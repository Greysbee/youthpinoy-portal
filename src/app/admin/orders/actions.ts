"use server";

import { requireAdmin } from "@/lib/admin";
import { createCheckoutSession, getCheckoutSession, type LineItem } from "@/lib/paymongo";
import { fulfillOrder } from "@/lib/fulfillment";
import { deliver } from "@/lib/email";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PayLinkState = { url?: string; ok?: boolean; error?: string };

// Return a usable PayMongo checkout URL for an unpaid order: reuse the existing
// session when possible, otherwise build a fresh one from the order's items.
async function ensureCheckoutUrl(
  admin: SupabaseClient,
  order: {
    id: string;
    event_id: string | null;
    quantity: number;
    amount_centavos: number;
    status: string;
    paymongo_checkout_id: string | null;
    buyer_participant_id: string;
    ticket_type_id: string | null;
  }
): Promise<{ url?: string; error?: string }> {
  // Reuse the existing session if it still has a hosted URL (and reconcile if paid).
  if (order.paymongo_checkout_id) {
    try {
      const s = await getCheckoutSession(order.paymongo_checkout_id);
      if (s.paid) {
        await fulfillOrder(order.id);
        return { error: "This order has already been paid." };
      }
      if (s.checkoutUrl) return { url: s.checkoutUrl };
    } catch {
      /* fall through and create a new session */
    }
  }

  if (!order.event_id) return { error: "Order has no event." };

  const [{ data: event }, { data: items }, { data: buyer }] = await Promise.all([
    admin.from("events").select("code, title, slug").eq("id", order.event_id).single(),
    admin
      .from("order_items")
      .select("quantity, unit_price_centavos, ticket_types(name)")
      .eq("order_id", order.id),
    admin.from("participants").select("email").eq("id", order.buyer_participant_id).single(),
  ]);
  if (!event) return { error: "Event not found." };

  let lineItems: LineItem[];
  if (items && items.length) {
    lineItems = items.map((it) => ({
      currency: "PHP",
      amount: (it.unit_price_centavos as number) ?? 0,
      name: `${event.code} — ${(it.ticket_types as { name?: string } | null)?.name ?? "Ticket"}`,
      quantity: (it.quantity as number) ?? 1,
    }));
  } else {
    const qty = order.quantity || 1;
    lineItems = [
      {
        currency: "PHP",
        amount: Math.round((order.amount_centavos ?? 0) / qty),
        name: `${event.code} — ${event.title}`,
        quantity: qty,
      },
    ];
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const session = await createCheckoutSession({
      lineItems,
      description: `${event.code} — resume payment`,
      metadata: { order_id: order.id },
      billing: { email: (buyer?.email as string) || undefined },
      successUrl: `${site}/checkout/success?order_id=${order.id}`,
      cancelUrl: `${site}/event/${event.slug}`,
    });
    await admin.from("orders").update({ paymongo_checkout_id: session.id }).eq("id", order.id);
    return { url: session.checkoutUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create a payment link." };
  }
}

async function loadUnpaidOrder(admin: SupabaseClient, orderId: string) {
  const { data: order } = await admin
    .from("orders")
    .select("id, event_id, quantity, amount_centavos, status, paymongo_checkout_id, buyer_participant_id, ticket_type_id")
    .eq("id", orderId)
    .single();
  return order;
}

// Return a payment link for a pending order (admin/super admin).
export async function resumeOrderPayment(_prev: PayLinkState, formData: FormData): Promise<PayLinkState> {
  const { admin } = await requireAdmin();
  const orderId = formData.get("order_id") as string;
  if (!orderId) return { error: "Missing order." };
  const order = await loadUnpaidOrder(admin, orderId);
  if (!order) return { error: "Order not found." };
  if (order.status === "paid") return { error: "This order is already paid." };
  return ensureCheckoutUrl(admin, order);
}

// Email the payment link to the buyer (admin/super admin).
export async function sendOrderPaymentLink(_prev: PayLinkState, formData: FormData): Promise<PayLinkState> {
  const { admin } = await requireAdmin();
  const orderId = formData.get("order_id") as string;
  if (!orderId) return { error: "Missing order." };
  const order = await loadUnpaidOrder(admin, orderId);
  if (!order) return { error: "Order not found." };
  if (order.status === "paid") return { error: "This order is already paid." };

  const res = await ensureCheckoutUrl(admin, order);
  if (!res.url) return { error: res.error ?? "Could not create a payment link." };

  const [{ data: buyer }, { data: event }] = await Promise.all([
    admin.from("participants").select("email, full_name").eq("id", order.buyer_participant_id).single(),
    order.event_id
      ? admin.from("events").select("code, title").eq("id", order.event_id).single()
      : Promise.resolve({ data: null }),
  ]);
  if (!buyer?.email) return { error: "Buyer has no email on file." };

  const ev = event as { code?: string; title?: string } | null;
  const send = await deliver({
    to: buyer.email,
    subject: `Complete your payment for ${ev?.code ?? "your order"} — YouthPinoy`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a">
      <h2 style="color:#033A7A;margin-top:0">Finish your purchase</h2>
      <p>Hi ${buyer.full_name || "there"}, your order for <strong>${ev?.title ?? "your event"}</strong> is awaiting payment.</p>
      <p><a href="${res.url}" style="display:inline-block;background:#033A7A;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600">Complete payment</a></p>
      <p style="color:#6b7280;font-size:12px">Or paste this link:<br>${res.url}</p>
    </div>`,
  });
  return send.ok ? { ok: true } : { error: `Email failed: ${send.error}` };
}

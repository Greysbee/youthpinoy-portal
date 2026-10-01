"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createCheckoutSession } from "@/lib/paymongo";
import { fulfillOrder } from "@/lib/fulfillment";
import { sendEmail } from "@/lib/email";

export type RegState = { error?: string };

type RegField = { key: string; label: string; required?: boolean };

async function getViewer(): Promise<{ userId: string; participantId: string | null } | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("participant_id")
    .eq("id", user.id)
    .single();
  return { userId: user.id, participantId: (data?.participant_id as string) ?? null };
}

function extractAnswers(
  formData: FormData,
  fields: RegField[]
): { answers: Record<string, string>; missing: string[] } {
  const answers: Record<string, string> = {};
  const missing: string[] = [];
  for (const f of fields ?? []) {
    const v = formData.get(`answer_${f.key}`);
    const val = v == null ? "" : String(v).trim();
    if (val) answers[f.key] = val;
    else if (f.required) missing.push(f.label);
  }
  return { answers, missing };
}

export async function registerFree(_prev: RegState, formData: FormData): Promise<RegState> {
  const slug = formData.get("slug") as string;
  const viewer = await getViewer();
  if (!viewer?.participantId) redirect(`/login?next=/events/${slug}`);

  const eventId = formData.get("event_id") as string;
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, title, slug, price_centavos, status, registration_fields, start_at, end_at, is_online, venue")
    .eq("id", eventId)
    .single();
  if (!event || event.status !== "published") return { error: "Event not available." };
  if (event.price_centavos !== 0) return { error: "This event requires payment." };

  const { answers, missing } = extractAnswers(formData, event.registration_fields ?? []);
  if (missing.length) return { error: `Please fill required fields: ${missing.join(", ")}` };

  const { data: reg } = await admin
    .from("registrations")
    .select("id")
    .eq("participant_id", viewer.participantId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!reg) {
    await admin.from("registrations").insert({
      participant_id: viewer.participantId,
      event_id: eventId,
      answers,
      status: "confirmed",
    });

    // Confirmation email (non-fatal, idempotent per event+recipient).
    const { data: pt } = await admin
      .from("participants")
      .select("email")
      .eq("id", viewer.participantId)
      .single();
    if (pt?.email) {
      await sendEmail({
        type: "event_registered",
        to: pt.email,
        refId: eventId,
        participantId: viewer.participantId,
        data: {
          eventTitle: event.title,
          slug: event.slug,
          startAt: event.start_at,
          endAt: event.end_at,
          isOnline: event.is_online,
          venue: event.venue,
        },
      });
    }
  }

  const { data: ent } = await admin
    .from("entitlements")
    .select("id")
    .eq("participant_id", viewer.participantId)
    .eq("event_id", eventId)
    .eq("type", "event")
    .is("revoked_at", null)
    .maybeSingle();
  if (!ent) {
    await admin.from("entitlements").insert({
      participant_id: viewer.participantId,
      event_id: eventId,
      type: "event",
      source: "purchase",
    });
  }

  redirect(`/events/${slug}?registered=1`);
}

// One-click enrollment in a FREE event (e.g. from the Library / watch page).
// Creates a registration + ₱0 entitlement (making the person a Participant), then
// returns to `back_to` so they can watch.
export async function enrollFreeEvent(formData: FormData): Promise<void> {
  const eventId = formData.get("event_id") as string;
  const backTo = (formData.get("back_to") as string) || "/library";
  const viewer = await getViewer();
  if (!viewer?.participantId) redirect(`/login?next=${encodeURIComponent(backTo)}`);

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, title, slug, price_centavos, status, start_at, end_at, is_online, venue")
    .eq("id", eventId)
    .single();
  if (!event || event.status !== "published" || event.price_centavos !== 0) redirect(backTo);

  const { data: reg } = await admin
    .from("registrations")
    .select("id")
    .eq("participant_id", viewer.participantId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!reg) {
    await admin.from("registrations").insert({
      participant_id: viewer.participantId,
      event_id: eventId,
      status: "confirmed",
    });
  }

  const { data: ent } = await admin
    .from("entitlements")
    .select("id")
    .eq("participant_id", viewer.participantId)
    .eq("event_id", eventId)
    .eq("type", "event")
    .is("revoked_at", null)
    .maybeSingle();
  if (!ent) {
    await admin.from("entitlements").insert({
      participant_id: viewer.participantId,
      event_id: eventId,
      type: "event",
      source: "purchase",
    });
    const { data: pt } = await admin
      .from("participants")
      .select("email")
      .eq("id", viewer.participantId)
      .single();
    if (pt?.email) {
      await sendEmail({
        type: "event_registered",
        to: pt.email,
        refId: eventId,
        participantId: viewer.participantId,
        data: {
          eventTitle: event.title,
          slug: event.slug,
          startAt: event.start_at,
          endAt: event.end_at,
          isOnline: event.is_online,
          venue: event.venue,
        },
      });
    }
  }

  redirect(backTo);
}

// Buy ticket types for an event (combined cart: a quantity per type). Collects the
// buyer's details on-page, saves them to the profile, and forwards name/email/phone
// to PayMongo so they aren't re-entered. Free carts (total ₱0) are fulfilled on the
// spot; paid carts go to PayMongo and are fulfilled by the webhook.
export async function startTicketCheckout(_prev: RegState, formData: FormData): Promise<RegState> {
  const slug = formData.get("slug") as string;
  const viewer = await getViewer();
  if (!viewer?.participantId) redirect(`/login?next=/events/${slug}`);

  const eventId = formData.get("event_id") as string;
  const admin = createAdminClient();
  const { data: event } = await admin.from("events").select("*").eq("id", eventId).single();
  if (!event || event.status !== "published") return { error: "Event not available." };

  // Cart: [{ id, qty }] of ticket types for this event.
  let cart: { id: string; qty: number }[] = [];
  try {
    const parsed = JSON.parse((formData.get("items") as string) || "[]");
    if (Array.isArray(parsed)) {
      cart = parsed
        .map((x: { id?: string; qty?: number }) => ({ id: String(x.id), qty: Math.max(0, parseInt(String(x.qty), 10) || 0) }))
        .filter((x) => x.id && x.qty > 0);
    }
  } catch {
    return { error: "Your ticket selection is invalid." };
  }
  if (!cart.length) return { error: "Select at least one ticket." };

  const { data: types } = await admin
    .from("ticket_types")
    .select("id, name, code, price_centavos")
    .eq("event_id", eventId)
    .in("id", cart.map((c) => c.id));
  const typeById = new Map((types ?? []).map((t) => [t.id as string, t]));
  if ((types ?? []).length !== new Set(cart.map((c) => c.id)).size)
    return { error: "One of the selected tickets is no longer available." };

  // Buyer details (required name; mobile optional). Saved to the profile.
  const title = ((formData.get("title") as string) || "").trim();
  const first = ((formData.get("first_name") as string) || "").trim();
  const last = ((formData.get("last_name") as string) || "").trim();
  const mobile = ((formData.get("mobile") as string) || "").replace(/\D/g, "");
  if (!first || !last) return { error: "Please enter your first and last name." };
  const fullName = [first, last].filter(Boolean).join(" ");
  await admin
    .from("participants")
    .update({
      title: title || null,
      first_name: first,
      last_name: last,
      full_name: fullName,
      mobile: mobile || null,
    })
    .eq("id", viewer.participantId);
  const { data: me } = await admin.from("participants").select("email").eq("id", viewer.participantId).single();
  const buyerEmail = (me?.email as string) ?? null;

  const { answers, missing } = extractAnswers(formData, event.registration_fields ?? []);
  if (missing.length) return { error: `Please fill required fields: ${missing.join(", ")}` };

  const items = cart.map((c) => {
    const tt = typeById.get(c.id)!;
    return { ticket_type_id: c.id, name: tt.name as string, quantity: c.qty, unit_price_centavos: (tt.price_centavos as number) ?? 0 };
  });
  const amount = items.reduce((s, it) => s + it.unit_price_centavos * it.quantity, 0);
  const totalQty = items.reduce((s, it) => s + it.quantity, 0);
  const singleTypeId = items.length === 1 ? items[0].ticket_type_id : null;

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      buyer_participant_id: viewer.participantId,
      event_id: eventId,
      ticket_type_id: singleTypeId,
      quantity: totalQty,
      amount_centavos: amount,
      currency: "PHP",
      status: "pending",
      answers,
    })
    .select("id")
    .single();
  if (orderErr || !order) return { error: orderErr?.message ?? "Could not create order." };

  await admin.from("order_items").insert(
    items.map((it) => ({
      order_id: order.id,
      ticket_type_id: it.ticket_type_id,
      quantity: it.quantity,
      unit_price_centavos: it.unit_price_centavos,
    }))
  );

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Free cart: fulfil immediately, no PayMongo.
  if (amount <= 0) {
    await fulfillOrder(order.id as string);
    redirect(`/checkout/success?order_id=${order.id}`);
  }

  let checkoutUrl: string;
  try {
    const session = await createCheckoutSession({
      lineItems: items.map((it) => ({
        currency: "PHP",
        amount: it.unit_price_centavos,
        name: `${event.code} — ${it.name}`,
        quantity: it.quantity,
      })),
      description: `${event.code} · ${totalQty} ticket${totalQty !== 1 ? "s" : ""}`,
      metadata: { order_id: order.id as string },
      billing: { name: fullName, email: buyerEmail ?? undefined, phone: mobile || undefined },
      successUrl: `${site}/checkout/success?order_id=${order.id}`,
      cancelUrl: `${site}/events/${slug}`,
    });
    checkoutUrl = session.checkoutUrl;
    await admin.from("orders").update({ paymongo_checkout_id: session.id }).eq("id", order.id);
  } catch (e) {
    await admin.from("orders").update({ status: "failed" }).eq("id", order.id);
    return { error: e instanceof Error ? e.message : "Payment setup failed." };
  }

  redirect(checkoutUrl);
}

export async function startCheckout(_prev: RegState, formData: FormData): Promise<RegState> {
  const slug = formData.get("slug") as string;
  const viewer = await getViewer();
  if (!viewer?.participantId) redirect(`/login?next=/events/${slug}`);

  const eventId = formData.get("event_id") as string;
  const quantity = Math.max(1, parseInt((formData.get("quantity") as string) || "1", 10) || 1);

  const admin = createAdminClient();
  const { data: event } = await admin.from("events").select("*").eq("id", eventId).single();
  if (!event || event.status !== "published") return { error: "Event not available." };
  if (event.price_centavos <= 0) return { error: "This is a free event." };

  const { answers, missing } = extractAnswers(formData, event.registration_fields ?? []);
  if (missing.length) return { error: `Please fill required fields: ${missing.join(", ")}` };

  const amount = event.price_centavos * quantity;
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      buyer_participant_id: viewer.participantId,
      event_id: eventId,
      quantity,
      amount_centavos: amount,
      currency: "PHP",
      status: "pending",
      answers,
    })
    .select("id")
    .single();
  if (orderErr || !order) return { error: orderErr?.message ?? "Could not create order." };

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  let checkoutUrl: string;
  try {
    const session = await createCheckoutSession({
      lineItems: [
        {
          currency: "PHP",
          amount: event.price_centavos,
          name: `${event.code} — ${event.title}`,
          quantity,
        },
      ],
      description: `${event.code} registration${quantity > 1 ? ` (${quantity} seats)` : ""}`,
      metadata: { order_id: order.id as string },
      successUrl: `${site}/checkout/success?order_id=${order.id}`,
      cancelUrl: `${site}/events/${slug}`,
    });
    checkoutUrl = session.checkoutUrl;
    await admin.from("orders").update({ paymongo_checkout_id: session.id }).eq("id", order.id);
  } catch (e) {
    await admin.from("orders").update({ status: "failed" }).eq("id", order.id);
    return { error: e instanceof Error ? e.message : "Payment setup failed." };
  }

  redirect(checkoutUrl);
}

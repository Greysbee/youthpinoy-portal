"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createCheckoutSession } from "@/lib/paymongo";
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

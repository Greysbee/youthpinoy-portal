import { createAdminClient } from "@/lib/supabase-admin";

// Fulfil a paid order. Idempotent: guarded by order.status and per-entity checks,
// so PayMongo webhook retries never double-grant. Grants ONLY happen here (called
// from the verified webhook), never from the success redirect.
export async function fulfillOrder(
  orderId: string,
  opts: { paymentId?: string | null; raw?: unknown } = {}
): Promise<{ ok: boolean; already?: boolean }> {
  const admin = createAdminClient();

  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).single();
  if (!order) return { ok: false };
  if (order.status === "paid") return { ok: true, already: true };

  await admin
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      paymongo_payment_id: opts.paymentId ?? order.paymongo_payment_id ?? null,
      raw_webhook: (opts.raw as object) ?? order.raw_webhook ?? null,
    })
    .eq("id", orderId);

  if (!order.event_id) return { ok: true };

  // Buyer registration (unique participant+event).
  const { data: reg } = await admin
    .from("registrations")
    .select("id")
    .eq("participant_id", order.buyer_participant_id)
    .eq("event_id", order.event_id)
    .maybeSingle();
  if (!reg) {
    await admin.from("registrations").insert({
      participant_id: order.buyer_participant_id,
      event_id: order.event_id,
      order_id: order.id,
      answers: order.answers ?? {},
      status: "confirmed",
    });
  }

  // Buyer entitlement (uses 1 seat).
  const { data: ent } = await admin
    .from("entitlements")
    .select("id")
    .eq("participant_id", order.buyer_participant_id)
    .eq("event_id", order.event_id)
    .eq("type", "event")
    .is("revoked_at", null)
    .maybeSingle();
  if (!ent) {
    await admin.from("entitlements").insert({
      participant_id: order.buyer_participant_id,
      event_id: order.event_id,
      type: "event",
      source: "purchase",
      order_id: order.id,
    });
  }

  // Group ticket: quantity > 1 creates a group the buyer can fill with invites (M4).
  if (order.quantity > 1) {
    const { data: grp } = await admin
      .from("groups")
      .select("id")
      .eq("order_id", order.id)
      .maybeSingle();
    if (!grp) {
      await admin.from("groups").insert({
        name: `Group — order ${String(order.id).slice(0, 8)}`,
        owner_participant_id: order.buyer_participant_id,
        event_id: order.event_id,
        order_id: order.id,
        seats_total: order.quantity,
      });
    }
  }

  return { ok: true };
}

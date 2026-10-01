import { createAdminClient } from "@/lib/supabase-admin";
import { sendEmail } from "@/lib/email";

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

  // ---- Ticketed order: reserve numbered tickets for the purchaser to assign. ----
  // Access is NOT granted to the buyer here — only when a ticket is accepted.
  const { data: orderItems } = await admin
    .from("order_items")
    .select("ticket_type_id, quantity")
    .eq("order_id", order.id);
  // Normalize to a flat item list; fall back to the single-type field for old orders.
  const items: { ticket_type_id: string; quantity: number }[] =
    orderItems && orderItems.length
      ? orderItems.map((it) => ({ ticket_type_id: it.ticket_type_id as string, quantity: it.quantity as number }))
      : order.ticket_type_id
        ? [{ ticket_type_id: order.ticket_type_id as string, quantity: order.quantity as number }]
        : [];

  if (items.length) {
    const { data: event } = await admin
      .from("events")
      .select("code, title, slug, start_at, end_at, is_online, venue")
      .eq("id", order.event_id)
      .single();

    // Idempotent: create tickets + group only once per order.
    const { count: existing } = await admin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("order_id", order.id);

    let groupId: string | null = null;
    if (!existing) {
      const totalQty = items.reduce((s, it) => s + it.quantity, 0);
      const { data: grp } = await admin
        .from("groups")
        .insert({
          name: `${event?.code ?? "Event"} — ${event?.title ?? "Tickets"}`,
          owner_participant_id: order.buyer_participant_id,
          event_id: order.event_id,
          order_id: order.id,
          seats_total: totalQty,
        })
        .select("id")
        .single();
      groupId = (grp?.id as string) ?? null;

      const { data: startSeq } = await admin.rpc("next_ticket_seq", {
        p_event: order.event_id,
        p_count: totalQty,
      });
      let seq = Number(startSeq);
      const rows: Record<string, unknown>[] = [];
      for (const it of items) {
        for (let k = 0; k < it.quantity; k++) {
          rows.push({
            event_id: order.event_id,
            ticket_type_id: it.ticket_type_id,
            order_id: order.id,
            group_id: groupId,
            seq,
            code: `${event?.code ?? "T"}${String(seq).padStart(3, "0")}`,
            purchaser_participant_id: order.buyer_participant_id,
            status: "reserved",
          });
          seq++;
        }
      }
      await admin.from("tickets").insert(rows);
    } else {
      groupId = (await admin.from("groups").select("id").eq("order_id", order.id).maybeSingle()).data?.id ?? null;
    }

    const { data: buyer } = await admin
      .from("participants")
      .select("email")
      .eq("id", order.buyer_participant_id)
      .single();
    if (buyer?.email && event) {
      await sendEmail({
        type: "order_paid",
        to: buyer.email,
        refId: String(order.id),
        participantId: order.buyer_participant_id,
        data: {
          orderRef: String(order.id).slice(0, 8).toUpperCase(),
          eventTitle: event.title,
          slug: event.slug,
          quantity: order.quantity,
          amountCentavos: order.amount_centavos,
          paidAt: new Date().toISOString(),
          paymentMethod: null,
          startAt: event.start_at,
          endAt: event.end_at,
          isOnline: event.is_online,
          venue: event.venue,
          groupId,
        },
      });
    }
    return { ok: true };
  }

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

  // Payment confirmation email (non-fatal, idempotent per order+recipient).
  const [{ data: buyer }, { data: event }, { data: group }] = await Promise.all([
    admin.from("participants").select("email").eq("id", order.buyer_participant_id).single(),
    admin.from("events").select("title, slug, start_at, end_at, is_online, venue").eq("id", order.event_id).single(),
    admin.from("groups").select("id").eq("order_id", order.id).maybeSingle(),
  ]);
  if (buyer?.email && event) {
    await sendEmail({
      type: "order_paid",
      to: buyer.email,
      refId: String(order.id),
      participantId: order.buyer_participant_id,
      data: {
        orderRef: String(order.id).slice(0, 8).toUpperCase(),
        eventTitle: event.title,
        slug: event.slug,
        quantity: order.quantity,
        amountCentavos: order.amount_centavos,
        paidAt: new Date().toISOString(),
        paymentMethod: null,
        startAt: event.start_at,
        endAt: event.end_at,
        isOnline: event.is_online,
        venue: event.venue,
        groupId: group?.id ?? null,
      },
    });
  }

  return { ok: true };
}

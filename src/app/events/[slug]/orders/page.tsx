import Link from "next/link";
import AdminShell from "@/components/admin-shell";
import { requireSuperAdmin, centavosToPesos } from "@/lib/admin";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EventOrdersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { admin } = await requireSuperAdmin();

  const key = slug.replace(/[(),]/g, "");
  const { data: event } = await admin
    .from("events")
    .select("id, code, title")
    .or(`slug.eq.${key},code.eq.${key}`)
    .maybeSingle();
  if (!event) notFound();

  const { data: orders } = await admin
    .from("orders")
    .select("id, amount_centavos, status, quantity, created_at, participants(email, full_name)")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false });

  // Ticket numbers per order (for ticketed events).
  const orderIds = (orders ?? []).map((o) => o.id);
  const { data: tickets } = orderIds.length
    ? await admin
        .from("tickets")
        .select("order_id, code, status, assigned_email, seq")
        .in("order_id", orderIds)
        .order("seq")
    : { data: [] as { order_id: string; code: string; status: string; assigned_email: string | null; seq: number }[] };
  const ticketsByOrder = new Map<string, { code: string; status: string; assigned_email: string | null }[]>();
  for (const t of tickets ?? []) {
    const arr = ticketsByOrder.get(t.order_id as string) ?? [];
    arr.push({ code: t.code, status: t.status, assigned_email: t.assigned_email });
    ticketsByOrder.set(t.order_id as string, arr);
  }

  const paid = (orders ?? []).filter((o) => o.status === "paid");
  const revenue = paid.reduce((s, o) => s + (o.amount_centavos ?? 0), 0);
  const seats = paid.reduce((s, o) => s + (o.quantity ?? 0), 0);

  return (
    <AdminShell>
      <Link href="/admin/events" className="text-sm text-brand-muted hover:text-brand-dark">← Events</Link>
      <h1 className="mt-2 text-2xl font-bold text-brand-dark">Orders · {event.code}</h1>
      <p className="mt-1 text-brand-muted">{event.title}</p>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <span className="rounded-lg bg-gray-100 px-3 py-1.5">Orders: <strong>{orders?.length ?? 0}</strong></span>
        <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-700">Paid: <strong>{paid.length}</strong></span>
        <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-700">Seats sold: <strong>{seats}</strong></span>
        <span className="rounded-lg bg-brand-blue/10 px-3 py-1.5 text-brand-blue">Revenue: <strong>₱{centavosToPesos(revenue)}</strong></span>
      </div>

      <div className="mt-6 max-h-[70vh] overflow-auto frozen-head">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-brand-muted">
              <th className="py-3 pr-4">Date</th>
              <th className="py-3 pr-4">Buyer</th>
              <th className="py-3 pr-4">Qty</th>
              <th className="py-3 pr-4">Tickets</th>
              <th className="py-3 pr-4">Amount</th>
              <th className="py-3 pr-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(orders ?? []).map((o) => {
              const buyer = o.participants as { email?: string; full_name?: string } | null;
              return (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 text-brand-muted">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="py-3 pr-4">{buyer?.full_name || buyer?.email || "—"}</td>
                  <td className="py-3 pr-4">{o.quantity}</td>
                  <td className="py-3 pr-4">
                    {(ticketsByOrder.get(o.id) ?? []).length === 0 ? (
                      <span className="text-brand-muted">—</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {(ticketsByOrder.get(o.id) ?? []).map((t) => (
                          <span key={t.code} className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs font-bold text-amber-800">{t.code}</span>
                            <span className="text-xs text-brand-muted">
                              {t.status === "accepted"
                                ? `✓ ${t.assigned_email ?? ""}`
                                : t.assigned_email
                                  ? `→ ${t.assigned_email}`
                                  : "unassigned"}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4">₱{centavosToPesos(o.amount_centavos)}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      o.status === "paid" ? "bg-emerald-100 text-emerald-700" : o.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-gray-200 text-gray-600"
                    }`}>{o.status}</span>
                  </td>
                </tr>
              );
            })}
            {(orders ?? []).length === 0 && (
              <tr><td colSpan={6} className="py-10 text-center text-brand-muted">No orders for this event yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

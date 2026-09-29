import AdminShell from "@/components/admin-shell";
import { requireSuperAdmin, centavosToPesos } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const { admin } = await requireSuperAdmin();
  const { data: orders } = await admin
    .from("orders")
    .select("id, amount_centavos, currency, status, quantity, created_at, events(code), participants(email)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold text-brand-dark">Orders</h1>
      <p className="mt-1 text-brand-muted">Read-only. Payments arrive in Milestone 3.</p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-brand-muted">
              <th className="py-3 pr-4">Date</th>
              <th className="py-3 pr-4">Buyer</th>
              <th className="py-3 pr-4">Event</th>
              <th className="py-3 pr-4">Qty</th>
              <th className="py-3 pr-4">Amount</th>
              <th className="py-3 pr-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(orders ?? []).map((o) => {
              const ev = o.events as { code?: string } | null;
              const buyer = o.participants as { email?: string } | null;
              return (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 text-brand-muted">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="py-3 pr-4">{buyer?.email ?? "—"}</td>
                  <td className="py-3 pr-4">{ev?.code ?? "—"}</td>
                  <td className="py-3 pr-4">{o.quantity}</td>
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
              <tr><td colSpan={6} className="py-10 text-center text-brand-muted">No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

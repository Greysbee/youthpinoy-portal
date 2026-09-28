import Link from "next/link";
import AdminShell from "@/components/admin-shell";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { admin } = await requireAdmin();
  const { q } = await searchParams;

  let query = admin
    .from("participants")
    .select("id, email, full_name, organization, source, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (q && q.trim()) {
    const term = q.trim().replace(/[%,]/g, "");
    query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
  }
  const { data: participants } = await query;

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold text-brand-dark">Participants</h1>
      <p className="mt-1 text-brand-muted">Search by name or email.</p>

      <form className="mt-4 flex gap-2" action="/admin/participants" method="get">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name or email…"
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
        />
        <button className="rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
          Search
        </button>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-brand-muted">
              <th className="py-3 pr-4">Name</th>
              <th className="py-3 pr-4">Email</th>
              <th className="py-3 pr-4">Organization</th>
              <th className="py-3 pr-4">Source</th>
              <th className="py-3 text-right">&nbsp;</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(participants ?? []).map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="py-3 pr-4 font-medium text-brand-dark">{p.full_name || "—"}</td>
                <td className="py-3 pr-4">{p.email}</td>
                <td className="py-3 pr-4 text-brand-muted">{p.organization || "—"}</td>
                <td className="py-3 pr-4">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{p.source}</span>
                </td>
                <td className="py-3 text-right">
                  <Link href={`/admin/participants/${p.id}`} className="rounded-lg px-3 py-1.5 text-brand-accent hover:bg-brand-accent/10">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {(participants ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-brand-muted">No participants found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

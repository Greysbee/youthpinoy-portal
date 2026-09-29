import Link from "next/link";
import AdminShell from "@/components/admin-shell";
import { requireSuperAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const BADGE = "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold";

function statusClass(status: "Member" | "Participant") {
  return status === "Participant" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600";
}
function accessClass(access: "Admin" | "Super Admin") {
  return access === "Super Admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700";
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { admin } = await requireSuperAdmin();
  const { q } = await searchParams;

  let query = admin
    .from("participants")
    .select("id, email, full_name, organization, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (q && q.trim()) {
    const term = q.trim().replace(/[%,]/g, "");
    query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
  }
  const { data: participants } = await query;
  const ids = (participants ?? []).map((p) => p.id);

  // Resolve stored staff role + activity for the listed people only.
  const [{ data: profiles }, { data: ents }, { data: regs }] = ids.length
    ? await Promise.all([
        admin.from("profiles").select("participant_id, role").in("participant_id", ids),
        admin.from("entitlements").select("participant_id").in("participant_id", ids).is("revoked_at", null),
        admin.from("registrations").select("participant_id").in("participant_id", ids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const roleByPid = new Map<string, string>();
  for (const p of profiles ?? []) if (p.participant_id) roleByPid.set(p.participant_id, p.role);
  const active = new Set<string>();
  for (const e of ents ?? []) if (e.participant_id) active.add(e.participant_id);
  for (const r of regs ?? []) if (r.participant_id) active.add(r.participant_id);

  function labelsFor(pid: string): {
    status: "Member" | "Participant";
    access: "Admin" | "Super Admin" | null;
  } {
    const stored = roleByPid.get(pid);
    const access = stored === "super_admin" ? "Super Admin" : stored === "admin" ? "Admin" : null;
    const status = active.has(pid) ? "Participant" : "Member";
    return { status, access };
  }

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Members</h1>
          <p className="mt-1 text-brand-muted">Everyone with a participant record. Search by name or email.</p>
        </div>
        <Link href="/admin/import" className="inline-flex min-h-11 items-center rounded-lg border border-brand-blue px-4 py-2.5 text-sm font-semibold text-brand-blue hover:bg-brand-blue/5">
          Import participants
        </Link>
      </div>

      <form className="mt-4 flex gap-2" action="/admin/members" method="get">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name or email…"
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
        />
        <button className="rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">Search</button>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-brand-muted">
              <th className="py-3 pr-4">Name</th>
              <th className="py-3 pr-4">Email</th>
              <th className="py-3 pr-4">Organization</th>
              <th className="py-3 pr-4">Role</th>
              <th className="py-3 text-right">&nbsp;</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(participants ?? []).map((p) => {
              const { status, access } = labelsFor(p.id);
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium text-brand-dark">{p.full_name || "—"}</td>
                  <td className="py-3 pr-4">{p.email}</td>
                  <td className="py-3 pr-4 text-brand-muted">{p.organization || "—"}</td>
                  <td className="py-3 pr-4">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className={`${BADGE} ${statusClass(status)}`}>{status}</span>
                      {access && <span className={`${BADGE} ${accessClass(access)}`}>{access}</span>}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <Link href={`/admin/participants/${p.id}`} className="rounded-lg px-3 py-1.5 text-brand-accent hover:bg-brand-accent/10">
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
            {(participants ?? []).length === 0 && (
              <tr><td colSpan={5} className="py-10 text-center text-brand-muted">No members found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

import Link from "next/link";
import AdminShell from "@/components/admin-shell";
import { requireAdmin, centavosToPesos } from "@/lib/admin";

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
  const { admin, role } = await requireAdmin();
  const { q } = await searchParams;

  let query = admin
    .from("participants")
    .select("id, member_id, email, full_name, organization, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (q && q.trim()) {
    const term = q.trim().replace(/[%,]/g, "");
    query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
  }
  const { data: participants } = await query;
  const ids = (participants ?? []).map((p) => p.id);

  // Resolve stored staff role + activity + orders + held tickets for the listed people.
  const [{ data: profiles }, { data: ents }, { data: regs }, { data: orders }, { data: heldTickets }] = ids.length
    ? await Promise.all([
        admin.from("profiles").select("participant_id, role").in("participant_id", ids),
        admin.from("entitlements").select("participant_id").in("participant_id", ids).is("revoked_at", null),
        admin.from("registrations").select("participant_id").in("participant_id", ids),
        admin.from("orders").select("buyer_participant_id, amount_centavos, status").in("buyer_participant_id", ids),
        admin.from("tickets").select("assigned_participant_id, code, seq").in("assigned_participant_id", ids).eq("status", "accepted").order("seq"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const roleByPid = new Map<string, string>();
  for (const p of profiles ?? []) if (p.participant_id) roleByPid.set(p.participant_id, p.role);
  const active = new Set<string>();
  for (const e of ents ?? []) if (e.participant_id) active.add(e.participant_id);
  for (const r of regs ?? []) if (r.participant_id) active.add(r.participant_id);

  // Orders per member (count of all orders, and total ₱ of paid ones).
  const ordersByPid = new Map<string, { count: number; paidCentavos: number }>();
  for (const o of orders ?? []) {
    const pid = o.buyer_participant_id as string;
    if (!pid) continue;
    const cur = ordersByPid.get(pid) ?? { count: 0, paidCentavos: 0 };
    cur.count += 1;
    if (o.status === "paid") cur.paidCentavos += o.amount_centavos ?? 0;
    ordersByPid.set(pid, cur);
  }
  // Anyone who has an order counts as a participant too.
  for (const pid of ordersByPid.keys()) active.add(pid);

  // Ticket numbers each person holds (accepted).
  const ticketsByPid = new Map<string, string[]>();
  for (const t of heldTickets ?? []) {
    const pid = t.assigned_participant_id as string;
    if (!pid) continue;
    const arr = ticketsByPid.get(pid) ?? [];
    arr.push(t.code as string);
    ticketsByPid.set(pid, arr);
    active.add(pid);
  }

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
        {role === "super_admin" && (
          <Link href="/admin/import" className="inline-flex min-h-11 items-center rounded-lg border border-brand-blue px-4 py-2.5 text-sm font-semibold text-brand-blue hover:bg-brand-blue/5">
            Import participants
          </Link>
        )}
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

      <div className="mt-6 max-h-[70vh] overflow-auto frozen-head">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-brand-muted">
              <th className="py-3 pr-4">YP ID</th>
              <th className="py-3 pr-4">Name</th>
              <th className="py-3 pr-4">Email</th>
              <th className="py-3 pr-4">Role</th>
              <th className="py-3 pr-4">Tickets</th>
              <th className="py-3 pr-4">Orders</th>
              <th className="py-3 text-right">&nbsp;</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(participants ?? []).map((p) => {
              const { status, access } = labelsFor(p.id);
              const ord = ordersByPid.get(p.id);
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-mono text-xs font-semibold text-brand-blue">{p.member_id}</td>
                  <td className="py-3 pr-4 font-medium text-brand-dark">{p.full_name || "—"}</td>
                  <td className="py-3 pr-4">{p.email}</td>
                  <td className="py-3 pr-4">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className={`${BADGE} ${statusClass(status)}`}>{status}</span>
                      {access && <span className={`${BADGE} ${accessClass(access)}`}>{access}</span>}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {(ticketsByPid.get(p.id) ?? []).length ? (
                      <span className="flex flex-wrap gap-1">
                        {(ticketsByPid.get(p.id) ?? []).map((code) => (
                          <span key={code} className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs font-bold text-amber-800">
                            {code}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-brand-muted">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-brand-muted">
                    {ord ? (
                      <span>
                        {ord.count} · <span className="text-brand-dark">₱{centavosToPesos(ord.paidCentavos)}</span>
                      </span>
                    ) : (
                      "—"
                    )}
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
              <tr><td colSpan={7} className="py-10 text-center text-brand-muted">No members found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

import Link from "next/link";
import AdminShell from "@/components/admin-shell";
import { requireAdmin, centavosToPesos } from "@/lib/admin";
import { notFound } from "next/navigation";
import { grantEntitlement, revokeEntitlement, setRole } from "../actions";

export const dynamic = "force-dynamic";

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { admin, userId } = await requireAdmin();

  const { data: p } = await admin.from("participants").select("*").eq("id", id).single();
  if (!p) notFound();

  const { data: linkedProfile } = await admin
    .from("profiles")
    .select("id, role")
    .eq("participant_id", id)
    .maybeSingle();
  const { data: caller } = await admin.from("profiles").select("role").eq("id", userId).single();
  const storedRole = linkedProfile?.role;
  const roleLabel =
    storedRole === "super_admin" ? "Super Admin" : storedRole === "admin" ? "Admin" : "Member";

  const [{ data: entitlements }, { data: registrations }, { data: orders }, { data: events }, { data: ownedGroups }, { data: memberships }] =
    await Promise.all([
      admin
        .from("entitlements")
        .select("id, type, source, granted_at, revoked_at, event_id, events(code, title)")
        .eq("participant_id", id)
        .order("granted_at", { ascending: false }),
      admin
        .from("registrations")
        .select("id, created_at, status, events(code, title)")
        .eq("participant_id", id),
      admin
        .from("orders")
        .select("id, amount_centavos, currency, status, quantity, created_at, events(code)")
        .eq("buyer_participant_id", id)
        .order("created_at", { ascending: false }),
      admin.from("events").select("id, code, title").order("code"),
      admin.from("groups").select("id, name, seats_total, events(code)").eq("owner_participant_id", id),
      admin.from("group_members").select("id, status, groups(name, events(code))").eq("participant_id", id),
    ]);

  const card = "rounded-xl border border-gray-200 bg-white p-5";
  const h2 = "text-sm font-bold uppercase tracking-wider text-brand-muted";

  return (
    <AdminShell>
      <Link href="/admin/members" className="text-sm text-brand-muted hover:text-brand-dark">← Members</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">{p.full_name || p.email}</h1>
          <p className="text-brand-muted">{p.email}{p.organization ? ` · ${p.organization}` : ""}</p>
          <p className="mt-1 text-xs text-brand-muted">Source: {p.source}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Role & access level */}
        <div className={card}>
          <h2 className={h2}>Role &amp; access level</h2>
          {linkedProfile ? (
            <>
              <p className="mt-3 text-sm">
                Current role: <span className="font-semibold">{roleLabel}</span>
              </p>
              <form action={setRole} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="participant_id" value={id} />
                <select
                  name="role"
                  defaultValue={storedRole === "super_admin" ? "super_admin" : storedRole === "admin" ? "admin" : "member"}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  {caller?.role === "super_admin" && <option value="super_admin">Super Admin</option>}
                </select>
                <button className="rounded-lg bg-brand-blue px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">
                  Update role
                </button>
              </form>
              <p className="mt-2 text-xs text-brand-muted">
                {caller?.role === "super_admin"
                  ? "Members auto-show as “Participant” once they register for an event."
                  : "Only a super admin can assign the super admin role."}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-brand-muted">
              No login yet — this person hasn&apos;t created an account. They become a Member (and a
              Participant once they register) when they sign up with {p.email}.
            </p>
          )}
        </div>

        {/* Entitlements + grant */}
        <div className={card}>
          <h2 className={h2}>Entitlements</h2>
          <ul className="mt-3 space-y-2">
            {(entitlements ?? []).map((e) => {
              const ev = e.events as { code?: string } | null;
              const active = !e.revoked_at;
              return (
                <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className={active ? "" : "text-brand-muted line-through"}>
                    {e.type === "all_access" ? "All-access" : ev?.code ?? "event"}{" "}
                    <span className="text-xs text-brand-muted">({e.source})</span>
                  </span>
                  {active ? (
                    <form action={revokeEntitlement}>
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="participant_id" value={id} />
                      <button className="rounded px-2 py-1 text-xs text-brand-red hover:bg-red-50">Revoke</button>
                    </form>
                  ) : (
                    <span className="text-xs text-brand-muted">revoked</span>
                  )}
                </li>
              );
            })}
            {(entitlements ?? []).length === 0 && <li className="text-sm text-brand-muted">None yet.</li>}
          </ul>

          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-brand-dark">Grant access</p>
            <form action={grantEntitlement} className="mt-2 flex flex-wrap items-center gap-2">
              <input type="hidden" name="participant_id" value={id} />
              <select name="event_id" className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                {(events ?? []).map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.code}</option>
                ))}
              </select>
              <input type="hidden" name="type" value="event" />
              <button className="rounded-lg bg-brand-blue px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">
                Grant event
              </button>
            </form>
            <form action={grantEntitlement} className="mt-2">
              <input type="hidden" name="participant_id" value={id} />
              <input type="hidden" name="type" value="all_access" />
              <button className="rounded-lg border border-brand-blue px-3 py-1.5 text-sm font-semibold text-brand-blue hover:bg-brand-blue/5">
                Grant all-access
              </button>
            </form>
          </div>
        </div>

        {/* Registrations */}
        <div className={card}>
          <h2 className={h2}>Registrations</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(registrations ?? []).map((r) => {
              const ev = r.events as { code?: string } | null;
              return <li key={r.id}>{ev?.code ?? "event"} · <span className="text-brand-muted">{r.status}</span></li>;
            })}
            {(registrations ?? []).length === 0 && <li className="text-brand-muted">None.</li>}
          </ul>
        </div>

        {/* Orders */}
        <div className={card}>
          <h2 className={h2}>Orders</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(orders ?? []).map((o) => {
              const ev = o.events as { code?: string } | null;
              return (
                <li key={o.id} className="flex justify-between">
                  <span>{ev?.code ?? "—"} ×{o.quantity}</span>
                  <span className="text-brand-muted">₱{centavosToPesos(o.amount_centavos)} · {o.status}</span>
                </li>
              );
            })}
            {(orders ?? []).length === 0 && <li className="text-brand-muted">None.</li>}
          </ul>
        </div>

        {/* Groups */}
        <div className={card}>
          <h2 className={h2}>Groups</h2>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-brand-dark">Owns</p>
              <ul className="mt-1 space-y-1">
                {(ownedGroups ?? []).map((g) => {
                  const ev = g.events as { code?: string } | null;
                  return <li key={g.id}>{g.name} <span className="text-brand-muted">({ev?.code ?? "—"}, {g.seats_total} seats)</span></li>;
                })}
                {(ownedGroups ?? []).length === 0 && <li className="text-brand-muted">None.</li>}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-brand-dark">Member of</p>
              <ul className="mt-1 space-y-1">
                {(memberships ?? []).map((m) => {
                  const g = m.groups as { name?: string; events?: { code?: string } } | null;
                  return <li key={m.id}>{g?.name ?? "group"} <span className="text-brand-muted">({g?.events?.code ?? "—"}, {m.status})</span></li>;
                })}
                {(memberships ?? []).length === 0 && <li className="text-brand-muted">None.</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

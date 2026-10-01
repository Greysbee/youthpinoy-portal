import Link from "next/link";
import AdminShell from "@/components/admin-shell";
import { requireAdmin, centavosToPesos } from "@/lib/admin";
import { TITLES, COUNTRIES } from "@/lib/reference";
import { notFound } from "next/navigation";
import { grantEntitlement, revokeEntitlement, setRole, updateMemberProfile } from "../actions";

export const dynamic = "force-dynamic";

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { admin, role } = await requireAdmin();
  const isSuper = role === "super_admin";

  const { data: p } = await admin.from("participants").select("*").eq("id", id).single();
  if (!p) notFound();

  const { data: linkedProfile } = await admin
    .from("profiles")
    .select("id, role")
    .eq("participant_id", id)
    .maybeSingle();
  const storedRole = linkedProfile?.role;
  const roleLabel =
    storedRole === "super_admin" ? "Super Admin" : storedRole === "admin" ? "Admin" : "Member";

  const [
    { data: entitlements },
    { data: registrations },
    { data: orders },
    { data: events },
    { data: ownedGroups },
    { data: memberships },
    { data: heldTickets },
    { data: dioceseRows },
  ] = await Promise.all([
    admin
      .from("entitlements")
      .select("id, type, source, granted_at, revoked_at, event_id, events(code, title)")
      .eq("participant_id", id)
      .order("granted_at", { ascending: false }),
    admin
      .from("registrations")
      .select("id, created_at, status, events(code, title)")
      .eq("participant_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("orders")
      .select("id, amount_centavos, currency, status, quantity, created_at, events(code, title)")
      .eq("buyer_participant_id", id)
      .order("created_at", { ascending: false }),
    admin.from("events").select("id, code, title").order("code"),
    admin.from("groups").select("id, name, seats_total, events(code)").eq("owner_participant_id", id),
    admin.from("group_members").select("id, status, groups(name, events(code))").eq("participant_id", id),
    admin
      .from("tickets")
      .select("id, code, accepted_at, events(code, title)")
      .eq("assigned_participant_id", id)
      .eq("status", "accepted")
      .order("accepted_at", { ascending: false }),
    admin.from("dioceses").select("name, ecclesiastical_province").order("sort_order"),
  ]);

  // Group dioceses by province for the edit dropdown.
  const dioceseGroups: { province: string; names: string[] }[] = [];
  for (const d of dioceseRows ?? []) {
    const prov = (d.ecclesiastical_province as string) || "Other";
    let g = dioceseGroups.find((x) => x.province === prov);
    if (!g) {
      g = { province: prov, names: [] };
      dioceseGroups.push(g);
    }
    g.names.push(d.name as string);
  }

  const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");

  const card = "rounded-xl border border-gray-200 bg-white p-5";
  const h2 = "text-sm font-bold uppercase tracking-wider text-brand-muted";
  const inp =
    "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent";

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
        {/* Edit profile — available to admin and super admin */}
        <div className={`${card} lg:col-span-2`}>
          <h2 className={h2}>Edit profile</h2>
          <form action={updateMemberProfile} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-6">
            <input type="hidden" name="participant_id" value={id} />
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-brand-muted">Title</label>
              <select name="title" defaultValue={p.title ?? ""} className={inp}>
                <option value="">—</option>
                {TITLES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-brand-muted">First name</label>
              <input name="first_name" defaultValue={p.first_name ?? ""} className={inp} />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-brand-muted">Middle</label>
              <input name="middle_name" defaultValue={p.middle_name ?? ""} className={inp} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-brand-muted">Last name</label>
              <input name="last_name" defaultValue={p.last_name ?? ""} className={inp} />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-brand-muted">Email</label>
              <input name="email" type="email" defaultValue={p.email ?? ""} className={inp} />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-brand-muted">Country</label>
              <select name="country" defaultValue={p.country ?? "PH"} className={inp}>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-brand-muted">Mobile</label>
              <input name="mobile" type="tel" inputMode="numeric" defaultValue={p.mobile ?? ""} className={inp} />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-brand-muted">Diocese</label>
              <select name="diocese" defaultValue={p.diocese ?? ""} className={inp}>
                <option value="">— Select diocese —</option>
                {dioceseGroups.map((g) => (
                  <optgroup key={g.province} label={g.province}>
                    {g.names.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-brand-muted">Organization</label>
              <input name="organization" defaultValue={p.organization ?? ""} className={inp} />
            </div>
            <div className="sm:col-span-6">
              <button className="rounded-lg bg-brand-blue px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                Save profile
              </button>
            </div>
          </form>
        </div>

        {/* Role & access level — super admin only */}
        {isSuper && (
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
                  <option value="super_admin">Super Admin</option>
                </select>
                <button className="rounded-lg bg-brand-blue px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">
                  Update role
                </button>
              </form>
              <p className="mt-2 text-xs text-brand-muted">
                Members auto-show as “Participant” once they register for an event.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-brand-muted">
              No login yet — this person hasn&apos;t created an account. They become a Member (and a
              Participant once they register) when they sign up with {p.email}.
            </p>
          )}
        </div>

        )}

        {/* Entitlements */}
        <div className={card}>
          <h2 className={h2}>Entitlements</h2>
          <ul className="mt-3 space-y-2">
            {(entitlements ?? []).map((e) => {
              const ev = e.events as { code?: string; title?: string } | null;
              const active = !e.revoked_at;
              return (
                <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className={active ? "" : "text-brand-muted line-through"}>
                    {e.type === "all_access" ? "All-access" : ev?.title ?? ev?.code ?? "event"}{" "}
                    <span className="text-xs text-brand-muted">({e.source})</span>
                  </span>
                  {active ? (
                    isSuper ? (
                      <form action={revokeEntitlement}>
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="participant_id" value={id} />
                        <button className="rounded px-2 py-1 text-xs text-brand-red hover:bg-red-50">Revoke</button>
                      </form>
                    ) : null
                  ) : (
                    <span className="text-xs text-brand-muted">revoked</span>
                  )}
                </li>
              );
            })}
            {(entitlements ?? []).length === 0 && <li className="text-sm text-brand-muted">None yet.</li>}
          </ul>

          {isSuper && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-brand-dark">Grant access</p>
              <form action={grantEntitlement} className="mt-2 flex flex-wrap items-center gap-2">
                <input type="hidden" name="participant_id" value={id} />
                <select name="event_id" className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                  {(events ?? []).map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
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
          )}
        </div>

        {/* Registrations — events registered + date, and accepted tickets */}
        <div className={card}>
          <h2 className={h2}>Registrations</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(registrations ?? []).map((r) => {
              const ev = r.events as { code?: string; title?: string } | null;
              return (
                <li key={r.id} className="flex items-start justify-between gap-2">
                  <span>{ev?.title ?? ev?.code ?? "event"}</span>
                  <span className="whitespace-nowrap text-xs text-brand-muted">Registered {fmtDate(r.created_at)}</span>
                </li>
              );
            })}
            {(heldTickets ?? []).map((t) => {
              const ev = t.events as { code?: string; title?: string } | null;
              return (
                <li key={t.id} className="flex items-start justify-between gap-2">
                  <span>
                    {ev?.title ?? ev?.code ?? "event"}{" "}
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-800">{t.code}</span>
                  </span>
                  <span className="whitespace-nowrap text-xs text-brand-muted">Accepted {fmtDate(t.accepted_at)}</span>
                </li>
              );
            })}
            {(registrations ?? []).length === 0 && (heldTickets ?? []).length === 0 && (
              <li className="text-brand-muted">None.</li>
            )}
          </ul>
        </div>

        {/* Orders — list + date purchased */}
        <div className={card}>
          <h2 className={h2}>Orders</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(orders ?? []).map((o) => {
              const ev = o.events as { code?: string; title?: string } | null;
              return (
                <li key={o.id} className="flex items-start justify-between gap-2">
                  <span>
                    {ev?.title ?? ev?.code ?? "—"} ×{o.quantity}
                    <span className="block text-xs text-brand-muted">Purchased {fmtDate(o.created_at)}</span>
                  </span>
                  <span className="whitespace-nowrap text-brand-muted">₱{centavosToPesos(o.amount_centavos)} · {o.status}</span>
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

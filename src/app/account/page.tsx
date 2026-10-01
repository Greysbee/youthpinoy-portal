import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { createAdminClient } from "@/lib/supabase-admin";
import { getAccessibleEventIds } from "@/lib/access";
import ProfileForm from "@/components/account/profile-form";
import GroupManager, { type OwnedGroupView } from "@/components/account/group-manager";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const viewer = await getViewer();
  if (!viewer?.participantId) redirect("/login?next=/account");
  const admin = createAdminClient();
  const pid = viewer.participantId;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const [{ data: participant }, { data: entitlements }, { data: registrations }, { data: ownedGroups }, { data: memberships }] =
    await Promise.all([
      admin.from("participants").select("*").eq("id", pid).single(),
      admin
        .from("entitlements")
        .select("type, source, events(code, title)")
        .eq("participant_id", pid)
        .is("revoked_at", null),
      admin.from("registrations").select("status, events(code, title)").eq("participant_id", pid),
      admin.from("groups").select("id, name, seats_total, events(code)").eq("owner_participant_id", pid),
      admin
        .from("group_members")
        .select("status, groups(name, owner_participant_id, events(code))")
        .eq("participant_id", pid)
        .neq("status", "removed"),
    ]);

  // Members + tickets for owned groups.
  const ownedIds = (ownedGroups ?? []).map((g) => g.id);
  const [{ data: members }, { data: ownedTickets }] = ownedIds.length
    ? await Promise.all([
        admin
          .from("group_members")
          .select("id, group_id, email, status, invite_token")
          .in("group_id", ownedIds)
          .neq("status", "removed"),
        admin
          .from("tickets")
          .select("id, group_id, code, status, assigned_email, assigned_participant_id, invite_token, seq")
          .in("group_id", ownedIds)
          .order("seq"),
      ])
    : [
        { data: [] as { id: string; group_id: string; email: string; status: string; invite_token: string }[] },
        { data: [] as { id: string; group_id: string; code: string; status: string; assigned_email: string | null; assigned_participant_id: string | null; invite_token: string | null; seq: number }[] },
      ];

  // Which assigned emails have actually created an account (profile) yet?
  const assignedEmails = [...new Set((ownedTickets ?? []).map((t) => t.assigned_email).filter(Boolean) as string[])];
  const accountEmails = new Set<string>();
  if (assignedEmails.length) {
    const { data: parts } = await admin.from("participants").select("id, email").in("email", assignedEmails);
    const pidByEmail = new Map((parts ?? []).map((p) => [p.id as string, p.email as string]));
    const partIds = (parts ?? []).map((p) => p.id as string);
    if (partIds.length) {
      const { data: profs } = await admin.from("profiles").select("participant_id").in("participant_id", partIds);
      for (const pr of profs ?? []) {
        const em = pr.participant_id ? pidByEmail.get(pr.participant_id as string) : null;
        if (em) accountEmails.add(em);
      }
    }
  }

  const ownedViews: OwnedGroupView[] = (ownedGroups ?? []).map((g) => {
    const ev = g.events as { code?: string } | null;
    return {
      id: g.id,
      name: g.name,
      eventCode: ev?.code ?? "—",
      seatsTotal: g.seats_total,
      members: (members ?? [])
        .filter((m) => m.group_id === g.id)
        .map((m) => ({
          id: m.id,
          email: m.email,
          status: m.status,
          inviteUrl: `${site}/invite/${m.invite_token}`,
        })),
      tickets: (ownedTickets ?? [])
        .filter((t) => t.group_id === g.id)
        .map((t) => ({
          id: t.id,
          code: t.code,
          status: t.status,
          assignedEmail: t.assigned_email,
          accepted: t.status === "accepted",
          hasAccount: t.assigned_email ? accountEmails.has(t.assigned_email) : false,
          inviteUrl: t.invite_token ? `${site}/ticket/${t.invite_token}` : null,
        })),
    };
  });

  // Tickets this participant holds (accepted) — shown under My events.
  const { data: myTickets } = await admin
    .from("tickets")
    .select("code, status, events(code, title)")
    .eq("assigned_participant_id", pid)
    .eq("status", "accepted")
    .order("seq");

  // Owner names for memberships.
  const ownerIds = [
    ...new Set(
      (memberships ?? [])
        .map((m) => (m.groups as { owner_participant_id?: string } | null)?.owner_participant_id)
        .filter(Boolean) as string[]
    ),
  ];
  const { data: owners } = ownerIds.length
    ? await admin.from("participants").select("id, full_name, email").in("id", ownerIds)
    : { data: [] as { id: string; full_name: string | null; email: string }[] };
  const ownerById = new Map((owners ?? []).map((o) => [o.id, o]));

  // "My access": everything watchable (direct + includes + all-access).
  const accessible = await getAccessibleEventIds(pid);
  const { data: accessibleEvents } = accessible.size
    ? await admin.from("events").select("code").in("id", [...accessible]).order("code")
    : { data: [] as { code: string }[] };

  const card = "rounded-xl border border-gray-200 bg-white p-5";
  const h2 = "text-lg font-bold text-brand-dark";

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <h1 className="text-2xl font-bold text-brand-dark">My Account</h1>

          <div className="mt-6 grid grid-cols-1 gap-6">
            <section className={card}>
              <h2 className={h2}>Profile</h2>
              <div className="mt-4">
                <ProfileForm
                  email={participant?.email ?? viewer.email ?? ""}
                  title={participant?.title ?? ""}
                  firstName={participant?.first_name ?? ""}
                  middleName={participant?.middle_name ?? ""}
                  lastName={participant?.last_name ?? ""}
                  mobile={participant?.mobile ?? ""}
                  country={participant?.country ?? "PH"}
                  diocese={participant?.diocese ?? ""}
                  organization={participant?.organization ?? ""}
                />
              </div>
            </section>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <section className={card}>
                <h2 className={h2}>My access</h2>
                <p className="mt-1 text-xs text-brand-muted">Events whose videos you can watch.</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(accessibleEvents ?? []).map((e) => (
                    <span key={e.code} className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      {e.code}
                    </span>
                  ))}
                  {(accessibleEvents ?? []).length === 0 && <span className="text-sm text-brand-muted">No access yet.</span>}
                </div>
                <ul className="mt-4 space-y-1 text-sm">
                  {(entitlements ?? []).map((e, i) => {
                    const ev = e.events as { code?: string } | null;
                    return (
                      <li key={i} className="text-brand-muted">
                        {e.type === "all_access" ? "All-access pass" : ev?.code} <span className="text-xs">· {e.source}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className={card}>
                <h2 className={h2}>My events</h2>
                <ul className="mt-3 space-y-1 text-sm">
                  {(myTickets ?? []).map((t, i) => {
                    const ev = t.events as { code?: string; title?: string } | null;
                    return (
                      <li key={`t${i}`}>
                        {ev?.title || ev?.code}{" "}
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          {t.code}
                        </span>
                      </li>
                    );
                  })}
                  {(registrations ?? []).map((r, i) => {
                    const ev = r.events as { code?: string; title?: string } | null;
                    return (
                      <li key={`r${i}`}>
                        {ev?.code} <span className="text-brand-muted">· {r.status}</span>
                      </li>
                    );
                  })}
                  {(myTickets ?? []).length === 0 && (registrations ?? []).length === 0 && (
                    <li className="text-brand-muted">No events yet.</li>
                  )}
                </ul>

                {(memberships ?? []).length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-brand-dark">Member of</p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {(memberships ?? []).map((m, i) => {
                        const g = m.groups as { name?: string; owner_participant_id?: string; events?: { code?: string } } | null;
                        const owner = g?.owner_participant_id ? ownerById.get(g.owner_participant_id) : null;
                        return (
                          <li key={i} className="text-brand-muted">
                            {g?.name} ({g?.events?.code}) — managed by {owner?.full_name || owner?.email || "organizer"}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </section>
            </div>

            <section className={card}>
              <h2 className={h2}>My groups</h2>
              <p className="mt-1 text-xs text-brand-muted">Assign the tickets you bought. Only you can assign or transfer them.</p>
              <div className="mt-4">
                <GroupManager groups={ownedViews} />
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

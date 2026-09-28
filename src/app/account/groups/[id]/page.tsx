import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { createAdminClient } from "@/lib/supabase-admin";
import GroupManager, { type OwnedGroupView } from "@/components/account/group-manager";

export const dynamic = "force-dynamic";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer?.participantId) redirect(`/login?next=/account/groups/${id}`);

  const admin = createAdminClient();
  const { data: group } = await admin
    .from("groups")
    .select("id, name, seats_total, owner_participant_id, events(code)")
    .eq("id", id)
    .single();
  if (!group) notFound();
  if (group.owner_participant_id !== viewer.participantId && viewer.role !== "admin") redirect("/account");

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data: members } = await admin
    .from("group_members")
    .select("id, email, status, invite_token")
    .eq("group_id", id)
    .neq("status", "removed");

  const ev = group.events as { code?: string } | null;
  const view: OwnedGroupView = {
    id: group.id,
    name: group.name,
    eventCode: ev?.code ?? "—",
    seatsTotal: group.seats_total,
    members: (members ?? []).map((m) => ({
      id: m.id,
      email: m.email,
      status: m.status,
      inviteUrl: `${site}/invite/${m.invite_token}`,
    })),
  };

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <Link href="/account" className="text-sm text-brand-muted hover:text-brand-dark">← My account</Link>
          <h1 className="mt-2 text-2xl font-bold text-brand-dark">Manage group</h1>
          <p className="mt-1 text-brand-muted">Invite people to the seats you bought — each gets their own login.</p>
          <div className="mt-6">
            <GroupManager groups={[view]} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Link from "next/link";
import { getViewer } from "@/lib/viewer";
import { createAdminClient } from "@/lib/supabase-admin";
import { normalizeEmail } from "@/lib/admin";
import AcceptInviteButton from "@/components/account/accept-invite-button";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: member } = await admin
    .from("group_members")
    .select("id, email, status, groups(name, owner_participant_id, events(code, title))")
    .eq("invite_token", token)
    .maybeSingle();

  const grp = member?.groups as
    | { name?: string; owner_participant_id?: string; events?: { code?: string; title?: string } }
    | null;

  let ownerName = "the organizer";
  if (grp?.owner_participant_id) {
    const { data: owner } = await admin
      .from("participants")
      .select("full_name, email")
      .eq("id", grp.owner_participant_id)
      .single();
    ownerName = owner?.full_name || owner?.email || ownerName;
  }

  const viewer = await getViewer();
  const emailMatches = viewer?.email && member && normalizeEmail(viewer.email) === member.email;

  const shell = (children: React.ReactNode) => (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center">{children}</div>
      </main>
      <Footer />
    </>
  );

  if (!member) {
    return shell(
      <>
        <h1 className="text-xl font-bold text-brand-dark">Invitation not found</h1>
        <p className="mt-2 text-brand-muted">This invite link is invalid.</p>
        <Link href="/" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">Go home</Link>
      </>
    );
  }

  if (member.status === "removed") {
    return shell(
      <>
        <h1 className="text-xl font-bold text-brand-dark">Invitation no longer active</h1>
        <p className="mt-2 text-brand-muted">This seat has been removed. Ask {ownerName} to invite you again.</p>
      </>
    );
  }

  if (member.status === "joined") {
    return shell(
      <>
        <h1 className="text-xl font-bold text-brand-dark">You&apos;re in!</h1>
        <p className="mt-2 text-brand-muted">
          You&apos;ve joined {grp?.name} for {grp?.events?.code}.
        </p>
        <Link href="/library" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">Go to Library</Link>
      </>
    );
  }

  // status === "invited"
  const header = (
    <>
      <h1 className="text-xl font-bold text-brand-dark">You&apos;re invited to {grp?.events?.code}</h1>
      <p className="mt-2 text-brand-muted">
        {ownerName} added <strong>{member.email}</strong> to the group &quot;{grp?.name}&quot;.
      </p>
    </>
  );

  if (!viewer) {
    return shell(
      <>
        {header}
        <p className="mt-4 text-sm text-brand-dark">
          Set up your own account (or log in) with <strong>{member.email}</strong> to claim your access.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href={`/register?next=/invite/${token}&email=${encodeURIComponent(member.email)}`}
            className="min-h-11 rounded-lg bg-brand-gold px-6 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400 inline-flex items-center justify-center"
          >
            Sign up
          </Link>
          <Link
            href={`/login?next=/invite/${token}&email=${encodeURIComponent(member.email)}`}
            className="min-h-11 rounded-lg border border-brand-blue px-6 py-2.5 text-sm font-semibold text-brand-blue hover:bg-brand-blue/5 inline-flex items-center justify-center"
          >
            I already have an account
          </Link>
        </div>
      </>
    );
  }

  if (!emailMatches) {
    return shell(
      <>
        {header}
        <p className="mt-4 text-sm text-brand-red">
          You&apos;re logged in as {viewer.email}. This invite is for {member.email}. Log out and sign in with that
          email to accept.
        </p>
        <Link href="/library" className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-semibold text-brand-dark hover:bg-gray-50">Back to Library</Link>
      </>
    );
  }

  return shell(
    <>
      {header}
      <AcceptInviteButton token={token} />
    </>
  );
}

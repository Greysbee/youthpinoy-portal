import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Link from "next/link";
import { getViewer } from "@/lib/viewer";
import { createAdminClient } from "@/lib/supabase-admin";
import { normalizeEmail } from "@/lib/admin";
import AcceptTicketButton from "@/components/account/accept-ticket-button";

export const dynamic = "force-dynamic";

export default async function TicketAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: ticket } = await admin
    .from("tickets")
    .select("id, code, status, assigned_email, purchaser_participant_id, ticket_type_id, events(code, title)")
    .eq("invite_token", token)
    .maybeSingle();

  const ev = ticket?.events as { code?: string; title?: string } | null;
  const { data: tt } = ticket?.ticket_type_id
    ? await admin.from("ticket_types").select("name").eq("id", ticket.ticket_type_id).single()
    : { data: null };

  let buyerName = "the purchaser";
  if (ticket?.purchaser_participant_id) {
    const { data: buyer } = await admin
      .from("participants")
      .select("full_name, email")
      .eq("id", ticket.purchaser_participant_id)
      .single();
    buyerName = buyer?.full_name || buyer?.email || buyerName;
  }

  const viewer = await getViewer();
  const emailMatches = viewer?.email && ticket && normalizeEmail(viewer.email) === ticket.assigned_email;

  const shell = (children: React.ReactNode) => (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center">{children}</div>
      </main>
      <Footer />
    </>
  );

  if (!ticket || !ticket.assigned_email) {
    return shell(
      <>
        <h1 className="text-xl font-bold text-brand-dark">Ticket not found</h1>
        <p className="mt-2 text-brand-muted">This ticket link is invalid or hasn&apos;t been assigned.</p>
        <Link href="/" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">Go home</Link>
      </>
    );
  }

  const ticketBadge = (
    <span className="mt-3 inline-block rounded-lg border border-brand-gold bg-amber-50 px-4 py-2 font-mono text-lg font-bold tracking-wider text-amber-800">
      {ticket.code}
    </span>
  );

  if (ticket.status === "accepted" && emailMatches) {
    return shell(
      <>
        <h1 className="text-xl font-bold text-brand-dark">You&apos;re all set!</h1>
        <p className="mt-2 text-brand-muted">You&apos;ve accepted your {ev?.code} ticket.</p>
        {ticketBadge}
        <Link href="/library" className="mt-4 block min-h-11 rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">Go to Library</Link>
      </>
    );
  }

  const header = (
    <>
      <h1 className="text-xl font-bold text-brand-dark">You&apos;ve received a ticket to {ev?.code}</h1>
      <p className="mt-2 text-brand-muted">
        {buyerName} assigned you a <strong>{(tt as { name?: string } | null)?.name ?? "ticket"}</strong> ticket for{" "}
        {ev?.title ?? "the event"}.
      </p>
      {ticketBadge}
    </>
  );

  if (!viewer) {
    return shell(
      <>
        {header}
        <p className="mt-4 text-sm text-brand-dark">
          Create your profile (or log in) with <strong>{ticket.assigned_email}</strong>, then accept your ticket.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href={`/register?next=/ticket/${token}&email=${encodeURIComponent(ticket.assigned_email)}`}
            className="min-h-11 rounded-lg bg-brand-gold px-6 py-2.5 text-sm font-bold text-brand-dark hover:bg-amber-400 inline-flex items-center justify-center"
          >
            Create my profile
          </Link>
          <Link
            href={`/login?next=/ticket/${token}&email=${encodeURIComponent(ticket.assigned_email)}`}
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
          You&apos;re logged in as {viewer.email}. This ticket is for {ticket.assigned_email}. Log out and sign in with
          that email to accept.
        </p>
        <Link href="/library" className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-semibold text-brand-dark hover:bg-gray-50">Back to Library</Link>
      </>
    );
  }

  return shell(
    <>
      {header}
      <AcceptTicketButton token={token} />
    </>
  );
}

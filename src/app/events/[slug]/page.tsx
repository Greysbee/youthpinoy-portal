import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentParticipantId } from "@/lib/access";
import { centavosToPesos } from "@/lib/admin";
import RegistrationForm from "@/components/registration-form";
import TicketPurchase, { type TicketTypeView, type BuyerDefaults } from "@/components/ticket-purchase";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ registered?: string }>;
}) {
  const { slug } = await params;
  const { registered } = await searchParams;

  const supabase = await createServerSupabaseClient();
  // Resolve by slug OR event code (so /events/CSMSv16 and /events/csms-v16 both work).
  const key = slug.replace(/[(),]/g, "");
  const { data: event } = await supabase
    .from("events")
    .select("id, code, title, slug, description, price_centavos, capacity, start_at, end_at, is_online, venue, registration_fields, cover_image_url, status")
    .eq("status", "published")
    .or(`slug.eq.${key},code.eq.${key}`)
    .maybeSingle();
  if (!event) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Ticket types (if any) replace the single-price registration flow.
  const { data: ticketTypesRaw } = await supabase
    .from("ticket_types")
    .select("id, name, code, price_centavos, capacity, sort_order, ticket_type_includes(included_event_id)")
    .eq("event_id", event.id)
    .order("sort_order");
  const tts = ticketTypesRaw ?? [];
  const incIds = [
    ...new Set(
      tts.flatMap((t) => ((t.ticket_type_includes as { included_event_id: string }[]) ?? []).map((i) => i.included_event_id))
    ),
  ];
  const { data: incEvents } = incIds.length
    ? await supabase.from("events").select("id, code").in("id", incIds)
    : { data: [] as { id: string; code: string }[] };
  const codeById = new Map((incEvents ?? []).map((e) => [e.id, e.code]));
  const ticketTypeViews: TicketTypeView[] = tts.map((t) => ({
    id: t.id as string,
    name: t.name as string,
    code: t.code as string,
    priceCentavos: (t.price_centavos as number) ?? 0,
    capacity: (t.capacity as number) ?? null,
    includes: ((t.ticket_type_includes as { included_event_id: string }[]) ?? [])
      .map((i) => codeById.get(i.included_event_id))
      .filter((c): c is string => !!c),
  }));
  const hasTickets = ticketTypeViews.length > 0;
  const minTicketPrice = hasTickets ? Math.min(...ticketTypeViews.map((t) => t.priceCentavos)) : 0;

  const participantId = await getCurrentParticipantId();

  // Prefill the buyer's details on the ticket form (editable, saved on purchase).
  let buyerDefaults: BuyerDefaults = { title: "", firstName: "", lastName: "", mobile: "" };
  if (hasTickets && participantId) {
    const { data: me } = await createAdminClient()
      .from("participants")
      .select("title, first_name, last_name, mobile")
      .eq("id", participantId)
      .single();
    if (me) {
      buyerDefaults = {
        title: me.title ?? "",
        firstName: me.first_name ?? "",
        lastName: me.last_name ?? "",
        mobile: me.mobile ?? "",
      };
    }
  }

  let alreadyRegistered = false;
  if (participantId) {
    const { data: reg } = await supabase
      .from("registrations")
      .select("id")
      .eq("participant_id", participantId)
      .eq("event_id", event.id)
      .maybeSingle();
    alreadyRegistered = !!reg;
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="bg-brand-blue py-10 text-white sm:py-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <Link href="/events" className="text-sm text-white/70 hover:text-white">← All events</Link>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold">{event.code}</span>
              <span className="text-brand-gold font-bold">
                {hasTickets
                  ? minTicketPrice === 0
                    ? "Tickets available"
                    : `From ₱${centavosToPesos(minTicketPrice)}`
                  : event.price_centavos === 0
                    ? "Free"
                    : `₱${centavosToPesos(event.price_centavos)}`}
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{event.title}</h1>
            {event.description && <p className="mt-3 max-w-2xl text-white/80">{event.description}</p>}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          {registered && (
            <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              You&apos;re registered! This event&apos;s videos are now unlocked in your Library.
            </div>
          )}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
            <div>
              <h2 className="text-lg font-bold text-brand-dark">Details</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="w-24 text-brand-muted">Format</dt>
                  <dd>{event.is_online ? "Online" : `In person${event.venue ? ` · ${event.venue}` : ""}`}</dd>
                </div>
                {event.start_at && (
                  <div className="flex gap-2">
                    <dt className="w-24 text-brand-muted">Date</dt>
                    <dd>{new Date(event.start_at).toLocaleDateString()}</dd>
                  </div>
                )}
                {event.capacity != null && (
                  <div className="flex gap-2">
                    <dt className="w-24 text-brand-muted">Capacity</dt>
                    <dd>{event.capacity}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div>
              <h2 className="text-lg font-bold text-brand-dark">{hasTickets ? "Get tickets" : "Register"}</h2>
              <div className="mt-3">
                {hasTickets ? (
                  <TicketPurchase
                    event={{
                      id: event.id,
                      slug: event.slug,
                      registration_fields: event.registration_fields ?? [],
                    }}
                    ticketTypes={ticketTypeViews}
                    isLoggedIn={!!user}
                    buyer={buyerDefaults}
                  />
                ) : (
                  <RegistrationForm
                    event={{
                      id: event.id,
                      slug: event.slug,
                      price_centavos: event.price_centavos,
                      registration_fields: event.registration_fields ?? [],
                      capacity: event.capacity,
                    }}
                    isLoggedIn={!!user}
                    alreadyRegistered={alreadyRegistered}
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

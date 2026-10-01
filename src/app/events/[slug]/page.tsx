import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentParticipantId } from "@/lib/access";
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
    .select("id, code, title, slug, description, price_centavos, capacity, start_at, end_at, is_online, venue, venue_type, registration_fields, cover_image_url, status")
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

  const formatLabel =
    event.venue_type === "onsite"
      ? `On-site${event.venue ? ` · ${event.venue}` : ""}`
      : event.venue_type === "hybrid"
        ? `Hybrid${event.venue ? ` · ${event.venue}` : ""}`
        : "Online";

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="bg-brand-blue py-10 text-white sm:py-14">
          <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center">
            {event.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.cover_image_url}
                alt={event.title}
                className="h-44 w-full shrink-0 rounded-xl object-cover md:h-40 md:w-64"
              />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold">{event.code}</span>
                <span className="text-sm font-semibold text-brand-gold">{formatLabel}</span>
              </div>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{event.title}</h1>
              {event.description && <p className="mt-3 max-w-2xl text-white/80">{event.description}</p>}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          {registered && (
            <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              You&apos;re registered! This event&apos;s videos are now unlocked in your Library.
            </div>
          )}
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
            <div className="max-w-md">
              <h2 className="text-lg font-bold text-brand-dark">Register</h2>
              <div className="mt-3">
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
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

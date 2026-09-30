import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentParticipantId } from "@/lib/access";
import { centavosToPesos } from "@/lib/admin";
import RegistrationForm from "@/components/registration-form";

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

  const participantId = await getCurrentParticipantId();
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
                {event.price_centavos === 0 ? "Free" : `₱${centavosToPesos(event.price_centavos)}`}
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
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { centavosToPesos } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, code, title, slug, description, price_centavos, start_at, is_online, venue")
    .eq("status", "published")
    .order("start_at", { ascending: false });

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="bg-brand-blue py-10 text-white sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              CSMS <span className="text-brand-gold">Events</span>
            </h1>
            <p className="mt-2 max-w-2xl text-white/80">
              Register for a Catholic Social Media Summit. Your registration unlocks
              that event&apos;s videos in the library.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          {(events ?? []).length === 0 ? (
            <p className="text-brand-muted">No published events yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(events ?? []).map((e) => (
                <Link
                  key={e.id}
                  href={`/events/${e.slug}`}
                  className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-brand-blue">{e.code}</span>
                    <span className="text-sm font-bold text-brand-dark">
                      {e.price_centavos === 0 ? "Free" : `₱${centavosToPesos(e.price_centavos)}`}
                    </span>
                  </div>
                  <h2 className="mt-1 font-semibold text-brand-dark group-hover:text-brand-blue">
                    {e.title}
                  </h2>
                  {e.description && (
                    <p className="mt-1 text-sm text-brand-muted line-clamp-2">{e.description}</p>
                  )}
                  <p className="mt-3 text-xs text-brand-muted">
                    {e.is_online ? "Online" : e.venue || "In person"}
                    {e.start_at ? ` · ${new Date(e.start_at).toLocaleDateString()}` : ""}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

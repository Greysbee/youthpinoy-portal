import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentParticipantId, getAccessibleEventIds } from "@/lib/access";
import LibraryBrowser, { type LibraryItem } from "@/components/library-browser";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/library");

  const participantId = await getCurrentParticipantId();
  const accessible = await getAccessibleEventIds(participantId);

  // RLS returns only published rows; provider_ref is not selectable by this client.
  const { data: events } = await supabase
    .from("events")
    .select("id, code, title, slug, start_at, status, price_centavos, type")
    .eq("status", "published");

  const { data: videos } = await supabase
    .from("videos")
    .select(
      "id, event_id, title, description, thumbnail_url, duration_seconds, sort_order, status"
    )
    .eq("status", "published")
    .order("sort_order");

  const eventsById = new Map((events ?? []).map((e) => [e.id, e]));

  const items: LibraryItem[] = (videos ?? []).map((v) => {
    const ev = v.event_id ? eventsById.get(v.event_id) : null;
    // Access is by enrollment. Unlocked = enrolled; Free = free event you can enroll
    // in for ₱0; Locked = paid event you haven't bought.
    const unlocked = ev ? accessible.has(ev.id) : false;
    const badge = unlocked ? "Unlocked" : ev && ev.price_centavos === 0 ? "Free" : "Locked";
    return {
      id: v.id,
      title: v.title,
      description: v.description,
      thumbnailUrl: v.thumbnail_url,
      durationSeconds: v.duration_seconds,
      sortOrder: v.sort_order,
      eventCode: ev?.code ?? "Unassigned",
      eventTitle: ev?.title ?? "Unassigned",
      eventStartAt: ev?.start_at ?? null,
      eventType: (ev?.type as "course" | "event") ?? "event",
      badge,
    };
  });

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="bg-brand-blue py-10 text-white sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Virtual <span className="text-brand-gold">Library</span>
            </h1>
            <p className="mt-2 max-w-2xl text-white/80">
              Your courses and event recordings. Enroll (free or paid) to unlock a
              session, then watch anytime.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          <LibraryBrowser items={items} />
        </section>
      </main>
      <Footer />
    </>
  );
}

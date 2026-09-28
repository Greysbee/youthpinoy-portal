import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentParticipantId, getPlaybackUrl } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/watch/${id}`);

  // Metadata only — this client cannot read provider_ref (column-level grant).
  const { data: video } = await supabase
    .from("videos")
    .select("id, title, description, thumbnail_url, is_free, event_id, status")
    .eq("id", id)
    .eq("status", "published")
    .single();
  if (!video) notFound();

  let eventCode: string | null = null;
  let eventTitle: string | null = null;
  if (video.event_id) {
    const { data: ev } = await supabase
      .from("events")
      .select("code, title, slug")
      .eq("id", video.event_id)
      .single();
    eventCode = ev?.code ?? null;
    eventTitle = ev?.title ?? null;
  }

  const participantId = await getCurrentParticipantId();
  // Server-side gate: null unless the participant may watch. The playable URL is
  // never computed or sent to the browser for a locked video.
  const playbackUrl = await getPlaybackUrl(id, participantId);

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <Link
            href="/library"
            className="inline-flex items-center gap-1 text-sm text-brand-muted hover:text-brand-dark"
          >
            ← Back to Library
          </Link>

          {playbackUrl ? (
            <div className="mt-4 aspect-video overflow-hidden rounded-xl bg-black">
              <iframe
                src={playbackUrl}
                className="h-full w-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="relative flex aspect-video items-center justify-center bg-gray-900">
                {video.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="absolute inset-0 h-full w-full object-cover opacity-40"
                  />
                )}
                <div className="relative text-center text-white">
                  <svg
                    className="mx-auto h-10 w-10 text-white/80"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="mt-2 font-semibold">This session is locked</p>
                  <p className="text-sm text-white/70">
                    {eventCode
                      ? `Included with ${eventCode} access`
                      : "Access required"}
                  </p>
                </div>
              </div>
              <div className="p-4 text-center">
                <Link
                  href="/library"
                  className="inline-flex min-h-11 items-center rounded-lg bg-brand-gold px-6 py-2.5 text-sm font-bold text-brand-dark transition-colors hover:bg-amber-400"
                >
                  Get access
                </Link>
              </div>
            </div>
          )}

          <div className="mt-5">
            {eventCode && (
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
                {eventCode}
                {eventTitle ? ` · ${eventTitle}` : ""}
              </span>
            )}
            <h1 className="mt-1 text-2xl font-bold text-brand-dark">{video.title}</h1>
            {video.description && (
              <p className="mt-2 text-brand-muted">{video.description}</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

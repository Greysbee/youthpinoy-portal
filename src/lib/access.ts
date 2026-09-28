import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// ---------------------------------------------------------------------------
// Single source of truth for access decisions. Pages must call THIS module and
// never re-implement gating inline. Access is keyed to the PARTICIPANT (by the
// linked profile), never directly to the auth user.
// ---------------------------------------------------------------------------

// The current auth user's participant id, or null if not logged in / not linked.
export async function getCurrentParticipantId(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("participant_id")
    .eq("id", user.id)
    .single();
  return data?.participant_id ?? null;
}

// Set of event ids this participant can access: direct entitlements + transitive
// event_includes closure, or every event if they hold an all_access entitlement.
export async function getAccessibleEventIds(
  participantId: string | null
): Promise<Set<string>> {
  if (!participantId) return new Set();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("accessible_event_ids", {
    p_participant: participantId,
  });
  if (error || !data) return new Set();
  // A set-returning scalar function can come back as string[] or [{...}] depending
  // on the PostgREST version — handle both defensively.
  const ids = (data as unknown[]).map((row) =>
    typeof row === "string"
      ? row
      : (Object.values(row as Record<string, unknown>)[0] as string)
  );
  return new Set(ids);
}

// Server-side gate. video.is_free OR video.event_id in accessible_event_ids.
export async function canWatch(
  participantId: string | null,
  videoId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("can_watch", {
    p_participant: participantId,
    p_video: videoId,
  });
  if (error) return false;
  return data === true;
}

// The ONE place that turns a video into a playable URL. Returns null unless the
// participant may watch. Structured so we can later swap to Bunny signed/token
// URLs without touching any page.
export async function getPlaybackUrl(
  videoId: string,
  participantId: string | null
): Promise<string | null> {
  const allowed = await canWatch(participantId, videoId);
  if (!allowed) return null;

  const admin = createAdminClient();
  const { data: v } = await admin
    .from("videos")
    .select("provider, provider_ref")
    .eq("id", videoId)
    .single();
  if (!v) return null;
  return buildEmbedUrl(v.provider as string, v.provider_ref as string);
}

function buildEmbedUrl(provider: string, ref: string): string | null {
  switch (provider) {
    case "vimeo":
      return `https://player.vimeo.com/video/${ref}?title=0&byline=0&portrait=0`;
    case "youtube":
      return `https://www.youtube.com/embed/${ref}`;
    case "bunny":
      // TODO(M-later): replace with a signed Bunny Stream token URL.
      return ref;
    case "url":
      return ref;
    default:
      return null;
  }
}

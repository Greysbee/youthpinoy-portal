"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveVideo, type VideoFormState } from "@/app/admin/videos/actions";

export type VideoInput = {
  id?: string;
  title?: string;
  event_id?: string | null;
  provider?: string;
  provider_ref?: string;
  thumbnail_url?: string | null;
  is_free?: boolean;
  sort_order?: number;
  status?: string;
  description?: string | null;
  duration_seconds?: number | null;
};

export default function VideoForm({
  video,
  events,
}: {
  video?: VideoInput;
  events: { id: string; code: string; title: string }[];
}) {
  const [state, formAction, pending] = useActionState<VideoFormState, FormData>(
    saveVideo,
    {}
  );

  const input =
    "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent";
  const label = "block text-sm font-medium text-brand-dark";

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {video?.id && <input type="hidden" name="id" value={video.id} />}

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label className={label}>Title *</label>
        <input name="title" required defaultValue={video?.title} className={input} />
      </div>

      <div>
        <label className={label}>Event</label>
        <select name="event_id" defaultValue={video?.event_id ?? ""} className={input}>
          <option value="">— Unassigned —</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.code} · {e.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Provider *</label>
          <select name="provider" defaultValue={video?.provider ?? "vimeo"} className={input}>
            <option value="vimeo">vimeo</option>
            <option value="youtube">youtube</option>
            <option value="bunny">bunny</option>
            <option value="url">url</option>
          </select>
        </div>
        <div>
          <label className={label}>Provider reference *</label>
          <input
            name="provider_ref"
            required
            defaultValue={video?.provider_ref}
            placeholder="video id or URL"
            className={input}
          />
        </div>
      </div>

      <div>
        <label className={label}>Description</label>
        <textarea name="description" rows={2} defaultValue={video?.description ?? ""} className={input} />
      </div>

      <div>
        <label className={label}>Thumbnail URL</label>
        <input name="thumbnail_url" defaultValue={video?.thumbnail_url ?? ""} className={input} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={label}>Sort order</label>
          <input name="sort_order" type="number" defaultValue={video?.sort_order ?? 0} className={input} />
        </div>
        <div>
          <label className={label}>Duration (sec)</label>
          <input name="duration_seconds" type="number" defaultValue={video?.duration_seconds ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Status</label>
          <select name="status" defaultValue={video?.status ?? "draft"} className={input}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-brand-dark">
        <input type="checkbox" name="is_free" defaultChecked={video?.is_free ?? false} />
        Free (open to everyone, no entitlement needed)
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save video"}
        </button>
        <Link href="/admin/videos" className="text-sm text-brand-muted hover:text-brand-dark">
          Cancel
        </Link>
      </div>
    </form>
  );
}

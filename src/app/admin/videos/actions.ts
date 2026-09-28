"use server";

import { requireAdmin, canonicalEventCode } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type VideoFormState = { error?: string };

const PROVIDERS = ["bunny", "vimeo", "youtube", "url"];

export async function saveVideo(
  _prev: VideoFormState,
  formData: FormData
): Promise<VideoFormState> {
  const { admin } = await requireAdmin();

  const id = (formData.get("id") as string) || null;
  const title = ((formData.get("title") as string) || "").trim();
  const provider = ((formData.get("provider") as string) || "").trim().toLowerCase();
  const provider_ref = ((formData.get("provider_ref") as string) || "").trim();
  if (!title || !provider || !provider_ref)
    return { error: "Title, provider and reference are required." };
  if (!PROVIDERS.includes(provider)) return { error: "Invalid provider." };

  const durationRaw = ((formData.get("duration_seconds") as string) || "").trim();
  const row = {
    title,
    provider,
    provider_ref,
    event_id: (formData.get("event_id") as string) || null,
    description: (formData.get("description") as string) || null,
    thumbnail_url: (formData.get("thumbnail_url") as string) || null,
    is_free: formData.get("is_free") === "on",
    sort_order: parseInt((formData.get("sort_order") as string) || "0", 10) || 0,
    status: (formData.get("status") as string) || "draft",
    duration_seconds: durationRaw ? parseInt(durationRaw, 10) : null,
  };

  if (id) {
    const { error } = await admin.from("videos").update(row).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin.from("videos").insert(row);
    if (error) return { error: error.message };
  }
  revalidatePath("/admin/videos");
  redirect("/admin/videos");
}

export async function deleteVideo(formData: FormData): Promise<void> {
  const { admin } = await requireAdmin();
  const id = formData.get("id") as string;
  if (id) {
    await admin.from("videos").delete().eq("id", id);
    revalidatePath("/admin/videos");
  }
}

export async function reorderVideo(formData: FormData): Promise<void> {
  const { admin } = await requireAdmin();
  const id = formData.get("id") as string;
  const dir = formData.get("dir") as string; // "up" | "down"
  const { data: v } = await admin
    .from("videos")
    .select("id, event_id, sort_order")
    .eq("id", id)
    .single();
  if (!v) return;

  const query = v.event_id
    ? admin.from("videos").select("id, sort_order").eq("event_id", v.event_id)
    : admin.from("videos").select("id, sort_order").is("event_id", null);
  const { data: sibs } = await query;
  const sorted = (sibs ?? []).sort((a, b) => a.sort_order - b.sort_order);
  const idx = sorted.findIndex((s) => s.id === id);
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= sorted.length) return;

  const other = sorted[swapIdx];
  await admin.from("videos").update({ sort_order: other.sort_order }).eq("id", v.id);
  await admin.from("videos").update({ sort_order: v.sort_order }).eq("id", other.id);
  revalidatePath("/admin/videos");
}

export type VideoImportReport = {
  inserted: number;
  failed: { row: number; reason: string }[];
};

// Bulk insert from parsed CSV rows. Columns: title, event_code, provider,
// provider_ref, is_free, thumbnail_url, sort_order.
export async function importVideos(
  rows: Record<string, string>[]
): Promise<VideoImportReport> {
  const { admin } = await requireAdmin();
  const { data: events } = await admin.from("events").select("id, code");
  const codeToId = new Map(
    (events ?? []).map((e) => [e.code.toUpperCase(), e.id as string])
  );

  const failed: { row: number; reason: string }[] = [];
  const toInsert: Record<string, unknown>[] = [];

  rows.forEach((r, i) => {
    const line = i + 2; // +1 header, +1 to 1-index
    const title = (r.title || "").trim();
    const provider = (r.provider || "").trim().toLowerCase();
    const provider_ref = (r.provider_ref || "").trim();
    if (!title || !provider_ref) {
      failed.push({ row: line, reason: "missing title or provider_ref" });
      return;
    }
    if (!PROVIDERS.includes(provider)) {
      failed.push({ row: line, reason: `invalid provider "${provider}"` });
      return;
    }
    let event_id: string | null = null;
    const codeRaw = (r.event_code || "").trim();
    if (codeRaw) {
      const canon = (canonicalEventCode(codeRaw) ?? codeRaw).toUpperCase();
      event_id = codeToId.get(canon) ?? null;
      if (!event_id) {
        failed.push({ row: line, reason: `unknown event_code "${codeRaw}"` });
        return;
      }
    }
    toInsert.push({
      title,
      provider,
      provider_ref,
      event_id,
      is_free: /^(1|true|yes|y)$/i.test((r.is_free || "").trim()),
      thumbnail_url: (r.thumbnail_url || "").trim() || null,
      sort_order: parseInt((r.sort_order || "0").trim(), 10) || 0,
      status: "published",
    });
  });

  let inserted = 0;
  if (toInsert.length) {
    const { data, error } = await admin.from("videos").insert(toInsert).select("id");
    if (error) return { inserted: 0, failed: [...failed, { row: 0, reason: error.message }] };
    inserted = data?.length ?? toInsert.length;
  }
  revalidatePath("/admin/videos");
  return { inserted, failed };
}

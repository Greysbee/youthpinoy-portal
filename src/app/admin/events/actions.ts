"use server";

import { requireAdmin, pesosToCentavos, slugify } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type EventFormState = { error?: string };

function parseRegistrationFields(raw: string): unknown[] | null {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveEvent(
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const { admin } = await requireAdmin();

  const id = (formData.get("id") as string) || null;
  const code = ((formData.get("code") as string) || "").trim();
  const title = ((formData.get("title") as string) || "").trim();
  let slug = ((formData.get("slug") as string) || "").trim();
  if (!code || !title) return { error: "Code and title are required." };
  if (!slug) slug = slugify(title);

  const regFields = parseRegistrationFields(
    (formData.get("registration_fields") as string) || ""
  );
  if (regFields === null)
    return { error: "Registration fields are not valid — use the builder below." };

  const capacityRaw = ((formData.get("capacity") as string) || "").trim();

  const row = {
    code,
    title,
    slug,
    description: (formData.get("description") as string) || null,
    status: (formData.get("status") as string) || "draft",
    price_centavos: pesosToCentavos((formData.get("price") as string) || "0"),
    capacity: capacityRaw ? parseInt(capacityRaw, 10) : null,
    venue: (formData.get("venue") as string) || null,
    is_online: formData.get("is_online") === "on",
    start_at: ((formData.get("start_at") as string) || "").trim() || null,
    end_at: ((formData.get("end_at") as string) || "").trim() || null,
    cover_image_url: (formData.get("cover_image_url") as string) || null,
    registration_fields: regFields,
  };

  let eventId = id;
  if (id) {
    const { error } = await admin.from("events").update(row).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await admin
      .from("events")
      .insert(row)
      .select("id")
      .single();
    if (error) return { error: error.message };
    eventId = data.id as string;
  }

  // Rewrite the "includes access to" set.
  await admin.from("event_includes").delete().eq("event_id", eventId);
  const includes = (formData.getAll("includes") as string[]).filter(
    (x) => x && x !== eventId
  );
  if (includes.length) {
    const { error } = await admin
      .from("event_includes")
      .insert(includes.map((inc) => ({ event_id: eventId, included_event_id: inc })));
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export async function deleteEvent(formData: FormData): Promise<void> {
  const { admin } = await requireAdmin();
  const id = formData.get("id") as string;
  if (id) {
    await admin.from("events").delete().eq("id", id);
    revalidatePath("/admin/events");
  }
}

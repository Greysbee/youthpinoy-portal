"use server";

import { requireAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";

export async function grantEntitlement(formData: FormData): Promise<void> {
  const { admin } = await requireAdmin();
  const participant_id = formData.get("participant_id") as string;
  const type = formData.get("type") as string; // "event" | "all_access"
  const event_id = type === "event" ? (formData.get("event_id") as string) : null;
  if (!participant_id || (type === "event" && !event_id)) return;

  // Idempotent: skip if an identical active entitlement already exists.
  let existing = admin
    .from("entitlements")
    .select("id")
    .eq("participant_id", participant_id)
    .eq("type", type)
    .is("revoked_at", null);
  existing = type === "event" ? existing.eq("event_id", event_id) : existing.is("event_id", null);
  const { data: found } = await existing.maybeSingle();

  if (!found) {
    await admin.from("entitlements").insert({
      participant_id,
      event_id,
      type,
      source: "manual",
    });
  }
  revalidatePath(`/admin/participants/${participant_id}`);
}

export async function revokeEntitlement(formData: FormData): Promise<void> {
  const { admin } = await requireAdmin();
  const id = formData.get("id") as string;
  const participant_id = formData.get("participant_id") as string;
  if (!id) return;
  await admin
    .from("entitlements")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`/admin/participants/${participant_id}`);
}

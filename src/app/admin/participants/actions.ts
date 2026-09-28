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

// Promote/demote a member's linked account. Only super_admins can grant or remove
// super_admin. Stored role is one of member/admin/super_admin (participant is
// computed from activity, never stored here).
export async function setRole(formData: FormData): Promise<void> {
  const { admin, userId } = await requireAdmin();
  const participant_id = formData.get("participant_id") as string;
  const role = formData.get("role") as string;
  if (!participant_id || !["member", "admin", "super_admin"].includes(role)) return;

  const { data: caller } = await admin.from("profiles").select("role").eq("id", userId).single();
  const { data: target } = await admin
    .from("profiles")
    .select("id, role")
    .eq("participant_id", participant_id)
    .maybeSingle();
  if (!target) return; // no linked account to assign a role to

  // Only super_admins may set or change the super_admin role.
  const touchesSuper = role === "super_admin" || target.role === "super_admin";
  if (touchesSuper && caller?.role !== "super_admin") return;

  await admin.from("profiles").update({ role }).eq("id", target.id);
  revalidatePath(`/admin/participants/${participant_id}`);
}

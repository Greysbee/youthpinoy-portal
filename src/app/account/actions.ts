"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/viewer";
import { createAdminClient } from "@/lib/supabase-admin";
import { normalizeEmail, isValidEmail } from "@/lib/admin";
import { sendEmail, inviteEmailHtml } from "@/lib/email";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ActionState = { error?: string; notice?: string };

async function loadOwnedGroup(
  admin: SupabaseClient,
  groupId: string,
  participantId: string,
  role: string | null
) {
  const { data: group } = await admin.from("groups").select("*").eq("id", groupId).single();
  if (!group) return null;
  if (group.owner_participant_id !== participantId && role !== "admin") return null;
  return group;
}

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer?.participantId) return { error: "Not signed in." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("participants")
    .update({
      full_name: ((formData.get("full_name") as string) || "").trim() || null,
      phone: ((formData.get("phone") as string) || "").trim() || null,
      organization: ((formData.get("organization") as string) || "").trim() || null,
    })
    .eq("id", viewer.participantId);
  if (error) return { error: error.message };
  revalidatePath("/account");
  return { notice: "Profile saved." };
}

export async function renameGroup(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer?.participantId) return;
  const admin = createAdminClient();
  const groupId = formData.get("group_id") as string;
  const name = ((formData.get("name") as string) || "").trim();
  const group = await loadOwnedGroup(admin, groupId, viewer.participantId, viewer.role);
  if (!group || !name) return;
  await admin.from("groups").update({ name }).eq("id", groupId);
  revalidatePath("/account");
}

export async function addGroupMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer?.participantId) return { error: "Not signed in." };
  const admin = createAdminClient();

  const groupId = formData.get("group_id") as string;
  const email = normalizeEmail((formData.get("email") as string) || "");
  const group = await loadOwnedGroup(admin, groupId, viewer.participantId, viewer.role);
  if (!group) return { error: "Group not found or not yours." };
  if (!isValidEmail(email)) return { error: "Enter a valid email address." };
  if (viewer.email && normalizeEmail(viewer.email) === email)
    return { error: "You already hold the owner's seat." };

  const { data: members } = await admin
    .from("group_members")
    .select("id, email, status")
    .eq("group_id", groupId)
    .neq("status", "removed");
  if ((members ?? []).length >= group.seats_total - 1)
    return { error: "No seats left in this group." };
  if ((members ?? []).some((m) => m.email === email))
    return { error: "That email is already invited." };

  // find-or-create participant by normalized email
  const { data: existing } = await admin
    .from("participants")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  let pid = existing?.id as string | undefined;
  if (!pid) {
    const { data: created, error } = await admin
      .from("participants")
      .insert({ email, source: "invite" })
      .select("id")
      .single();
    if (error) return { error: error.message };
    pid = created.id as string;
  }

  // grant the seat entitlement immediately (access before signup)
  if (group.event_id) {
    const { data: ent } = await admin
      .from("entitlements")
      .select("id")
      .eq("participant_id", pid)
      .eq("event_id", group.event_id)
      .eq("type", "event")
      .is("revoked_at", null)
      .maybeSingle();
    if (!ent) {
      await admin.from("entitlements").insert({
        participant_id: pid,
        event_id: group.event_id,
        type: "event",
        source: "group_seat",
        order_id: group.order_id,
      });
    }
  }

  const token = crypto.randomBytes(24).toString("hex");
  const { error: gmErr } = await admin.from("group_members").insert({
    group_id: groupId,
    email,
    participant_id: pid,
    invite_token: token,
    status: "invited",
  });
  if (gmErr) return { error: gmErr.message };

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const ev = group.event_id
    ? (await admin.from("events").select("code").eq("id", group.event_id).single()).data
    : null;
  const owner = (
    await admin.from("participants").select("full_name, email").eq("id", group.owner_participant_id).single()
  ).data;

  const send = await sendEmail({
    to: email,
    subject: `You're invited to ${ev?.code ?? "an event"} on YouthPinoy`,
    html: inviteEmailHtml({
      groupName: group.name,
      eventCode: ev?.code ?? "the event",
      ownerName: owner?.full_name || owner?.email || "The organizer",
      url: `${site}/invite/${token}`,
    }),
  });

  revalidatePath("/account");
  return send.ok
    ? { notice: `Invite sent to ${email}.` }
    : { notice: `Invite created, but the email failed to send (${send.error}). Share the link from the list below.` };
}

export async function removeGroupMember(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer?.participantId) return;
  const admin = createAdminClient();
  const memberId = formData.get("member_id") as string;

  const { data: member } = await admin
    .from("group_members")
    .select("id, participant_id, group_id, groups(owner_participant_id, event_id)")
    .eq("id", memberId)
    .single();
  if (!member) return;
  const grp = member.groups as { owner_participant_id?: string; event_id?: string } | null;
  if (grp?.owner_participant_id !== viewer.participantId && viewer.role !== "admin") return;

  await admin.from("group_members").update({ status: "removed" }).eq("id", memberId);

  // Removing frees the seat: revoke that seat's entitlement.
  if (member.participant_id && grp?.event_id) {
    await admin
      .from("entitlements")
      .update({ revoked_at: new Date().toISOString() })
      .eq("participant_id", member.participant_id)
      .eq("event_id", grp.event_id)
      .eq("source", "group_seat")
      .is("revoked_at", null);
  }
  revalidatePath("/account");
}

export async function resendInvite(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer?.participantId) return;
  const admin = createAdminClient();
  const memberId = formData.get("member_id") as string;

  const { data: member } = await admin
    .from("group_members")
    .select("id, email, invite_token, group_id, groups(owner_participant_id, event_id, name)")
    .eq("id", memberId)
    .single();
  if (!member) return;
  const grp = member.groups as { owner_participant_id?: string; event_id?: string; name?: string } | null;
  if (grp?.owner_participant_id !== viewer.participantId && viewer.role !== "admin") return;

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const ev = grp?.event_id
    ? (await admin.from("events").select("code").eq("id", grp.event_id).single()).data
    : null;
  const owner = (
    await admin.from("participants").select("full_name, email").eq("id", viewer.participantId).single()
  ).data;
  await sendEmail({
    to: member.email,
    subject: `Reminder: you're invited to ${ev?.code ?? "an event"} on YouthPinoy`,
    html: inviteEmailHtml({
      groupName: grp?.name ?? "your group",
      eventCode: ev?.code ?? "the event",
      ownerName: owner?.full_name || owner?.email || "The organizer",
      url: `${site}/invite/${member.invite_token}`,
    }),
  });
  revalidatePath("/account");
}

export async function acceptInvite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = formData.get("token") as string;
  const viewer = await getViewer();
  if (!viewer?.participantId || !viewer.email) redirect(`/login?next=/invite/${token}`);

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("group_members")
    .select("id, email, status, group_id, groups(event_id)")
    .eq("invite_token", token)
    .single();
  if (!member) return { error: "This invite is not valid." };
  if (member.status === "removed") return { error: "This invite is no longer active." };
  if (normalizeEmail(viewer!.email!) !== member.email)
    return { error: `This invite is for ${member.email}. Log in with that email to accept.` };

  await admin
    .from("group_members")
    .update({ status: "joined", participant_id: viewer!.participantId, joined_at: new Date().toISOString() })
    .eq("id", member.id);

  // Ensure the seat entitlement is active (it was created at invite time).
  const grp = member.groups as { event_id?: string } | null;
  if (grp?.event_id) {
    const { data: ent } = await admin
      .from("entitlements")
      .select("id")
      .eq("participant_id", viewer!.participantId)
      .eq("event_id", grp.event_id)
      .eq("type", "event")
      .is("revoked_at", null)
      .maybeSingle();
    if (!ent) {
      await admin.from("entitlements").insert({
        participant_id: viewer!.participantId,
        event_id: grp.event_id,
        type: "event",
        source: "group_seat",
      });
    }
  }

  redirect("/library");
}

"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/viewer";
import { createAdminClient } from "@/lib/supabase-admin";
import { normalizeEmail, isValidEmail } from "@/lib/admin";
import { deliver, inviteEmailHtml, ticketInviteEmailHtml, sendEmail } from "@/lib/email";
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

  const first = ((formData.get("first_name") as string) || "").trim();
  const middle = ((formData.get("middle_name") as string) || "").trim();
  const last = ((formData.get("last_name") as string) || "").trim();
  const fullName = [first, middle, last].filter(Boolean).join(" ");
  // Mobile: digits only.
  const mobile = ((formData.get("mobile") as string) || "").replace(/\D/g, "");

  const { error } = await admin
    .from("participants")
    .update({
      title: ((formData.get("title") as string) || "").trim() || null,
      first_name: first || null,
      middle_name: middle || null,
      last_name: last || null,
      full_name: fullName || null,
      mobile: mobile || null,
      country: ((formData.get("country") as string) || "PH").trim() || "PH",
      diocese: ((formData.get("diocese") as string) || "").trim() || null,
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

  const send = await deliver({
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
  await deliver({
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

// ---------------------------------------------------------------------------
// Tickets — assign / transfer / resend / accept.
// ---------------------------------------------------------------------------

// Load a ticket and verify the current viewer is its purchaser (or a super admin).
async function loadOwnedTicket(admin: SupabaseClient, ticketId: string, participantId: string, role: string | null) {
  const { data: ticket } = await admin
    .from("tickets")
    .select("id, event_id, ticket_type_id, order_id, group_id, code, status, assigned_email, assigned_participant_id, purchaser_participant_id")
    .eq("id", ticketId)
    .single();
  if (!ticket) return null;
  if (ticket.purchaser_participant_id !== participantId && role !== "super_admin") return null;
  return ticket;
}

// Email the assignee of a ticket (used by assign + resend).
async function sendTicketInvite(
  admin: SupabaseClient,
  ticket: { code: string; event_id: string; ticket_type_id: string | null; invite_token: string; assigned_email: string },
  purchaserParticipantId: string
): Promise<{ ok: boolean; error?: string }> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [{ data: ev }, { data: tt }, { data: buyer }] = await Promise.all([
    admin.from("events").select("code, title").eq("id", ticket.event_id).single(),
    ticket.ticket_type_id
      ? admin.from("ticket_types").select("name").eq("id", ticket.ticket_type_id).single()
      : Promise.resolve({ data: null }),
    admin.from("participants").select("full_name, email").eq("id", purchaserParticipantId).single(),
  ]);
  return deliver({
    to: ticket.assigned_email,
    subject: `Your ticket ${ticket.code} for ${ev?.code ?? "an event"} on YouthPinoy`,
    html: ticketInviteEmailHtml({
      ticketCode: ticket.code,
      eventTitle: ev?.title ?? "the event",
      eventCode: ev?.code ?? "the event",
      ticketTypeName: (tt as { name?: string } | null)?.name ?? "General",
      purchaserName: buyer?.full_name || buyer?.email || "The purchaser",
      url: `${site}/ticket/${ticket.invite_token}`,
    }),
  });
}

// Assign a reserved ticket to an email, or transfer an already-assigned one to a new
// email. Only the purchaser can do this. Transferring revokes the previous holder's
// access for this ticket; the new assignee gets access only once they accept.
export async function assignTicket(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer?.participantId) return { error: "Not signed in." };
  const admin = createAdminClient();

  const ticketId = formData.get("ticket_id") as string;
  const email = normalizeEmail((formData.get("email") as string) || "");
  if (!isValidEmail(email)) return { error: "Enter a valid email address." };

  const ticket = await loadOwnedTicket(admin, ticketId, viewer.participantId, viewer.role);
  if (!ticket) return { error: "Ticket not found or not yours." };

  // Can't collide with another ticket in the same event already held by this email.
  const { data: clash } = await admin
    .from("tickets")
    .select("id")
    .eq("event_id", ticket.event_id)
    .eq("assigned_email", email)
    .neq("id", ticketId)
    .maybeSingle();
  if (clash) return { error: "That email already holds another ticket for this event." };

  // Transfer away from a previous holder: revoke exactly this ticket's entitlements.
  if (ticket.assigned_participant_id) {
    await admin
      .from("entitlements")
      .update({ revoked_at: new Date().toISOString() })
      .eq("ticket_id", ticketId)
      .is("revoked_at", null);
  }

  const token = crypto.randomBytes(24).toString("hex");
  const { error: upErr } = await admin
    .from("tickets")
    .update({
      assigned_email: email,
      assigned_participant_id: null,
      invite_token: token,
      status: "assigned",
      assigned_at: new Date().toISOString(),
      accepted_at: null,
    })
    .eq("id", ticketId);
  if (upErr) return { error: upErr.message };

  const send = await sendTicketInvite(
    admin,
    { code: ticket.code, event_id: ticket.event_id, ticket_type_id: ticket.ticket_type_id, invite_token: token, assigned_email: email },
    viewer.participantId
  );

  revalidatePath("/account");
  return send.ok
    ? { notice: `Ticket ${ticket.code} assigned to ${email}.` }
    : { notice: `Ticket ${ticket.code} assigned to ${email}, but the email failed to send (${send.error}). Share the link from the list.` };
}

export async function resendTicketInvite(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer?.participantId) return;
  const admin = createAdminClient();
  const ticketId = formData.get("ticket_id") as string;

  const ticket = await loadOwnedTicket(admin, ticketId, viewer.participantId, viewer.role);
  if (!ticket || !ticket.assigned_email) return;

  // Ensure a token exists.
  let token = (await admin.from("tickets").select("invite_token").eq("id", ticketId).single()).data?.invite_token as
    | string
    | null;
  if (!token) {
    token = crypto.randomBytes(24).toString("hex");
    await admin.from("tickets").update({ invite_token: token }).eq("id", ticketId);
  }

  await sendTicketInvite(
    admin,
    { code: ticket.code, event_id: ticket.event_id, ticket_type_id: ticket.ticket_type_id, invite_token: token, assigned_email: ticket.assigned_email },
    viewer.participantId
  );
  revalidatePath("/account");
}

// The assignee accepts their ticket: links the ticket to them and grants access to
// the ticket type's inclusions (plus the event itself). Access happens ONLY here.
export async function acceptTicket(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = formData.get("token") as string;
  const viewer = await getViewer();
  if (!viewer?.participantId || !viewer.email) redirect(`/login?next=/ticket/${token}`);

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("tickets")
    .select("id, event_id, ticket_type_id, order_id, code, status, assigned_email, purchaser_participant_id, group_id")
    .eq("invite_token", token)
    .single();
  if (!ticket) return { error: "This ticket link is not valid." };
  if (!ticket.assigned_email) return { error: "This ticket is not assigned to anyone." };
  if (normalizeEmail(viewer!.email!) !== ticket.assigned_email)
    return { error: `This ticket is for ${ticket.assigned_email}. Sign in with that email to accept.` };

  await admin
    .from("tickets")
    .update({ status: "accepted", assigned_participant_id: viewer!.participantId, accepted_at: new Date().toISOString() })
    .eq("id", ticket.id);

  // Grant access: the event itself + the ticket type's inclusions.
  const targetIds = new Set<string>([ticket.event_id as string]);
  if (ticket.ticket_type_id) {
    const { data: incs } = await admin
      .from("ticket_type_includes")
      .select("included_event_id")
      .eq("ticket_type_id", ticket.ticket_type_id);
    for (const i of incs ?? []) if (i.included_event_id) targetIds.add(i.included_event_id as string);
  }
  for (const evId of targetIds) {
    const { data: ent } = await admin
      .from("entitlements")
      .select("id")
      .eq("participant_id", viewer!.participantId)
      .eq("event_id", evId)
      .eq("ticket_id", ticket.id)
      .is("revoked_at", null)
      .maybeSingle();
    if (!ent) {
      await admin.from("entitlements").insert({
        participant_id: viewer!.participantId,
        event_id: evId,
        type: "event",
        source: "ticket",
        order_id: ticket.order_id,
        ticket_id: ticket.id,
      });
    }
  }

  // Notify the purchaser their ticket was accepted (non-fatal).
  const { data: buyer } = await admin
    .from("participants")
    .select("email")
    .eq("id", ticket.purchaser_participant_id)
    .single();
  const { data: ev } = await admin.from("events").select("code, title").eq("id", ticket.event_id).single();
  if (buyer?.email) {
    await deliver({
      to: buyer.email,
      subject: `${ticket.assigned_email} accepted ticket ${ticket.code} (${ev?.code ?? "event"})`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a">
        <p><strong>${ticket.assigned_email}</strong> accepted ticket <strong>${ticket.code}</strong> for ${ev?.title ?? "your event"}.</p>
        <p style="color:#6b7280;font-size:13px">You can see all your tickets under My Account → My groups.</p>
      </div>`,
    });
  }

  redirect("/library");
}

export async function acceptInvite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = formData.get("token") as string;
  const viewer = await getViewer();
  if (!viewer?.participantId || !viewer.email) redirect(`/login?next=/invite/${token}`);

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("group_members")
    .select("id, email, status, group_id, groups(id, event_id, name, seats_total, owner_participant_id)")
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
  const grp = member.groups as
    | { id?: string; event_id?: string; name?: string; seats_total?: number; owner_participant_id?: string }
    | null;
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

  // Notify the group owner (idempotent per member).
  if (grp?.owner_participant_id && grp.id) {
    const { data: owner } = await admin
      .from("participants")
      .select("email, full_name")
      .eq("id", grp.owner_participant_id)
      .single();
    const { count: usedCount } = await admin
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", grp.id)
      .neq("status", "removed");
    if (owner?.email) {
      await sendEmail({
        type: "group_joined",
        to: owner.email,
        refId: member.id,
        participantId: grp.owner_participant_id,
        data: {
          memberName: viewer!.fullName || member.email,
          groupName: grp.name ?? "your group",
          seatsUsed: (usedCount ?? 0) + 1, // +1 for the owner's own seat
          seatsTotal: grp.seats_total ?? 0,
          groupId: grp.id,
        },
      });
    }
  }

  redirect("/library");
}

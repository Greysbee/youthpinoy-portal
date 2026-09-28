import * as React from "react";
import { render } from "@react-email/render";
import { createEvent } from "ics";
import { createAdminClient } from "@/lib/supabase-admin";
import { WelcomeEmail } from "@emails/welcome";
import { EventRegisteredEmail } from "@emails/event-registered";
import { OrderPaidEmail } from "@emails/order-paid";
import { GroupJoinedEmail } from "@emails/group-joined";

// ---------------------------------------------------------------------------
// Low-level Resend delivery (REST, no SDK). Supports text, reply-to, attachments.
// ---------------------------------------------------------------------------
type Attachment = { filename: string; content: string }; // content = base64

function fromAddress(): string {
  return (
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    "YouthPinoy <onboarding@resend.dev>"
  );
}

export async function deliver(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Attachment[];
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY not set" };
  try {
    const body: Record<string, unknown> = {
      from: fromAddress(),
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    };
    if (opts.text) body.text = opts.text;
    if (process.env.EMAIL_REPLY_TO) body.reply_to = process.env.EMAIL_REPLY_TO;
    if (opts.attachments?.length) body.attachments = opts.attachments;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: `Resend ${res.status}: ${JSON.stringify(json).slice(0, 200)}` };
    }
    return { ok: true, id: (json as { id?: string }).id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
export function pesoFromCentavos(centavos: number): string {
  return "₱" + (centavos / 100).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatManila(iso?: string | null): string {
  if (!iso) return "Date to be announced";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Date to be announced";
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${date} · ${time}`;
}

function toUtcArr(d: Date): [number, number, number, number, number] {
  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes()];
}

function buildIcsBase64(opts: {
  title: string;
  startAt?: string | null;
  endAt?: string | null;
  location: string;
  url?: string;
  description?: string;
}): string | null {
  if (!opts.startAt) return null;
  const start = new Date(opts.startAt);
  if (isNaN(start.getTime())) return null;
  let hours = 2;
  let minutes = 0;
  if (opts.endAt) {
    const end = new Date(opts.endAt);
    const ms = end.getTime() - start.getTime();
    if (ms > 0) {
      hours = Math.floor(ms / 3_600_000);
      minutes = Math.round((ms % 3_600_000) / 60_000);
    }
  }
  const { error, value } = createEvent({
    title: opts.title,
    start: toUtcArr(start),
    startInputType: "utc",
    duration: { hours, minutes },
    location: opts.location,
    url: opts.url,
    description: opts.description,
  });
  if (error || !value) return null;
  return Buffer.from(value, "utf8").toString("base64");
}

// ---------------------------------------------------------------------------
// Template registry — builds subject/html/text/attachments per type.
// Exported so /admin/emails can preview with sample data.
// ---------------------------------------------------------------------------
export type EmailType = "welcome" | "event_registered" | "order_paid" | "group_joined";

export async function buildEmail(
  type: EmailType,
  data: Record<string, unknown>
): Promise<{ subject: string; html: string; text: string; attachments?: Attachment[] }> {
  switch (type) {
    case "welcome": {
      const firstName = String(data.firstName ?? "there");
      const el = (
        <WelcomeEmail
          firstName={firstName}
          allAccess={Boolean(data.allAccess)}
          editions={(data.editions as string[]) ?? []}
        />
      );
      return {
        subject: `Welcome to the YouthPinoy Portal, ${firstName}!`,
        html: await render(el),
        text: await render(el, { plainText: true }),
      };
    }
    case "event_registered": {
      const eventTitle = String(data.eventTitle ?? "the event");
      const whenText = formatManila(data.startAt as string);
      const location = data.isOnline ? "Online" : String(data.venue || "In person");
      const joinLink = (data.joinLink as string) || null;
      const el = (
        <EventRegisteredEmail
          eventTitle={eventTitle}
          slug={String(data.slug ?? "")}
          whenText={whenText}
          location={location}
          joinLink={joinLink}
        />
      );
      const ics = buildIcsBase64({
        title: eventTitle,
        startAt: data.startAt as string,
        endAt: data.endAt as string,
        location: data.isOnline ? (joinLink || "Online") : String(data.venue || ""),
        url: joinLink || undefined,
        description: `Your registration for ${eventTitle}.`,
      });
      return {
        subject: `You're registered for ${eventTitle}`,
        html: await render(el),
        text: await render(el, { plainText: true }),
        attachments: ics ? [{ filename: "event.ics", content: ics }] : undefined,
      };
    }
    case "order_paid": {
      const eventTitle = String(data.eventTitle ?? "the event");
      const quantity = Number(data.quantity ?? 1);
      const whenText = formatManila(data.startAt as string);
      const location = data.isOnline ? "Online" : String(data.venue || "In person");
      const joinLink = (data.joinLink as string) || null;
      const el = (
        <OrderPaidEmail
          orderRef={String(data.orderRef ?? "")}
          eventTitle={eventTitle}
          slug={String(data.slug ?? "")}
          quantity={quantity}
          amountText={pesoFromCentavos(Number(data.amountCentavos ?? 0))}
          paidDate={formatManila((data.paidAt as string) ?? new Date().toISOString())}
          paymentMethod={(data.paymentMethod as string) || null}
          whenText={whenText}
          location={location}
          joinLink={joinLink}
          groupId={(data.groupId as string) || null}
        />
      );
      const ics = buildIcsBase64({
        title: eventTitle,
        startAt: data.startAt as string,
        endAt: data.endAt as string,
        location: data.isOnline ? (joinLink || "Online") : String(data.venue || ""),
        url: joinLink || undefined,
        description: `Your ticket for ${eventTitle}.`,
      });
      return {
        subject: `Payment received — ${eventTitle} (${quantity} ticket${quantity !== 1 ? "s" : ""})`,
        html: await render(el),
        text: await render(el, { plainText: true }),
        attachments: ics ? [{ filename: "event.ics", content: ics }] : undefined,
      };
    }
    case "group_joined": {
      const memberName = String(data.memberName ?? "A member");
      const groupName = String(data.groupName ?? "your group");
      const el = (
        <GroupJoinedEmail
          memberName={memberName}
          groupName={groupName}
          seatsUsed={Number(data.seatsUsed ?? 0)}
          seatsTotal={Number(data.seatsTotal ?? 0)}
          groupId={String(data.groupId ?? "")}
        />
      );
      return {
        subject: `${memberName} joined ${groupName}`,
        html: await render(el),
        text: await render(el, { plainText: true }),
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Idempotent, logged, never-throwing sender. Grants/flows must never break on
// a mail failure — we log and move on.
// ---------------------------------------------------------------------------
export async function sendEmail(params: {
  type: EmailType;
  to: string;
  refId: string;
  participantId?: string | null;
  data: Record<string, unknown>;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const to = (params.to || "").trim().toLowerCase();
  if (!to) return { ok: false, error: "no recipient" };

  try {
    const admin = createAdminClient();

    // Skip if already sent (webhooks retry).
    const { data: existing } = await admin
      .from("email_log")
      .select("id, status")
      .eq("type", params.type)
      .eq("ref_id", params.refId)
      .eq("to_email", to)
      .maybeSingle();
    if (existing?.status === "sent") return { ok: true, skipped: true };

    const built = await buildEmail(params.type, params.data);
    const result = await deliver({
      to,
      subject: built.subject,
      html: built.html,
      text: built.text,
      attachments: built.attachments,
    });

    await admin.from("email_log").upsert(
      {
        type: params.type,
        ref_id: params.refId,
        to_email: to,
        participant_id: params.participantId ?? null,
        resend_id: result.id ?? null,
        status: result.ok ? "sent" : "failed",
        error: result.error ?? null,
      },
      { onConflict: "type,ref_id,to_email" }
    );

    return { ok: result.ok, error: result.error };
  } catch (e) {
    // Never propagate into signup / registration / payment flows.
    console.error("[sendEmail] non-fatal error:", e);
    return { ok: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}

// Send the welcome email (idempotent per participant). Safe to call from several
// places — the first one wins and the rest are skipped via email_log.
export async function sendWelcome(opts: {
  participantId: string;
  email: string;
  fullName?: string | null;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const { allAccess, editions } = await buildWelcomeData(opts.participantId);
  const firstName = (opts.fullName || "").trim().split(/\s+/)[0] || "there";
  return sendEmail({
    type: "welcome",
    to: opts.email,
    refId: opts.participantId,
    participantId: opts.participantId,
    data: { firstName, allAccess, editions },
  });
}

// Compute the welcome email's entitlement summary for a participant.
export async function buildWelcomeData(
  participantId: string
): Promise<{ allAccess: boolean; editions: string[] }> {
  const admin = createAdminClient();
  const { data: aa } = await admin
    .from("entitlements")
    .select("id")
    .eq("participant_id", participantId)
    .eq("type", "all_access")
    .is("revoked_at", null)
    .maybeSingle();
  if (aa) return { allAccess: true, editions: [] };

  const { data: ids } = await admin.rpc("accessible_event_ids", { p_participant: participantId });
  const idList = ((ids as unknown[]) ?? []).map((r) =>
    typeof r === "string" ? r : (Object.values(r as Record<string, unknown>)[0] as string)
  );
  if (idList.length === 0) return { allAccess: false, editions: [] };

  const { data: evs } = await admin.from("events").select("code").in("id", idList);
  const editions = (evs ?? [])
    .map((e) => e.code as string)
    .sort((a, b) => (parseInt(a.replace(/\D/g, "")) || 0) - (parseInt(b.replace(/\D/g, "")) || 0));
  return { allAccess: false, editions };
}

// ---------------------------------------------------------------------------
// Group invite email (kept from Milestone 4 — uses the low-level sender; invites
// are intentionally re-sendable, so they do NOT go through the idempotent path).
// ---------------------------------------------------------------------------
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function inviteEmailHtml(opts: {
  groupName: string;
  eventCode: string;
  ownerName: string;
  url: string;
}): string {
  const g = escapeHtml(opts.groupName);
  const ev = escapeHtml(opts.eventCode);
  const owner = escapeHtml(opts.ownerName);
  const url = escapeHtml(opts.url);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
    <div style="background:#033A7A;padding:24px;text-align:center;border-radius:8px 8px 0 0">
      <img src="${site}/email/youthpinoy-email-logo.png" width="280" alt="YouthPinoy" style="margin:0 auto" />
    </div>
    <div style="background:#fff;padding:32px;color:#1a1a1a;font-size:16px;line-height:1.6">
      <h2 style="color:#033A7A;margin-top:0">You're invited to ${ev}</h2>
      <p>${owner} added you to the group <strong>"${g}"</strong> for <strong>${ev}</strong> at YouthPinoy CSMS.</p>
      <p>Click below to claim your access — you'll set up (or sign in to) your own account:</p>
      <p><a href="${url}" style="display:inline-block;background:#033A7A;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600">Accept invitation</a></p>
      <p style="color:#6b7280;font-size:12px">Or paste this link:<br>${url}</p>
    </div>
  </div>`;
}

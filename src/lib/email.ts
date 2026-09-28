// Minimal Resend client via REST (no SDK dependency). Server-only.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "YouthPinoy CSMS <onboarding@resend.dev>";
  if (!key) return { ok: false, error: "RESEND_API_KEY not set" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${t.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
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
  return `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:8px">
    <h2 style="color:#1e3a8a">You're invited to ${ev}</h2>
    <p>${owner} added you to the group <strong>"${g}"</strong> for <strong>${ev}</strong> at YouthPinoy CSMS.</p>
    <p>Click below to claim your access — you'll set up (or sign in to) your own account:</p>
    <p><a href="${url}" style="display:inline-block;background:#1e3a8a;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Accept invitation</a></p>
    <p style="color:#666;font-size:12px">Or paste this link into your browser:<br>${url}</p>
  </div>`;
}

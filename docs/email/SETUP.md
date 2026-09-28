# Email setup (Resend + Supabase)

Transactional emails (welcome, event registration, payment, group-joined, group
invites) are sent by the app via Resend. Supabase **auth** emails (confirm signup,
magic link, reset password) are sent by Supabase — point those at Resend SMTP so
everything comes from the same verified sender and the default auth rate limits
don't apply.

## 1. Logo asset
Add the email logo (PNG, not SVG — many clients block SVG) at:

    public/email/youthpinoy-email-logo.png

Templates reference it at `${NEXT_PUBLIC_SITE_URL}/email/youthpinoy-email-logo.png`
(width 280). The Supabase auth templates hard-code the full URL — update the domain
in each `docs/email/*.html` file to your real portal domain.

## 2. App env vars (.env.local + host)
```
RESEND_API_KEY=re_...                     # Resend API key
EMAIL_FROM=YouthPinoy <portal@youthpinoy.org>   # verified Resend domain
EMAIL_REPLY_TO=support@youthpinoy.org
NEXT_PUBLIC_SITE_URL=https://portal.youthpinoy.org
```

## 3. Verify the sending domain in Resend
Resend → Domains → Add `youthpinoy.org` (or a subdomain like `send.youthpinoy.org`).
Resend shows the exact DNS records to add — add all of them, then click Verify.

### DNS records to add (values come from the Resend domain page)
| Type  | Host (example)              | Value |
| ----- | --------------------------- | ----- |
| TXT   | `send.youthpinoy.org` (SPF) | `v=spf1 include:amazonses.com ~all` |
| CNAME | `resend._domainkey…` (DKIM) | (3 CNAMEs Resend provides — copy exactly) |
| TXT   | `_dmarc.youthpinoy.org`     | `v=DMARC1; p=none; rua=mailto:dmarc@youthpinoy.org` |

- **SPF** authorizes Resend's servers to send for the domain.
- **DKIM** (the CNAMEs) signs messages — the biggest factor in not landing in spam.
- **DMARC** ties SPF/DKIM together; start with `p=none` and tighten to
  `p=quarantine` once you confirm alignment in the DMARC reports.

Until the domain shows **Verified**, Resend returns `403 domain is not verified`
and emails won't deliver (the app logs the failure and continues — flows never break).

## 4. Supabase auth emails via Resend SMTP
Supabase Dashboard → **Project Settings → Authentication → SMTP Settings** →
enable **Custom SMTP** and enter:

| Field          | Value |
| -------------- | ----- |
| Host           | `smtp.resend.com` |
| Port           | `465` (SSL) — or `587` (STARTTLS) |
| Username       | `resend` |
| Password       | your `RESEND_API_KEY` |
| Sender email   | `portal@youthpinoy.org` (verified domain) |
| Sender name    | `YouthPinoy` |

Then Supabase → **Authentication → Email Templates**, and paste:
- Confirm signup → `docs/email/supabase-confirm-signup.html`
- Magic Link → `docs/email/supabase-magic-link.html`
- Reset Password → `docs/email/supabase-reset-password.html`

(Update the logo domain in each file first.) Also set the redirect/Site URL so the
confirmation link lands on `${SITE}/auth/confirm` — the app sends the welcome email
right after confirmation.

## 5. Idempotency
Every app email is recorded in `public.email_log` with a UNIQUE(type, ref_id,
to_email). `sendEmail()` skips anything already `sent`, so webhook retries and
double-triggers never double-send. `/admin/emails` previews each template and can
send a live test to the signed-in admin.

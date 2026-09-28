-- Idempotency + delivery log for transactional emails.
-- UNIQUE(type, ref_id, to_email) prevents double-sends across webhook retries.
create table if not exists public.email_log (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid references public.participants(id) on delete set null,
  type           text not null,
  ref_id         text not null,
  to_email       text not null,
  resend_id      text,
  status         text not null check (status in ('sent','failed')),
  error          text,
  created_at     timestamptz not null default now(),
  unique (type, ref_id, to_email)
);
alter table public.email_log enable row level security;
create policy email_log_admin_all on public.email_log for all
  using (public.is_admin()) with check (public.is_admin());

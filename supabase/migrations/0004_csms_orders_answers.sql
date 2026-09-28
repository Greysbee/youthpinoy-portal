-- Carry registration answers on the order so the webhook can create the
-- registration after payment (paid events collect answers before redirecting).
alter table public.orders add column if not exists answers jsonb not null default '{}'::jsonb;

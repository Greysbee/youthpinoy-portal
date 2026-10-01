-- Ticketing model: ticket types per event (replace the event's single price),
-- individual numbered tickets reserved to a purchaser, assignable/transferable to
-- others, access granted only when the assignee accepts.

-- Ticket types for an event (name, code, price, capacity, own inclusions).
create table if not exists public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  code text not null,
  price_centavos integer not null default 0,
  capacity integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, code)
);

-- What each ticket type unlocks (the "inclusions"): other events/courses.
create table if not exists public.ticket_type_includes (
  ticket_type_id uuid not null references public.ticket_types(id) on delete cascade,
  included_event_id uuid not null references public.events(id) on delete cascade,
  primary key (ticket_type_id, included_event_id)
);

-- Per-event sequential counter for ticket numbers (eventcode + NNN).
create table if not exists public.event_ticket_counters (
  event_id uuid primary key references public.events(id) on delete cascade,
  last_seq integer not null default 0
);

-- Atomically reserve p_count consecutive ticket numbers for an event; returns the
-- first number of the reserved range (so the caller builds codes start..start+n-1).
create or replace function public.next_ticket_seq(p_event uuid, p_count integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  start_seq integer;
begin
  insert into public.event_ticket_counters (event_id, last_seq)
  values (p_event, 0)
  on conflict (event_id) do nothing;

  update public.event_ticket_counters
    set last_seq = last_seq + p_count
    where event_id = p_event
    returning last_seq - p_count + 1 into start_seq;

  return start_seq;
end;
$$;

-- Individual tickets.
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  ticket_type_id uuid references public.ticket_types(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  group_id uuid references public.groups(id) on delete set null,
  seq integer not null,
  code text not null,
  purchaser_participant_id uuid not null references public.participants(id),
  assigned_email text,
  assigned_participant_id uuid references public.participants(id),
  invite_token text unique,
  status text not null default 'reserved' check (status in ('reserved','assigned','accepted')),
  assigned_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, seq),
  unique (event_id, code)
);

create index if not exists tickets_order_idx on public.tickets (order_id);
create index if not exists tickets_group_idx on public.tickets (group_id);
create index if not exists tickets_purchaser_idx on public.tickets (purchaser_participant_id);
create index if not exists tickets_assigned_idx on public.tickets (assigned_participant_id);

-- Link an order to the ticket type it bought (purchase is one type + quantity).
alter table public.orders add column if not exists ticket_type_id uuid references public.ticket_types(id);

-- Tie an entitlement to the ticket that granted it (so a transfer revokes exactly
-- the right rows), and allow source 'ticket'.
alter table public.entitlements add column if not exists ticket_id uuid references public.tickets(id) on delete set null;
alter table public.entitlements drop constraint if exists entitlements_source_check;
alter table public.entitlements add constraint entitlements_source_check
  check (source in ('legacy_import','purchase','group_seat','manual','ticket'));

-- Profile title (Mr./Ms./…).
alter table public.participants add column if not exists title text;

-- RLS: enable on the new tables. Ticket types + their inclusions are public (shown
-- on the event page); tickets and counters are admin/service-role only (all app
-- access goes through the service-role client in server code).
alter table public.ticket_types enable row level security;
alter table public.ticket_type_includes enable row level security;
alter table public.tickets enable row level security;
alter table public.event_ticket_counters enable row level security;

drop policy if exists "ticket_types read" on public.ticket_types;
create policy "ticket_types read" on public.ticket_types for select using (true);

drop policy if exists "ticket_type_includes read" on public.ticket_type_includes;
create policy "ticket_type_includes read" on public.ticket_type_includes for select using (true);

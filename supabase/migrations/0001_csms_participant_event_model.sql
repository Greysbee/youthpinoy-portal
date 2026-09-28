-- ============================================================
-- CSMS portal — Milestone 1: participant / event model
-- Added ALONGSIDE the existing courses/lessons/enrollments tables
-- (those are left untouched and keep working; retired in a later milestone).
--
-- Core principle: access is keyed to the PARTICIPANT (by normalized email),
-- not the auth user. A participant can exist before anyone signs up; an auth
-- account links to the participant with the same email and inherits everything.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Email normalization helper (trim + lowercase, everywhere)
-- ------------------------------------------------------------
create or replace function public.normalize_email(p text)
returns text language sql immutable as $$
  select lower(trim(p));
$$;

-- Shared BEFORE-trigger fn: normalizes a row's `email` column on write.
create or replace function public.tg_normalize_email()
returns trigger language plpgsql as $$
begin
  new.email := public.normalize_email(new.email);
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 1. participants
-- ------------------------------------------------------------
create table if not exists public.participants (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  full_name     text,
  phone         text,
  organization  text,
  source        text not null default 'signup'
                  check (source in ('wp_import','csv_import','signup','invite','purchase')),
  legacy_ids    jsonb not null default '[]'::jsonb,
  notes         text,
  created_at    timestamptz not null default now()
);

drop trigger if exists trg_participants_normalize on public.participants;
create trigger trg_participants_normalize
  before insert or update of email on public.participants
  for each row execute function public.tg_normalize_email();

-- ------------------------------------------------------------
-- 2. profiles: link to participant + allow 'member' role
--    (existing rows keep role 'student'; only the constraint is relaxed)
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists participant_id uuid references public.participants(id);

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('student','member','admin'));

-- ------------------------------------------------------------
-- 3. events
-- ------------------------------------------------------------
create table if not exists public.events (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,           -- e.g. 'CSMSv16'
  title               text not null,
  slug                text not null unique,
  description         text,
  start_at            timestamptz,
  end_at              timestamptz,
  venue               text,
  is_online           boolean not null default true,
  status              text not null default 'draft'
                        check (status in ('draft','published','closed')),
  price_centavos      integer not null default 0,     -- 0 = free
  capacity            integer,
  registration_fields jsonb not null default '[]'::jsonb,  -- [{key,label,type,required,options}]
  cover_image_url     text,
  created_at          timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. event_includes  (package inheritance; resolved transitively)
-- ------------------------------------------------------------
create table if not exists public.event_includes (
  event_id          uuid not null references public.events(id) on delete cascade,
  included_event_id uuid not null references public.events(id) on delete cascade,
  primary key (event_id, included_event_id),
  check (event_id <> included_event_id)
);

-- ------------------------------------------------------------
-- 5. videos  (multi-provider; provider_ref is the secret playable id/URL)
-- ------------------------------------------------------------
create table if not exists public.videos (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid references public.events(id) on delete set null,
  title            text not null,
  description      text,
  provider         text not null check (provider in ('bunny','vimeo','youtube','url')),
  provider_ref     text not null,      -- HIDDEN from clients (see grants below)
  thumbnail_url    text,
  duration_seconds integer,
  is_free          boolean not null default false,
  sort_order       integer not null default 0,
  status           text not null default 'draft' check (status in ('draft','published')),
  created_at       timestamptz not null default now()
);
create index if not exists idx_videos_event on public.videos(event_id);

-- ------------------------------------------------------------
-- 6. orders  (created before entitlements/registrations/groups for FKs)
-- ------------------------------------------------------------
create table if not exists public.orders (
  id                   uuid primary key default gen_random_uuid(),
  buyer_participant_id uuid not null references public.participants(id) on delete cascade,
  event_id             uuid references public.events(id) on delete set null,
  quantity             integer not null default 1 check (quantity >= 1),
  amount_centavos      integer not null default 0,
  currency             text not null default 'PHP',
  status               text not null default 'pending'
                         check (status in ('pending','paid','failed','expired')),
  paymongo_checkout_id text,
  paymongo_payment_id  text,
  raw_webhook          jsonb,
  created_at           timestamptz not null default now(),
  paid_at              timestamptz
);

-- ------------------------------------------------------------
-- 7. entitlements
-- ------------------------------------------------------------
create table if not exists public.entitlements (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  event_id       uuid references public.events(id) on delete cascade,
  type           text not null check (type in ('event','all_access')),
  source         text not null check (source in ('legacy_import','purchase','group_seat','manual')),
  order_id       uuid references public.orders(id) on delete set null,
  granted_at     timestamptz not null default now(),
  revoked_at     timestamptz,
  check (
    (type = 'event'      and event_id is not null) or
    (type = 'all_access' and event_id is null)
  )
);
-- Idempotency: at most one ACTIVE entitlement per (participant,event) and per all-access.
create unique index if not exists uq_entitlement_active_event
  on public.entitlements (participant_id, event_id)
  where revoked_at is null and type = 'event';
create unique index if not exists uq_entitlement_active_all_access
  on public.entitlements (participant_id)
  where revoked_at is null and type = 'all_access';

-- ------------------------------------------------------------
-- 8. registrations
-- ------------------------------------------------------------
create table if not exists public.registrations (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  event_id       uuid not null references public.events(id) on delete cascade,
  order_id       uuid references public.orders(id) on delete set null,
  answers        jsonb not null default '{}'::jsonb,
  status         text not null default 'confirmed',
  created_at     timestamptz not null default now(),
  unique (participant_id, event_id)
);

-- ------------------------------------------------------------
-- 9. groups + group_members
-- ------------------------------------------------------------
create table if not exists public.groups (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  owner_participant_id uuid not null references public.participants(id) on delete cascade,
  event_id             uuid references public.events(id) on delete set null,
  order_id             uuid references public.orders(id) on delete set null,
  seats_total          integer not null default 1 check (seats_total >= 1),
  created_at           timestamptz not null default now()
);

create table if not exists public.group_members (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references public.groups(id) on delete cascade,
  email          text not null,
  participant_id uuid references public.participants(id) on delete set null,
  invite_token   text not null unique,
  status         text not null default 'invited'
                   check (status in ('invited','joined','removed')),
  invited_at     timestamptz not null default now(),
  joined_at      timestamptz
);
create index if not exists idx_group_members_email on public.group_members(email);

drop trigger if exists trg_group_members_normalize on public.group_members;
create trigger trg_group_members_normalize
  before insert or update of email on public.group_members
  for each row execute function public.tg_normalize_email();

-- ============================================================
-- 10. ACCESS HELPERS (SECURITY DEFINER)
-- ============================================================

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.current_participant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select participant_id from profiles where id = auth.uid();
$$;

-- Union of directly-entitled events + transitive event_includes closure.
-- Any active all_access entitlement => every event.
create or replace function public.accessible_event_ids(p_participant uuid)
returns setof uuid
language plpgsql stable security definer set search_path = public as $$
begin
  if p_participant is null then
    return;
  end if;

  if exists (
    select 1 from entitlements e
    where e.participant_id = p_participant
      and e.type = 'all_access'
      and e.revoked_at is null
  ) then
    return query select id from events;
    return;
  end if;

  return query
  with recursive direct as (
    select e.event_id
    from entitlements e
    where e.participant_id = p_participant
      and e.type = 'event'
      and e.revoked_at is null
      and e.event_id is not null
  ),
  closure as (
    select event_id from direct
    union
    select ei.included_event_id
    from event_includes ei
    join closure c on ei.event_id = c.event_id
  )
  select distinct event_id from closure;
end;
$$;

-- video.is_free OR video.event_id in accessible_event_ids(participant)
create or replace function public.can_watch(p_participant uuid, p_video uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from videos v
    where v.id = p_video
      and (
        v.is_free
        or (v.event_id is not null
            and v.event_id in (select public.accessible_event_ids(p_participant)))
      )
  );
$$;

-- ============================================================
-- 11. PROFILE -> PARTICIPANT LINK (find-or-create by normalized email)
--     Also auto-joins any pending group invites for that email.
-- ============================================================
create or replace function public.link_profile_participant()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_email text := public.normalize_email(new.email);
  v_pid   uuid;
begin
  select id into v_pid from participants where email = v_email;

  if v_pid is null then
    insert into participants (email, full_name, source)
    values (v_email, nullif(new.full_name, ''), 'signup')
    returning id into v_pid;
  else
    -- keep existing non-empty values; fill a blank name from the new profile
    update participants
      set full_name = coalesce(full_name, nullif(new.full_name, ''))
      where id = v_pid;
  end if;

  new.participant_id := v_pid;

  update group_members
    set status = 'joined', participant_id = v_pid, joined_at = now()
    where email = v_email and status = 'invited';

  return new;
end;
$$;

drop trigger if exists trg_link_profile_participant on public.profiles;
create trigger trg_link_profile_participant
  before insert on public.profiles
  for each row execute function public.link_profile_participant();

-- New signups default to the 'member' role of the participant model.
-- (Existing 'student' rows remain valid under the relaxed constraint above.)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    'member'
  );
  return new;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 12. ROW LEVEL SECURITY
--   Members: read published events/videos metadata; read only their OWN
--   participant/entitlements/registrations/orders and groups they own/belong to.
--   Admin: full access. All access-GRANTING writes happen server-side with the
--   service role (which bypasses RLS) — so members get no write policies here.
-- ============================================================
alter table public.participants   enable row level security;
alter table public.events         enable row level security;
alter table public.event_includes enable row level security;
alter table public.videos         enable row level security;
alter table public.orders         enable row level security;
alter table public.entitlements   enable row level security;
alter table public.registrations  enable row level security;
alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;

-- participants
create policy participants_read_own on public.participants for select
  using (id = public.current_participant_id() or public.is_admin());
create policy participants_admin_all on public.participants for all
  using (public.is_admin()) with check (public.is_admin());

-- events
create policy events_read_published on public.events for select
  using (status = 'published' or public.is_admin());
create policy events_admin_all on public.events for all
  using (public.is_admin()) with check (public.is_admin());

-- event_includes (not sensitive; needed to display package contents)
create policy event_includes_read on public.event_includes for select using (true);
create policy event_includes_admin_all on public.event_includes for all
  using (public.is_admin()) with check (public.is_admin());

-- videos (row policy; provider_ref is additionally hidden via column grants below)
create policy videos_read_published on public.videos for select
  using (status = 'published' or public.is_admin());
create policy videos_admin_all on public.videos for all
  using (public.is_admin()) with check (public.is_admin());

-- orders
create policy orders_read_own on public.orders for select
  using (buyer_participant_id = public.current_participant_id() or public.is_admin());
create policy orders_admin_all on public.orders for all
  using (public.is_admin()) with check (public.is_admin());

-- entitlements
create policy entitlements_read_own on public.entitlements for select
  using (participant_id = public.current_participant_id() or public.is_admin());
create policy entitlements_admin_all on public.entitlements for all
  using (public.is_admin()) with check (public.is_admin());

-- registrations
create policy registrations_read_own on public.registrations for select
  using (participant_id = public.current_participant_id() or public.is_admin());
create policy registrations_admin_all on public.registrations for all
  using (public.is_admin()) with check (public.is_admin());

-- groups
create policy groups_read on public.groups for select using (
  owner_participant_id = public.current_participant_id()
  or exists (
    select 1 from group_members gm
    where gm.group_id = groups.id
      and gm.participant_id = public.current_participant_id()
  )
  or public.is_admin()
);
create policy groups_admin_all on public.groups for all
  using (public.is_admin()) with check (public.is_admin());

-- group_members
create policy group_members_read on public.group_members for select using (
  participant_id = public.current_participant_id()
  or exists (
    select 1 from groups g
    where g.id = group_members.group_id
      and g.owner_participant_id = public.current_participant_id()
  )
  or public.is_admin()
);
create policy group_members_admin_all on public.group_members for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 13. COLUMN GRANTS — hide videos.provider_ref from clients
--   Clients may read video METADATA but never the playable ref.
--   Only the service role (server) can read provider_ref, and it must gate
--   every read through can_watch() before returning a playable URL.
-- ============================================================
revoke select on public.videos from anon, authenticated;
grant select (
  id, event_id, title, description, thumbnail_url,
  duration_seconds, is_free, sort_order, status, created_at
) on public.videos to anon, authenticated;
grant all on public.videos to service_role;

-- Execute grants for helpers used by server/RLS.
grant execute on function public.is_admin()                       to anon, authenticated, service_role;
grant execute on function public.current_participant_id()         to anon, authenticated, service_role;
grant execute on function public.accessible_event_ids(uuid)       to anon, authenticated, service_role;
grant execute on function public.can_watch(uuid, uuid)            to anon, authenticated, service_role;

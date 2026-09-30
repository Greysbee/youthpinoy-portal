-- events.type: 'course' (video collection) vs 'event' (ticketed)
alter table public.events
  add column if not exists type text not null default 'event'
  check (type in ('course', 'event'));

-- events.venue_type: online / onsite / hybrid (is_online kept in sync for emails/.ics)
alter table public.events
  add column if not exists venue_type text not null default 'online'
  check (venue_type in ('online', 'onsite', 'hybrid'));
update public.events set venue_type = case when is_online then 'online' else 'onsite' end;

-- participant profile fields
alter table public.participants
  add column if not exists first_name  text,
  add column if not exists middle_name text,
  add column if not exists last_name   text,
  add column if not exists country     text not null default 'PH',
  add column if not exists diocese     text;

-- rename phone -> mobile (idempotent)
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='participants' and column_name='phone')
     and not exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='participants' and column_name='mobile') then
    alter table public.participants rename column phone to mobile;
  end if;
  if not exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='participants' and column_name='mobile') then
    alter table public.participants add column mobile text;
  end if;
end $$;

-- best-effort backfill of first/last from existing full_name
update public.participants
set first_name = coalesce(first_name, nullif(split_part(full_name, ' ', 1), '')),
    last_name  = coalesce(last_name,  nullif(trim(substr(full_name, length(split_part(full_name,' ',1)) + 2)), ''))
where full_name is not null and full_name <> '' and first_name is null;

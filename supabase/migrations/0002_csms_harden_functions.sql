-- Pin search_path on the three functions the linter flagged
-- (all their references are already schema-qualified).
create or replace function public.normalize_email(p text)
returns text language sql immutable set search_path = '' as $$
  select lower(trim(p));
$$;

create or replace function public.tg_normalize_email()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.email := public.normalize_email(new.email);
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
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
$$;

-- accessible_event_ids / can_watch accept an arbitrary participant id, so they
-- must be server-only (service_role) — clients must not enumerate participants.
revoke execute on function public.accessible_event_ids(uuid) from anon, authenticated;
revoke execute on function public.can_watch(uuid, uuid)      from anon, authenticated;

-- Trigger functions are never called directly via REST.
revoke execute on function public.handle_new_user()          from anon, authenticated, public;
revoke execute on function public.link_profile_participant() from anon, authenticated, public;

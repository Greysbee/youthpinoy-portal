-- When a profile is created (signup), also populate the participant's first/last
-- name from the full name, so registration's first/last fields flow through.
create or replace function public.link_profile_participant()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_email text := public.normalize_email(new.email);
  v_pid   uuid;
  v_first text := nullif(split_part(coalesce(new.full_name, ''), ' ', 1), '');
  v_last  text := nullif(trim(substr(coalesce(new.full_name, ''), length(split_part(coalesce(new.full_name, ''), ' ', 1)) + 2)), '');
begin
  select id into v_pid from participants where email = v_email;

  if v_pid is null then
    insert into participants (email, full_name, first_name, last_name, source)
    values (v_email, nullif(new.full_name, ''), v_first, v_last, 'signup')
    returning id into v_pid;
  else
    update participants
      set full_name  = coalesce(full_name, nullif(new.full_name, '')),
          first_name = coalesce(first_name, v_first),
          last_name  = coalesce(last_name, v_last)
      where id = v_pid;
  end if;

  new.participant_id := v_pid;

  update group_members
    set status = 'joined', participant_id = v_pid, joined_at = now()
    where email = v_email and status = 'invited';

  return new;
end;
$$;

revoke execute on function public.link_profile_participant() from anon, authenticated, public;

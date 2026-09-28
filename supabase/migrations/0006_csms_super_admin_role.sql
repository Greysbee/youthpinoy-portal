-- Allow the participant/super_admin roles; is_admin() treats super_admin as admin.
-- (member vs participant is computed in the UI; admin/super_admin are stored.)
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student','member','participant','admin','super_admin'));

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')
  );
$$;

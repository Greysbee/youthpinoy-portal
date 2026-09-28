-- Functions default-grant EXECUTE to PUBLIC; revoke there so the access helpers
-- are truly server-only. (Revoking from anon/authenticated alone is not enough
-- because they inherit EXECUTE from PUBLIC.)
revoke execute on function public.accessible_event_ids(uuid) from public;
revoke execute on function public.can_watch(uuid, uuid)      from public;
grant  execute on function public.accessible_event_ids(uuid) to service_role;
grant  execute on function public.can_watch(uuid, uuid)      to service_role;

-- is_admin() and current_participant_id() intentionally remain callable by
-- anon/authenticated: RLS policies invoke them and they only reveal the caller's
-- own status (via auth.uid()). Revoking would break RLS evaluation.

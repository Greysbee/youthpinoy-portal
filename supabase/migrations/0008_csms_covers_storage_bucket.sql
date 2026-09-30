-- Public bucket for event/course cover images. Admins upload; anyone can read.
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

drop policy if exists "covers public read" on storage.objects;
drop policy if exists "covers admin insert" on storage.objects;
drop policy if exists "covers admin update" on storage.objects;
drop policy if exists "covers admin delete" on storage.objects;

create policy "covers public read" on storage.objects for select
  using (bucket_id = 'covers');
create policy "covers admin insert" on storage.objects for insert
  with check (bucket_id = 'covers' and public.is_admin());
create policy "covers admin update" on storage.objects for update
  using (bucket_id = 'covers' and public.is_admin());
create policy "covers admin delete" on storage.objects for delete
  using (bucket_id = 'covers' and public.is_admin());

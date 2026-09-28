-- CSMS portal — Milestone 1 seed (idempotent). Dev/test data only.
-- Test accounts all use password: CsmsTest!2026

-- ============ events (CSMSv8–v16) ============
insert into public.events (code, title, slug, description, start_at, end_at, is_online, status, price_centavos)
values
 ('CSMSv8','Catholic Social Media Summit v8','csms-v8','CSMS v8 recorded sessions.','2019-08-01','2019-08-02',true,'published',0),
 ('CSMSv9','Catholic Social Media Summit v9','csms-v9','CSMS v9 recorded sessions.','2020-08-01','2020-08-02',true,'published',50000),
 ('CSMSv10','Catholic Social Media Summit v10','csms-v10','CSMS v10 recorded sessions.','2021-08-01','2021-08-02',true,'published',50000),
 ('CSMSv11','Catholic Social Media Summit v11','csms-v11','CSMS v11 recorded sessions.','2022-08-01','2022-08-02',true,'published',50000),
 ('CSMSv12','Catholic Social Media Summit v12','csms-v12','CSMS v12 — bundle that includes v8–v11.','2023-08-01','2023-08-02',true,'published',150000),
 ('CSMSv13','Catholic Social Media Summit v13','csms-v13','CSMS v13 recorded sessions.','2023-11-01','2023-11-02',true,'published',50000),
 ('CSMSv14','Catholic Social Media Summit v14','csms-v14','CSMS v14 recorded sessions.','2024-05-01','2024-05-02',true,'published',50000),
 ('CSMSv15','Catholic Social Media Summit v15','csms-v15','CSMS v15 recorded sessions.','2024-11-01','2024-11-02',true,'published',50000),
 ('CSMSv16','Catholic Social Media Summit v16','csms-v16','CSMS v16 — bundle that includes all prior summits.','2025-08-01','2025-08-02',true,'published',250000)
on conflict (code) do nothing;

-- ============ event_includes (transitive package inheritance) ============
insert into public.event_includes (event_id, included_event_id)
select p.id, c.id from public.events p, public.events c
where p.code='CSMSv12' and c.code in ('CSMSv8','CSMSv9','CSMSv10','CSMSv11')
on conflict do nothing;

insert into public.event_includes (event_id, included_event_id)
select p.id, c.id from public.events p, public.events c
where p.code='CSMSv16' and c.code in ('CSMSv8','CSMSv9','CSMSv10','CSMSv11','CSMSv12','CSMSv13','CSMSv14','CSMSv15')
on conflict do nothing;

-- ============ videos (2 per event; Session 1 free preview) ============
insert into public.videos (event_id, title, description, provider, provider_ref, is_free, sort_order, status, duration_seconds)
select e.id, e.code || ' — ' || v.suffix, 'Sample recorded session for ' || e.code,
       'vimeo', '76979871', v.is_free, v.sort_order, 'published', 600
from public.events e
cross join (values
   ('Session 1 (Free Preview)', true, 1),
   ('Session 2', false, 2)
) as v(suffix, is_free, sort_order)
where e.code like 'CSMSv%'
  and not exists (select 1 from public.videos vv where vv.event_id = e.id and vv.sort_order = v.sort_order);

-- ============ test auth users (admin + 3 members) ============
-- Direct auth.users inserts for local/dev seeding. Password: CsmsTest!2026
do $$
declare rec record; uid uuid;
begin
  for rec in select * from (values
    ('admin@csms.test','CSMS Admin','admin'),
    ('member1@csms.test','Member One','member'),
    ('member2@csms.test','Member Two','member'),
    ('member3@csms.test','Member Three','member')
  ) as t(email, name, role)
  loop
    if not exists (select 1 from auth.users where email = rec.email) then
      uid := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
        rec.email, extensions.crypt('CsmsTest!2026', extensions.gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', rec.name),
        '', '', '', ''
      );
      insert into auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), uid, uid::text,
        jsonb_build_object('sub', uid::text, 'email', rec.email),
        'email', now(), now(), now()
      );
      if rec.role = 'admin' then
        update public.profiles set role = 'admin' where id = uid;
      end if;
    end if;
  end loop;
end $$;

-- ============ entitlements ============
-- member1 -> CSMSv8 (event)
insert into public.entitlements (participant_id, event_id, type, source)
select pt.id, e.id, 'event', 'legacy_import'
from public.participants pt, public.events e
where pt.email='member1@csms.test' and e.code='CSMSv8'
  and not exists (select 1 from public.entitlements x where x.participant_id=pt.id and x.event_id=e.id and x.type='event' and x.revoked_at is null);

-- member2 -> CSMSv12 (event) [cascades to v8–v11 via event_includes]
insert into public.entitlements (participant_id, event_id, type, source)
select pt.id, e.id, 'event', 'legacy_import'
from public.participants pt, public.events e
where pt.email='member2@csms.test' and e.code='CSMSv12'
  and not exists (select 1 from public.entitlements x where x.participant_id=pt.id and x.event_id=e.id and x.type='event' and x.revoked_at is null);

-- member3 -> all_access
insert into public.entitlements (participant_id, event_id, type, source)
select pt.id, null, 'all_access', 'legacy_import'
from public.participants pt
where pt.email='member3@csms.test'
  and not exists (select 1 from public.entitlements x where x.participant_id=pt.id and x.type='all_access' and x.revoked_at is null);

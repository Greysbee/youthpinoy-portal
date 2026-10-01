-- YP member ID: a sequential human-friendly id per participant (YP001, YP002, …).
-- member_no is the numeric sequence; member_id is the derived display code.
create sequence if not exists public.participant_member_no_seq;

alter table public.participants add column if not exists member_no bigint;

-- Backfill existing participants in signup order.
with ordered as (
  select id, row_number() over (order by created_at, id) as rn
  from public.participants
  where member_no is null
)
update public.participants p
  set member_no = o.rn
  from ordered o
  where p.id = o.id;

-- Advance the sequence past the highest assigned number.
select setval('public.participant_member_no_seq', coalesce((select max(member_no) from public.participants), 0), true);

-- New participants get the next number automatically.
alter table public.participants alter column member_no set default nextval('public.participant_member_no_seq');
alter sequence public.participant_member_no_seq owned by public.participants.member_no;
alter table public.participants alter column member_no set not null;
alter table public.participants add constraint participants_member_no_key unique (member_no);

-- Derived display id, always in sync with member_no.
alter table public.participants
  add column if not exists member_id text generated always as ('YP' || lpad(member_no::text, 3, '0')) stored;

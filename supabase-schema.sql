-- YouthPinoy Course Portal — Database Schema + RLS Policies
-- Paste this entire script into the Supabase SQL Editor and run it.

-- ============================================================
-- 1. TABLES
-- ============================================================

create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  email text not null,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  cover_image_url text,
  price numeric not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  description text,
  vimeo_url text,
  vimeo_id text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.course_materials (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text not null,
  file_url text not null,
  file_type text not null default 'pdf',
  created_at timestamptz not null default now()
);

create table public.enrollments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'free')),
  enrolled_at timestamptz not null default now(),
  unique (user_id, course_id)
);

-- ============================================================
-- 2. AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    'student'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.course_materials enable row level security;
alter table public.enrollments enable row level security;

-- ============================================================
-- 4. RLS POLICIES
-- ============================================================

-- PROFILES --
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- COURSES --
create policy "Anyone can read published courses"
  on public.courses for select
  using (is_published = true);

create policy "Admins can do everything with courses"
  on public.courses for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- LESSONS --
create policy "Enrolled users can read lessons"
  on public.lessons for select
  using (
    exists (
      select 1 from public.enrollments
      where enrollments.course_id = lessons.course_id
        and enrollments.user_id = auth.uid()
        and enrollments.status in ('paid', 'free')
    )
  );

create policy "Admins can do everything with lessons"
  on public.lessons for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- COURSE MATERIALS --
create policy "Enrolled users can read materials"
  on public.course_materials for select
  using (
    exists (
      select 1 from public.enrollments
      where enrollments.course_id = course_materials.course_id
        and enrollments.user_id = auth.uid()
        and enrollments.status in ('paid', 'free')
    )
  );

create policy "Admins can do everything with materials"
  on public.course_materials for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ENROLLMENTS --
create policy "Students can read own enrollments"
  on public.enrollments for select
  using (auth.uid() = user_id);

create policy "Students can create own enrollment"
  on public.enrollments for insert
  with check (auth.uid() = user_id and status = 'pending');

create policy "Admins can read all enrollments"
  on public.enrollments for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update enrollments"
  on public.enrollments for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- 5. STORAGE BUCKET FOR MATERIALS (PDFs)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('materials', 'materials', true);

create policy "Admins can upload materials"
  on storage.objects for insert
  with check (
    bucket_id = 'materials'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete materials"
  on storage.objects for delete
  using (
    bucket_id = 'materials'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Anyone can read materials"
  on storage.objects for select
  using (bucket_id = 'materials');

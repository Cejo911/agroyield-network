-- ============================================================================
-- Migration: profile_experience — LinkedIn-style experience rows on profiles
--
-- One-to-many: a profile has many experience rows. Each row captures a role
-- (title + organisation + dates + optional description). is_current signals
-- an ongoing role and implicitly means end_date is null.
--
-- Rendered read-only on /directory/[id] and /u/[slug]; edited on /profile.
--
-- Idempotent — safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A. Table
-- ---------------------------------------------------------------------------
create table if not exists public.profile_experience (
  id            uuid        primary key default gen_random_uuid(),
  profile_id    uuid        not null references public.profiles(id) on delete cascade,
  role          varchar(150) not null,
  organisation  varchar(150) not null,
  start_date    date        not null,
  end_date      date,
  is_current    boolean     not null default false,
  description   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (is_current = false or end_date is null),
  check (end_date is null or end_date >= start_date)
);

-- ---------------------------------------------------------------------------
-- B. Indexes
-- ---------------------------------------------------------------------------
-- "Show me this profile's experience, most recent first."
create index if not exists idx_profile_experience_profile_start
  on public.profile_experience(profile_id, start_date desc);

-- ---------------------------------------------------------------------------
-- C. RLS
--
-- SELECT: public to authenticated (experience is part of the profile page).
-- INSERT: profile_id = auth.uid().
-- UPDATE: profile_id = auth.uid().
-- DELETE: profile_id = auth.uid().
-- ---------------------------------------------------------------------------
alter table public.profile_experience enable row level security;

drop policy if exists "Authed users read all experience rows" on public.profile_experience;
create policy "Authed users read all experience rows"
  on public.profile_experience
  for select
  to authenticated
  using (true);

drop policy if exists "Users insert their own experience rows" on public.profile_experience;
create policy "Users insert their own experience rows"
  on public.profile_experience
  for insert
  to authenticated
  with check (profile_id = auth.uid());

drop policy if exists "Users update their own experience rows" on public.profile_experience;
create policy "Users update their own experience rows"
  on public.profile_experience
  for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "Users delete their own experience rows" on public.profile_experience;
create policy "Users delete their own experience rows"
  on public.profile_experience
  for delete
  to authenticated
  using (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- D. updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.tg_profile_experience_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tg_profile_experience_updated_at on public.profile_experience;
create trigger tg_profile_experience_updated_at
  before update on public.profile_experience
  for each row
  execute function public.tg_profile_experience_touch_updated_at();

-- ---------------------------------------------------------------------------
-- E. Comments
-- ---------------------------------------------------------------------------
comment on table  public.profile_experience              is
  'One-to-many experience rows per profile. Rendered on /directory/[id] and /u/[slug].';
comment on column public.profile_experience.is_current   is
  'True = ongoing role. Enforced: is_current implies end_date IS NULL.';

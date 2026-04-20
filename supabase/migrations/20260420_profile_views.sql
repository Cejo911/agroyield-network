-- ============================================================================
-- Migration: profile_views — who viewed whose profile, deduped per day
--
-- Written whenever an authenticated user lands on /directory/[id] or /u/[slug]
-- for another user. The (viewer_id, viewed_id, view_date) unique index keeps
-- the row count honest: one view per viewer per day, not one per refresh.
-- Pro-tier users can see the viewer identities; free-tier sees only the count.
--
-- Idempotent — safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A. Table
-- ---------------------------------------------------------------------------
create table if not exists public.profile_views (
  id          uuid        primary key default gen_random_uuid(),
  viewer_id   uuid        not null references public.profiles(id) on delete cascade,
  viewed_id   uuid        not null references public.profiles(id) on delete cascade,
  view_date   date        not null default (now() at time zone 'utc')::date,
  created_at  timestamptz not null default now(),
  check (viewer_id <> viewed_id)
);

-- ---------------------------------------------------------------------------
-- B. Indexes
-- ---------------------------------------------------------------------------
-- Dedup per (viewer, viewed, day) — prevents refresh-farming and keeps counts
-- meaningful. INSERT with ON CONFLICT DO NOTHING on the API side.
create unique index if not exists ux_profile_views_viewer_viewed_date
  on public.profile_views(viewer_id, viewed_id, view_date);

-- "How many views does viewed_id have?" — fast count + range scan.
create index if not exists idx_profile_views_viewed_created
  on public.profile_views(viewed_id, created_at desc);

-- ---------------------------------------------------------------------------
-- C. RLS
--
-- SELECT: viewed_id = auth.uid() (you see who viewed YOU) + admins.
-- INSERT: viewer_id = auth.uid() AND viewer_id <> viewed_id.
-- UPDATE/DELETE: not granted.
-- ---------------------------------------------------------------------------
alter table public.profile_views enable row level security;

drop policy if exists "Users read views of their own profile" on public.profile_views;
create policy "Users read views of their own profile"
  on public.profile_views
  for select
  to authenticated
  using (
    viewed_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Users insert their own view events" on public.profile_views;
create policy "Users insert their own view events"
  on public.profile_views
  for insert
  to authenticated
  with check (
    viewer_id = auth.uid()
    and viewer_id <> viewed_id
  );

-- ---------------------------------------------------------------------------
-- D. Comments
-- ---------------------------------------------------------------------------
comment on table  public.profile_views             is
  'Who viewed whose profile. Deduped per (viewer, viewed, day).';
comment on column public.profile_views.view_date   is
  'UTC date the view happened. Part of the dedup key.';

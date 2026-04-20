-- ============================================================================
-- Migration: saves — polymorphic "bookmark" store across content types
--
-- One table, one RLS policy set — every module that wants a Save/Bookmark
-- button writes here with (content_type, content_id). Partial unique index
-- prevents duplicates per user. /saved aggregates by type, counts per row.
--
-- Idempotent — safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A. Table
-- ---------------------------------------------------------------------------
create table if not exists public.saves (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  content_type  text        not null check (content_type in (
                               'opportunity',
                               'grant',
                               'marketplace_listing',
                               'research',
                               'business'
                             )),
  content_id    uuid        not null,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- B. Indexes
-- ---------------------------------------------------------------------------
-- One save per (user, type, id) — prevents double-taps and makes upsert cheap.
create unique index if not exists ux_saves_user_type_id
  on public.saves(user_id, content_type, content_id);

-- Fast lookup of "what has this user saved?" sorted most-recent first.
create index if not exists idx_saves_user_created
  on public.saves(user_id, created_at desc);

-- Fast lookup of "how many users saved this thing?" for aggregate counts.
create index if not exists idx_saves_content
  on public.saves(content_type, content_id);

-- ---------------------------------------------------------------------------
-- C. RLS
--
-- SELECT: user_id = auth.uid(). Saves are private — we intentionally do NOT
--         surface who has saved what to other users.
-- INSERT: user_id = auth.uid().
-- DELETE: user_id = auth.uid().
-- UPDATE: not granted. Re-save after delete if needed.
-- ---------------------------------------------------------------------------
alter table public.saves enable row level security;

drop policy if exists "Users read their own saves" on public.saves;
create policy "Users read their own saves"
  on public.saves
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users insert their own saves" on public.saves;
create policy "Users insert their own saves"
  on public.saves
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users delete their own saves" on public.saves;
create policy "Users delete their own saves"
  on public.saves
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- D. Comments
-- ---------------------------------------------------------------------------
comment on table  public.saves              is
  'Polymorphic bookmark store. One row per (user, content_type, content_id).';
comment on column public.saves.content_type is
  'Entity kind: opportunity | grant | marketplace_listing | research | business.';
comment on column public.saves.content_id   is
  'UUID of the entity; joined back on read via content_type.';

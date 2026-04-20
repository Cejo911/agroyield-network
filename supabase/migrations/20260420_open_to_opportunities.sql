-- ============================================================================
-- Migration: open_to_opportunities — LinkedIn #OpenToWork-style signal
--
-- Two new columns on profiles:
--   open_to_opportunities        bool     default false
--   open_to_opportunities_until  timestamptz  optional expiry
--
-- Filter on /directory, badge on profile cards, respect expiry server-side.
--
-- Idempotent — safe to re-run.
-- ============================================================================

alter table public.profiles
  add column if not exists open_to_opportunities       boolean     not null default false;

alter table public.profiles
  add column if not exists open_to_opportunities_until timestamptz;

-- Fast "who is open right now?" filter for /directory.
create index if not exists idx_profiles_open_to_opportunities
  on public.profiles(open_to_opportunities)
  where open_to_opportunities = true;

comment on column public.profiles.open_to_opportunities       is
  'User-controlled toggle. True = show OPEN badge + appear in /directory Open filter.';
comment on column public.profiles.open_to_opportunities_until is
  'Optional expiry. When set and in the past, the flag is treated as false server-side.';

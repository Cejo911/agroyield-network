-- ============================================================================
-- Migration: businesses verified-badge fields
--
-- Adds:
--   businesses.is_verified  boolean  NOT NULL DEFAULT false
--   businesses.verified_at  timestamptz
--
-- Together these support the "Verified ✓" chip next to the business name on
-- /b/{slug} and the admin toggle that sets the flag. Mirrors the pattern
-- already used on `profiles.is_verified` / `profiles.verified_at`.
--
-- Idempotent — safe to re-run. No backfill (default false) so the chip only
-- appears for businesses an admin has explicitly verified.
-- ============================================================================

alter table public.businesses
  add column if not exists is_verified boolean not null default false,
  add column if not exists verified_at timestamptz;

-- Partial index keeps the Businesses → Verified admin query fast even when
-- the verified set grows (hundreds of thousands of unverified rows in the
-- long tail would otherwise dominate a plain index).
create index if not exists idx_businesses_is_verified
  on public.businesses(is_verified) where is_verified = true;

comment on column public.businesses.is_verified is
  'Admin-set verification flag. Renders a "Verified ✓" chip on /b/{slug}.';
comment on column public.businesses.verified_at is
  'Timestamp of the most recent admin verification. Null when not verified.';

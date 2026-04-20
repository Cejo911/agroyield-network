-- ============================================================================
-- Migration: pg_trgm-backed global search
--
-- Enables fuzzy / substring search across the five surfaces powering
-- site-wide search:
--   • profiles            (people)
--   • opportunities       (jobs, fellowships, grants cross-post, etc.)
--   • grants              (funding)
--   • marketplace_listings (items & services)
--   • businesses          (public agribusinesses)
--
-- Trigram GIN indexes accelerate leading+trailing-wildcard ILIKE scans
-- (e.g. `%cassava%` → bounded index scan instead of sequential scan), which
-- is what our client-library-emitted search queries actually produce.
--
-- Idempotent — safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A. Extension
-- ---------------------------------------------------------------------------
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- B. Profiles — name / username / role / institution / bio
-- ---------------------------------------------------------------------------
create index if not exists idx_profiles_first_name_trgm
  on public.profiles using gin (first_name gin_trgm_ops);
create index if not exists idx_profiles_last_name_trgm
  on public.profiles using gin (last_name  gin_trgm_ops);
create index if not exists idx_profiles_username_trgm
  on public.profiles using gin (username   gin_trgm_ops);
create index if not exists idx_profiles_role_trgm
  on public.profiles using gin (role       gin_trgm_ops);
create index if not exists idx_profiles_institution_trgm
  on public.profiles using gin (institution gin_trgm_ops);
create index if not exists idx_profiles_bio_trgm
  on public.profiles using gin (bio        gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- C. Opportunities — title / organisation / description / location
-- ---------------------------------------------------------------------------
create index if not exists idx_opportunities_title_trgm
  on public.opportunities using gin (title        gin_trgm_ops);
create index if not exists idx_opportunities_organisation_trgm
  on public.opportunities using gin (organisation gin_trgm_ops);
create index if not exists idx_opportunities_description_trgm
  on public.opportunities using gin (description  gin_trgm_ops);
create index if not exists idx_opportunities_location_trgm
  on public.opportunities using gin (location     gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- D. Grants — title / funder / description / region
-- ---------------------------------------------------------------------------
create index if not exists idx_grants_title_trgm
  on public.grants using gin (title       gin_trgm_ops);
create index if not exists idx_grants_funder_trgm
  on public.grants using gin (funder      gin_trgm_ops);
create index if not exists idx_grants_description_trgm
  on public.grants using gin (description gin_trgm_ops);
create index if not exists idx_grants_region_trgm
  on public.grants using gin (region      gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- E. Marketplace listings — title / description / category / state
-- ---------------------------------------------------------------------------
create index if not exists idx_marketplace_title_trgm
  on public.marketplace_listings using gin (title       gin_trgm_ops);
create index if not exists idx_marketplace_description_trgm
  on public.marketplace_listings using gin (description gin_trgm_ops);
create index if not exists idx_marketplace_category_trgm
  on public.marketplace_listings using gin (category    gin_trgm_ops);
create index if not exists idx_marketplace_state_trgm
  on public.marketplace_listings using gin (state       gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- F. Businesses — name / tagline / about / sector / state
-- ---------------------------------------------------------------------------
create index if not exists idx_businesses_name_trgm
  on public.businesses using gin (name    gin_trgm_ops);
create index if not exists idx_businesses_tagline_trgm
  on public.businesses using gin (tagline gin_trgm_ops);
create index if not exists idx_businesses_about_trgm
  on public.businesses using gin (about   gin_trgm_ops);
create index if not exists idx_businesses_sector_trgm
  on public.businesses using gin (sector  gin_trgm_ops);
create index if not exists idx_businesses_state_trgm
  on public.businesses using gin (state   gin_trgm_ops);

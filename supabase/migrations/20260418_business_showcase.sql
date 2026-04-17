-- ============================================================================
-- Migration: business showcase fields
-- Adds marketing-page fields to businesses so /b/{slug} becomes a proper
-- landing page (tagline, about, cover image, website, socials, hours, founded).
-- Idempotent — safe to re-run.
-- ============================================================================

alter table public.businesses
  add column if not exists tagline          text,
  add column if not exists about            text,
  add column if not exists cover_image_url  text,
  add column if not exists website          text,
  add column if not exists instagram        text,
  add column if not exists facebook         text,
  add column if not exists opening_hours    text,
  add column if not exists founded_year     integer;

-- Sanity: founded_year reasonable range (optional — keeps bad data out)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'businesses'
      and constraint_name = 'businesses_founded_year_range'
  ) then
    alter table public.businesses
      add constraint businesses_founded_year_range
      check (founded_year is null or (founded_year between 1800 and extract(year from now())::int + 1));
  end if;
end $$;

comment on column public.businesses.tagline         is 'One-line pitch shown under business name on /b/{slug}.';
comment on column public.businesses.about           is 'Long-form description rendered on /b/{slug}.';
comment on column public.businesses.cover_image_url is 'Banner image at the top of /b/{slug}. Stored in business-logos bucket.';
comment on column public.businesses.website         is 'Public website URL (optional).';
comment on column public.businesses.instagram       is 'Instagram handle (without @) or full URL.';
comment on column public.businesses.facebook        is 'Facebook page handle or full URL.';
comment on column public.businesses.opening_hours   is 'Free-form opening hours, e.g. "Mon–Sat 8am–6pm". Preserves line breaks.';
comment on column public.businesses.founded_year    is 'Year the business was founded (1800 – current year).';

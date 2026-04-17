-- 20260417_business_slugs.sql
-- F1: Public business URL infrastructure
--
-- Adds:
--   1. businesses.slug (unique, auto-generated from name)
--   2. businesses.is_public (admin kill switch per business)
--   3. reserved_slugs (blocklist: routing, brand, Nigerian gov, CAC-restricted)
--   4. business_slug_aliases (historical slugs for 301 redirects after admin rename)
--   5. Auto-slug trigger on businesses insert
--   6. Backfill for existing rows
-- Idempotent.

-- ---------------------------------------------------------------------------
-- A. Columns on businesses
-- ---------------------------------------------------------------------------
alter table public.businesses
  add column if not exists slug text,
  add column if not exists is_public boolean not null default true;

-- ---------------------------------------------------------------------------
-- B. Reserved slugs (single source of truth enforced by trigger + admin API)
-- ---------------------------------------------------------------------------
create table if not exists public.reserved_slugs (
  slug text primary key,
  category text,
  added_at timestamptz not null default now()
);

insert into public.reserved_slugs (slug, category) values
  -- App routing / common routes
  ('admin','routing'), ('api','routing'), ('dashboard','routing'),
  ('app','routing'), ('b','routing'), ('u','routing'),
  ('www','routing'), ('mail','routing'), ('new','routing'),
  ('login','common'), ('signup','common'), ('settings','common'),
  ('about','common'), ('contact','common'), ('privacy','common'),
  ('terms','common'), ('pricing','common'), ('support','common'),
  ('help','common'), ('edit','common'), ('test','common'),
  ('null','common'), ('undefined','common'),
  -- Brand
  ('agroyield','brand'),
  -- Nigerian government umbrella
  ('federal','nigerian-gov'), ('national','nigerian-gov'),
  ('nigeria','nigerian-gov'), ('nigerian','nigerian-gov'),
  ('government','nigerian-gov'), ('fgn','nigerian-gov'),
  ('state','nigerian-gov'),
  -- Authority titles
  ('ministry','nigerian-gov'), ('presidential','nigerian-gov'),
  ('president','nigerian-gov'), ('senate','nigerian-gov'),
  ('assembly','nigerian-gov'), ('governor','nigerian-gov'),
  ('minister','nigerian-gov'),
  -- Nigerian agencies
  ('cac','nigerian-gov'), ('cbn','nigerian-gov'),
  ('nafdac','nigerian-gov'), ('son','nigerian-gov'),
  ('frsc','nigerian-gov'), ('efcc','nigerian-gov'),
  ('icpc','nigerian-gov'), ('nimc','nigerian-gov'),
  ('firs','nigerian-gov'), ('ncc','nigerian-gov'),
  ('nitda','nigerian-gov'), ('inec','nigerian-gov'),
  ('ndlea','nigerian-gov'), ('nysc','nigerian-gov'),
  ('sec','nigerian-gov'), ('nerc','nigerian-gov'),
  ('nnpc','nigerian-gov'), ('nddc','nigerian-gov'),
  ('dss','nigerian-gov'), ('nda','nigerian-gov'),
  -- Defence
  ('army','defence'), ('navy','defence'),
  ('police','defence'), ('military','defence'),
  ('air-force','defence'),
  -- CAC-restricted (royal/religious)
  ('royal','cac-restricted'), ('imperial','cac-restricted'),
  ('kingdom','cac-restricted'), ('church','cac-restricted'),
  ('mosque','cac-restricted'),
  -- Regulated sectors (need CBN / NUC / NMDCN approval to use in a business name)
  ('bank','regulated'), ('insurance','regulated'),
  ('trust','regulated'), ('broker','regulated'),
  ('university','regulated'), ('college','regulated'),
  ('academy','regulated'), ('hospital','regulated'),
  ('clinic','regulated')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- C. Alias table (historical slugs for 301 redirect after admin rename)
-- ---------------------------------------------------------------------------
create table if not exists public.business_slug_aliases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  old_slug text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_business_slug_aliases_business_id
  on public.business_slug_aliases(business_id);

-- ---------------------------------------------------------------------------
-- D. Backfill existing businesses
-- ---------------------------------------------------------------------------
do $$
declare
  biz record;
  base_slug text;
  candidate text;
  n int;
begin
  for biz in select id, name from public.businesses where slug is null or slug = '' loop
    base_slug := lower(coalesce(biz.name, 'business'));
    base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
    base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
    base_slug := substring(base_slug, 1, 40);
    if base_slug = '' or base_slug is null then
      base_slug := 'business';
    end if;

    -- If name collides with a reserved slug, decorate
    if exists(select 1 from public.reserved_slugs where slug = base_slug) then
      base_slug := base_slug || '-biz';
    end if;

    candidate := base_slug;
    n := 2;
    while exists(select 1 from public.businesses where slug = candidate) loop
      candidate := base_slug || '-' || n;
      n := n + 1;
      if n > 1000 then exit; end if;
    end loop;

    update public.businesses set slug = candidate where id = biz.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- E. Unique constraint + NOT NULL + indexes
-- ---------------------------------------------------------------------------
alter table public.businesses alter column slug set not null;
create unique index if not exists ux_businesses_slug on public.businesses(slug);
create index if not exists idx_businesses_is_public
  on public.businesses(is_public) where is_public = true;

-- ---------------------------------------------------------------------------
-- F. Auto-slug trigger for new inserts (so client code can just insert name)
-- ---------------------------------------------------------------------------
create or replace function public.businesses_auto_slug()
returns trigger as $$
declare
  base_slug text;
  candidate text;
  n int;
begin
  if new.slug is not null and new.slug != '' then
    return new;
  end if;

  base_slug := lower(coalesce(new.name, 'business'));
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
  base_slug := substring(base_slug, 1, 40);
  if base_slug = '' or base_slug is null then
    base_slug := 'business';
  end if;

  if exists(select 1 from public.reserved_slugs where slug = base_slug) then
    base_slug := base_slug || '-biz';
  end if;

  candidate := base_slug;
  n := 2;
  while exists(
    select 1 from public.businesses where slug = candidate
    union all
    select 1 from public.business_slug_aliases where old_slug = candidate
  ) loop
    candidate := base_slug || '-' || n;
    n := n + 1;
    if n > 1000 then exit; end if;
  end loop;

  new.slug := candidate;
  return new;
end;
$$ language plpgsql;

drop trigger if exists businesses_auto_slug_trigger on public.businesses;
create trigger businesses_auto_slug_trigger
  before insert on public.businesses
  for each row
  execute function public.businesses_auto_slug();

-- ---------------------------------------------------------------------------
-- G. RLS — public read for slug lookup (the tables are indexes, not sensitive)
-- ---------------------------------------------------------------------------
alter table public.business_slug_aliases enable row level security;
drop policy if exists "Anyone can read business slug aliases" on public.business_slug_aliases;
create policy "Anyone can read business slug aliases"
  on public.business_slug_aliases for select using (true);

alter table public.reserved_slugs enable row level security;
drop policy if exists "Anyone can read reserved slugs" on public.reserved_slugs;
create policy "Anyone can read reserved slugs"
  on public.reserved_slugs for select using (true);

-- ---------------------------------------------------------------------------
-- H. Comments
-- ---------------------------------------------------------------------------
comment on column public.businesses.slug is
  'Unique URL-safe identifier for /b/{slug}. Auto-generated from name on insert.';
comment on column public.businesses.is_public is
  'When false, /b/{slug} returns 404. Admin kill switch.';
comment on table public.business_slug_aliases is
  'Historical slugs preserved on admin rename. /b/{old_slug} 301-redirects to current.';
comment on table public.reserved_slugs is
  'Slugs blocked at creation (app routing, brand, Nigerian government, CAC-restricted).';

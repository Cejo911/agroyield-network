-- ============================================================================
-- Migration: business_reviews — business-level reviews for /b/{slug}
--
-- product_reviews already exists but is product-scoped. Businesses that sell
-- services (not products) or whose buyers want to leave a review of the whole
-- business relationship need their own row. Schema mirrors product_reviews
-- (rating, headline, body, seller_reply, replied_at, published, created_at)
-- so future rollups are uniform.
--
-- Idempotent — safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A. Table
-- ---------------------------------------------------------------------------
create table if not exists public.business_reviews (
  id           uuid        primary key default gen_random_uuid(),
  business_id  uuid        not null references public.businesses(id) on delete cascade,
  reviewer_id  uuid        not null references public.profiles(id)   on delete cascade,
  rating       integer     not null check (rating between 1 and 5),
  headline     varchar(150),
  body         text,
  seller_reply text,
  replied_at   timestamptz,
  published    boolean     not null default true,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- B. One review per user per business (prevents brigading)
-- ---------------------------------------------------------------------------
create unique index if not exists ux_business_reviews_reviewer_per_business
  on public.business_reviews(business_id, reviewer_id);

create index if not exists idx_business_reviews_business_id
  on public.business_reviews(business_id);

create index if not exists idx_business_reviews_reviewer_id
  on public.business_reviews(reviewer_id);

-- ---------------------------------------------------------------------------
-- C. RLS
--
-- SELECT: any authenticated user can read PUBLISHED rows. Reviewer, business
--         owner, and admins can also see their own unpublished rows (so an
--         unpublished review still shows up to the author / owner / admin).
-- INSERT: reviewer must be the authed user AND must NOT be the business owner
--         (block self-reviews at the RLS layer as a defence-in-depth; the API
--         already enforces this too).
-- UPDATE: reviewer (edit own review), business owner (post seller_reply),
--         admins (moderation) — all can update. WITH CHECK mirrors USING so
--         an owner can't reassign the row to another business, etc.
-- DELETE: not granted. Reviewers wanting to retract should edit their review
--         or contact support; admins drop rows via the service role if needed.
-- ---------------------------------------------------------------------------
alter table public.business_reviews enable row level security;

drop policy if exists "Authed users read published + own/owner/admin unpublished"
  on public.business_reviews;
create policy "Authed users read published + own/owner/admin unpublished"
  on public.business_reviews
  for select
  to authenticated
  using (
    published = true
    or reviewer_id = auth.uid()
    or business_id in (select id from public.businesses where user_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Authed non-owners insert their own review"
  on public.business_reviews;
create policy "Authed non-owners insert their own review"
  on public.business_reviews
  for insert
  to authenticated
  with check (
    reviewer_id = auth.uid()
    and business_id not in (select id from public.businesses where user_id = auth.uid())
  );

drop policy if exists "Reviewer, owner, or admin can update"
  on public.business_reviews;
create policy "Reviewer, owner, or admin can update"
  on public.business_reviews
  for update
  to authenticated
  using (
    reviewer_id = auth.uid()
    or business_id in (select id from public.businesses where user_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    reviewer_id = auth.uid()
    or business_id in (select id from public.businesses where user_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ---------------------------------------------------------------------------
-- D. Comments
-- ---------------------------------------------------------------------------
comment on table  public.business_reviews               is
  'Business-level reviews rendered below the product list on /b/{slug}.';
comment on column public.business_reviews.rating        is '1–5 stars.';
comment on column public.business_reviews.headline      is 'Optional short title (≤150 chars).';
comment on column public.business_reviews.body          is 'Optional long-form review text.';
comment on column public.business_reviews.seller_reply  is 'Business owner reply to the review. One per review.';
comment on column public.business_reviews.replied_at    is 'When the seller_reply was posted.';
comment on column public.business_reviews.published     is 'Admin/owner moderation flag. false = hidden from public readers.';

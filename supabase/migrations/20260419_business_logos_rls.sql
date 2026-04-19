-- ============================================================================
-- Migration: business-logos storage bucket + RLS policies
--
-- Fix: "new row violates row-level security policy" when uploading a cover
-- image from /business/setup for an existing business. Root cause: no RLS
-- policy on storage.objects allowed INSERTs whose first path segment is a
-- business UUID owned by auth.uid(). This adds owner-scoped INSERT / UPDATE /
-- DELETE policies plus public SELECT (since /b/{slug} renders covers and
-- logos publicly), and creates the bucket if it doesn't already exist.
--
-- Path conventions (both supported by the policies below):
--   {businessId}/logo.{ext}
--   {businessId}/cover.{ext}
--   {userId}/new_{timestamp}/logo.{ext}        -- during business creation
--   {userId}/new_{timestamp}/cover.{ext}       -- during business creation
--
-- Idempotent — safe to re-run.
-- ============================================================================

-- 1) Ensure the bucket exists and is public-read.
insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do update set public = excluded.public;

-- 2) Public read — cover and logo images render on public /b/{slug} pages.
drop policy if exists "business_logos_select_public" on storage.objects;
create policy "business_logos_select_public"
  on storage.objects
  for select
  to public
  using (bucket_id = 'business-logos');

-- 3) INSERT — authenticated users may upload iff the first path segment is
-- either (a) a business.id they own, or (b) their own auth.uid() (covers
-- the "new business, no ID yet" creation flow).
drop policy if exists "business_logos_insert_owner" on storage.objects;
create policy "business_logos_insert_owner"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'business-logos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.businesses b
        where b.id::text = (storage.foldername(name))[1]
          and b.user_id = auth.uid()
      )
    )
  );

-- 4) UPDATE — same owner gate. `upsert: true` in the client triggers UPDATE
-- when the object already exists (e.g. replacing an existing cover).
drop policy if exists "business_logos_update_owner" on storage.objects;
create policy "business_logos_update_owner"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'business-logos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.businesses b
        where b.id::text = (storage.foldername(name))[1]
          and b.user_id = auth.uid()
      )
    )
  )
  with check (
    bucket_id = 'business-logos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.businesses b
        where b.id::text = (storage.foldername(name))[1]
          and b.user_id = auth.uid()
      )
    )
  );

-- 5) DELETE — same owner gate, for the "Remove cover / Remove logo" buttons.
drop policy if exists "business_logos_delete_owner" on storage.objects;
create policy "business_logos_delete_owner"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'business-logos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.businesses b
        where b.id::text = (storage.foldername(name))[1]
          and b.user_id = auth.uid()
      )
    )
  );

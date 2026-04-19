-- ============================================================================
-- Migration: business-logos storage RLS — CORRECTED
--
-- Fixes a name-resolution bug in 20260419_business_logos_rls.sql. In the
-- original policy:
--
--   exists (select 1 from public.businesses b
--           where b.id::text = (storage.foldername(name))[1]
--             and b.user_id = auth.uid())
--
-- Postgres resolved the bare `name` inside the subquery to businesses.name
-- (the business display name string) instead of storage.objects.name (the
-- file path we meant). Result: the policy silently evaluated false for every
-- insert/update/delete, so RLS kept rejecting uploads even though the policy
-- text looked correct.
--
-- The fix uses IN (subquery) so the storage.foldername() call stays in the
-- outer storage.objects scope and can't be shadowed by businesses.name.
--
-- Idempotent — safe to re-run.
-- ============================================================================

-- Ensure the bucket exists (no-op if already there).
insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do update set public = excluded.public;

-- Public read — covers and logos render on public /b/{slug} pages.
drop policy if exists "business_logos_select_public" on storage.objects;
create policy "business_logos_select_public"
  on storage.objects
  for select
  to public
  using (bucket_id = 'business-logos');

-- INSERT — permit if first path segment is either the user's uid OR a
-- business.id they own. Uses IN (…) to avoid the name-shadowing bug.
drop policy if exists "business_logos_insert_owner" on storage.objects;
create policy "business_logos_insert_owner"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'business-logos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] in (
        select b.id::text
          from public.businesses b
         where b.user_id = auth.uid()
      )
    )
  );

-- UPDATE — same owner gate for upsert-triggered updates.
drop policy if exists "business_logos_update_owner" on storage.objects;
create policy "business_logos_update_owner"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'business-logos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] in (
        select b.id::text from public.businesses b where b.user_id = auth.uid()
      )
    )
  )
  with check (
    bucket_id = 'business-logos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] in (
        select b.id::text from public.businesses b where b.user_id = auth.uid()
      )
    )
  );

-- DELETE — same owner gate for "Remove cover / Remove logo".
drop policy if exists "business_logos_delete_owner" on storage.objects;
create policy "business_logos_delete_owner"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'business-logos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] in (
        select b.id::text from public.businesses b where b.user_id = auth.uid()
      )
    )
  );

-- Clean up the old, broader dashboard-template policies if they're still
-- around. They required `(auth.uid())::text = (storage.foldername(name))[1]`,
-- which blocks the businessId-as-first-folder path we actually use. The new
-- policies above cover both the userId-first and businessId-first cases, so
-- these legacy ones are redundant and harmful. Safe to drop.
drop policy if exists "Users can upload own logo"      on storage.objects;
drop policy if exists "Users can update own logo"      on storage.objects;
drop policy if exists "Authenticated users can upload logos" on storage.objects;
drop policy if exists "Anyone can view logos"          on storage.objects;
-- (business_logos_select_public above replaces "Anyone can view logos".)

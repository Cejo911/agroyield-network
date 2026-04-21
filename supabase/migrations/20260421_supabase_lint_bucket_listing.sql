-- 2026-04-21  Supabase lint: drop broad SELECT policies on 7 public buckets
--
-- Supabase lint: public_bucket_allows_listing (WARN × 7)
--
-- These buckets are correctly marked `public = true`, which means
-- direct-URL object access via /storage/v1/object/public/<bucket>/<path>
-- works without any policy at all. That's the path our <Image> and
-- <img> tags use end-to-end; no code calls .list() on these buckets
-- from a client context.
--
-- The extra SELECT policy on storage.objects that Supabase's dashboard
-- auto-created for "public read" buckets is what enables the list()
-- endpoint — i.e. letting anon/authenticated clients enumerate every
-- file in the bucket. That's the surface the lint flags: an attacker
-- could list `community-images` and find drafts, orphaned uploads, or
-- previously-posted-then-deleted content whose object still exists.
--
-- Dropping these 7 policies:
--   • Does NOT break public URL access (that path is bucket.public-driven).
--   • DOES close the list endpoint for anon + authenticated.
--   • Does NOT affect service-role code — it bypasses storage.objects RLS.
--
-- Buckets covered: avatars, business-logos, community-images,
-- marketplace-images, message-attachments, opportunity-images,
-- research-files.
--
-- If any future feature needs .list() on one of these buckets from a
-- user context, replace the broad policy with a path-prefix-scoped
-- one — e.g. USING (bucket_id = 'avatars' AND owner = auth.uid()) —
-- instead of reverting this migration wholesale.
--
-- Rollback: recreate each policy with
--   CREATE POLICY "<name>" ON storage.objects FOR SELECT
--   TO public USING (bucket_id = '<bucket>');
-- Names are preserved below for reference.

DROP POLICY IF EXISTS "Public avatar read"              ON storage.objects;
DROP POLICY IF EXISTS "business_logos_select_public"    ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view community images" ON storage.objects;
DROP POLICY IF EXISTS "Public read marketplace images"   ON storage.objects;
DROP POLICY IF EXISTS "message_attachments_select_public" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view opportunity images" ON storage.objects;
DROP POLICY IF EXISTS "Public read research files"       ON storage.objects;

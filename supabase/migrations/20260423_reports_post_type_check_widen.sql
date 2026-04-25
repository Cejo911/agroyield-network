-- 20260423_reports_post_type_check_widen.sql
--
-- Widen the public.reports.post_type CHECK constraint to include all
-- surfaces that ship a Report button.
--
-- Background
-- ----------
-- A CHECK constraint named `reports_post_type_check` exists on
-- public.reports. It was added out-of-band (not present in any prior
-- migration file in this repo — likely via the Supabase dashboard or
-- a one-off SQL snippet) and only permits the original three surfaces:
--
--   opportunity, listing, business_review
--
-- Because of this, inserts for price_report / research / community_post
-- were silently rejected by Postgres ("new row for relation \"reports\"
-- violates check constraint \"reports_post_type_check\""). The earlier
-- /api/report POST handler awaited the insert without checking its
-- error, so users saw "✓ Reported" but no row landed and the admin
-- moderation queue stayed empty for those surfaces.
--
-- The error became loud after the error-handling commit on the route;
-- this migration removes the underlying cause.
--
-- What this migration does
-- ------------------------
-- Drops the existing constraint (if present) and recreates it with the
-- full set of 6 valid post_types. Idempotent: safe to re-run, safe to
-- apply to fresh dev databases that don't have the constraint at all.
--
-- The DROP IF EXISTS + ADD pattern (rather than a no-op when missing)
-- is intentional: if a fresh DB ends up without the constraint, this
-- migration will install it; if a prod DB already has the narrow form,
-- this swaps it for the wider form atomically.
--
-- The new list mirrors:
--   • app/components/ReportButton.tsx postType union
--   • app/api/report/route.ts request type + auto-hide table map
--   • app/api/admin/reports/route.ts DELETE restore table map
--   • app/admin/page.tsx + admin-client.tsx ReportGroup union
--
-- Pre-flight check (recommended in staging before applying):
--   SELECT pg_get_constraintdef(oid)
--     FROM pg_constraint
--    WHERE conname = 'reports_post_type_check';
--   -- Should return the current narrow CHECK; null if missing.
--
-- Verification (run post-apply):
--   SELECT pg_get_constraintdef(oid)
--     FROM pg_constraint
--    WHERE conname = 'reports_post_type_check';
--   -- Expected: CHECK ((post_type = ANY (ARRAY['opportunity'::text, ...])))
--
-- Rollback
-- --------
-- If a future surface is added but the migration file isn't updated,
-- inserts will fail again (loud now, not silent). Either:
--   (a) ship a follow-up migration extending the list, or
--   (b) drop the constraint entirely and rely on the API/component
--       layer for validation:
--         ALTER TABLE public.reports DROP CONSTRAINT reports_post_type_check;
--
-- For a clean rollback to the prior narrow definition:
--   ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_post_type_check;
--   ALTER TABLE public.reports ADD CONSTRAINT reports_post_type_check
--     CHECK (post_type IN ('opportunity', 'listing', 'business_review'));

BEGIN;

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_post_type_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_post_type_check
  CHECK (post_type IN (
    'opportunity',
    'listing',
    'business_review',
    'price_report',
    'research',
    'community_post'
  ));

COMMIT;

-- Smoke test (optional, run as a separate statement post-apply):
--   INSERT INTO public.reports (user_id, post_type, post_id, reason)
--   VALUES (
--     (SELECT id FROM public.profiles LIMIT 1),
--     'price_report',
--     '00000000-0000-0000-0000-000000000000',
--     'Spam'
--   );
--   -- Should succeed (post_type passes CHECK). The post_id won't
--   -- match a real price_report row but reports has no FK to enforce
--   -- that, so the insert lands. Clean up:
--   DELETE FROM public.reports WHERE post_id = '00000000-0000-0000-0000-000000000000';

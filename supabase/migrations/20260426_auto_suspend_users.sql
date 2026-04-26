-- 20260426_auto_suspend_users.sql
--
-- Auto-suspend users when N distinct reporters have flagged their content.
--
-- Scope
-- -----
-- Threshold-based suspension is fired from /api/report POST after the
-- existing per-post auto-hide check. Counting model is "distinct
-- reporters across this user's content (any post type)" — closer to a
-- real abuse-consensus signal than raw report count, and more resistant
-- to one angry user serially reporting many posts (which the per-post
-- duplicate dedupe already prevents per post).
--
-- This migration sets up the schema and seed data that the route
-- handler depends on:
--
--   1. public.reports.post_author_id (uuid, FK profiles, ON DELETE
--      SET NULL). Denormalised at insert time so the threshold check
--      is a single fast COUNT(DISTINCT user_id) instead of joining
--      reports to N post-type tables on every new report.
--
--   2. Backfill post_author_id for existing report rows by looking up
--      each row's author from the appropriate post-type table. Authors
--      that have been deleted (extremely rare) end up NULL — those
--      rows are excluded from future threshold checks, which is fine.
--
--   3. public.profiles.last_suspension_cleared_at (timestamptz). When
--      a super admin manually unsuspends a user, /api/admin/member
--      stamps this column with now() — the threshold query then only
--      counts reports with created_at > last_suspension_cleared_at,
--      so an unsuspended user gets a fresh slate without us deleting
--      audit history.
--
--   4. public.settings('user_suspension_threshold', '3'). Independent
--      from the existing report_threshold (used for content auto-hide)
--      so admins can tune content moderation and account-level
--      consequences separately.
--
-- Idempotent — safe to re-run, safe on fresh dev DBs.

BEGIN;

-- 1. Denormalised author column on reports.
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS post_author_id uuid
  REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.reports.post_author_id IS
  'Author of the reported post, copied from the post-type table at insert time. Powers the user_suspension_threshold check in /api/report POST without N joins.';

-- Partial index — threshold queries always filter on a non-null author.
CREATE INDEX IF NOT EXISTS idx_reports_post_author_id
  ON public.reports(post_author_id)
  WHERE post_author_id IS NOT NULL;

-- 2. Backfill post_author_id from the appropriate post-type table.
--    Skip rows that already have it set so this is safe to re-run.
UPDATE public.reports r
   SET post_author_id = CASE r.post_type
     WHEN 'opportunity' THEN
       (SELECT user_id FROM public.opportunities WHERE id = r.post_id)
     WHEN 'listing' THEN
       (SELECT user_id FROM public.marketplace_listings WHERE id = r.post_id)
     WHEN 'community_post' THEN
       (SELECT user_id FROM public.community_posts WHERE id = r.post_id)
     WHEN 'research' THEN
       (SELECT user_id FROM public.research_posts WHERE id = r.post_id)
     WHEN 'price_report' THEN
       (SELECT user_id FROM public.price_reports WHERE id = r.post_id)
     WHEN 'business_review' THEN
       (SELECT reviewer_id FROM public.business_reviews WHERE id = r.post_id)
   END
 WHERE r.post_author_id IS NULL;

-- 3. Suspension-clear marker on profiles. NULL means "never suspended"
--    and is treated as -infinity in the threshold query (every report
--    counts). After an unsuspend it's stamped with now() so only
--    fresh reports count toward a re-suspension.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_suspension_cleared_at timestamptz;

COMMENT ON COLUMN public.profiles.last_suspension_cleared_at IS
  'Set to now() by /api/admin/member action=unsuspend. Threshold check in /api/report POST only counts reports with created_at > this column, so unsuspending a user effectively resets their report-counter clock without deleting audit history.';

-- 4. Threshold setting. Independent from report_threshold so content
--    moderation and account suspension can be tuned separately.
INSERT INTO public.settings (key, value)
VALUES ('user_suspension_threshold', '3')
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- Verification (run post-apply):
--   SELECT count(*) FILTER (WHERE post_author_id IS NULL) AS null_author,
--          count(*) FILTER (WHERE post_author_id IS NOT NULL) AS with_author
--     FROM public.reports;
--   -- null_author should equal the count of reports whose post or
--   -- post-author has been deleted (likely 0 in a fresh DB).
--
--   SELECT * FROM public.settings WHERE key = 'user_suspension_threshold';
--   -- expect: ('user_suspension_threshold', '3')
--
--   \d+ public.reports
--   \d+ public.profiles
--   -- expect post_author_id column with FK and the index, and
--   -- last_suspension_cleared_at column on profiles.

-- Rollback (last resort)
-- ----------------------
--   DROP INDEX IF EXISTS idx_reports_post_author_id;
--   ALTER TABLE public.reports DROP COLUMN IF EXISTS post_author_id;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS last_suspension_cleared_at;
--   DELETE FROM public.settings WHERE key = 'user_suspension_threshold';
-- The /api/report and /api/admin/member route changes shipped in the
-- same commit must be reverted alongside the rollback or they'll
-- 500 on the missing column.

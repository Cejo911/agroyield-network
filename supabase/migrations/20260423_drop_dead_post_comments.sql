-- 20260423_drop_dead_post_comments.sql
--
-- Drop the unused public.post_comments table.
--
-- Why now
-- -------
-- In baseline (00000000000000_baseline.sql line 981) we created two
-- candidate comment tables: public.comments (polymorphic, with a
-- post_type discriminator) and public.post_comments (dedicated).
-- Only the polymorphic table was ever wired up. post_comments has
-- lived dormant since baseline and the @mentions scoping pass (see
-- docs/features/mentions.md §4.1, closed 23 Apr 2026) confirmed:
--
--   • SELECT count(*) FROM public.post_comments → 0 rows (empty)
--   • grep of `.from('post_comments')` across app/ → 0 hits
--   • No FK references point at the table (REFERENCES search, zero)
--   • No RLS policies, triggers, or indexes attached beyond the PK
--
-- Canonical path is public.comments (4 rows, 7+ code references).
-- Keeping the dead table around is just more surface to reason about
-- during audits, and a trap for any future contributor who looks at
-- the baseline and wonders which one to use.
--
-- Pre-launch context (23 Apr 2026)
-- --------------------------------
-- Original plan was to defer this to post-launch because dropping
-- tables is inherently destructive and we didn't want a cleanup
-- landing near the 27 Apr beta cutover. The beta window was extended
-- (72 days to public launch), so there's runway to land it now —
-- rollback is cheap (re-run the CREATE TABLE from baseline), and
-- having a dead table around for 72 days of beta debugging is a
-- persistent source of confusion we don't need.
--
-- What this migration does
-- ------------------------
-- Idempotent DROP TABLE with CASCADE. CASCADE is belt-and-braces
-- only — we've verified there are no dependent objects. IF EXISTS
-- makes the migration safe to re-run and safe to apply to any
-- branch where the baseline hasn't been run yet (fresh dev DBs).
--
-- Rollback
-- --------
-- To restore, re-apply the baseline CREATE TABLE snippet:
--
--   CREATE TABLE IF NOT EXISTS public.post_comments (
--     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--     post_id uuid NOT NULL,
--     author_id uuid NOT NULL,
--     parent_id uuid,
--     body text NOT NULL,
--     like_count integer DEFAULT 0 NOT NULL,
--     deleted boolean DEFAULT false NOT NULL,
--     created_at timestamptz DEFAULT now() NOT NULL,
--     updated_at timestamptz DEFAULT now() NOT NULL
--   );
--
-- The table has never held data so rollback is schema-only. No
-- DELETE/INSERT backfill to worry about.

BEGIN;

DROP TABLE IF EXISTS public.post_comments CASCADE;

COMMIT;

-- Verification (run post-apply):
--   SELECT to_regclass('public.post_comments');  -- expect NULL

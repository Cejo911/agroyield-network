-- ============================================================================
-- Migration: Widen likes_post_type_check to accept all 5 post types the
--            client actually uses.
--
-- Context (2026-04-28):
--   The likes table CHECK constraint only allowed ('opportunity','listing'),
--   but the client emits POSTs to /api/like with five distinct post_type
--   values: opportunity, listing, research, community, comment.
--
--   The /api/like POST handler uses the service-role admin client to
--   adminAny.from('likes').insert(...) — the insert raises a constraint
--   violation, the SDK swallows it (no .throwOnError()), the API then
--   re-counts (0) and returns { liked: true, count: 0 }. Client UIs
--   (CommentsSection, community-client, LikeButton) either revert the
--   optimistic flip (community comment heart) or display a permanently
--   stuck filled-but-zero-count heart (community post / research),
--   neither of which persists across reload.
--
--   Confirmed pre-fix state: SELECT post_type, COUNT(*) FROM likes
--   GROUP BY post_type → opportunity 8, listing 3, no other rows.
--
-- Fix:
--   Drop the narrow CHECK and recreate with the full set of in-use values.
--   Purely additive — zero existing rows can violate the wider constraint
--   (the narrow one was strictly more restrictive), so this is safe to run
--   in production with no data migration.
--
-- Idempotency:
--   ALTER TABLE ... DROP CONSTRAINT IF EXISTS guards re-runs.
--
-- Rollback:
--   Reverse the constraint to the narrow form. Note: any rows added with
--   research/community/comment post_types after this migration would have
--   to be deleted before the rollback could succeed.
-- ============================================================================

ALTER TABLE public.likes
  DROP CONSTRAINT IF EXISTS likes_post_type_check;

ALTER TABLE public.likes
  ADD CONSTRAINT likes_post_type_check
  CHECK (post_type = ANY (ARRAY[
    'opportunity'::text,
    'listing'::text,
    'research'::text,
    'community'::text,
    'comment'::text
  ]));

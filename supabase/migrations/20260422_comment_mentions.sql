-- 2026-04-22  @mentions in comments (feature-flag-gated, OFF at launch)
-- Updated 2026-04-23: §4.1 CLOSED — simplified schema (no discriminator).
--
-- Status: DRAFT — do not apply to main yet.
-- Review against docs/features/mentions.md § "Decision gate" first.
--
-- Companion to docs/features/mentions.md — see there for the full design
-- rationale (data model choices, RLS matrix, rollout plan, risks).
--
-- This migration is DORMANT at launch: the feature_flag is seeded with
-- is_enabled = false. No user-visible behavior changes until the flag
-- is flipped post-launch. Merging this to main is safe launch-week;
-- applying it to production is a schema change (new table, new enum
-- value, new trigger) and should ideally land Wed 23 Apr per the doc's
-- timeline, not Sunday QA day.
--
-- What changed 23 Apr 2026 (vs. the 22 Apr draft)
-- -----------------------------------------------
-- The 22 Apr draft was written while §4.1 was still open — was the
-- canonical comment table `public.comments` (polymorphic) or
-- `public.post_comments` (dedicated)? A `comment_source` discriminator
-- column kept both paths viable.
--
-- §4.1 closed 23 Apr 2026 with evidence:
--   • SELECT count(*) FROM public.comments WHERE created_at > now() - '7 days' → 4
--   • SELECT count(*) FROM public.post_comments WHERE created_at > now() - '7 days' → 0
--   • grep of .from('post_comments') across app/ → 0 hits
--   • grep of .from('comments') across app/ → 7+ hits
--
-- `public.comments` is canonical; `public.post_comments` is dead. Drop
-- the discriminator, add a direct FK + CASCADE to public.comments(id),
-- and denormalize post_type into the mentions row for efficient
-- surface-specific queries ("mentions on community posts this week")
-- without a join. A validation trigger keeps the denormalization honest.
--
-- Idempotent — safe to re-run.
--
-- Dependencies / prerequisites
-- ----------------------------
--   • public.profiles exists with PK `id uuid` (baseline)
--   • public.comments exists with (id, post_id, post_type, user_id)
--     (baseline line 260)
--   • public.connections exists with (requester_id, recipient_id, status)
--     and connection_status enum including 'accepted' (baseline)
--   • public.feature_flags exists with (key, description, is_enabled,
--     rollout_percentage, enabled_for_users, enabled_for_businesses)
--     (20260417_feature_flags.sql)
--   • notification_type enum exists (baseline)
--
-- Pre-condition diagnostics to run BEFORE this migration
-- ------------------------------------------------------
--   -- 1. Confirm notification_type exists and comment_mention is NOT yet present:
--   SELECT enumlabel
--     FROM pg_enum
--     JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
--    WHERE pg_type.typname = 'notification_type'
--    ORDER BY enumsortorder;
--
--   -- 2. Confirm public.comments has the columns we reference:
--   SELECT column_name, data_type
--     FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name = 'comments'
--      AND column_name IN ('id', 'post_type', 'user_id');
--   -- Expected: 3 rows.

-- ---------------------------------------------------------------------------
-- 1. Extend notification_type enum
-- ---------------------------------------------------------------------------
-- Postgres forbids ALTER TYPE ADD VALUE inside a transaction, so this
-- runs at the top and is its own implicit transaction.
-- If already present (re-run), the IF NOT EXISTS guard skips cleanly.

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'comment_mention';

-- ---------------------------------------------------------------------------
-- 2. comment_mentions junction table
-- ---------------------------------------------------------------------------
-- One row per (comment, mentioned user) pair. The UNIQUE constraint
-- prevents duplicate notifications when a user is mentioned twice in
-- the same comment body.
--
-- Post-§4.1 simplifications:
--   • No more comment_source discriminator — there's only one source.
--   • comment_id is a real FK to public.comments(id) with ON DELETE
--     CASCADE, so comment moderation (soft-delete via is_active=false
--     or hard delete) cleans up mentions automatically.
--   • comment_post_type is denormalized from public.comments.post_type
--     so "all mentions in community comments last 7 days" is a one-table
--     scan. A trigger (§2.1) validates this stays in sync on insert.

CREATE TABLE IF NOT EXISTS public.comment_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL
    REFERENCES public.comments(id) ON DELETE CASCADE,
  comment_post_type text NOT NULL,
  mentioned_user_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentioner_user_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  position_start int,
  position_end int,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- A given user can only be mentioned once per comment.
  UNIQUE (comment_id, mentioned_user_id),
  -- No self-mentions.
  CHECK (mentioner_user_id <> mentioned_user_id)
);

COMMENT ON TABLE public.comment_mentions IS
  '@mention junction between comments and mentioned users. One row per mention. Populated by API-layer parser on comment insert. Feature-gated via feature_flags.comment_mentions_enabled.';

COMMENT ON COLUMN public.comment_mentions.comment_post_type IS
  'Mirror of public.comments.post_type at insert time (denormalized for efficient surface-specific queries). Kept honest by tg_comment_mentions_validate_post_type.';

COMMENT ON COLUMN public.comment_mentions.position_start IS
  'Character offset in the rendered comment body where the mention pill begins. Nullable; populated when the parser tracks offsets. Used for UX highlighting, not enforcement.';

-- ---------------------------------------------------------------------------
-- 2.1 Denormalization safety trigger
-- ---------------------------------------------------------------------------
-- Ensures comment_mentions.comment_post_type always matches the parent
-- comment's post_type. Catches API-layer bugs where a caller forgets to
-- copy the value through. Runs BEFORE INSERT so the NOT NULL constraint
-- sees the corrected value when the caller passed NULL.

CREATE OR REPLACE FUNCTION public.tg_comment_mentions_validate_post_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_post_type text;
BEGIN
  SELECT c.post_type INTO parent_post_type
    FROM public.comments c
   WHERE c.id = NEW.comment_id;

  IF parent_post_type IS NULL THEN
    RAISE EXCEPTION 'comment_mentions: parent comment % not found', NEW.comment_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Auto-fill if caller omitted it.
  IF NEW.comment_post_type IS NULL THEN
    NEW.comment_post_type := parent_post_type;
  ELSIF NEW.comment_post_type <> parent_post_type THEN
    RAISE EXCEPTION
      'comment_mentions.comment_post_type (%) must match parent comment.post_type (%)',
      NEW.comment_post_type, parent_post_type
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_comment_mentions_validate_post_type
  ON public.comment_mentions;

CREATE TRIGGER tg_comment_mentions_validate_post_type
  BEFORE INSERT ON public.comment_mentions
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_comment_mentions_validate_post_type();

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------
-- Lookup patterns:
--   a) "Find all mentions on this comment" — fan-out on insert,
--      render-layer lookup for hover cards. Now single-column since
--      the discriminator is gone.
--   b) "Find all comments where user X was mentioned" — future profile
--      feature "your @mentions" tab.
--   c) "Count mentions sent by user X in last 60 min" — abuse cap per
--      §5.2 of mentions.md (max 50 mention-notifications per user per hour).
--   d) "All mentions in community-post comments" — analytics / future
--      filters. Partial index scoped to the only value currently in play
--      so we don't index unused surfaces.

CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment
  ON public.comment_mentions (comment_id);

CREATE INDEX IF NOT EXISTS idx_comment_mentions_mentioned_user
  ON public.comment_mentions (mentioned_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comment_mentions_mentioner_recent
  ON public.comment_mentions (mentioner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comment_mentions_post_type_community
  ON public.comment_mentions (created_at DESC)
  WHERE comment_post_type = 'community';

-- ---------------------------------------------------------------------------
-- 4. Row-Level Security
-- ---------------------------------------------------------------------------
-- SELECT: mentioned user sees their own mentions; mentioner sees what
--         they sent. Parent-comment visibility is enforced by the parent
--         table's own RLS — we don't duplicate that here. If a caller
--         somehow sees a mention row for a parent comment they can't
--         read, the worst case is they know they were @-tagged there,
--         which is the point of the notification anyway.
-- INSERT: only the mentioner can insert a mention row for themselves,
--         AND only if they have an accepted connection with the
--         mentioned user. Defense in depth — the API layer also
--         validates this, but RLS is the backstop.
-- UPDATE: blocked. Mentions are append-only; edits to the parent
--         comment cause a re-parse + re-write (DELETE + re-INSERT),
--         not an in-place update.
-- DELETE: cascades from comment deletion (FK ON DELETE CASCADE) and
--         profile deletion. Direct deletes blocked under RLS — we keep
--         an audit trail.

ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;

-- SELECT policy: mentioned-or-mentioner can read
DROP POLICY IF EXISTS comment_mentions_select_participant
  ON public.comment_mentions;
CREATE POLICY comment_mentions_select_participant
  ON public.comment_mentions
  FOR SELECT
  TO authenticated
  USING (
    mentioned_user_id = auth.uid()
    OR mentioner_user_id = auth.uid()
  );

-- INSERT policy: mentioner must match caller AND have accepted connection
DROP POLICY IF EXISTS comment_mentions_insert_connected_mentioner
  ON public.comment_mentions;
CREATE POLICY comment_mentions_insert_connected_mentioner
  ON public.comment_mentions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    mentioner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
        FROM public.connections c
       WHERE c.status = 'accepted'
         AND (
           (c.requester_id = auth.uid() AND c.recipient_id = mentioned_user_id)
           OR
           (c.recipient_id = auth.uid() AND c.requester_id = mentioned_user_id)
         )
    )
  );

-- No UPDATE policy — RLS default-deny blocks all updates.
-- No DELETE policy — RLS default-deny blocks all deletes (CASCADE still
-- works because it runs with elevated privileges, not under RLS).

-- ---------------------------------------------------------------------------
-- 5. Feature flag seed
-- ---------------------------------------------------------------------------
-- Off at launch. Flipped by admin post-launch per the ramp in §7 of the
-- scoping doc.

INSERT INTO public.feature_flags (key, description, is_enabled)
VALUES (
  'comment_mentions_enabled',
  '@mentions in post comments. Ramp via rollout_percentage post-launch. Dormant at 27 Apr launch.',
  false
)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Rollback
-- ---------------------------------------------------------------------------
-- Clean rollback (run in order):
--
--   DROP POLICY IF EXISTS comment_mentions_insert_connected_mentioner
--     ON public.comment_mentions;
--   DROP POLICY IF EXISTS comment_mentions_select_participant
--     ON public.comment_mentions;
--   DROP TRIGGER IF EXISTS tg_comment_mentions_validate_post_type
--     ON public.comment_mentions;
--   DROP FUNCTION IF EXISTS public.tg_comment_mentions_validate_post_type();
--   DROP TABLE IF EXISTS public.comment_mentions;
--   DELETE FROM public.feature_flags WHERE key = 'comment_mentions_enabled';
--
-- The 'comment_mention' enum value CANNOT be cleanly removed in Postgres
-- (DROP VALUE isn't supported). Leaving it in place is harmless — it
-- just becomes an unused enum entry. If a fresh cluster rebuild is
-- needed, it will be absent there.

-- ---------------------------------------------------------------------------
-- 7. Verification queries (run AFTER applying)
-- ---------------------------------------------------------------------------
-- 1. Table exists + RLS is enabled:
--      SELECT relname, relrowsecurity
--        FROM pg_class
--       WHERE relname = 'comment_mentions';
--      Expected: relrowsecurity = true
--
-- 2. Policies are in place:
--      SELECT policyname, cmd, roles
--        FROM pg_policies
--       WHERE tablename = 'comment_mentions';
--      Expected: 2 rows (SELECT + INSERT policies)
--
-- 3. Enum value added:
--      SELECT enumlabel FROM pg_enum
--        JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
--       WHERE pg_type.typname = 'notification_type'
--         AND enumlabel = 'comment_mention';
--      Expected: 1 row.
--
-- 4. Feature flag seeded + disabled:
--      SELECT key, is_enabled, rollout_percentage
--        FROM public.feature_flags
--       WHERE key = 'comment_mentions_enabled';
--      Expected: is_enabled = false, rollout_percentage = 0.
--
-- 5. Validation trigger in place:
--      SELECT tgname FROM pg_trigger
--       WHERE tgrelid = 'public.comment_mentions'::regclass
--         AND NOT tgisinternal;
--      Expected: tg_comment_mentions_validate_post_type
--
-- 6. RLS matrix smoke test (run as two different users, with a real
--    comment row in public.comments):
--      -- As user A (connected to B, accepted, owns comment X):
--      INSERT INTO public.comment_mentions (
--        comment_id, comment_post_type,
--        mentioned_user_id, mentioner_user_id
--      ) VALUES (
--        '<comment_X_uuid>', 'community',
--        '<user_B_uuid>', auth.uid()
--      );
--      Expected: success.
--
--      -- As user A (NOT connected to C):
--      INSERT INTO public.comment_mentions (
--        comment_id, comment_post_type,
--        mentioned_user_id, mentioner_user_id
--      ) VALUES (
--        '<comment_X_uuid>', 'community',
--        '<user_C_uuid>', auth.uid()
--      );
--      Expected: "new row violates row-level security policy".
--
--      -- Denormalization trigger: wrong post_type should fail.
--      INSERT INTO public.comment_mentions (
--        comment_id, comment_post_type,
--        mentioned_user_id, mentioner_user_id
--      ) VALUES (
--        '<community_comment_uuid>', 'opportunity',
--        '<user_B_uuid>', auth.uid()
--      );
--      Expected: "comment_mentions.comment_post_type (opportunity) must
--                match parent comment.post_type (community)".

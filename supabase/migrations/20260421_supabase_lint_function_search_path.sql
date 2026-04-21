-- 2026-04-21  Supabase lint: pin search_path on 54 public.* functions
--
-- Supabase lint: function_search_path_mutable (WARN × 54)
--
-- Background
-- ----------
-- Postgres resolves unqualified object references in a function body
-- through `search_path`. If a function doesn't pin search_path, an
-- attacker who can write into any schema earlier in the caller's
-- search_path (e.g. a schema they own, or a schema the DB owner created
-- with loose ACLs) can shadow objects the function references — e.g.
-- create a malicious `public.now()` that shims in first. This is
-- the classic "trojan source" vector Supabase's linter is defending
-- against.
--
-- Real-world exploitability for our 54 functions is low — they're
-- either trigger functions (only fired by the DB itself, no user-
-- controlled search_path) or admin/service-role helpers. But the fix
-- is one-line-per-function and eliminates a whole class of future
-- footguns, so there's no reason to carry the warnings.
--
-- Remediation
-- -----------
-- Pin each function's search_path to 'public, pg_catalog'. We include
-- pg_catalog explicitly (rather than relying on it being appended
-- implicitly) so the function resolves built-ins (now(), coalesce(),
-- etc.) against the canonical Postgres catalog regardless of what the
-- caller's search_path looks like.
--
-- Implementation note: ALTER FUNCTION requires argument signatures,
-- not just names. Rather than hard-code 54 × signature tuples (and
-- risk mismatches on overloaded functions), we iterate pg_proc at
-- migration time and emit a correctly-signatured ALTER FUNCTION for
-- every matching (schema, name) pair. This handles overloads
-- gracefully — if a name has 2 signatures, both get pinned.
--
-- Rollback
-- --------
-- Reset with: ALTER FUNCTION public.<name>(<args>) RESET search_path;
-- Or, to mass-revert, run the DO block below with `RESET search_path`
-- instead of `SET search_path = public, pg_catalog`.

DO $$
DECLARE
  -- The 54 function names flagged by Supabase's linter on 21 Apr 2026.
  -- Keep alphabetised so re-audits are diff-friendly.
  target_names text[] := ARRAY[
    'admin_can_view_logs',
    'award_xp',
    'award_xp_on_collab_posted',
    'award_xp_on_paper_submitted',
    'award_xp_on_post',
    'award_xp_on_product_listed',
    'businesses_auto_slug',
    'calculate_profile_strength',
    'capture_platform_stats',
    'check_price_alerts',
    'expire_old_notifications',
    'feature_flags_set_updated_at',
    'get_admin_role',
    'immutable_array_to_string',
    'increment_otp_attempt',
    'is_active_admin',
    'notify_connection_request',
    'notify_post_commented',
    'notify_post_liked',
    'on_admin_user_inserted',
    'on_announcement_published',
    'on_collab_application',
    'on_event_registration',
    'on_grant_application',
    'on_mentorship_request',
    'on_platform_setting_changed',
    'on_product_inquiry',
    'on_session_completed',
    'process_notification_digests',
    'recalculate_citation_stats',
    'recalculate_mentor_rating',
    'recalculate_product_rating',
    'seed_default_notification_preferences',
    'send_grant_deadline_reminders',
    'set_expense_receipts_updated_at',
    'set_recurring_invoices_updated_at',
    'set_updated_at',
    'set_usage_tracking_updated_at',
    'smart_notify',
    'sync_comment_like_count',
    'sync_event_save_count',
    'sync_grant_save_count',
    'sync_paper_downloads',
    'sync_poll_vote_count',
    'sync_post_comment_count',
    'sync_post_like_count',
    'sync_post_save_count',
    'sync_product_save_count',
    'tg_profile_experience_touch_updated_at',
    'trg_fn_no_self_collab_application',
    'trg_fn_papers_citation_sync',
    'trg_fn_user_papers_citation_sync',
    'update_conversation_on_message',
    'user_has_business_access'
  ];

  fn_record RECORD;
  altered_count int := 0;
  missing_names text[] := ARRAY[]::text[];
BEGIN
  -- Loop over every target name. For each, find all matching
  -- signatures in pg_proc (handles overloads) and ALTER them.
  FOR fn_record IN
    SELECT n.nspname AS schema_name,
           p.proname  AS function_name,
           pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = ANY(target_names)
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_catalog',
      fn_record.schema_name,
      fn_record.function_name,
      fn_record.args
    );
    altered_count := altered_count + 1;
  END LOOP;

  -- Report any names in the target list that had no matching function.
  -- If this fires, it probably means a function was renamed/dropped
  -- between the lint scan (21 Apr) and deploy — worth an eyeball
  -- but not an error.
  SELECT array_agg(t) INTO missing_names
    FROM unnest(target_names) AS t
   WHERE NOT EXISTS (
         SELECT 1
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
            AND p.proname = t
       );

  RAISE NOTICE 'search_path pinned on % function signature(s)', altered_count;
  IF array_length(missing_names, 1) IS NOT NULL THEN
    RAISE NOTICE 'target names with no matching function (ok to ignore if renamed/dropped): %', missing_names;
  END IF;
END $$;

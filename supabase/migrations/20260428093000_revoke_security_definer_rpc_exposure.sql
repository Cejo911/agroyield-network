-- ============================================================================
-- Migration: Revoke EXECUTE on Tier 1 SECURITY DEFINER functions from
--            anon, authenticated, and PUBLIC.
--
-- Context:
--   Supabase database-linter flagged 21 distinct SECURITY DEFINER functions
--   in `public` as executable by `anon` and/or `authenticated` via
--   PostgREST RPC (/rest/v1/rpc/<fn>). For Tier 1 (trigger fns) and Tier 1b
--   (cron/scheduled workers), there is NO legitimate API caller — they exist
--   to fire from triggers or pg_cron under the table-owner / service_role.
--   Exposing them is a pure footgun.
--
--   Tier 2 (smart_notify, award_xp, increment_otp_attempt,
--   recalculate_citation_stats, seed_default_notification_preferences) is
--   handled in a separate migration after auth-check refactor.
--
--   Tier 3 (admin_can_view_logs, get_admin_role, is_active_admin,
--   user_has_business_access) needs `authenticated` EXECUTE retained for RLS
--   policy use — handled in a separate migration that revokes anon and pins
--   search_path.
--
-- Risk:
--   - Triggers continue to fire normally (they run as the table owner, not
--     via the granted EXECUTE).
--   - pg_cron jobs continue to run normally (cron uses postgres role).
--   - External cron callers (edge functions / Vercel) using `service_role`
--     keep EXECUTE because service_role is not affected by these REVOKEs.
--
-- Rollback:
--   For any individual function, restore with:
--     GRANT EXECUTE ON FUNCTION public.<fn>(<args>) TO authenticated;
--     GRANT EXECUTE ON FUNCTION public.<fn>(<args>) TO anon;
--
-- Verification: see the SELECT at the bottom of this file. After applying,
-- the result set should be empty (or contain only Tier 2/3 functions).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Tier 1 — Trigger functions (must never be RPC-callable)
-- ----------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.enforce_mentorship_request_transition()
  FROM anon, authenticated, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.handle_auth_user_updated()
  FROM anon, authenticated, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user()
  FROM anon, authenticated, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM anon, authenticated, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.on_announcement_published()
  FROM anon, authenticated, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.on_mentorship_request()
  FROM anon, authenticated, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.on_platform_setting_changed()
  FROM anon, authenticated, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()
  FROM anon, authenticated, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.tg_comment_mentions_validate_post_type()
  FROM anon, authenticated, PUBLIC;

-- ----------------------------------------------------------------------------
-- Tier 1b — Cron / scheduled workers (must only run as service_role/postgres)
-- ----------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.capture_platform_stats()
  FROM anon, authenticated, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.expire_old_notifications()
  FROM anon, authenticated, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.process_notification_digests()
  FROM anon, authenticated, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.send_grant_deadline_reminders()
  FROM anon, authenticated, PUBLIC;

COMMIT;

-- ============================================================================
-- VERIFICATION (run after migration; expected: only Tier 2/3 functions remain)
-- ============================================================================
--
--   SELECT
--     n.nspname              AS schema,
--     p.proname              AS function,
--     pg_get_function_identity_arguments(p.oid) AS arguments,
--     r.rolname              AS granted_to,
--     a.privilege_type
--   FROM pg_proc p
--   JOIN pg_namespace n  ON n.oid = p.pronamespace
--   JOIN aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
--        ON true
--   JOIN pg_roles r      ON r.oid = a.grantee
--   WHERE n.nspname = 'public'
--     AND p.prosecdef = true
--     AND r.rolname IN ('anon', 'authenticated', 'PUBLIC')
--     AND a.privilege_type = 'EXECUTE'
--     AND p.proname IN (
--       'enforce_mentorship_request_transition',
--       'handle_auth_user_updated',
--       'handle_new_auth_user',
--       'handle_new_user',
--       'on_announcement_published',
--       'on_mentorship_request',
--       'on_platform_setting_changed',
--       'rls_auto_enable',
--       'tg_comment_mentions_validate_post_type',
--       'capture_platform_stats',
--       'expire_old_notifications',
--       'process_notification_digests',
--       'send_grant_deadline_reminders'
--     )
--   ORDER BY p.proname, r.rolname;
--
-- Expected result: 0 rows.
--
-- Then re-run the Supabase advisor — the count of
-- `anon_security_definer_function_executable` and
-- `authenticated_security_definer_function_executable` warnings should drop
-- by 13 functions × 2 roles = 26 warnings, leaving ~16 warnings for Tier 2/3.
-- ============================================================================

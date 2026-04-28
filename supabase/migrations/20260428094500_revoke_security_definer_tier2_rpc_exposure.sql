-- ============================================================================
-- Migration: Revoke EXECUTE on Tier 2 SECURITY DEFINER functions from
--            anon, authenticated, and PUBLIC.
--
-- Context:
--   Follow-up to 20260428093000_revoke_security_definer_rpc_exposure.sql
--   (Tier 1 trigger fns + Tier 1b cron workers, already applied — advisor
--   warnings dropped from 42 to 18).
--
--   Tier 2 = application functions that perform *privileged side effects*
--   (notifications, XP grants, OTP rate-limit counters, stats recomputes,
--   onboarding seeds) and were exposed via PostgREST RPC. Every one of
--   these is dangerous to leave callable by anon or authenticated:
--
--   - smart_notify        : central notification dispatcher.
--                           Caller-controlled p_user_id, p_actor_id,
--                           p_title, p_body, p_link → anyone with anon
--                           key could spam arbitrary notifications.
--                           HIGHEST IMPACT. Notification volume drives
--                           SMS / WhatsApp spend and inbox trust.
--   - award_xp            : caller-controlled p_user_id and p_points
--                           → user could grant themselves arbitrary XP,
--                           breaking the gamification economy.
--   - increment_otp_attempt: caller-controlled p_otp_id → DoS the verify
--                           flow by pre-burning attempt counters on
--                           someone else's OTP.
--   - recalculate_citation_stats: CPU-bound; exposing it as RPC is a
--                           cheap CPU-DoS vector.
--   - seed_default_notification_preferences: only legitimate caller is
--                           the handle_new_user trigger; exposing creates
--                           a way to spam preference rows.
--
-- Strategy:
--   These functions remain SECURITY DEFINER (they need to write across
--   tables that RLS would otherwise block). We just remove the public API
--   exposure. Going forward each must be invoked by ONE of:
--     (a) a database trigger (fires as table owner — unaffected by REVOKE),
--     (b) pg_cron (runs as postgres — unaffected),
--     (c) an edge function or backend route using the service_role key
--         (service_role is not affected by REVOKE on anon/authenticated/PUBLIC).
--
--   If any of these are currently called directly from the browser via
--   the supabase-js client with the anon/authenticated session, those call
--   sites MUST be migrated to a server route BEFORE applying this migration
--   — otherwise users will see "permission denied for function" errors.
--
-- Pre-apply checklist (do not skip):
--   [ ] grep the app for `.rpc('smart_notify'`, `.rpc("smart_notify"`, etc.
--       Same for award_xp, increment_otp_attempt, recalculate_citation_stats,
--       seed_default_notification_preferences.
--   [ ] For every hit, confirm the call site is server-side (edge function,
--       route handler, /api/*, cron job) using the service_role key, NOT
--       a client component with the anon key.
--   [ ] Specifically: confirm OTP verify flow does NOT call
--       increment_otp_attempt directly from the client. The increment must
--       happen inside a server-side verify_otp wrapper.
--
-- Rollback:
--   For any individual function, restore with:
--     GRANT EXECUTE ON FUNCTION public.<fn>(<args>) TO authenticated;
--     -- and/or TO anon;  (rarely needed)
--
-- Verification: see the SELECT at the bottom. Expected result after apply: 0 rows.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. smart_notify — central notification dispatcher (HIGHEST PRIORITY)
-- ----------------------------------------------------------------------------
-- After this REVOKE, the only callers will be:
--   - Triggers: on_announcement_published, on_mentorship_request, etc.
--               (fire as table owner — unaffected)
--   - Cron worker process_notification_digests (postgres role — unaffected)
--   - Edge functions invoking via service_role (unaffected)
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.smart_notify(
    p_user_id        uuid,
    p_type           public.notification_type,
    p_title          text,
    p_body           text,
    p_link           text,
    p_actor_id       uuid,
    p_entity_id      uuid,
    p_priority       public.notification_priority,
    p_batch_key      text,
    p_expires_at     timestamp with time zone,
    p_dedup_window   interval
) FROM anon, authenticated, PUBLIC;

-- ----------------------------------------------------------------------------
-- 2. award_xp — gamification grant (must be server-side authority)
-- ----------------------------------------------------------------------------
-- Going forward, XP grants flow through a server route that:
--   1. authenticates the caller,
--   2. validates the action that earns XP (e.g. post created, comment liked),
--   3. invokes award_xp via service_role.
-- Direct client calls from the browser MUST be removed before applying.
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.award_xp(
    p_user_id  uuid,
    p_points   integer
) FROM anon, authenticated, PUBLIC;

-- ----------------------------------------------------------------------------
-- 3. increment_otp_attempt — rate-limit counter for OTP verify
-- ----------------------------------------------------------------------------
-- Anyone who can call this directly with someone else's p_otp_id can DoS
-- their verify flow by burning the attempt counter to the lockout threshold.
-- The legitimate caller is a server-side verify_otp() wrapper that:
--   1. looks up the OTP row by user-supplied code (constant-time),
--   2. compares hashed code,
--   3. THEN calls increment_otp_attempt only on the correct OTP id.
-- Confirm such a wrapper exists before applying.
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.increment_otp_attempt(
    p_otp_id  uuid
) FROM anon, authenticated, PUBLIC;

-- ----------------------------------------------------------------------------
-- 4. recalculate_citation_stats — CPU-bound stats recompute
-- ----------------------------------------------------------------------------
-- Should be invoked by:
--   - a trigger on research_posts/citations table (preferred), OR
--   - a nightly cron, OR
--   - an admin-only endpoint that re-runs for a single user_id.
-- No reason for an anon visitor or a regular authenticated user to invoke.
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.recalculate_citation_stats(
    p_user_id  uuid
) FROM anon, authenticated, PUBLIC;

-- ----------------------------------------------------------------------------
-- 5. seed_default_notification_preferences — onboarding helper
-- ----------------------------------------------------------------------------
-- Only legitimate caller is the handle_new_user trigger fired on
-- profiles INSERT. That trigger runs as the table owner so it does NOT
-- need EXECUTE granted on this function via the anon/authenticated roles.
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.seed_default_notification_preferences(
    p_user_id  uuid
) FROM anon, authenticated, PUBLIC;

COMMIT;

-- ============================================================================
-- VERIFICATION (run after migration; expected: 0 rows)
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
--       'smart_notify',
--       'award_xp',
--       'increment_otp_attempt',
--       'recalculate_citation_stats',
--       'seed_default_notification_preferences'
--     )
--   ORDER BY p.proname, r.rolname;
--
-- Expected result: 0 rows.
--
-- Then re-run the Supabase advisor — the count of
-- `anon_security_definer_function_executable` and
-- `authenticated_security_definer_function_executable` warnings should drop
-- by 5 functions × 2 roles = 10 warnings, leaving 8 warnings = the four
-- Tier 3 RLS-helper functions × 2 roles. Those are addressed in the next
-- migration (revoke from anon, retain authenticated, pin search_path).
-- ============================================================================

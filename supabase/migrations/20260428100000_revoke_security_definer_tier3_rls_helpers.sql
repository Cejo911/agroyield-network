-- ============================================================================
-- Migration: Tier 3 — RLS-helper SECURITY DEFINER functions.
--            Revoke EXECUTE from `anon` and `PUBLIC` only.
--            DO NOT revoke from `authenticated` — RLS policies depend on it.
--
-- Context:
--   Follow-up to:
--     20260428093000_revoke_security_definer_rpc_exposure.sql        (Tier 1)
--     20260428094500_revoke_security_definer_tier2_rpc_exposure.sql  (Tier 2)
--
--   Tier 3 functions are called from inside RLS policies, e.g.:
--     CREATE POLICY ... ON some_table USING (public.is_active_admin(auth.uid()));
--
--   For an RLS policy to evaluate, the role running the query
--   (`authenticated` for logged-in users via supabase-js) needs EXECUTE
--   on the helper. Therefore:
--     - Revoke from `anon`   ✅ (logged-out callers should learn nothing
--                              about admin/role/access state)
--     - Revoke from `PUBLIC` ✅ (defensive default)
--     - KEEP for `authenticated` ⚠️ (required by RLS)
--
--   Functions covered:
--     - admin_can_view_logs(p_user_id uuid)
--     - get_admin_role(p_user_id uuid)
--     - is_active_admin(p_user_id uuid)
--     - user_has_business_access(biz_id uuid, usr_id uuid)
--
-- Expected advisor outcome:
--   - `anon_security_definer_function_executable` warnings: -4 (drop to 0)
--   - `authenticated_security_definer_function_executable` warnings: -0
--     (these 4 will REMAIN flagged for the `authenticated` role).
--
--   The remaining 4 authenticated warnings are EXPECTED and constitute a
--   known false-positive set: the linter cannot tell that these functions
--   are RLS helpers rather than user-callable RPCs. They should be
--   annotated as accepted-known-issues, OR cleared by the optional
--   follow-up below (move to private schema).
--
-- Optional clean-up to eliminate the 4 remaining warnings (NOT in this
-- migration — too invasive without inspecting all RLS policy definitions
-- that reference these helpers):
--
--   1. Create a `private` schema (or reuse one) NOT exposed by PostgREST:
--        CREATE SCHEMA IF NOT EXISTS private;
--        REVOKE ALL ON SCHEMA private FROM anon, authenticated, PUBLIC;
--        GRANT  USAGE ON SCHEMA private TO authenticated;
--      (Confirm the project's PostgREST `db-schemas` setting excludes it —
--       Supabase default exposes only `public` + `graphql_public`, so a
--       `private` schema is automatically not exposed.)
--
--   2. ALTER FUNCTION public.<fn>(<args>) SET SCHEMA private;
--      for each of the 4 functions.
--
--   3. Find every RLS policy USING/WITH CHECK referencing these helpers
--      and update the qualified name from `public.<fn>` to `private.<fn>`.
--
--      To find references:
--        SELECT schemaname, tablename, policyname, qual, with_check
--          FROM pg_policies
--         WHERE qual LIKE '%is_active_admin%'
--            OR qual LIKE '%get_admin_role%'
--            OR qual LIKE '%admin_can_view_logs%'
--            OR qual LIKE '%user_has_business_access%'
--            OR with_check LIKE '%is_active_admin%'
--            OR with_check LIKE '%get_admin_role%'
--            OR with_check LIKE '%admin_can_view_logs%'
--            OR with_check LIKE '%user_has_business_access%';
--
--   4. Re-run advisor — `authenticated_security_definer_function_executable`
--      should now be empty for these 4 functions (they're no longer in a
--      PostgREST-exposed schema).
--
-- Hardening already addressed by REVOKE from anon:
--   These functions take a caller-supplied `p_user_id` and return
--   admin/role/access status. With anon EXECUTE revoked, an unauthenticated
--   visitor can no longer probe "is UUID X an admin?" via PostgREST.
--   Authenticated users can still probe (until the optional schema move
--   above), but at least they're identifiable in audit logs.
--
-- Rollback:
--   GRANT EXECUTE ON FUNCTION public.<fn>(<args>) TO anon;
--   (Authenticated grant is untouched, so RLS keeps working either way.)
--
-- Verification: see the SELECT at the bottom of this file.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- admin_can_view_logs(uuid)
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.admin_can_view_logs(p_user_id uuid)
  FROM anon, PUBLIC;

-- ----------------------------------------------------------------------------
-- get_admin_role(uuid)
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.get_admin_role(p_user_id uuid)
  FROM anon, PUBLIC;

-- ----------------------------------------------------------------------------
-- is_active_admin(uuid)
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.is_active_admin(p_user_id uuid)
  FROM anon, PUBLIC;

-- ----------------------------------------------------------------------------
-- user_has_business_access(uuid, uuid)
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.user_has_business_access(
    biz_id  uuid,
    usr_id  uuid
) FROM anon, PUBLIC;

COMMIT;

-- ============================================================================
-- VERIFICATION (run after applying)
-- ============================================================================
--
-- 1) Confirm anon and PUBLIC have NO execute privilege on these functions.
--    Expected: 0 rows.
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
--     AND r.rolname IN ('anon', 'PUBLIC')
--     AND a.privilege_type = 'EXECUTE'
--     AND p.proname IN (
--       'admin_can_view_logs',
--       'get_admin_role',
--       'is_active_admin',
--       'user_has_business_access'
--     )
--   ORDER BY p.proname, r.rolname;
--
-- 2) Confirm `authenticated` STILL has execute privilege (RLS still works).
--    Expected: 4 rows (one per function).
--
--   SELECT
--     p.proname              AS function,
--     pg_get_function_identity_arguments(p.oid) AS arguments,
--     'authenticated'        AS granted_to
--   FROM pg_proc p
--   JOIN pg_namespace n  ON n.oid = p.pronamespace
--   JOIN aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
--        ON true
--   JOIN pg_roles r      ON r.oid = a.grantee
--   WHERE n.nspname = 'public'
--     AND r.rolname = 'authenticated'
--     AND a.privilege_type = 'EXECUTE'
--     AND p.proname IN (
--       'admin_can_view_logs',
--       'get_admin_role',
--       'is_active_admin',
--       'user_has_business_access'
--     )
--   ORDER BY p.proname;
--
-- 3) Spot-check that admin gating in the app still works post-deploy:
--    - Log in as a non-admin user, hit any admin-gated route, expect 403.
--    - Log in as an admin, hit the same route, expect 200.
--    - Log in as a non-admin, navigate to a business they DO own, expect 200.
--    - Log in as a non-admin, attempt to access a business they DON'T own,
--      expect blocked by RLS.
--
-- After applying:
--   - `anon_security_definer_function_executable` should be at 0
--     (combined with Tier 1 + Tier 2 already applied).
--   - `authenticated_security_definer_function_executable` should be at 4
--     (the four RLS helpers above — accepted as known intentional grants
--     until the optional private-schema migration is run).
-- ============================================================================

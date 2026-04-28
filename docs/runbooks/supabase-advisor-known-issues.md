# Supabase advisor — known intentional warnings

**Status:** Accepted as known false-positives.
**Last updated:** 2026-04-28
**Owner:** Okoli

## Summary

The Supabase database-linter (`get_advisors`) currently reports **4** persistent warnings against AgroYield Network. They are all of the same shape and all intentional. Treat 4 as the green baseline. Investigate only if the count changes or a new function name appears.

## The 4 accepted warnings

All 4 are `authenticated_security_definer_function_executable` (lint code `0029`) against:

| Function | Arguments | Why authenticated needs EXECUTE |
|---|---|---|
| `public.admin_can_view_logs` | `p_user_id uuid` | Called from RLS policies on `admin_audit_log` and related admin-only tables. |
| `public.get_admin_role` | `p_user_id uuid` | Called from RLS policies that gate by `super` / `moderator` admin role. |
| `public.is_active_admin` | `p_user_id uuid` | Most-used RLS helper — called by every policy that checks "is the caller an admin?" |
| `public.user_has_business_access` | `biz_id uuid, usr_id uuid` | Called from RLS policies on `businesses`, `business_members`, `business_reviews`. |

## Why they're intentional

These four are SECURITY DEFINER helper functions that exist to be called from inside RLS policies, e.g.:

```sql
CREATE POLICY admin_only ON admin_audit_log
  FOR SELECT
  USING (public.is_active_admin(auth.uid()));
```

For an RLS policy to evaluate, the role running the query (`authenticated` for any logged-in user via supabase-js) must have `EXECUTE` on the helper. Therefore `authenticated` cannot have `EXECUTE` revoked without breaking RLS for every signed-in user.

The advisor cannot distinguish "RLS helper" from "user-callable RPC", so it flags them. The flag is correct in principle (an authenticated user CAN call `POST /rest/v1/rpc/is_active_admin` and get back a boolean) but the disclosure is low-impact — it confirms admin status of a UUID the caller already knows. No data is leaked beyond a yes/no.

## How we got here

Three migrations applied on 2026-04-28, taking the advisor count from 42 → 4:

1. `20260428093000_revoke_security_definer_rpc_exposure.sql` — Tier 1: revoked EXECUTE from anon / authenticated / PUBLIC on 9 trigger fns + 4 cron workers (13 functions × 2 roles = 26 warnings cleared).
2. `20260428094500_revoke_security_definer_tier2_rpc_exposure.sql` — Tier 2: revoked EXECUTE from anon / authenticated / PUBLIC on 5 application fns with privileged side effects (`smart_notify`, `award_xp`, `increment_otp_attempt`, `recalculate_citation_stats`, `seed_default_notification_preferences`) — 5 functions × 2 roles = 10 warnings cleared.
3. `20260428100000_revoke_security_definer_tier3_rls_helpers.sql` — Tier 3: revoked EXECUTE from anon / PUBLIC only on the 4 RLS helpers above; **deliberately retained `authenticated` EXECUTE** because RLS depends on it. Cleared 4 anon warnings, leaving the 4 authenticated warnings documented here.

## Daily-check baseline

In the morning health-check skill, the Supabase advisor count is **expected to be 4**. Treatment:

- **= 4, same function names as above** → 🟢 baseline. No action.
- **> 4** → 🟡 yellow. New SECURITY DEFINER function was added without REVOKE. Investigate which function and apply the same revoke pattern (Tier 1/1b template).
- **< 4** → 🟢 unexpected but harmless; means a function was dropped or renamed. Update this doc.
- **Different function names** → 🟡 a function was added or renamed. Investigate.

## Verification

Run periodically (e.g. weekly) to confirm the accepted set hasn't drifted:

```sql
-- Should return exactly 4 rows: the four RLS helpers above, granted_to = authenticated.
SELECT
  p.proname              AS function,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  r.rolname              AS granted_to,
  a.privilege_type
FROM pg_proc p
JOIN pg_namespace n  ON n.oid = p.pronamespace
JOIN aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a ON true
JOIN pg_roles r      ON r.oid = a.grantee
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND r.rolname IN ('anon', 'authenticated', 'PUBLIC')
  AND a.privilege_type = 'EXECUTE'
ORDER BY p.proname, r.rolname;
```

Anything outside the 4 expected rows = drift. Either a new SECURITY DEFINER function was added without an accompanying REVOKE, or one of the existing REVOKEs was rolled back.

## Optional future clean-up (silences the 4 remaining warnings entirely)

Move the four helpers to a `private` schema not exposed by PostgREST. This eliminates the warnings completely because the linter only checks functions in PostgREST-exposed schemas.

**Why we haven't done it yet:** invasive — every RLS policy referencing `public.is_active_admin` etc. has to be dropped and re-created with `private.is_active_admin`. Several dozen policies across the schema. Worth scheduling as a deliberate task, not bundled with routine hardening.

**Sketch of the migration:**

```sql
-- 1. Create the schema (Supabase default db-schemas exposes only public + graphql_public,
--    so `private` is automatically not exposed via PostgREST).
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated, PUBLIC;
GRANT  USAGE ON SCHEMA private TO authenticated;

-- 2. Move the four helpers.
ALTER FUNCTION public.admin_can_view_logs(uuid) SET SCHEMA private;
ALTER FUNCTION public.get_admin_role(uuid) SET SCHEMA private;
ALTER FUNCTION public.is_active_admin(uuid) SET SCHEMA private;
ALTER FUNCTION public.user_has_business_access(uuid, uuid) SET SCHEMA private;

-- 3. Find every RLS policy referencing the old qualified names.
SELECT schemaname, tablename, policyname, qual, with_check
  FROM pg_policies
 WHERE qual        LIKE '%public.is_active_admin%'
    OR qual        LIKE '%public.get_admin_role%'
    OR qual        LIKE '%public.admin_can_view_logs%'
    OR qual        LIKE '%public.user_has_business_access%'
    OR with_check  LIKE '%public.is_active_admin%'
    OR with_check  LIKE '%public.get_admin_role%'
    OR with_check  LIKE '%public.admin_can_view_logs%'
    OR with_check  LIKE '%public.user_has_business_access%';

-- 4. For each row, DROP and re-CREATE the policy with `private.<fn>` instead of `public.<fn>`.
```

After applying, the Supabase advisor should show 0 warnings of the SECURITY DEFINER family. Update this doc to reflect the new baseline.

## Related

- Sentry noise filter regression on `JAVASCRIPT-NEXTJS-A` — separate work, tracked in the Sentry triage section of the morning health check.
- `instrumentation-client.ts` filter pattern needs to inspect the full stack for `ServiceWorkerContainer` frames, not just the top frame.

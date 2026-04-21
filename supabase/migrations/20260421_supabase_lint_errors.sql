-- 2026-04-21  Supabase lint: launch-blocker fixes (4 ERRORs)
--
-- Addresses every ERROR-level finding from Supabase's database linter
-- (security + RLS). Triage context and per-table access-pattern
-- analysis lives in the pre-launch chat transcript; the short version
-- of "why these policies and not others" is inline against each
-- statement below.
--
-- Changes:
--   1. public.connections_view — flip to security_invoker so RLS on the
--      underlying `connections` table is enforced against the caller
--      rather than the view creator.
--   2. public.likes           — enable RLS + authenticated SELECT.
--   3. public.settings        — enable RLS + authenticated SELECT.
--   4. public.reports         — enable RLS with zero policies
--      (service-role writes only; no client access intended).
--
-- Deploy order: safe to run any time. All statements are idempotent.
-- Rollback notes are inline against each block.

-- ---------------------------------------------------------------------------
-- 1. connections_view: security_invoker = true
-- ---------------------------------------------------------------------------
-- Supabase lint: security_definer_view (ERROR)
--
-- Postgres-15+ syntax. Under the default (security_definer), the view
-- runs as the owner (`postgres`), so anyone granted SELECT on the view
-- implicitly bypasses RLS on the underlying `connections` table. With
-- security_invoker = true, the view respects the caller's RLS — which
-- is what the lint expects and what we actually want.
--
-- Prerequisite: `connections` itself must have RLS set up correctly for
-- the view to return the right rows for each user. That's already in
-- place (see baseline RLS policies on public.connections). If a future
-- migration ever drops them, this view will start returning empty for
-- non-owner queries — which fails closed, not open. That's the
-- intended safety property.
--
-- Rollback: ALTER VIEW public.connections_view SET (security_invoker = false);
ALTER VIEW public.connections_view SET (security_invoker = true);

-- ---------------------------------------------------------------------------
-- 2. public.likes — RLS on, authenticated SELECT
-- ---------------------------------------------------------------------------
-- Supabase lint: rls_disabled_in_public (ERROR)
--
-- Access pattern audit (grep `from('likes')`):
--   • WRITES happen exclusively in /api/like/route.ts via the service-role
--     admin client. Service role bypasses RLS, so no client INSERT/DELETE
--     policies are needed — they'd only expand the attack surface.
--   • READS happen client-side from CommentsSection.tsx and
--     app/community/page.tsx (to show per-post like counts + the
--     current user's liked state). Authenticated users need SELECT.
--   • Anon doesn't need access today; community pages gate reads
--     behind a logged-in session.
--
-- Rollback: DROP POLICY ...; ALTER TABLE ... DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS likes_select_authenticated ON public.likes;
CREATE POLICY likes_select_authenticated
  ON public.likes
  FOR SELECT
  TO authenticated
  USING (true);

-- Intentionally no INSERT/UPDATE/DELETE policies: all writes flow
-- through the service-role client in /api/like/route.ts.

-- ---------------------------------------------------------------------------
-- 3. public.settings — RLS on, authenticated SELECT
-- ---------------------------------------------------------------------------
-- Supabase lint: rls_disabled_in_public (ERROR)
--
-- Access pattern audit (grep `from('settings')`, 22 call sites):
--   • Most reads are server-side via the service-role admin client
--     (cron handlers, /api/* routes, middleware) — RLS bypass automatic.
--   • Two CLIENT reads remain:
--       - app/business/BusinessSwitcher.tsx  (key = allow_multi_business)
--       - app/community/community-client.tsx (key = community_daily_limit)
--     Authenticated users need SELECT to read these feature-flag rows.
--   • Admin writes go through the admin dashboard using a service-role
--     session, so no UPDATE/INSERT policies are needed client-side.
--
-- Note on data sensitivity: this table holds feature-flag-style
-- key/value pairs (maintenance_enabled, digest_enabled, daily_limit,
-- etc.). No credentials, tokens, or PII. If that invariant ever
-- changes, tighten the SELECT policy to a whitelist of client-safe
-- keys before merging.
--
-- Rollback: DROP POLICY ...; ALTER TABLE ... DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS settings_select_authenticated ON public.settings;
CREATE POLICY settings_select_authenticated
  ON public.settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Intentionally no INSERT/UPDATE/DELETE policies: admin writes flow
-- through the service-role client via the /admin dashboard.

-- ---------------------------------------------------------------------------
-- 4. public.reports — RLS on, NO client policies
-- ---------------------------------------------------------------------------
-- Supabase lint: rls_disabled_in_public (ERROR)
--
-- Access pattern audit (grep `from('reports')`):
--   • 100% of reads + writes happen via the service-role admin client
--     (app/api/report/route.ts for inserts + threshold counts;
--     app/admin/page.tsx for admin dashboard reads). Service role
--     bypasses RLS automatically.
--   • No legitimate authenticated or anon client access exists today.
--
-- Enabling RLS with zero policies means PostgREST returns empty/403
-- for anon + authenticated and service-role continues to work. That's
-- exactly the posture we want: abuse-report data stays server-side.
--
-- If we ever add a "view my own reports" UI, add a SELECT policy with
-- USING (user_id = (SELECT auth.uid())) at that point — not pre-emptively.
--
-- Rollback: ALTER TABLE ... DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Intentionally no policies — service-role bypasses RLS; no other
-- principal should read or write this table.

-- ============================================================================
-- Migration: Add SELECT policy on public.reports so authenticated users can
--            read their OWN report rows.
--
-- Context:
--   On 2026-04-28 the Supabase advisor flagged `reports` as RLS-enabled
--   with zero policies. Investigation confirmed that the userReportedSet
--   batch query in app/community/page.tsx — which pre-fetches the
--   current user's own report rows so <ReportButton initialReported>
--   can short-circuit its mount-time GET — was silently returning empty
--   for every authenticated caller. The N+1 fix from Checkpoint 40
--   (Sentry issue JAVASCRIPT-NEXTJS-8) was therefore silently undone:
--   each ReportButton instance was firing its own GET on every page
--   load, recreating the original 40-50 redundant calls per /community.
--
-- Policy:
--   Authenticated users see ONLY their own rows. Other users' reports
--   remain invisible. INSERT/UPDATE/DELETE continue to require service
--   role (the /api/report POST and admin moderation endpoints both use
--   the service-role admin client).
--
-- Rollback:
--   DROP POLICY IF EXISTS reports_select_own ON public.reports;
--
-- Idempotency:
--   DROP POLICY IF EXISTS guards make this safe to re-run. Useful for
--   the H2.6 GitHub Action that will eventually auto-apply pending
--   migrations on merge.
-- ============================================================================

DROP POLICY IF EXISTS reports_select_own ON public.reports;

CREATE POLICY reports_select_own ON public.reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON POLICY reports_select_own ON public.reports IS
  'Reactivates the N+1 fix in app/community/page.tsx by letting authenticated users read their own report rows. INSERT/UPDATE/DELETE remain service-role only.';

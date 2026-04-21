-- ============================================================================
-- Institution posting gate — Row Level Security
-- ----------------------------------------------------------------------------
-- Opportunities, research, and marketplace inserts go through API routes that
-- call requireVerifiedInstitution() server-side. Grants posts, however, are
-- direct client-side inserts (app/grants/post/page.tsx) that use the user's
-- JWT, so the gate has to be enforced at the database layer.
--
-- Policy logic:
--   • Individuals (account_type != 'institution' OR NULL) can insert as today.
--   • Institutions can insert only when is_institution_verified = true.
--   • The `posted_by` column must match auth.uid() (basic ownership check).
--
-- Note: we keep any existing permissive policies intact; RLS rules combine
-- with OR for the same role/command, so this tightens the institution path
-- without removing individual access. If no other INSERT policy exists yet,
-- this one is the authoritative check.
-- ============================================================================

ALTER TABLE public.grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS grants_insert_verified_institution ON public.grants;

CREATE POLICY grants_insert_verified_institution
  ON public.grants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Ownership: caller must be the poster
    posted_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          -- Individual accounts: always allowed (backward compatible)
          p.account_type IS NULL
          OR p.account_type <> 'institution'
          -- Institutions: must be admin-verified
          OR p.is_institution_verified = true
        )
    )
  );

-- Also add SELECT (public read) and UPDATE (own rows) policies only if they
-- don't already exist. We use IF NOT EXISTS via DO block for idempotency.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'grants' AND policyname = 'grants_select_public'
  ) THEN
    CREATE POLICY grants_select_public
      ON public.grants
      FOR SELECT
      TO authenticated, anon
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'grants' AND policyname = 'grants_update_own'
  ) THEN
    CREATE POLICY grants_update_own
      ON public.grants
      FOR UPDATE
      TO authenticated
      USING (posted_by = auth.uid())
      WITH CHECK (posted_by = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'grants' AND policyname = 'grants_delete_own'
  ) THEN
    CREATE POLICY grants_delete_own
      ON public.grants
      FOR DELETE
      TO authenticated
      USING (posted_by = auth.uid());
  END IF;
END $$;

COMMENT ON POLICY grants_insert_verified_institution ON public.grants IS
  'Institution accounts must have is_institution_verified = true to insert grants. Individual accounts are unaffected.';

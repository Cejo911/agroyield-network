-- ----------------------------------------------------------------------------
-- Migration: Expense OCR (Unicorn #5)
-- Date:      18 Apr 2026
-- Purpose:   Back the "Scan Receipt" feature — users upload a receipt photo,
--            Anthropic Vision extracts vendor/amount/date/VAT/category, user
--            reviews and commits. The committed receipt creates a row in the
--            existing `business_expenses` table so reports/charts light up
--            without any other page changing.
--
--            Two new tables:
--            (1) expense_receipts — one row per uploaded receipt image. Keeps
--                the raw extraction JSON (audit trail + eval data) and links
--                to a business_expenses row once the user commits. Status
--                enum lets us keep discarded receipts for audit without
--                conflating them with real expenses.
--            (2) usage_tracking — per-business monthly counter keyed by
--                feature_key + period_yyyymm. Atomic increment via upsert
--                on a unique composite key. Natural rollover — no cron
--                needed to "reset" counters; a new month just inserts a new
--                row with count=1.
--
--            Plus a storage bucket policy for 'receipts' (created in
--            dashboard; policies scripted here so they're version-controlled).
--
-- Idempotent. Safe to re-run.
--
-- Related:
--   - lib/feature-flags.ts FeatureFlagKey 'expense_ocr' (seeded in
--     20260417_feature_flags.sql, is_enabled=false — staged rollout)
--   - Admin UI: /app/admin/tabs/FeatureFlagsTab.tsx (super-admin toggle)
-- ----------------------------------------------------------------------------

-- ============================================================================
-- expense_receipts
-- ============================================================================

CREATE TABLE IF NOT EXISTS expense_receipts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expense_id          uuid REFERENCES business_expenses(id) ON DELETE SET NULL,

  -- Storage:
  receipt_url         text NOT NULL,    -- public or signed URL to uploaded image
  storage_path        text NOT NULL,    -- {businessId}/{uuid}.{ext} — used for delete on discard
  mime_type           text,
  file_size_bytes     integer,

  -- Extracted fields (nullable — Vision may not find every field):
  vendor              text,
  amount              numeric,
  receipt_date        date,
  vat_amount          numeric,
  suggested_category  text,

  -- Observability + audit:
  raw_extraction      jsonb,            -- full JSON returned by Vision model
  confidence_score    numeric,          -- model-reported 0..1 if provided
  extraction_error    text,             -- populated when extraction fails
  model_used          text,             -- e.g. 'claude-haiku-4-5-20251001'

  -- Workflow state:
  status              text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','reviewed','discarded','failed')),

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE expense_receipts IS
  'OCR pipeline for the "Scan Receipt" feature. One row per uploaded image. '
  'status=pending until user reviews; status=reviewed once linked to a '
  'business_expenses row. Raw extraction JSON kept for audit + future evals.';

-- List-page index: scoped lookups per business.
CREATE INDEX IF NOT EXISTS idx_expense_receipts_business
  ON expense_receipts (business_id, status, created_at DESC);

-- Owner scope (dashboard queries that filter by user).
CREATE INDEX IF NOT EXISTS idx_expense_receipts_user
  ON expense_receipts (user_id);

-- Reverse lookup when a business_expense row needs to find its source receipt.
CREATE INDEX IF NOT EXISTS idx_expense_receipts_expense
  ON expense_receipts (expense_id)
  WHERE expense_id IS NOT NULL;

-- updated_at trigger (matches existing pattern).
CREATE OR REPLACE FUNCTION set_expense_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expense_receipts_updated_at ON expense_receipts;
CREATE TRIGGER trg_expense_receipts_updated_at
  BEFORE UPDATE ON expense_receipts
  FOR EACH ROW
  EXECUTE FUNCTION set_expense_receipts_updated_at();

-- ----------------------------------------------------------------------------
-- RLS — owner or business owner can read; only user themselves can write.
-- (Service-role bypasses for the OCR API which writes on the user's behalf.)
-- ----------------------------------------------------------------------------
ALTER TABLE expense_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expense_receipts_select ON expense_receipts;
CREATE POLICY expense_receipts_select
  ON expense_receipts
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = expense_receipts.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS expense_receipts_insert ON expense_receipts;
CREATE POLICY expense_receipts_insert
  ON expense_receipts
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = expense_receipts.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS expense_receipts_update ON expense_receipts;
CREATE POLICY expense_receipts_update
  ON expense_receipts
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = expense_receipts.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS expense_receipts_delete ON expense_receipts;
CREATE POLICY expense_receipts_delete
  ON expense_receipts
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = expense_receipts.business_id
        AND b.user_id = auth.uid()
    )
  );

-- ============================================================================
-- usage_tracking
-- ============================================================================
--
-- Design note: we key on period_yyyymm (text, 'YYYY-MM') rather than a
-- rolling 30-day window. Two reasons:
--   (1) "Free tier: 20 receipts/month" in marketing copy = calendar month.
--       A rolling window makes quota math confusing for users
--       ("I only scanned 15 but it says I'm at my limit?").
--   (2) Natural rollover. No cron needed to zero counters — a new month
--       just upserts a new row with count=1. The /api/cron/usage-reset
--       route is kept for observability but does nothing destructive.
--
-- Unique (business_id, feature_key, period_yyyymm) lets us do atomic
-- "increment or create" in a single INSERT ... ON CONFLICT DO UPDATE.
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_tracking (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key     text NOT NULL,                    -- e.g. 'expense_ocr', 'ai_assistant'
  period_yyyymm   text NOT NULL,                    -- 'YYYY-MM' in UTC
  count           integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT usage_tracking_unique_period
    UNIQUE (business_id, feature_key, period_yyyymm),
  CONSTRAINT usage_tracking_period_format
    CHECK (period_yyyymm ~ '^\d{4}-\d{2}$'),
  CONSTRAINT usage_tracking_count_non_negative
    CHECK (count >= 0)
);

COMMENT ON TABLE usage_tracking IS
  'Per-business monthly counter for tier-gated features (expense_ocr, '
  'ai_assistant, etc). Natural rollover via period_yyyymm — no reset cron '
  'needed. Atomic increment via INSERT ... ON CONFLICT DO UPDATE SET count '
  '= count + 1.';

CREATE INDEX IF NOT EXISTS idx_usage_tracking_lookup
  ON usage_tracking (business_id, feature_key, period_yyyymm);

-- Analytics: "how many receipts did all businesses scan last month?"
CREATE INDEX IF NOT EXISTS idx_usage_tracking_feature_period
  ON usage_tracking (feature_key, period_yyyymm);

CREATE OR REPLACE FUNCTION set_usage_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usage_tracking_updated_at ON usage_tracking;
CREATE TRIGGER trg_usage_tracking_updated_at
  BEFORE UPDATE ON usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION set_usage_tracking_updated_at();

-- RLS: only owners can read their usage. Writes go through service-role
-- admin client from the API routes (same defence-in-depth pattern as
-- recurring_invoices — see scratchpad #42).
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usage_tracking_select ON usage_tracking;
CREATE POLICY usage_tracking_select
  ON usage_tracking
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = usage_tracking.business_id
        AND b.user_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies — service role only.

-- ============================================================================
-- Storage bucket 'receipts' — policies
-- ============================================================================
-- The bucket itself must be created once in the Supabase dashboard
-- (Storage → New bucket → name: receipts, Public: NO, File size limit: 5MB,
--  Allowed MIME types: image/jpeg, image/png, image/webp).
--
-- The policies below gate object access:
--   - authenticated users can insert (upload) into paths under their own
--     business's folder — path convention: {businessId}/{uuid}.{ext}
--   - authenticated users can select (read) objects they own
--   - no public read — we'll mint signed URLs on demand from the API
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN

    -- INSERT: authenticated users can upload receipts to their own business folder.
    -- Path format: {businessId}/{uuid}.{ext}
    -- The first path segment must match a business the user owns.
    DROP POLICY IF EXISTS "receipts_insert_owner" ON storage.objects;
    CREATE POLICY "receipts_insert_owner"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'receipts'
        AND EXISTS (
          SELECT 1 FROM businesses b
          WHERE b.id::text = (storage.foldername(name))[1]
            AND b.user_id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "receipts_select_owner" ON storage.objects;
    CREATE POLICY "receipts_select_owner"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'receipts'
        AND EXISTS (
          SELECT 1 FROM businesses b
          WHERE b.id::text = (storage.foldername(name))[1]
            AND b.user_id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "receipts_delete_owner" ON storage.objects;
    CREATE POLICY "receipts_delete_owner"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'receipts'
        AND EXISTS (
          SELECT 1 FROM businesses b
          WHERE b.id::text = (storage.foldername(name))[1]
            AND b.user_id = auth.uid()
        )
      );

  END IF;
END $$;

-- ============================================================================
-- Admin kill-switch setting — mirrors recurring_invoices_enabled pattern.
-- Default ON so feature-flag controls the rollout; kill-switch is for
-- emergencies (e.g. runaway Anthropic billing).
-- ============================================================================
INSERT INTO settings (key, value)
VALUES ('expense_ocr_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Refresh PostgREST schema cache so the new tables are visible immediately
-- to the API layer without a restart.
NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------------------------
-- Migration: recurring_invoices (Unicorn #4)
-- Date:      18 Apr 2026
-- Purpose:   Back the Pro+ "Make this recurring" feature on invoices.
--            Each row is a template + cadence; a daily cron
--            (/api/cron/recurring-invoices) uses `next_run_on` to drive
--            generation of real `invoices` rows.
--
-- Idempotent. Safe to re-run — uses IF NOT EXISTS everywhere and
-- DROP POLICY IF EXISTS + CREATE for policies.
--
-- Gotchas:
--   - line_items is jsonb, not a sub-table. Avoids a join on every cron tick;
--     invoice_items are materialised *only when* a real invoice is generated.
--   - next_run_on is required and computed by the API on INSERT. Keeping it
--     NOT NULL means the partial index (status='active', next_run_on) never
--     has to handle NULLs.
--   - end_on is optional. status='ended' is set by the cron when
--     next_run_on would step past end_on — so the schedule state is
--     always recoverable from just (status, next_run_on, end_on).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS recurring_invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,                    -- template owner (who created it)
  customer_id     uuid NOT NULL,                    -- generated invoices always go to one customer
  cadence         text NOT NULL CHECK (cadence IN ('weekly','monthly','quarterly')),

  -- Template payload (mirrors invoice columns populated on create):
  document_type   text DEFAULT 'invoice',
  notes           text,
  apply_vat       boolean DEFAULT false,
  vat_rate        numeric DEFAULT 7.5,
  delivery_charge numeric DEFAULT 0,
  due_days        integer DEFAULT 14,               -- offset from issue_date, applied when generating

  -- line_items stored as JSON to avoid a per-row join on cron scan.
  -- Each entry: { product_id: uuid|null, description: text, quantity: number, unit_price: number }
  line_items      jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Schedule state:
  start_on        date NOT NULL DEFAULT CURRENT_DATE,
  next_run_on     date NOT NULL,
  last_run_on     date,
  end_on          date,                             -- NULL = open-ended
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','ended')),

  -- Observability:
  last_error      text,                             -- last failure message, cleared on next success
  generated_count integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Cron scan index: hot path is (status='active', next_run_on <= today).
-- Partial index keeps it tiny even as ended/paused rows accumulate.
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_cron_scan
  ON recurring_invoices (next_run_on)
  WHERE status = 'active';

-- List-page index: owner-scoped lookups filtered by business.
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_business
  ON recurring_invoices (business_id, status);

-- Owner audit + reverse lookup:
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_user
  ON recurring_invoices (user_id);

-- updated_at trigger (matches pattern used elsewhere in the schema):
CREATE OR REPLACE FUNCTION set_recurring_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recurring_invoices_updated_at ON recurring_invoices;
CREATE TRIGGER trg_recurring_invoices_updated_at
  BEFORE UPDATE ON recurring_invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_recurring_invoices_updated_at();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;

-- SELECT: template owner OR business owner can read.
-- (The cron uses the service role which bypasses RLS, so no admin policy
--  needed here.)
DROP POLICY IF EXISTS recurring_invoices_select ON recurring_invoices;
CREATE POLICY recurring_invoices_select
  ON recurring_invoices
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = recurring_invoices.business_id
        AND b.user_id = auth.uid()
    )
  );

-- INSERT: user must be the template owner AND own the target business.
-- Prevents a logged-in user from creating a recurring invoice against
-- someone else's business.
DROP POLICY IF EXISTS recurring_invoices_insert ON recurring_invoices;
CREATE POLICY recurring_invoices_insert
  ON recurring_invoices
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = recurring_invoices.business_id
        AND b.user_id = auth.uid()
    )
  );

-- UPDATE: template owner or business owner can modify
-- (pause/resume/end + template edits).
DROP POLICY IF EXISTS recurring_invoices_update ON recurring_invoices;
CREATE POLICY recurring_invoices_update
  ON recurring_invoices
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = recurring_invoices.business_id
        AND b.user_id = auth.uid()
    )
  );

-- DELETE: same gate as UPDATE. In practice the API uses soft-end
-- (status='ended') rather than DELETE, but we leave the policy for admin
-- cleanups via dashboard.
DROP POLICY IF EXISTS recurring_invoices_delete ON recurring_invoices;
CREATE POLICY recurring_invoices_delete
  ON recurring_invoices
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = recurring_invoices.business_id
        AND b.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- Admin kill-switch setting (defaults to 'true' — opt out, not opt in,
-- since the feature flag already gates rollout).
-- ----------------------------------------------------------------------------
INSERT INTO settings (key, value)
VALUES ('recurring_invoices_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

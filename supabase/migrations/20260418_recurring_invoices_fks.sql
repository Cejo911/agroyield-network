-- ----------------------------------------------------------------------------
-- Migration: recurring_invoices — add missing foreign keys (Unicorn #4 hotfix)
-- Date:      18 Apr 2026 (Session 4 follow-up)
-- Purpose:   `20260418_recurring_invoices.sql` declared `customer_id`,
--            `business_id`, and `user_id` as bare `uuid NOT NULL` columns.
--            `business_id` correctly carried `REFERENCES businesses(id)
--            ON DELETE CASCADE`, but `customer_id` and `user_id` did not.
--            PostgREST can't resolve embeds like `customers(name)` without
--            a foreign-key constraint, so the dedicated recurring page
--            (`/business/invoices/recurring`) silently fell back to its
--            empty state even when rows existed.
--
--            This migration adds the two missing FKs idempotently. It also
--            re-asserts the businesses FK in case the table was created
--            on an older schema version.
--
-- Idempotent. Safe to re-run — guards every ADD CONSTRAINT with an
-- existence check, so partial replays just no-op.
--
-- Gotchas:
--   - `customer_id` has no historical NULL values (NOT NULL since
--     creation), so the FK can be added without a backfill.
--   - We deliberately use ON DELETE RESTRICT on customer_id (not CASCADE):
--     deleting a customer that still has live recurring templates should
--     be blocked — the user has to End the templates first. This mirrors
--     accounting-system semantics and protects audit trails.
--   - user_id references auth.users(id) (not profiles): matches the
--     pattern used in `recurring_invoices_select` RLS policy which
--     compares against auth.uid().
-- ----------------------------------------------------------------------------

-- customer_id → customers(id), block deletes that would orphan templates.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'recurring_invoices_customer_id_fkey'
      AND conrelid = 'public.recurring_invoices'::regclass
  ) THEN
    ALTER TABLE public.recurring_invoices
      ADD CONSTRAINT recurring_invoices_customer_id_fkey
      FOREIGN KEY (customer_id)
      REFERENCES public.customers(id)
      ON DELETE RESTRICT;
  END IF;
END$$;

-- user_id → auth.users(id), cascade if the user is hard-deleted.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'recurring_invoices_user_id_fkey'
      AND conrelid = 'public.recurring_invoices'::regclass
  ) THEN
    ALTER TABLE public.recurring_invoices
      ADD CONSTRAINT recurring_invoices_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END$$;

-- Re-assert business_id FK in case the original CREATE TABLE was somehow
-- replayed on a schema where the inline REFERENCES got stripped.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'recurring_invoices_business_id_fkey'
      AND conrelid = 'public.recurring_invoices'::regclass
  ) THEN
    ALTER TABLE public.recurring_invoices
      ADD CONSTRAINT recurring_invoices_business_id_fkey
      FOREIGN KEY (business_id)
      REFERENCES public.businesses(id)
      ON DELETE CASCADE;
  END IF;
END$$;

-- Force PostgREST to refresh its schema cache so the new FKs become
-- usable in nested selects without a server restart.
NOTIFY pgrst, 'reload schema';

-- Migration: Add delivery_charge to invoices
-- Purpose: Allow capturing logistics / delivery cost on an invoice.
--          Delivery is added to the subtotal BEFORE VAT is applied,
--          matching how most Nigerian businesses invoice freight + goods.

-- 1. Column (idempotent — safe to re-run)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS delivery_charge numeric NOT NULL DEFAULT 0;

-- 2. Sanity constraint — delivery cannot be negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_delivery_charge_nonneg'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_delivery_charge_nonneg CHECK (delivery_charge >= 0);
  END IF;
END $$;

COMMENT ON COLUMN public.invoices.delivery_charge IS
  'Logistics / shipping cost added to subtotal before VAT is calculated.';

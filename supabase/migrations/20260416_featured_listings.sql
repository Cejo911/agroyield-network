-- Phase 4.8: Featured Marketplace Listings
-- Adds featured listing support to marketplace_listings + payment tracking table.

-- 1. Add featured columns to marketplace_listings
ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS featured_at timestamptz DEFAULT NULL;

-- Index for sorting featured listings to top + expiry cron
CREATE INDEX IF NOT EXISTS idx_listings_featured ON marketplace_listings (is_featured, featured_until)
  WHERE is_featured = true;

-- 2. Featured listing payments (audit trail)
CREATE TABLE IF NOT EXISTS featured_listing_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,             -- price paid in naira
  days integer NOT NULL,               -- duration purchased
  paystack_reference text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz DEFAULT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_flp_listing ON featured_listing_payments (listing_id);
CREATE INDEX IF NOT EXISTS idx_flp_user ON featured_listing_payments (user_id);
CREATE INDEX IF NOT EXISTS idx_flp_reference ON featured_listing_payments (paystack_reference);

-- 3. RLS policies
ALTER TABLE featured_listing_payments ENABLE ROW LEVEL SECURITY;

-- Users can see their own payments
DROP POLICY IF EXISTS "Users can view own featured payments" ON featured_listing_payments;
CREATE POLICY "Users can view own featured payments"
  ON featured_listing_payments FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role inserts/updates (via API)
DROP POLICY IF EXISTS "Service role manages featured payments" ON featured_listing_payments;
CREATE POLICY "Service role manages featured payments"
  ON featured_listing_payments FOR ALL
  USING (auth.role() = 'service_role');

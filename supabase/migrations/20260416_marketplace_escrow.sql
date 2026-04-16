-- ══════════════════════════════════════════════════════════════════════
-- Marketplace Escrow System — Phase 4.1
-- Tables: seller_bank_accounts, marketplace_orders, marketplace_disputes
-- Commission: 3% platform fee
-- Auto-release: 7 days after seller marks delivered (configurable)
-- ══════════════════════════════════════════════════════════════════════

-- ── Seller Bank Accounts (for Paystack Transfers) ───────────────────
CREATE TABLE seller_bank_accounts (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name         text        NOT NULL,
  bank_code         text        NOT NULL,          -- Paystack bank code
  account_number    text        NOT NULL,
  account_name      text        NOT NULL,          -- verified account name from Paystack
  recipient_code    text,                           -- Paystack transfer recipient code
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_seller_bank_user ON seller_bank_accounts(user_id);

-- ── Marketplace Orders ──────────────────────────────────────────────
CREATE TABLE marketplace_orders (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id        uuid        NOT NULL REFERENCES marketplace_listings(id) ON DELETE SET NULL,
  buyer_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Pricing
  amount            numeric     NOT NULL,           -- listing price in NGN
  commission        numeric     NOT NULL DEFAULT 0, -- platform fee (3%)
  seller_amount     numeric     NOT NULL DEFAULT 0, -- amount - commission

  -- Payment
  paystack_reference text       UNIQUE,             -- Paystack transaction reference
  payment_status    text        NOT NULL DEFAULT 'pending',

  -- Order lifecycle
  status            text        NOT NULL DEFAULT 'pending_payment',
  shipped_at        timestamptz,                    -- seller marked shipped
  delivery_deadline timestamptz,                    -- auto-release if not confirmed/disputed by this date
  confirmed_at      timestamptz,                    -- buyer confirmed delivery
  released_at       timestamptz,                    -- funds transferred to seller
  transfer_code     text,                           -- Paystack transfer code/reference
  cancelled_at      timestamptz,

  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),

  CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending','paid','released','refunded')),
  CONSTRAINT valid_order_status   CHECK (status IN (
    'pending_payment',  -- awaiting buyer payment
    'paid',             -- buyer paid, awaiting seller to ship
    'shipped',          -- seller marked shipped, awaiting buyer confirmation
    'completed',        -- buyer confirmed, funds released
    'disputed',         -- dispute raised
    'refunded',         -- admin refunded buyer
    'cancelled'         -- cancelled before payment
  ))
);

CREATE INDEX idx_orders_buyer      ON marketplace_orders(buyer_id, created_at DESC);
CREATE INDEX idx_orders_seller     ON marketplace_orders(seller_id, created_at DESC);
CREATE INDEX idx_orders_listing    ON marketplace_orders(listing_id);
CREATE INDEX idx_orders_status     ON marketplace_orders(status, created_at DESC);
CREATE INDEX idx_orders_paystack   ON marketplace_orders(paystack_reference) WHERE paystack_reference IS NOT NULL;
CREATE INDEX idx_orders_auto_release ON marketplace_orders(delivery_deadline)
  WHERE status = 'shipped' AND delivery_deadline IS NOT NULL;

-- ── Marketplace Disputes ────────────────────────────────────────────
CREATE TABLE marketplace_disputes (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id          uuid        NOT NULL UNIQUE REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  raised_by         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  reason            text        NOT NULL,
  description       text,
  evidence_urls     text[],                         -- photo evidence from either party
  status            text        NOT NULL DEFAULT 'open',
  resolution        text,                           -- admin resolution notes
  resolved_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at       timestamptz,
  created_at        timestamptz DEFAULT now(),

  CONSTRAINT valid_dispute_status CHECK (status IN ('open','investigating','resolved_seller','resolved_buyer','closed'))
);

CREATE INDEX idx_disputes_order  ON marketplace_disputes(order_id);
CREATE INDEX idx_disputes_status ON marketplace_disputes(status, created_at DESC);

-- ══════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE seller_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_disputes ENABLE ROW LEVEL SECURITY;

-- Seller bank accounts: users see + manage their own only
CREATE POLICY "Users can view own bank account"
  ON seller_bank_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank account"
  ON seller_bank_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank account"
  ON seller_bank_accounts FOR UPDATE
  USING (auth.uid() = user_id);

-- Orders: buyer and seller can see their own orders
CREATE POLICY "Buyer can view own orders"
  ON marketplace_orders FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Seller can view own orders"
  ON marketplace_orders FOR SELECT
  USING (auth.uid() = seller_id);

-- Disputes: participants can view disputes on their orders
CREATE POLICY "Order participants can view disputes"
  ON marketplace_disputes FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM marketplace_orders
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

CREATE POLICY "Order participants can raise disputes"
  ON marketplace_disputes FOR INSERT
  WITH CHECK (
    auth.uid() = raised_by
    AND order_id IN (
      SELECT id FROM marketplace_orders
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════════════════════════════════
-- Add escrow_auto_release_days to settings (default 7)
-- Run this only if you want to seed the setting:
-- INSERT INTO settings (key, value)
--   VALUES ('escrow_auto_release_days', '7')
--   ON CONFLICT (key) DO NOTHING;
-- ══════════════════════════════════════════════════════════════════════

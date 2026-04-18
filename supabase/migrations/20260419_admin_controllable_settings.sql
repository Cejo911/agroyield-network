-- ----------------------------------------------------------------------------
-- Migration: Admin-controllable settings (pre-Beta hardening)
-- Date:      19 Apr 2026
-- Purpose:   Move two more "magic" surfaces out of source code and into the
--            settings table so they can be tuned from the Admin Dashboard
--            without redeploying. Mirrors the pattern already used by
--            opportunity_types / marketplace_categories / pricing tiers.
--
--            (1) usage_limits — per-feature × per-tier monthly quota grid.
--                Until now this lived as a hardcoded `USAGE_LIMITS` constant
--                in lib/usage-tracking.ts. Moving it to settings means:
--                  - bump expense_ocr Pro from 100 to 150 in 5s without a
--                    deploy
--                  - turn a tier into "unlimited" by setting null
--                  - gives the founder direct control over the cost knob
--                    that's most likely to need tuning during Beta
--                Shape: { [feature_key]: { free: number, pro: number,
--                                          growth: number | null } }
--                null means unlimited.
--
--            (2) expense_categories — the 10 category labels shown in the
--                receipt OCR Vision prompt AND in the expenses page picker /
--                breakdown chart. Was duplicated in two source files (a
--                drift trap — the comment in /api/expense-ocr/route.ts even
--                warned to "keep in sync"). One source of truth now.
--                Shape: string[] (1-32 chars per entry).
--
-- Idempotent. Safe to re-run.
--
-- Related:
--   - lib/usage-tracking.ts — async settings-backed reads with 60s cache
--     (mirrors lib/feature-flags.ts pattern; SAFE_DEFAULTS fall back to the
--     values seeded here)
--   - lib/expense-categories.ts — server-side getExpenseCategories() helper
--   - app/api/content-types/route.ts — extended GET to serve
--     expense_categories so client components (`'use client'`) can fetch
--     without crossing the server-only boundary
--   - app/api/admin/settings/route.ts — saveSettings() validators reject
--     malformed shapes (scratchpad #18 — "Dynamic Settings Are a Schema
--     Debt Trap")
--   - Admin UI cards: "Usage Limits" in Pricing & Subscriptions section,
--     "Expense Categories" in Content & Moderation section, both with
--     Option B confirmation modal before save (avoids accidental
--     mid-month lockouts).
-- ----------------------------------------------------------------------------

-- ============================================================================
-- usage_limits — per-feature × per-tier monthly quota grid
-- ============================================================================
-- Defaults match the constants we're retiring from lib/usage-tracking.ts so
-- behaviour is byte-identical on first deploy. Any subsequent admin edits
-- override these.
--
-- ON CONFLICT DO NOTHING — never clobber values an admin has already tuned.
INSERT INTO settings (key, value)
VALUES (
  'usage_limits',
  '{"expense_ocr":{"free":20,"pro":100,"growth":null},"ai_assistant":{"free":5,"pro":50,"growth":null}}'
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- expense_categories — labels for receipt OCR + expenses page
-- ============================================================================
-- Order is preserved client-side. The first item in the list is also used as
-- the default selection in the expenses picker, so keep "Input Costs" first
-- (most-frequently used by Nigerian smallholder farmers — verified during
-- Week 2 user interviews; see scratchpad #38).
INSERT INTO settings (key, value)
VALUES (
  'expense_categories',
  '["Input Costs","Transport & Logistics","Labour & Wages","Market Fees & Commissions","Equipment & Maintenance","Rent & Storage","Utilities","Marketing & Advertising","Professional Services","Other"]'
)
ON CONFLICT (key) DO NOTHING;

-- Refresh PostgREST schema cache so admin reads see the new rows immediately
-- without a connection-pool restart.
NOTIFY pgrst, 'reload schema';

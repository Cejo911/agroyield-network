-- 2026-04-21  Rename price_reports.category 'oils' → 'oil'
--
-- The Price Tracker's category taxonomy used the plural key "oils" which
-- rendered as "Oils" in the Submit-a-Price-Report category dropdown
-- (prices-client and submit form both title-case the stored key). The
-- rest of the app (Marketplace, admin settings) uses the singular "oil",
-- so the Price Tracker was the odd one out. Code has been updated to
-- use "oil" — this migration rewrites existing rows so the filter pill,
-- the category badge, and the edit form all keep working for reports
-- submitted before the rename landed.
--
-- Table is `price_reports` (the Price Tracker's user-submitted rows,
-- written by /api/prices). Not to be confused with `price_entries`
-- (older import-pipeline table, schema-wise unrelated: its category lives
-- on the referenced `commodities` row, not inline).
--
-- price_reports.category is `text` with no CHECK constraint (see
-- 00000000000000_baseline.sql around line 1078) so a plain UPDATE is
-- safe. No index on category today, so this is a single table scan.
--
-- Backout: UPDATE price_reports SET category = 'oils' WHERE category = 'oil';
-- (Only safe to back out before any report is submitted post-rename —
-- after that, running the backout would conflate new legit 'oil' rows
-- with the legacy ones.)

UPDATE price_reports
   SET category = 'oil'
 WHERE category = 'oils';

# Expense OCR Rollout Runbook

**Feature**: `expense_ocr` (Unicorn #5)
**Owner**: Chijioke Okoli
**Created**: 18 April 2026
**Target Beta**: Monday 20 April 2026, 07:00 WAT

This runbook covers the controlled rollout of the Expense OCR feature from founder-only
testing to all Beta users, plus the emergency stop and rollback procedures.

---

## 1. Guardrails — what's already in place

Three independent controls gate the feature. All three must be green for any user to hit
the endpoint.

1. **Admin kill-switch** — `settings.expense_ocr_enabled` row in Postgres. Flip to
   `'false'` to stop the entire feature instantly for everyone, bypassing flag logic.
2. **Feature flag** — `expense_ocr` in the `feature_flags` table. Default OFF. Supports
   allowlist by user-id or business-id, plus percentage rollout.
3. **Tier + quota** — Free: 20/month, Pro: 100/month, Growth: unlimited. Counter lives in
   `usage_tracking` keyed by `(business_id, feature_key, period_yyyymm)`. Increments only
   on successful extraction (scratchpad #50).

Each layer can be triggered independently from `/admin` → Feature Flags tab.

---

## 2. Current state (pre-rollout)

- `settings.expense_ocr_enabled` = `'true'`
- `feature_flags.expense_ocr.enabled` = `false`
- `feature_flags.expense_ocr.user_allowlist` = `[<okoli-user-id>]` (to be added Sunday)
- Smoke tests passing: end-to-end OCR ✓, cross-journey 30/30 ✓
- Monitoring verified: Sentry + PostHog firing

---

## 3. Rollout steps — in order

### Step 1 — Sunday evening: Okoli-only allowlist dry-run (20:00 WAT)

Goal: prove the whole pipeline works in production with a real user session.

1. `/admin` → Feature Flags → find `expense_ocr` row
2. Leave `enabled` = **false**
3. Add Okoli's user-id to **user_allowlist**
4. Sign in at `https://agroyield.africa`, navigate to any business you own → `/business/expenses`
5. Click "Scan Receipt" → upload a real receipt photo
6. Confirm the extraction appears, review, save as expense
7. Verify row appears in `/business/expenses` list and `usage_tracking.count = 1`

**Expected**: smooth round-trip, Haiku returns vendor/amount/date with confidence ≥ 0.75
for typical printed receipts.

**If broken**: leave flag as-is, run `./scripts/smoke-test-expense-ocr.ts` and
`./scripts/peek-receipt.sh receipt.jpg` to isolate which tier failed. Do NOT widen.

### Step 2 — Monday morning: widen to Beta cohort (07:00 WAT)

Goal: enable for all Beta users while maintaining the ability to pull the plug.

**Option A — full switch-on (recommended if Step 1 passed cleanly):**

1. `/admin` → Feature Flags → `expense_ocr` → toggle `enabled` = **true**
2. Leave `rollout_percent` at 100 (or whatever your flag schema defaults to)
3. Remove the Okoli-only allowlist entry (optional — it's a no-op when enabled=true,
   but tidier)
4. Send the Beta welcome email (see `marketing/beta-welcome.md`)

**Option B — gradual ramp (recommended if Step 1 showed any flakiness):**

1. Toggle `enabled` = **true**
2. Set `rollout_percent` = 25
3. Watch Sentry + PostHog for 2 hours. Target: zero new 5xx errors on `/api/expense-ocr`
4. If clean → bump to 50, wait 2 hours, bump to 100
5. If errors spike → drop back to 0 and debug. Already-uploaded receipts are unaffected.

### Step 3 — post-rollout monitoring (first 48 hours)

**Metrics to watch:**

- `usage_tracking` count growth — expect a few-dozen increments per day across the cohort
- `expense_receipts.status` distribution — pending:failed ratio should be >= 3:1
- Sentry errors tagged `/api/expense-ocr` — investigate any spike >5/hour
- PostHog event `$pageview` on `/business/expenses` — spike confirms Beta users found it

**Daily check-in SQL** (paste into Supabase SQL editor):

```sql
-- Daily OCR health snapshot
SELECT
  date_trunc('day', created_at) AS day,
  status,
  count(*) AS receipts,
  round(avg(confidence_score) * 100)::int AS avg_confidence_pct
FROM expense_receipts
WHERE created_at > now() - interval '7 days'
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

-- Current-month usage per business
SELECT business_id, count, period_yyyymm
FROM usage_tracking
WHERE feature_key = 'expense_ocr'
  AND period_yyyymm = to_char(now(), 'YYYY-MM')
ORDER BY count DESC
LIMIT 20;
```

---

## 4. Emergency procedures

### Kill switch — stop everything in < 30 seconds

Use when:
- Vision is returning garbage / hallucinating amounts
- Anthropic billing alarm fires
- Supabase Storage quota near limit
- Any user-data incident

**Procedure:**

```sql
-- Flip the kill-switch
UPDATE settings SET value = 'false' WHERE key = 'expense_ocr_enabled';
```

Effect: the POST endpoint returns `403 Feature temporarily disabled` on the next request.
UI shows "Scan Receipt temporarily unavailable" banner. No in-flight upload is aborted —
they complete or fail normally. Usage_tracking is unaffected.

**To resume:**

```sql
UPDATE settings SET value = 'true' WHERE key = 'expense_ocr_enabled';
```

### Flag rollback — disable for new users, preserve data

Use when:
- One user cohort is seeing issues (e.g. mobile Safari upload bug)
- You want to pause adoption without deleting the feature

**Procedure:** `/admin` → Feature Flags → `expense_ocr` → toggle `enabled` = **false**.
Existing receipts remain intact; users just can't create new ones.

### Full rollback — restore to pre-feature state

Only needed if there's a data corruption issue. Receipts and usage_tracking rows are
independent of `business_expenses`, so dropping them is safe.

```sql
-- 1. Stop ingesting new data
UPDATE settings SET value = 'false' WHERE key = 'expense_ocr_enabled';

-- 2. (Optional) Soft-delete all pending/reviewed receipts
UPDATE expense_receipts SET status = 'discarded' WHERE status IN ('pending', 'reviewed');

-- 3. (Nuclear) Drop the feature — re-enabling requires re-running the migration
-- DROP TABLE expense_receipts CASCADE;
-- DROP TABLE usage_tracking CASCADE;
-- DELETE FROM settings WHERE key = 'expense_ocr_enabled';
-- DELETE FROM feature_flags WHERE key = 'expense_ocr';
```

The nuclear option also requires deleting the storage bucket contents in Supabase
Dashboard → Storage → `receipts` → Empty bucket.

---

## 5. Known limitations for Beta

Surface these in the Beta welcome email so users set accurate expectations:

- Supports JPEG, PNG, WebP up to 5 MB
- Nigerian-printed receipts work best; handwritten receipts hit ~40% confidence
- Vision occasionally mis-reads amount if the receipt is creased through the total line
- Currency assumed to be NGN — other currencies surface as raw numbers with a warning
- Rate limit: 5 uploads/minute/IP (protects against accidental camera-loops on mobile)
- Quota is calendar-month; counter rolls over at 00:10 UTC on the 1st

---

## 6. Post-rollout — the 48-hour checklist

| When | Who | What |
|------|-----|------|
| +1h  | Okoli | Scan Sentry Issues for any 5xx on `/api/expense-ocr` |
| +4h  | Okoli | Run `./scripts/peek-receipt.sh` against your own business — spot-check extraction quality |
| +24h | Okoli | Run daily-health SQL, check pending:failed ratio |
| +48h | Okoli | Review Beta feedback tickets (`/admin` → Reports), adjust flag/quota if needed |

If all four checkpoints pass, feature graduates from "Beta" to "GA" and gets a mention on
the `/pricing` page's "What's included" list.

---

## 7. Related files

- Migration: `supabase/migrations/20260418_expense_ocr.sql`
- API: `app/api/expense-ocr/route.ts` + `app/api/expense-ocr/[id]/route.ts`
- UI: `app/business/expenses/ReceiptScanButton.tsx`
- Quota helpers: `lib/usage-tracking.ts`
- Monthly reset cron: `app/api/cron/usage-reset/route.ts`
- Smoke tests: `scripts/smoke-test-expense-ocr.ts`, `scripts/peek-receipt.sh`
- Cross-journey smoke: `scripts/smoke-test-journeys.sh`
- Scratchpad #50 (quota invariant): `ROADMAP.md`

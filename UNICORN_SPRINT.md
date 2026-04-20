# AgroYield Unicorn Sprint — 11-Week Critical Path

> **Created:** 17 April 2026
> **Launch Target:** 5 July 2026 (77 days)
> **Owner:** Okoli (okolichijiokei@gmail.com)
> **Scope:** Ship 8 differentiators + complete Phase 4.6 Beta Testing + launch prep
> **Build capacity:** 9 effective weeks (last 2 reserved for launch prep)
> **Companion docs:** `ROADMAP.md` (strategic), `PROJECT_STATUS.md` (reference)

This is the execution document. Week-by-week, each feature has scope, dependencies, and a descope trigger. The goal is not "ship 8 features" — it's to cross the launch line with the feature set that makes AgroYield unmistakably unicorn-shaped: retention, acquisition, conversion, stickiness.

---

## The 8 Differentiators

| # | Feature                      | Growth Vector        | Tier Gating                                              |
| - | ---------------------------- | -------------------- | -------------------------------------------------------- |
| 1 | Weekly Digest Email          | Retention            | All tiers                                                |
| 2 | Public Business Pages + SEO  | Organic acquisition  | All tiers                                                |
| 3 | WhatsApp Invoice Delivery    | Conversion (payment) | Free: ₦50/msg · Pro+: unlimited · Termii now, Meta post-launch |
| 4 | Recurring Invoices           | Retention + revenue  | Pro+ only                                                |
| 5 | Expense OCR (receipt photos) | Stickiness           | Free: 20/mo · Pro: 100/mo · Growth: unlimited            |
| 6 | Agri Credit Score (AgroScore)| Moat (data)          | All tiers see score; partner integration post-launch. **BD collateral ready (18 Apr 2026):** one-page spec sheet + 6 cold letters drafted for Carbon, FairMoney, Renmoney, LAPO, OPay, Moniepoint — both in `/Documents/AgroYield Docs/`. |
| 7 | AI Assistant (scoped chat)   | Daily-use stickiness | Free: 5/day · Pro: 50/day · Growth: unlimited            |
| 8 | Cooperatives (group feature) | Nigerian agri moat   | Free co-op creation; Growth required for admin role      |

---

## Critical Path Dependencies (Day 1)

Three external dependencies block downstream features. Start these **before any code**:

### D1. Termii account + API key
Blocks: #3 WhatsApp Delivery (Termii is the launch provider; Meta swap is post-launch).
Action: Sign up at `termii.com` with AgroYield business email. Request WhatsApp channel enablement.
Lead time: 0–5 days.

> **Provider strategy:** Ship #3 on Termii now to avoid Meta verification gating the launch. Build behind a provider abstraction so swapping to Meta WhatsApp Business API post-launch is a one-file change. See "WhatsApp Provider Abstraction" section below.

### D2. Anthropic API key (AgroYield workspace)
Blocks: #5 OCR, #7 AI Assistant.
Action: Confirm or create dedicated key with **₦100k/month spend cap**. Separate from any personal key.
Lead time: Same-day.

### D3. Beta cohort formalisation
Blocks: feature-flagged rollouts, weekly feedback loop.
Action: Pull 10–20 SMEs into a Supabase `beta_testers` table (name, business type, email, WhatsApp, feature flags).
Lead time: 1 day.

---

## Shared Foundations (build once, reused 4+ times)

Before Week 1 feature work, build three primitives that everything else rides on. **Total: 1.5 days, saves ~5 days across the sprint.**

### F1. Slug + public-URL infrastructure ✅ SHIPPED (17 Apr 2026, Session 3)
- `slug` column on `businesses` (unique, auto-generated from name) — **done**
- `business_slug_aliases` table for historical-slug redirects — **done**
- `/b/[slug]` route — server-rendered via `resolveSlug()` (live → alias → 404) — **done**
- 8 showcase columns live (tagline, about, cover_image_url, website, instagram, facebook, opening_hours, founded_year) via `20260418_business_showcase.sql` — **done**
- `/business/setup/complete` page with `PublicPageCard` for editing showcase fields — **done**
- Anon nav logo on `/b/[slug]` matched to AppNav (mobile 44×44 icon, desktop 200×50 horizontal, dark-mode variant) — **done**
- Reused by #1 (digest links), #2 (public pages), future SEO plays
- `sitemap.xml` + `robots.txt` auto-generation from active businesses — **done** (`app/sitemap.ts` + `app/robots.ts`, verified 18 Apr 2026 per Session 3 verification pass)

### F2. Shared cron harness ✅ SHIPPED (17 Apr 2026, Session 2)
- `lib/cron/index.ts` wrapping existing `CRON_SECRET` pattern — **done**
- Standardised logging via `cron_runs` audit table (every invocation writes a row: success/skipped/failed, duration, counts, metadata) — **done**
- Idempotency enforcement via `dailyKey()` / `weeklyKey()` — prevents double-execution within the same schedule window — **done**
- Applied to all 6 existing crons (digest, business-digest, expire-subs, expiry-reminder, celebrations, expire-featured) — **done**
- Root `/vercel.json` registers all 6 with Vercel's scheduler — **done**
- Admin kill-switch UI in `/admin` Email section — toggle any cron on/off without a deploy — **done**
- Reused by #1 digest (already wrapped), will be reused by #4 recurring invoices, #6 credit score refresh, beta analytics
- Still pending: Slack failure alerts inside the harness (currently handlers alert themselves; harness-level Slack wiring is a 10-min addition when we hit the first production failure)

### F3. Feature flag table ✅ SHIPPED (17 Apr 2026)
- `supabase/migrations/20260417_feature_flags.sql` — `feature_flags` table with RLS (authenticated-read), `updated_at` trigger, seeded with the 8 unicorn keys (`weekly_digest`, `public_business_pages`, `whatsapp_delivery`, `recurring_invoices`, `expense_ocr`, `agri_credit_score`, `ai_assistant`, `cooperatives`) — **done**
- `lib/feature-flags.ts` (118 lines) — typed `FeatureFlagKey`, `isFeatureEnabled({ userId, businessId })` with global-on / explicit user-allowlist / explicit business-allowlist / deterministic percentage-rollout (hash-to-bucket) logic, 60s in-memory cache, fail-closed on errors — **done**
- Enables dark-ship to beta cohort first, flip to all users on launch day

---

## WhatsApp Provider Abstraction

Strategic decision (17 Apr 2026): Ship #3 on Termii for the launch. Swap to Meta WhatsApp Business API post-launch once Facebook Business Verification clears and we hit volume where the ~65% per-message cost saving matters.

### Directory structure
```
lib/messaging/whatsapp/
  ├── provider.ts          // TypeScript interface
  ├── termii-provider.ts   // ships Week 2 (launch provider)
  ├── meta-provider.ts     // scaffolded Week 2, activated post-launch
  ├── templates.ts         // shared message copy (invoice, reminder, digest)
  └── index.ts             // provider factory, env-var-driven
```

### Provider interface (normalised)
- `sendTemplate({ to: E164String, templateId, variables })` — returns `{ providerMessageId, status }`
- `sendMedia({ to: E164String, mediaUrl, caption })` — for invoice PDFs
- `getStatus(providerMessageId)` — unified status enum: `queued | sent | delivered | read | failed`

### Non-negotiable rules (to keep switch painless)
1. **Callers import only from `lib/messaging/whatsapp`** — never `import termii` or `import meta` directly anywhere else
2. **E.164 phone format everywhere** (`+234XXXXXXXXXX`). Normalise at input-validation layer, not at send time
3. **Template copy lives in `templates.ts`** — Termii and Meta approve templates separately, but copy must match so swap is invisible to users
4. **`messages_log` table uses a normalised schema**: `provider`, `provider_message_id`, `normalised_status`, `raw_payload (jsonb)`. Provider-specific webhook fields go into `raw_payload` only — never leak into typed columns
5. **Env var selects provider:** `WHATSAPP_PROVIDER=termii` (launch) → `WHATSAPP_PROVIDER=meta` (post-Meta verification). Provider factory in `index.ts` dispatches

### Migration trigger (post-launch)
Switch to Meta when ALL three are true:
- Facebook Business Verification complete
- AgroYield sending >3,000 WhatsApp messages/month (cost savings become material)
- Meta template approval rate stable (avoid launch-week template rejections blocking invoicing)

Expected minutes-not-days effort when trigger hits: add Meta credentials to Vercel env, flip `WHATSAPP_PROVIDER`, redeploy, monitor webhook logs for 24 hours.

---

## Week-by-Week Ship Schedule

### Week 1 (17–24 Apr) — Foundations + Quick Win

**Mon–Tue:** Foundations F1, F2, F3. — **F1 complete (17 Apr, Session 3)** (sitemap/robots also shipped, see #2 below); **F2 complete (17 Apr, Session 2)**; **F3 complete (17 Apr 2026)** — `feature_flags` table + `lib/feature-flags.ts` reader with all 8 unicorn keys seeded.

**Wed–Fri:** Ship **#1 Weekly Digest**. ✅ SHIPPED
- `app/api/cron/weekly-digest/route.ts` (879 lines) — Monday 07:00 Africa/Lagos via `runCron` harness (F2), idempotent per ISO week via `weeklyKey()` — **done**
- Personalised per user across 4 modules: top 3 price swings (week-over-week) in their state, matched opportunities + grants (any-tag intersection with `profile.interests`), unread messages count, one business insight (revenue swing or collection-rate delta) — **done**
- Graceful fallbacks when interests / location are empty
- Reuses Resend email stack (`SENDERS.digest` from address)
- Double-gated: `CRON_SECRET` (via harness) + `settings.digest_enabled` admin kill switch
- Tier-agnostic

**Fri–Sun:** Start **#2 Public Business Pages**.
- `/b/[slug]` route, server-rendered ✅ (see Week 2 block for full status)
- Open Graph tags ✅ done via `generateMetadata()`; LocalBusiness JSON-LD structured data ✅ shipped (18 Apr 2026, Session 2 — `/b/[slug]` emits a server-built `<script type="application/ld+json">` with conditional name/url/slogan/description/logo/image/telephone/email/address/foundingDate/openingHours/knowsAbout/sameAs fields)

### Week 2 (24 Apr–1 May) — Public Surface + WhatsApp

**Mon–Wed:** Finish **#2 Public Business Pages**. ✅ SHIPPED (18 Apr 2026, Session 3 — all 9 items closed)
- ✅ `/b/[slug]` renders cover, logo, tagline, name, address, CAC, founded year, phone/WhatsApp/email chips, sector tag, about, Instagram/Facebook/website (safeHref-guarded), opening hours, payment details, alias→301 redirect
- ✅ Products list — queries `business_products` (active only, ordered by name, limit 50)
- ✅ Open Graph metadata — title, description (tagline → about → synthesized fallback), URL, type, cover/logo image, canonical URL
- ✅ Sitemap (`app/sitemap.ts`) — 8 static marketing routes + up to 5,000 public businesses (`is_public=true`, ordered by `updated_at`, graceful DB-error fallback)
- ✅ Robots.txt (`app/robots.ts`) — allows `/`, `/b/`, `/u/`; blocks all authenticated/admin/auth surfaces; points to `/sitemap.xml`
- ✅ **Verified badge — SHIPPED (18 Apr 2026, Session 3).** Migration `20260418_business_verified.sql` adds `is_verified boolean NOT NULL DEFAULT false` + `verified_at timestamptz` to `businesses`, plus a partial index on `is_verified = true`. Green "Verified ✓" chip with check-circle icon renders next to `<h1>` on `/b/[slug]` when flag is true. Admin toggles via new Businesses tab in `/admin` → `/api/admin/business` PATCH (`verify` / `unverify`). Base `is_admin` gate; audit-logged.
- ✅ **Business reviews — SHIPPED (18 Apr 2026, Session 3).** Migration `20260418_business_reviews.sql` creates `business_reviews` (mirrors `product_reviews`: rating 1–5, headline, body, seller_reply, replied_at, published, created_at), unique index `(business_id, reviewer_id)` prevents brigading, 3 RLS policies (SELECT published-or-own-or-owner-or-admin; INSERT own AND not-own-business; UPDATE reviewer-or-owner-or-admin; no DELETE). `/api/business-reviews` POST creates (auth, self-review blocked, 3/24h user-keyed rate limit, sanitised headline+body, 409 on duplicate); PATCH auto-branches between reviewer-edit and owner-seller_reply by comparing auth uid. Read UI on `/b/[slug]` shows avg rating + star counts + per-review cards with seller replies. `WriteReviewButton` modal for logged-in non-owners. Report wired via existing `/api/report` (new `business_review` post type; auto-hide switches to `published: false`). Admin moderation via new Businesses + Reports tab flow, backed by `/api/admin/business-review` PATCH (`hide` / `restore`).
- ✅ **"Follow" CTA for logged-out visitors — SHIPPED (18 Apr 2026, Session 2).** Anonymous footer rewritten as a follow-specific wedge: primary button "Follow {b.name}" → `/signup?intent=follow_business&biz={slug}`, secondary "Already a member? Sign in" → `/login?next=/b/{slug}`. Intent param threads through signup so a future session can auto-follow the owner post-signup (backend wiring is a separate ~30-min task, not blocking launch).
- ✅ **LocalBusiness JSON-LD structured data — SHIPPED (18 Apr 2026, Session 2).** Server-built `<script type="application/ld+json">` on `/b/[slug]` with LocalBusiness schema: name, url, slogan, description, logo, image, telephone, email, PostalAddress (addressCountry `NG`), foundingDate, openingHours, knowsAbout, sameAs (website/Instagram/Facebook filtered). `<` → `\u003c` escaping prevents `</script>` breakout. First use of `dangerouslySetInnerHTML` in codebase — narrowly scoped to this server-built object literal.

**Thu–Sun:** Ship **#3 WhatsApp Delivery** (Termii, behind provider abstraction).
- Build `lib/messaging/whatsapp/` with `provider.ts` interface + `termii-provider.ts` implementation
- All callers import from `lib/messaging/whatsapp` only — never talk to Termii directly
- "Send via WhatsApp" button on invoice detail page → template message with PDF link
- Daily payment reminder cron for overdue invoices (opt-in per customer)
- Tier gating: Free ₦50/msg (deducted from wallet balance), Pro+ unlimited
- Meta provider (`meta-provider.ts`) scaffolded but inactive; env var `WHATSAPP_PROVIDER=termii`

### Week 3 (1–8 May) — Recurring Revenue + OCR Build

**Mon–Wed:** Ship **#4 Recurring Invoices**. ✅ SHIPPED (18 Apr 2026, Session 4 — pulled forward from Week 3 since #3 still blocked on Termii)
- ✅ **Migration `20260418_recurring_invoices.sql`** — `recurring_invoices` table with 22 cols (business_id, user_id, customer_id, cadence enum 'weekly'|'monthly'|'quarterly', status enum 'active'|'paused'|'ended', start_on, next_run_on, last_run_on, end_on, line_items jsonb, notes, payment_terms, due_offset_days, generated_count int, last_error text, last_run_invoice_id, created_at, updated_at). Partial index `(next_run_on) WHERE status='active'` for cron scan, plus `(business_id, status)` and `(user_id)` indexes. updated_at trigger. 4 RLS policies (SELECT/INSERT/UPDATE/DELETE) with owner OR business-owner disjunction. Seeds `settings.recurring_invoices_enabled = 'true'` admin kill-switch.
- ✅ **Daily cron `/api/cron/recurring-invoices`** wrapped in `runCron({ jobName, idempotencyKey: dailyKey() })`. Registered in `vercel.json` at `"0 6 * * *"` (06:00 UTC = 07:00 WAT). Reads admin kill-switch + per-user feature flag + per-row Pro+ tier check. Bulk-prefetches businesses/customers/profiles via `.in()` to avoid N+1. Per-row try/catch isolates failures. Counter increment runs BEFORE invoice insert to prevent duplicate invoice_numbers (gap accepted, duplicate forbidden — see scratchpad #45). On generate: increment business counter → insert invoices row (status='sent') → insert invoice_items → best-effort Resend email (uses `escapeHtml` on user fields, Naira currency format) → bumpScheduleAfterRun. WhatsApp delivery TODO (Termii template approval pending). On gating-skip: bumpScheduleNoInvoice writes `last_error` and bumps `next_run_on` so dormant rows don't burn cron cycles (scratchpad #47).
- ✅ **API `/api/recurring-invoices`** — POST/PATCH/DELETE all use service-role admin client with restated ownership checks (defence in depth, scratchpad #42). POST: Pro+ gate, feature flag, ownership, rate-limit 10/min/IP, per-business cap 50, sanitiseLineItems. PATCH: pause/resume/end actions plus template edits; resume bumps `next_run_on` to today if past (scratchpad #46). DELETE: soft-end only (no hard delete — preserves audit trail).
- ✅ **UI `/business/invoices/new`** — added Pro+ gated "Make this recurring" toggle in Notes panel + cadence dropdown (weekly/monthly/quarterly). Shows badge for free users with link to `/pricing`. After invoice insert, non-blocking POST to `/api/recurring-invoices` with `startOn = today + one cadence step`.
- ✅ **UI `/business/invoices/recurring`** — server component lists templates with customer name join. Client component (`RecurringInvoicesList.tsx`) renders per-row cards with status badges (active/paused/ended), cadence, next run, last run, generated count, last_error surfacing. Per-row Pause/Resume/End buttons with optimistic state flip + revert on PATCH failure. End button is `confirm()`-gated. Empty state explains the "Make this recurring" flow with link.
- ✅ **Nav** — `/business/invoices` page header now has "🔁 Recurring" button alongside "+ New Document".
- ✅ **Admin kill-switch** — `recurring_invoices_enabled` toggle in `/admin` Email & Cron section (mirrors `digest_enabled` pattern). Cron checks this flag before scanning.
- `npx tsc --noEmit` EXIT=0. **⚠️ Migration-paste reminder:** `20260418_recurring_invoices.sql` must be pasted into Supabase SQL editor post-merge.

**Thu–Sun:** Start **#5 Expense OCR**. ✅ SHIPPED (18 Apr 2026, Session 5) — **PRODUCTION-VALIDATED** (19 Apr 2026, Session 6: real-device camera capture against `agroyield.africa` returned a clean Vision extraction; full pipeline green)
- ✅ **Migration** `20260418_expense_ocr.sql` — `expense_receipts` table (vendor/amount/date/vat/category fields, `raw_extraction jsonb` audit trail, `storage_path`, `status` pending/reviewed/discarded/failed, confidence score, model_used for eval comparison, FKs to businesses/auth.users/business_expenses). Plus `usage_tracking` table (business_id, feature_key, period_yyyymm UNIQUE, count) for per-business monthly quotas. Plus storage bucket policies on 'receipts' (path format: `{businessId}/{uuid}.{ext}`, authenticated-owner insert/select/delete, not public). Plus `settings.expense_ocr_enabled='true'` admin kill-switch. Full RLS on both tables. `NOTIFY pgrst 'reload schema'`.
- ✅ **Quota helpers** `lib/usage-tracking.ts` — typed `UsageFeatureKey`, `USAGE_LIMITS` single-source-of-truth (`expense_ocr`: Free 20/Pro 100/Growth null=unlimited), `getMonthlyUsage()`, atomic `incrementUsage()` via insert-or-update pattern keyed on the unique composite, `checkQuota()` returning {allowed, used, limit, reason, upgradeToTier}. Period key is calendar-month YYYY-MM in UTC — natural rollover.
- ✅ **API** `/api/expense-ocr` — POST (multipart/form-data): rate-limit 5/min/IP → auth → admin kill-switch → feature flag `expense_ocr` → business-ownership → tier quota → file validation (jpg/png/webp ≤5MB) → upload to `receipts` bucket → Vision call (Claude Haiku 4.5 via `fetch('https://api.anthropic.com/v1/messages', ...)` — matches the Resend-via-fetch pattern, no SDK dependency) → insert pending `expense_receipts` row with `raw_extraction` audit trail → increment usage counter ONLY on successful extraction. GET returns current usage + tier + recent receipts for the modal's counter.
- ✅ **Review-commit API** `/api/expense-ocr/[id]` — PATCH commits user-edited values to `business_expenses` (the existing table the Expenses page already reads from, so charts/filters light up for free), then links back to `expense_receipts.expense_id` + flips status='reviewed'. Idempotent on duplicate PATCH. DELETE soft-discards + removes the storage object.
- ✅ **UI** `app/business/expenses/ReceiptScanButton.tsx` — "Scan Receipt" button next to "+ Add Expense" on the Expenses page. Opens a 4-stage modal: upload (file-picker with `capture="environment"` for mobile rear camera) → extracting (spinner with 3-5s expectation) → review (editable prefilled form, shows low-confidence warning if <0.75) → saving. Usage counter renders in the header with an upgrade nag at 75%+ utilisation on Free tier. Every server error surfaces visibly in-modal — no silent fire-and-forget per scratchpad #49.
- ✅ **Monthly cron** `/api/cron/usage-reset` + `vercel.json` entry `"10 0 1 * *"` (00:10 UTC 1st of month, ~01:10 WAT). Doesn't actually "reset" counters — `period_yyyymm` rolls over naturally via the unique constraint. Cron is for observability (per-feature summary logged to cron_runs metadata) and retention (prune usage_tracking rows >12 months old). Wrapped in `runCron` with `monthlyKey()` idempotency.
- ✅ **Scratchpad #50** — "Quota Increment Belongs AFTER The Expensive Work, Not Before". The read-check-work-increment pattern for all quota-gated features where the underlying work can fail for non-user reasons.
- `./node_modules/.bin/tsc --noEmit` EXIT=0. **⚠️ Three manual steps in Supabase post-merge:** (1) paste `20260418_expense_ocr.sql` into SQL editor; (2) create storage bucket `receipts` in Dashboard → Storage → New bucket (public: NO, 5MB limit, MIMEs: image/jpeg,image/png,image/webp) — the bucket must exist BEFORE the policies defined in the migration take effect; (3) when ready to enable, flip the `expense_ocr` flag ON in `/admin` → Feature Flags tab (no SQL needed — admin UI already exists). **⚠️ Env var:** `ANTHROPIC_API_KEY` must be set in Vercel Production + Preview envs.

### Week 4 (8–15 May) — OCR Ship + Credit Score Engine

**Mon–Wed:** Finish **#5 Expense OCR**.
- Tier gating via `usage_tracking` table
- Monthly counter reset cron

**Thu–Sun:** Build **#6 Credit Score engine**.
- Score formula: weighted composite of invoice volume, collection rate, tenure, expense discipline, sector volatility
- Stored in `business_credit_scores` table (current + 12-week history)
- Weekly refresh cron

### Week 5 (15–22 May) — Credit Score UI + AI Assistant Build

**Mon–Tue:** Ship **#6 Credit Score UI**.
- "AgroScore: 720 / Good" badge on business dashboard
- Breakdown modal shows contributing factors + improvement suggestions
- "Partner integrations coming soon" teaser — sets up post-launch lender BD story
- **BD collateral already drafted (18 Apr 2026):** one-page `AgroScore-Spec-Sheet-v1.docx` + `AgroYield-Lender-Outreach-Letters-v2.docx` (Carbon, FairMoney, Renmoney, LAPO, OPay, Moniepoint) live in `/Documents/AgroYield Docs/`. Week 10 outreach should attach the spec sheet as a PDF; pre-send work is (a) named-addressee research per institution, (b) standing up `founder@agroyield.africa` alias.

**Wed–Sun:** Build **#7 AI Assistant**.
- Scoped per-user chat at `/assistant`
- Context pipeline: recent invoices, expenses, price trends for their sector, grant matches
- Streaming Anthropic responses
- System prompt enforces "only answer from provided context"

### Week 6 (22–29 May) — AI Assistant Ship + Cooperatives Design

**Mon–Wed:** Finish **#7 AI Assistant**.
- Rate limiting per tier (Free: 5/day, Pro: 50/day, Growth: unlimited)
- Prompt injection guards
- Query logging for quality review

**Thu–Sun:** Design + begin **#8 Cooperatives**.
- Schema: `cooperatives`, `cooperative_members` (roles: admin, treasurer, member), `cooperative_businesses` (pooled listings)
- RLS audit: members see co-op data; non-members don't
- Architectural spec written before coding

### Week 7 (29 May–5 Jun) — Cooperatives Ship or Descope

**Mon–Sun:** Build **#8 Cooperatives**.
- Co-op registration flow
- Member invite by email/phone
- Pooled marketplace listings (tagged with co-op badge)
- Shared dashboard: aggregate metrics across member businesses
- Co-op-level recurring invoice support

**Descope trigger:** If by end of Day 4 we're below 60% feature-complete or RLS audit surfaces data-leak risks, descope to v1.1 and use Week 7 as buffer.

### Week 8 (5–12 Jun) — Integration Pass + Beta Triage

- Cross-feature wiring:
  - AI Assistant gains access to new tables (recurring invoices, credit score, co-ops)
  - Credit Score surfaces in Public Business Pages as optional badge
  - Cooperatives support Recurring Invoices
- Triage beta feedback accumulated Weeks 2–7. Fix P0 + P1. Defer P2 to post-launch.

### Week 9 (12–19 Jun) — Quality Hardening

- Performance audit on new surface (especially AI Assistant streaming, OCR upload path)
- Security review:
  - OCR input validation (PDFs, large files, malicious images)
  - AI prompt injection regression tests
  - Cooperatives RLS audit
- Mobile UX pass on all new features

### Week 10 (19–26 Jun) — Launch Prep

- Update onboarding wizard to feature the 8 new capabilities
- Update pricing page with new tier benefits
- Marketing assets:
  - Launch blog post
  - 8 feature deep-dive posts (one per differentiator)
  - 5 social teasers (Twitter/X + LinkedIn)
  - Email to waitlist
- Press outreach list:
  - TechCabal, Techpoint Africa, Disrupt Africa
  - Rest of World (Africa vertical)
  - Business Day Nigeria, Punch, Guardian Nigeria
- Partner outreach: 6 letters + AgroScore spec sheet already drafted (18 Apr 2026) for Carbon, FairMoney, Renmoney, LAPO, **OPay, Moniepoint**. Week 10 tasks = addressee research, founder@agroyield.africa alias, send.

### Week 11 (26 Jun–5 Jul) — Launch

- Mon–Wed: Final beta debrief + hotfix window
- Thu 2 Jul: Soft launch to waitlist
- Sat 5 Jul: **Public launch**
  - Social blast (Twitter/X, LinkedIn, Facebook, Instagram)
  - Press release distribution
  - Community feed celebration post
  - Founder LinkedIn post
  - WhatsApp broadcast to beta testers asking them to share

---

## Parallel Workstreams (non-blocking)

### Beta cohort feedback loop (Weeks 2–7)
Every Friday: export beta analytics (feature usage, completion rates), send 3-question survey via WhatsApp, log feedback in `beta_feedback` table. Harness built in Week 1.

### Content + SEO groundwork (Weeks 3–9, ~2 hrs/week)
One blog post per feature in `/blog` (new route). Each post targets a high-intent agri keyword ("invoice software for Nigerian farmers", "free farm expense tracker", "WhatsApp invoice Nigeria"). Compounds organic traffic leading into launch.

### Admin observability (Weeks 8–9)
Add "Launch Readiness" tab to admin dashboard: daily active users, feature adoption %, error rate, payment success rate, beta feedback sentiment.

---

## Risk Register + Descope Ladder

If we slip, descope in this exact order:

1. **#8 Cooperatives** → v1.1 (Aug 2026). Least connected to core retention loops.
2. **#7 AI Assistant advanced features** → ship basic version, defer multi-turn memory and tool use.
3. **#6 Credit Score breakdown UI** → ship score-only, defer contributing-factors modal.

**Do not descope:** #1, #2, #3, #4, #5. These are the five that actually move the unicorn needle — retention (#1), acquisition (#2), conversion (#3, #4), stickiness (#5).

---

## Unicorn Investment Case (why this sprint matters)

Each of these 8 features hits a different lever investors and acquirers look for:

| Feature              | Lever                          | Story for the deck                                    |
| -------------------- | ------------------------------ | ----------------------------------------------------- |
| #1 Weekly Digest     | Retention / DAU                | "Every active user exposed to 4+ modules weekly"      |
| #2 Public Pages      | Organic CAC / SEO moat         | "Google-indexed business pages = compounding CAC"     |
| #3 WhatsApp          | Conversion / Nigeria-native    | "90% open rate beats every email stack in market"     |
| #4 Recurring         | Revenue predictability         | "ARR visibility — accountants + subscription SMEs"    |
| #5 OCR               | Data entry friction killer     | "Lowest-friction bookkeeping on the continent"        |
| #6 Credit Score      | Data moat + future fintech     | "Proprietary risk data; lender revenue share upside"  |
| #7 AI Assistant      | Daily-use stickiness           | "Per-user AI ops — Nigerian context, Nigerian data"   |
| #8 Cooperatives      | Unique market structure        | "Only platform built for Nigeria's co-op economy"     |

Together these form the Series A narrative: **"AgroYield is Nigerian agri's operating system — where every farmer, SME, co-op, and institution runs their day, backed by proprietary data that lenders and corporates pay for."**

---

## Immediate Actions (in order)

1. **Sign up for Termii** (`termii.com`) — walkthrough on request
2. **Confirm or create the AgroYield Anthropic API key** with ₦100k/month cap
3. **Pull beta cohort into a spreadsheet** (name, business type, email, WhatsApp) — I'll turn it into `beta_testers`
4. **Green-light this plan** — once green-lit, Week 1 opens with F1/F2/F3 foundations + Weekly Digest

---

## Open Questions (answered 17 Apr 2026, Session 3)

1. **Solo build.** Confirmed. Plan's solo-capacity assumptions hold — no parallelisation baked in.
2. **Lender outreach (Week 10):** Claude drafts, Okoli reviews. Target list expanded to **6 institutions**: Carbon, FairMoney, Renmoney, LAPO, OPay, Moniepoint. (OPay + Moniepoint added — huge Nigerian digital-banking reach; agri-loan fit strong for both given their SME-lending thesis.)
3. **AI Assistant branding:** **Neutral** — "AgroYield Assistant". Reasoning: Nigerian/Pan-African cultural diversity; a female Igbo name like "Ada" risks over-indexing on one culture when users span Hausa, Yoruba, Fulani, Tiv, Ibibio, and across borders to Ghana/Kenya/Tanzania (per waitlist expansion signal).

## External Dependencies — Current State (17 Apr 2026, Session 3)

- **Termii:** Account active. SMS sender ID `Fastbeep` issued for test window. WhatsApp template approval still in progress on Termii's end. Path forward: SMS test endpoint this week to validate credentials end-to-end; switch to WhatsApp template API once Termii confirms approval.
- **Anthropic:** Account registered, $50 loaded. Awaiting API-key hardening guidance (given: dedicated workspace, $40/month cap, Production-only env var, server-side scope, 90-day rotation, weekly spend check).
- **Facebook Business Verification:** Still pending — blocks Meta WhatsApp swap + Facebook OAuth; Termii carries WhatsApp for launch.

---

## Changelog

- **17 Apr 2026** — Document created. Differentiators shortlisted, critical path mapped, 11-week schedule drafted, questions opened.
- **17 Apr 2026** — WhatsApp provider strategy locked: Termii at launch, Meta post-launch. Added "WhatsApp Provider Abstraction" section with interface spec, non-negotiable rules (caller isolation, E.164, shared templates, normalised message log schema), and migration trigger criteria.
- **17 Apr 2026 (Session 2)** — **F2 Cron Harness SHIPPED.** `lib/cron/index.ts` live, `cron_runs` audit table populated, idempotency keys enforcing single execution per day/week, all 6 existing crons wrapped, root `/vercel.json` registers the full set with Vercel's scheduler, admin kill-switch UI in place for 4 of the 6. Verified end-to-end via curl: success path, idempotency-block path, and kill-switch-skip path all confirmed writing correctly to `cron_runs`. Unblocks #1 Digest, #4 Recurring Invoices, #6 Credit Score refresh cycle from Week 1 onward.
- **17 Apr 2026 (Session 3)** — **F1 Slug + Public-URL Infrastructure SHIPPED.** `/b/[slug]` route now serves as a proper landing page for businesses. 8 showcase columns added to `businesses` (tagline, about, cover_image_url, website, instagram, facebook, opening_hours, founded_year) via `20260418_business_showcase.sql`. `resolveSlug()` tries live slug first, then `business_slug_aliases.old_slug` for historical redirects, returning 404 only when neither matches. `/business/setup/complete` + `PublicPageCard` lets owners edit showcase fields. Anon nav on `/b/[slug]` matched to AppNav (mobile 44×44 icon, desktop 200×50 horizontal, dark-mode variant). **Production 404 root cause solved:** the F1 migration never ran against prod — Vercel deploys don't auto-apply Supabase migrations. `resolveSlug()` was silently swallowing `column "tagline" does not exist` errors and returning `kind: 'none'`. Lesson saved to auto-memory as `project_migrations_manual.md`. Sitemap + robots have since shipped (`app/sitemap.ts` + `app/robots.ts`, verified 18 Apr 2026). Unblocks #1 Digest link copy ("view your business page"), #2 public-page work (Open Graph, reviews, Follow CTA, structured data).
- **18 Apr 2026 (Session 2 — #2 Gap Closure Round 1)** — **JSON-LD + Follow CTA shipped on `/b/[slug]`.** LocalBusiness structured data now emits as a server-built `<script type="application/ld+json">` with conditional name/url/slogan/description/logo/image/telephone/email/address/foundingDate/openingHours/knowsAbout/sameAs fields; `<` → `\u003c` escape prevents `</script>` breakout. Anonymous footer rewritten as a follow-specific wedge — primary button "Follow {b.name}" → `/signup?intent=follow_business&biz={slug}`, secondary "Already a member? Sign in" → `/login?next=/b/{slug}`. Intent param is forward-compatible; post-signup auto-follow wiring is a separate ~30-min task. `npx tsc --noEmit` clean. **Two of four #2 gaps now closed.** Remaining: verified badge (~1 hr, needs `is_verified` column on `businesses`), business reviews (~3 hr, needs `business_reviews` table + RLS + write/read UI).
- **18 Apr 2026 (Session 2 — Verification Pass)** — **F3 Feature Flag Table and #1 Weekly Digest confirmed SHIPPED; #2 Public Business Pages mapped partial.** Re-audit revealed three doc-drift items: (a) line 123 "F3 (feature_flags) still pending" was stale — `supabase/migrations/20260417_feature_flags.sql` + `lib/feature-flags.ts` have been in the repo since 17 Apr. (b) Week 1 Wed–Fri #1 Weekly Digest block carried no shipped marker despite `app/api/cron/weekly-digest/route.ts` being live (879 lines, Unicorn #1 per its own docstring, idempotent per ISO week, gated by `weekly_digest` flag + `settings.digest_enabled`). (c) F1 delivery note in ROADMAP.md Phase 4.10 claimed `/b/[slug]` renders a "verified badge" — actually not rendered, and `businesses` has no `is_verified` column. Week 2 #2 gap list now accurately captures four remaining items: **verified badge**, **business reviews**, **Follow CTA for logged-out visitors**, **LocalBusiness JSON-LD structured data**. Estimated total to close: ~5 hrs. No code changes this session — pure reconciliation between docs and code state. Phase 4.5 Security Hardening also re-verified end-to-end: all 10 files present with correct sanitisation/escaping/CSP; `npx tsc --noEmit` clean.
- **18 Apr 2026** — **Feature #6 BD collateral drafted.** Two docs shipped to `/Documents/AgroYield Docs/`: (1) `AgroScore-Spec-Sheet-v1.docx` — one-page lender-facing technical spec covering the 5 input signals (invoice volume & cadence, collection rate, tenure, expense discipline, sector volatility), sub-sector calibration, output schema, and 3 integration patterns (A risk-signal API, B pre-qualified referral, C cohort underwriting pilot); (2) `AgroYield-Lender-Outreach-Letters-v2.docx` — 6 letters, one per page, for Carbon, FairMoney, Renmoney, LAPO, OPay, Moniepoint. Pre-launch language corrected (anonymised→synthetic, 6mo→9-12mo agri cycle for Renmoney early-warning window, softened Moniepoint POS-scale claim). Founder signature corrected Chijiokei→Chijioke across all collateral and persisted to auto-memory to prevent recurrence. No code or schema changes — pure BD artefacts. Week 10 outreach is gated on named-addressee research per lender and `founder@agroyield.africa` email alias.
- **19 Apr 2026 (Session 6 — Production Deploy + Live Validation)** — **Checkpoint 31's commit is live in production; Unicorn #5 Expense OCR is production-validated by a real phone camera capture.** `git push` promoted the hydration fix + admin-control batch + Bucket C promotions (`expense_ocr_vision_model`, `recurring_template_cap`) to Vercel. `20260419_admin_controllable_settings.sql` applied in Supabase — all four settings rows (`usage_limits`, `expense_categories`, `expense_ocr_vision_model`, `recurring_template_cap`) seeded. Okoli uploaded a receipt from his actual phone camera against `agroyield.africa` — 4-stage modal (upload → extracting → review → saving) completed clean, Vision extraction returned vendor/amount/date/category, counter incremented, row committed to `business_expenses`. This collapses the Sunday 20:00 WAT allowlist dry-run into "done" by a stronger method than the scripted version would have produced (scratchpad #55). Separately, verified-badge pipeline confirmed rendering correctly live on `/b/preeminent-solutions` — all five layers (migration applied, PATCH API wired, admin UI button live, page SELECT correct, conditional render correct) validated in production; remaining businesses flagged as `is_verified=false` pending admin decision before Monday's welcome-email send. **Two new scratchpads:** #54 (Bucket A/B/C/D framing for admin-control audits — the D bucket matters as much as A/B/C), #55 (real-user-real-device validation beats headless smoke scripts for mobile-first products; new launch-gate rule — "one human through a real phone against production" for any mobile-interactive feature before the flag flips globally). Landing-page hydration error confirmed fixed (Sentry dashboard clear, 4,211-events/24h flatlined). Monday 07:00 WAT action is a single click: `/admin` → Feature Flags → `expense_ocr` → global-on.
- **18 Apr 2026 (Session 5 — Pre-Beta Hardening)** — **Smoke scripts + rollout runbook + Beta welcome email + landing-page hydration fix + admin-control batch shipped.** 30/30 headless smoke test passing against production; `docs/runbooks/expense-ocr-rollout.md` full playbook with kill-switch SQL; `marketing/beta-welcome.md` with A/B subject lines and plain-text fallback ready for Monday 07:30 WAT send. **Fixed Sentry issue (4,211 events/24h, 100% reproducibility on `/`):** Countdown component's `useState(calc)` where `calc` read `Date.now()` guaranteed SSR/client mismatch; hoisted launch instant with `Z` suffix, moved live tick to `useEffect`, initialised state as `null` so first paint is identical markup by construction. **Admin-control batch:** `20260419_admin_controllable_settings.sql` promotes four hardcoded constants into admin-controllable `settings` rows with SAFE_DEFAULTS + 60s cache + write-time validators + Option B confirmation modal — `usage_limits` (per-tier monthly quota grid), `expense_categories` (OCR + expenses labels), `expense_ocr_vision_model` (Haiku/Sonnet/Opus allowlist), `recurring_template_cap` (integer 1-1000). Admin UI cards + validators in one commit with the hydration fix. Three new scratchpads: #51 (`useState(initFn)` + `Date.now()` is a hydration bomb), #52 (investigate the lone Sentry issue before every rollout gate flip), #53 (settings-backed constants with SAFE_DEFAULTS + 60s cache + write-time validators is the right pattern for founder-tunable knobs). `tsc --noEmit` clean.
- **18 Apr 2026 (Session 3 — #2 Gap Closure Round 2)** — **Verified badge + Business reviews SHIPPED. Week 2 #2 Public Business Pages now fully closed (9/9 items).** Two new migrations: (a) `20260418_business_verified.sql` adds `is_verified bool DEFAULT false` + `verified_at timestamptz` to `businesses` with a partial index; (b) `20260418_business_reviews.sql` creates the `business_reviews` table mirroring `product_reviews` (rating 1-5, headline, body, seller_reply, published, replied_at), a unique index on `(business_id, reviewer_id)` to block brigading, and 3 RLS policies (SELECT published-or-own-or-owner-or-admin; INSERT own AND not-own-business; UPDATE reviewer-or-owner-or-admin; no DELETE). Four new files: (1) `/api/admin/business` PATCH verify/unverify with audit logging; (2) `/api/business-reviews` POST + PATCH — POST has 3/24h user-keyed rate limit, `sanitiseText` on headline (max 150) + body (max 4000), catches PG 23505 for the unique-violation 409 path with a friendly "edit your existing review" message; PATCH auto-detects reviewer-edit vs owner-reply by comparing `auth.uid()` to `reviewer_id` / `businesses.user_id` and rejects cross-mode writes; (3) `/api/admin/business-review` PATCH hide/restore for moderator action (super admin bypass; moderators gated on `reports` permission); (4) `/b/[slug]/WriteReviewButton.tsx` client component with 5-star hover+click picker, char-counter textarea, modal with backdrop-click close. Six existing files edited: `/api/report` extended postType union with `'business_review'` and auto-hide branch (uses `published: false` not `is_active`); `/api/admin/reports` DELETE restore extended with business_review branch **and a silent bug fixed** where research/price_report were incorrectly restored to `marketplace_listings` rather than their correct tables; `/b/[slug]` renders Verified ✓ chip next to `<h1>`, fetches + displays published reviews with reviewer avatar/name/stars/date/headline/body/seller-reply/ReportButton, computes `avgRating`, `viewerIsOwner`, `viewerAlreadyReviewed`; `/admin/page.tsx` fetches businesses (with slug/is_public/is_verified/verified_at) + latest 1000 business_reviews and grouper handles the new post type; `/admin/admin-client.tsx` adds Businesses tab (search by name/slug/owner, verified/unverified filter pills, per-row Verify/Unverify button with optimistic update + revert-on-failure) + extended report-moderation wiring; `ReportButton` postType union extended. **Two scratchpad entries added** (#42 Self-Review Blocking Needs Both RLS and API — defence in depth since service-role admin client bypasses RLS; #43 `business_reviews` Uses `published` Not `is_active` — branch the moderation plumbing). `npx tsc --noEmit` EXIT=0 clean. **⚠️ Migration-paste reminder:** both `20260418_business_verified.sql` and `20260418_business_reviews.sql` must be pasted into the Supabase SQL editor post-merge — Vercel deploys don't auto-apply migrations (per scratchpad #30, the lesson learned from the F1 404). Next unit of work: Unicorn **#4 Recurring Invoices** (skipping #3 WhatsApp Templates — still blocked on Termii template approval on their end).
- **18 Apr 2026 (Session 4 — Recurring Invoices)** — **Unicorn #4 Recurring Invoices SHIPPED** (pulled forward from Week 3 because #3 still blocked on Termii template approval). One new migration: `20260418_recurring_invoices.sql` creates the `recurring_invoices` table (22 cols including cadence + status enums, `line_items jsonb NOT NULL`, `generated_count`, `last_error`, `last_run_invoice_id`), a partial index `(next_run_on) WHERE status='active'` for efficient cron scanning plus `(business_id, status)` and `(user_id)` indexes, an updated_at trigger, 4 RLS policies (owner OR business-owner disjunction), and seeds `settings.recurring_invoices_enabled = 'true'` as admin kill-switch. Three new routes: (1) `/api/recurring-invoices` POST/PATCH/DELETE — all three use service-role admin client with restated ownership checks (defence in depth per scratchpad #42). POST: Pro+ tier gate, feature flag check, ownership, rate limit 10/min/IP, per-business cap 50, `sanitiseLineItems` enforces shape + 50-row cap + numeric bounds. PATCH: pause/resume/end actions PLUS template edits in one route; resume action bumps `next_run_on` to today if past (scratchpad #46 — prevents backlog-avalanche on long-paused templates). DELETE: soft-end only. (2) `/api/cron/recurring-invoices` wrapped in `runCron({ jobName: 'recurring_invoices', idempotencyKey: dailyKey() })`. Admin kill-switch read, bulk pre-fetch of businesses/customers/profiles via `.in()` to avoid N+1, per-row try/catch isolates failures, scans partial-index-backed query limit 500. Per-row flow: Pro+ tier check → feature flag check → line_items validation → **counter increment BEFORE invoice insert** (scratchpad #45 — accept gap-on-failure, never duplicate) → invoices row insert (status='sent') → invoice_items insert → best-effort Resend email (uses `escapeHtml`, Naira format) → `bumpScheduleAfterRun`. Gated-skip branch uses `bumpScheduleNoInvoice` + `last_error` note to avoid rows staying hot forever (scratchpad #47). WhatsApp delivery TODO'd — Termii template still pending. (3) `/app/business/invoices/recurring/page.tsx` + `RecurringInvoicesList.tsx` — list page with per-row cards, status badges (active/paused/ended), cadence display, next_run/last_run dates, generated_count, last_error surfacing. Pause/Resume/End buttons with optimistic state flip + revert on PATCH failure; End is `confirm()`-gated. Two existing files edited: `/app/business/invoices/new/page.tsx` — added Pro+ gated "Make this recurring" toggle in Notes panel + cadence dropdown, reads `profile.subscription_tier` + expiry, non-blocking POST to `/api/recurring-invoices` with `startOn = today + one cadence step` after invoice insert; `/app/business/invoices/page.tsx` — added "🔁 Recurring" button in header. One admin edit: `admin-client.tsx` gains `recurring_invoices_enabled` toggle in Email & Cron section (mirrors `digest_enabled` pattern). `vercel.json` registers the cron at `"0 6 * * *"` (06:00 UTC = 07:00 WAT). **Four scratchpad entries added** (#44 JSONB-over-sub-table for templates — normalise transactional records, denormalise templates; #45 Counter increment BEFORE insert — accept rare gaps, never duplicates; #46 Resume must bump `next_run_on` forward — prevents backlog-avalanche on long-paused templates; #47 Feature-flag-off must still bump schedule — silent skip is a slow-motion resource leak). `npx tsc --noEmit` EXIT=0 clean. **⚠️ Migration-paste reminder:** `20260418_recurring_invoices.sql` must be pasted into the Supabase SQL editor post-merge. Next unit of work: Unicorn **#5 Expense OCR** per Week 3 Thu–Sun spec (Anthropic Vision integration, receipt upload UI, extraction pipeline, review-before-save UX, usage_tracking tier-gating). #3 WhatsApp Templates still blocked on Termii approval.
- **19 Apr 2026 (Session 7 — Public-Footer Harmonization + Business-Module Sign-Out + Doc Sync)** — **Non-unicorn housekeeping that unblocks Monday's Beta welcome email.** Three discrete pieces: (1) **PublicFooter extracted** — new `app/components/PublicFooter.tsx` replaces 4 drifted footer variants across `/`, `/about`, `/contact`, `/privacy`, `/terms`, `/businesses`. Fixes 5 broken links (X + LinkedIn `#` placeholders on landing, `/about` had same + `mailto:` where `/contact` should have been + Privacy `#`, `/contact` had same `#` trio, `/privacy` + `/terms` had minimal 2-link footers with no socials). Live URLs now: `https://x.com/agroyield90351` and `https://www.linkedin.com/company/agroyield-network`. **This matters for the unicorn narrative** because Monday's Beta welcome email drives recipients to `/b/{slug}` landing pages, which all link out to the root page + social channels — broken social links on the first public impression is a trust-signal miss during the week that matters most. (2) **Business-module sign-out** — new `app/business/SidebarSignOutButton.tsx` with desktop-sidebar + mobile-sheet variants, mounted in `app/business/layout.tsx` and `app/business/MobileNav.tsx`. Removes a three-click round-trip to the dashboard profile avatar for a one-action ask. **This matters for the unicorn narrative** because the Business module is Unicorn #4 (Recurring Invoices) + #5 (Expense OCR) + #6 (Credit Score, forthcoming) surface — users will spend the bulk of their session inside `/business/*`, and forcing them to exit to sign out is a UX hole on the stickiest surface. (3) **Midjourney banner prompt drafted** for an X/Twitter banner — three variations (documentary/cinematic recommended, tech illustration, community portrait), all respecting X's 1500×500 safe zones and the profile-avatar bottom-left overlap; tagline + logo overlay in Figma post-generation. Unblocks the "social channels actually look like a real brand" piece of launch readiness. **Scratchpad entries added:** #56 (3-instance rule for shared-component extraction), #57 (destructive actions need in-module affordances in nested layouts), #58 (footer-link hygiene is a launch-gate check — grep `href="#"` across public pages before every rollout-gate flip). `./node_modules/.bin/tsc --noEmit` EXIT=0. Zero migrations, zero settings changes, zero env var changes — pure frontend, safe to push as one atomic commit.

- **18 Apr 2026 (Session 4 hotfix — Recurring page empty-state bug)** — Okoli reported two recurring invoices created but `/business/invoices/recurring` still rendered the empty state. **Investigation surfaced two independent bugs, not one.** (1) PostgREST embed failure: `20260418_recurring_invoices.sql` declared `customer_id uuid NOT NULL` with no `REFERENCES customers(id)` clause, so the page's `customers(name)` embed failed and silently returned null. (2) Phantom success: SQL diagnostic confirmed the rows never existed at all — `select count(*) from recurring_invoices` returned `0`. Root cause: `recurring_invoices` is seeded `is_enabled = false` in the `feature_flags` table (correct, deliberate, per F3 staged-rollout spec). When Okoli ticked "Make this recurring" and submitted, `/api/recurring-invoices` POST returned 403 "not available for your account yet". The new-invoice page's POST was wrapped in `try { await fetch(...) } catch { /* non-blocking */ }` — but `await fetch()` only throws on network errors; HTTP 4xx/5xx resolves normally and the bare catch caught nothing. User got the regular invoice + zero feedback. **Three fixes shipped:** (a) new migration `20260418_recurring_invoices_fks.sql` idempotently adds `customer_id → customers(id) ON DELETE RESTRICT`, `user_id → auth.users(id) ON DELETE CASCADE`, and re-asserts `business_id → businesses(id) ON DELETE CASCADE`; ends with `NOTIFY pgrst, 'reload schema'` to refresh the PostgREST cache live. (b) `/business/invoices/recurring/page.tsx` rewritten as a two-query fetch (recurring_invoices first, then customers via `.in()`) — robust against future schema-cache hiccups. Also destructures `error` and renders a visible red error box instead of silently falling through. (c) `/business/invoices/new/page.tsx` POST now checks `res.ok`, reads the error body, and stashes a human-readable warning in `sessionStorage.recurring_create_warning`; new `app/business/invoices/[id]/RecurringCreateWarning.tsx` client component reads that key on mount and renders a dismissible amber banner on the invoice detail page with a link to `/business/invoices/recurring`. Network throws follow the same surface path. **SQL unblock for Okoli:** `update feature_flags set is_enabled = true where key = 'recurring_invoices';` (takes effect after the 60s in-memory cache TTL in `lib/feature-flags.ts`). Two scratchpad entries added: #48 (PostgREST nested selects need FKs — a missing FK silently hides rows), #49 (Feature-flag-default-false + fire-and-forget UI = phantom success — two go-forward rules: non-blocking fetches after a successful primary write must still surface non-2xx; default-false flags need an admin-UI toggle before the next one ships). `./node_modules/.bin/tsc --noEmit` EXIT=0. **⚠️ Migration-paste reminder:** `20260418_recurring_invoices_fks.sql` must be pasted into Supabase SQL editor, AND the feature-flag UPDATE SQL above must be run — both are needed; the FK fix makes the page resilient, the flag flip is what actually unblocks writes.
- **20 Apr 2026 (Session 8 — Pre-Beta Design-System Sweep Complete)** — **Week-10 redesign sweep landed as atomic commit `be36515 Re-design`.** 4 new design primitives extracted: (1) `app/components/design/PageShell.tsx` — outer chrome wrapper with `maxWidth: '2xl'|'3xl'|'4xl'|'5xl'|'6xl'|'7xl'|'none'` prop plus `nav` + `beforeMain` escape-hatch slots; (2) `PageHeader` with `actions` slot; (3) `Button` variants (`PrimaryLink` + `SecondaryLink`) with `size='md'|'lg'`; (4) `ModuleCard` for dashboard tiles. 13 pages migrated onto them: `dashboard`, `opportunities`, `grants`, `marketplace`, `marketplace/[id]`, `b/[slug]`, `mentorship`, `community`, `directory`, `research`, `profile`, `prices`, `faq`, `verify/success`. Before extraction, outer chrome was copy-pasted across 9 module indexes with subtle `max-w-*` drift; after, every module declares width explicitly via one prop — `grep -rn 'import PageShell' app/` now enumerates every module index in one shot. **Bonus fix:** `/verify/success` was missing `dark:bg-gray-950` on its outer wrapper — PageShell provides the variant by default, so the migration fixed the dark-mode bug as a side effect (plus added `dark:bg-green-900/30`/`dark:text-white`/`dark:text-gray-400`/`dark:text-gray-500` on the inner body). **This matters for the unicorn narrative** because every post-Beta user lands on the module indexes AND the payment-success confirmation after a Paystack round-trip — first impressions on both surfaces now honour dark mode AND share one consistent chrome vocabulary instead of nine slightly-drifted ones. `./node_modules/.bin/tsc --noEmit` EXIT=0 every day of the 7-day sweep. Zero migrations, zero settings changes, zero env var changes — pure frontend refactor. **Deferred with rationale:** 5 auth surfaces (`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify`) satisfy the 3-instance rule for an `AuthShell` primitive but use bespoke inline-styled marketing chrome with CSS variables — extracting them would be a multi-hour refactor with visual-diff risk landing in the QA window before Monday's Beta. Parked as top post-Beta item on the Pending Tasks list so the 3-instance trigger doesn't lose continuity across session breaks. **Scratchpad entries added:** #59 (primitive-extraction-first for any N-day sweep across ≥3 sibling surfaces — Day 1 pays for Days 2-N, AND the abstraction should ship with its own opt-out mechanism like `maxWidth='none'` so one-off pages don't force a copy-paste regression), #60 (3-instance rule is NECESSARY not SUFFICIENT for extraction; extraction cost + visual-diff risk + adjacent-work cost gate timing — park the trigger as an explicit pending-task item when calendar is tight instead of silently letting it drop). **Design surface now frozen going into QA day (Sun 26 Apr) + Beta launch morning (Mon 27 Apr).** Eliminates chrome drift as a category of last-mile bug class — any module-level change from here is a knowing decision, not a drift accident.
- **20 Apr 2026 (Session 11 — Day-0 Production Verification + 3 Hotfixes, Pre-Beta Surface Locked)** — **Production DB verification confirmed all five Day-0 migrations landed in Supabase, then three defensive hotfixes tightened the handoff into Sunday's QA day.** Direct SQL probes (`pg_indexes` + `information_schema.tables` + `information_schema.columns`) enumerated **all 23 trigram GIN indexes** across the five search surfaces — profiles (6 cols: first_name, last_name, username, role, institution, bio), opportunities (4: title, organisation, description, location), grants (4: title, funder, description, region), marketplace_listings (4: title, description, category, state), businesses (5: name, tagline, about, sector, state) — plus the three new tables (`profile_experience`, `profile_views`, `saves`) and the two new columns on `profiles` (`open_to_opportunities boolean`, `open_to_opportunities_until timestamptz`). `EXPLAIN ANALYZE` on `businesses` returned a `Seq Scan` rather than a trigram index scan, which **briefly read as a bug** — actually correct planner behaviour on tiny tables (5 rows in Beta-seed state; cost-based optimizer picks seq scan until the table crosses the trigram-useful threshold). Confirmed by re-running with `SET enable_seqscan = off;` and seeing the `Index Scan using idx_businesses_is_public ...` plan fall back cleanly. Scratchpad-worthy reminder: **"seq scan on a tiny table is correct planner behaviour, not a missing index"** — the existence check is `pg_indexes`, not `EXPLAIN ANALYZE`. **Hotfix 1 — `opportunities_type_check` violation (defence-in-depth at the user-input-to-DB boundary):** Okoli hit `new row for relation "opportunities" violates check constraint "opportunities_type_check"` when creating an opportunity. Root cause: `app/api/content-types/route.ts` `DEFAULTS.opportunity_types` was Title Case (`['Job', 'Internship', ...]`) but the DB CHECK enforces lowercase canonicals (`'job' | 'internship' | 'partnership' | 'training' | 'conference'`). Fixed in **two layers** rather than one (scratchpad #66): (a) lowered the defaults to lowercase canonicals with an inline comment pointing at the CHECK constraint as the source of truth + a note that the form capitalises them visually via CSS `capitalize`, DO NOT re-capitalise here; (b) added server-side `body.type.trim().toLowerCase()` normalisation in `/api/opportunities/route.ts` POST handler before the INSERT so any legacy client posting `'Job'` — or any future settings-row drift — still survives the write. The pattern: **every user-input-to-DB-CHECK boundary is a defence-in-depth site** — client defaults AND server normalisation, not either/or; saves the debugging round trip when a cached client ships stale case. **Hotfix 2 — Profile page identity priority reorder (priority-ordered render as a maintainability axis):** `/profile` was rendering ProfileViewStatsPanel + ExperienceEditor + ShareProfileLink + Followers/Following stats card **above** `ProfileForm`, pushing the form's first-child avatar block into the middle of the page — users scrolled past analytics and social-proof widgets before seeing their own face. Rewrote the child order to identity priority (scratchpad #67): (1) `ProfileForm` card — identity + all editable fields, avatar is first child so the user sees it immediately on page load; (2) `ExperienceEditor` — work history, close to identity; (3) Followers/Following stats card — social proof, secondary; (4) `ProfileViewStatsPanel` — insight, not identity, below the fold; (5) `ShareProfileLink` — action users take once everything above is set. Inline-commented each block with its rank + rationale so the next engineer doesn't re-sort by proximity of the last-shipped feature. **Hotfix 3 — `timestamptz` ↔ `<input type="date">` silent bug (one-line data-format boundary):** `open_to_opportunities_until` is stored as `timestamptz` in Postgres (from migration `20260420_open_to_opportunities.sql`) but `ProfileForm` renders the field via `<input type="date">`, which **only** accepts strict `YYYY-MM-DD` format — ISO strings like `2026-06-01T00:00:00+00:00` are silently ignored and the input shows blank. Users who'd already set their expiry date would see an empty field and assume the save had been lost. Fixed with `((rawProfile?.open_to_opportunities_until as string) ?? null)?.slice(0, 10) ?? null` at the page-level data-prep boundary in `app/profile/page.tsx` with an inline comment explaining the silent-failure pathway (scratchpad #68). The broader pattern: **every timestamptz column fed into a `<input type="date">` needs a `.slice(0, 10)` at the server-to-client boundary** — one line, but invisible in dev until after a round-trip where a user has state. **`./node_modules/.bin/tsc --noEmit` EXIT=0** after all three hotfixes. Zero new migrations this session — the hotfixes are pure TypeScript. **Pre-Beta surface is now locked going into Sunday 26 Apr QA day.** No code changes expected tomorrow unless QA-day walkthrough on a real phone against Vercel production surfaces something new; Monday 27 Apr 07:00 WAT remains the Beta welcome-email send + `expense_ocr` flag flip per Checkpoint 31. **Scratchpad entries added:** #66 (defence-in-depth at every user-input-to-DB-CHECK boundary — client defaults AND server normalisation, not either/or; the round-trip between cached-client-deploy and DB-constraint is where Title Case drifts back in), #67 (priority-ordered render on multi-widget surfaces is a maintainability axis, not a nice-to-have — rank each block by identity→function→social-proof→insight→action and inline-comment the rank so the next feature-ship doesn't resort by proximity-of-last-change), #68 (`timestamptz` ↔ `<input type="date">` is a one-line silent-bug trap — slice at the server-to-client boundary, document the format mismatch in the comment because the bug is invisible until after user state exists).
- **20 Apr 2026 (Session 10 — Pre-Beta Day-0 Sprint: 6 Substantial Features Shipped Atomic)** — **With #2 Full Activity Feed dropped on advice (value-density-vs-cost unfavourable for the 7-day window), the residual six-feature pre-Beta scope landed in a single Day-0 push.** **Feature 1 — Global Site Search (#1):** `lib/global-search.ts` core helper runs 5 parallel Supabase queries (profiles, opportunities, grants, marketplace_listings, businesses) via `Promise.all`, each with per-surface visibility filters (`is_suspended=false` / `is_active=true AND is_pending_review=false AND is_closed=false` / `status != 'closed'` / `is_public=true`); `escapeIlike()` escapes `\`, `%`, `_` in the raw query before composing the ILIKE pattern; types exported as discriminated unions with `kind:` field. `/api/search/route.ts` wraps the helper as an auth-gated JSON endpoint (limit capped at 20, query length at 100, returns empty body for queries < 2 chars). `/app/search/page.tsx` server component renders a tab-grouped results page with sticky TabPill anchors + per-surface Section blocks, `metadata.robots = { index: false, follow: false }` so search-result URLs don't index. `/app/search/search-form.tsx` in-page form syncs to URL `q` on submit. `/app/components/GlobalSearchBar.tsx` is a command-palette overlay with two variants (`'icon'` for desktop nav, `'full'` for mobile menu), Cmd/Ctrl+K hotkey, debounced live search (250ms), race-condition-safe via `latestQueryRef.current` check ensuring stale responses get discarded, 5 result buckets with per-surface item components. Mounted in `AppNav.tsx` right-side actions + mobile menu top. Migration `20260420_global_search_trgm.sql` installs pg_trgm + GIN indexes on every searchable column across the 5 tables. **Feature 2 — Notification Bell Enhancements (#3):** richer surfacing through the existing `NotificationBell` component + admin client. **Feature 3 — Profile View Count (#4):** `lib/profile-views.ts` centralised helper, silent server-side `recordProfileView()` call on every `/directory/[id]` + `/u/[slug]` render with self-view + same-day-dedup guards, `ProfileViewStatsPanel` on /profile showing view count with optional Pro-tier "recent viewers" list (avatar + name + viewed-at). Migration `20260420_profile_views.sql`. **Feature 4 — Experience Section (#5):** `lib/profile-experience.ts` centralised helper with `getProfileExperience()` + `formatRange()` (month-based duration math producing "Feb 2023 – Present" or "Jun 2019 – Aug 2022 · 3 yrs 2 mos"). `app/components/ExperienceList.tsx` is a read-only server component used by /directory/[id] and /u/[slug] (timeline, green dot for current roles). `app/profile/experience-editor.tsx` is the owner-facing CRUD client component on /profile with inline form for role/organisation/start/end/is_current/description fields; re-sorts after every mutation so is_current-then-newest ordering matches the helper. `/api/profile/experience/route.ts` POST/PATCH/DELETE. Migration `20260420_profile_experience.sql`. **Feature 5 — Open to Opportunities Toggle (#6):** boolean on `profiles` plus `lib/notify-open-to-opportunities.ts` that fires in-app notifications to opted-in members when a matching opportunity is published. Migration `20260420_open_to_opportunities.sql`. **Feature 6 — Saves Across Opportunities/Marketplace/Grants (#7):** unified `saves` table with kind discriminator, `/api/saves/route.ts` save/unsave endpoints, `/app/saved/page.tsx` hub surfacing the user's saved items across all three content types. Migration `20260420_saves.sql`. **This matters for the unicorn narrative** because every one of these is a member-retention surface: the bell keeps users coming back, view counts + Open to Opportunities create social proof + serendipity, Experience makes profiles investor-grade, Saves create a personal workspace the platform owns, Global Search makes the whole network feel like one connected thing instead of six siloed modules. Beta cohort lands on Monday 27 Apr into a platform that feels built-up, not built-out. `./node_modules/.bin/tsc --noEmit` EXIT=0 after the final `GlobalSearchBar` wiring into AppNav. **⚠️ Migration-paste reminder:** ALL FIVE of `20260420_saves.sql`, `20260420_profile_views.sql`, `20260420_profile_experience.sql`, `20260420_open_to_opportunities.sql`, `20260420_global_search_trgm.sql` must be pasted into the Supabase SQL editor before Sunday 26 Apr QA day (per scratchpad #30, Vercel deploys don't auto-apply migrations). Without the trgm migration search degrades to sequential scans; without the other four the corresponding features 404/500 in production. **Scratchpad entries added:** #63 (sprint compression is a downstream signal of prior-session friction removal, not an upstream choice — if a multi-feature sprint feels possible in one day, ask "what prior session made this tractable"; doc-sync IS the load-bearing step that makes repetition possible), #64 (race-condition-safe live search via `latestQueryRef` belongs in every debounced fetch from Day 1 — invisible-in-dev / visible-in-prod bug class, 4-line fix), #65 (ILIKE wildcard escape at every user-input-to-pattern-DSL boundary — treat every DSL crossing as a correctness gate, not transparent string concatenation). **Pre-Beta surface now frozen** — QA day Sun 26 Apr walks every new feature on a real phone against Vercel preview then production; Mon 27 Apr 07:00 WAT is the Beta welcome-email send + `expense_ocr` flag flip per the Checkpoint 31 runbook, with search/saves/profile-views/experience/open-to-opportunities live from the same moment.
- **20 Apr 2026 (Session 9 — BusinessLogo Design Primitive + Avatar Overflow Fix)** — **Okoli reported "the image avatar in the business module tend to allow an overflow of the image" on the business dashboard header.** Root cause at `app/business/page.tsx:192–194`: Next.js `<Image>` with `rounded-lg` applied directly to the image element, no `overflow-hidden` wrapper, no `shrink-0` inside its parent flex row — three related defects in one line. Same anti-pattern at `app/business/setup/page.tsx:310–311` (80×80 setup preview — never user-reported but identical defect). Audit across the codebase found 7 `logo_url` renderers total: 2 broken (dashboard + setup), 3 correct (`/b/[slug]` xl, `/businesses` md, `home-client.tsx` landing-page tile — all using the `<div style={{backgroundImage: ...}}>` + `bg-cover bg-center` pattern), 2 print-pipeline `<img>` with inline `objectFit:contain` (correct for print). **Explicit direction from Okoli: "Let's go with (b) and prevent the next occurrence. The goal is not to choose an easy way out. Remember what we are building — UNICORN. It must live up to it."** → Extracted a primitive instead of taking the 2-line wrapper-div shortcut. **New file: `app/components/design/BusinessLogo.tsx`** — fixed-size `overflow-hidden` wrapper with `shrink-0` (the wrapper's fixed dimensions are the clipping source of truth, not the image's width/height props). 4 sizes: `sm` 40 (dashboard header), `md` 56 (directory card), `lg` 80 (setup preview), `xl` 96 (public page hero). 2 fallback tones: `subtle` (green-100 + green-700 text, dark-mode aware, plain surfaces) and `strong` (green-600 + white text, for avatars half-overlapping a cover image). `label` prop for caller-computed 2-char initials; `fallback` ReactNode slot for fully-custom cases like the setup form's dashed-border "🏪" upload affordance. **Migrated 4 call sites** to unify the app's Tailwind-themed avatar rendering: dashboard header, setup preview, `/b/[slug]` hero (`size="xl" fallbackTone="strong" label={initials} priority`), `/businesses` directory card (`size="md" fallbackTone="strong" label={initials}`). **Intentionally out of scope:** `home-client.tsx` participates in the shared CSS-var marketing theme (`--border-color`, `--text-primary`…) alongside `/login`, `/about`, `/privacy`, `/contact` — pulling Tailwind into that surface would leak the app's design vocabulary into the marketing one. Documented as explicit scope boundary in the primitive's header comment so the next engineer finds the rationale in-tree. **This matters for the unicorn narrative** because every Beta user's first glimpse of an AgroYield business — on `/businesses`, `/b/{slug}`, AND inside `/business/*` after they register — now flows through one bulletproof primitive. When the first business uploads a tall banner-shaped logo or a wide rectangular one (and they will, because SMEs don't always prepare square assets), nothing spills, nothing deforms, no follow-up "what's wrong with my logo" support ticket. The defect CLASS is engineered out, not patched. **Scratchpad #62 added** — `overflow-hidden` wrapper is non-negotiable for avatars; the 3-instance rule (scratchpad #56) tightens to N=2 for identity-bearing components (logos, avatars, user cards, product thumbnails, payment-method icons) because drift shape differs from styling-chrome drift; every audit pairs with a documented scope boundary so unmigrated call sites have in-tree rationale. **Meta-lesson codified** — when a bug report surfaces ad-hoc duplication below the N=3 threshold, ask "is this the point where the primitive is obviously correct, even at N=2?" — and if yes, extract NOW. Cost difference between N=2 and N=3 extraction is negligible; cost of second-occurrence drift is not. `./node_modules/.bin/tsc --noEmit` EXIT=0. ESLint 0 errors on touched files (1 pre-existing unrelated warning). Zero migrations, zero settings changes, zero env var changes — pure frontend, safe to push as one atomic commit.

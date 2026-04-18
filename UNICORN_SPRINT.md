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
- Still pending: `sitemap.xml` + `robots.txt` auto-generation from active businesses (Week 2 scope under #2 Public Business Pages)

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
- Open Graph tags ✅ done via `generateMetadata()`; LocalBusiness JSON-LD structured data ⚠️ still pending

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

**Mon–Wed:** Ship **#4 Recurring Invoices**.
- `recurring_invoices` table (template + cadence: weekly / monthly / quarterly)
- Daily cron generates + auto-sends on schedule (reuses WhatsApp + email)
- UI: "Make this recurring" checkbox on new invoice page
- "Pause / resume / end" controls on recurring invoice list

**Thu–Sun:** Start **#5 Expense OCR**.
- Anthropic Vision API integration
- Receipt upload UI (camera + gallery on mobile)
- Extraction pipeline: vendor, amount, date, VAT, suggested category
- Review-before-save UX (user can correct fields)

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
- **18 Apr 2026 (Session 3 — #2 Gap Closure Round 2)** — **Verified badge + Business reviews SHIPPED. Week 2 #2 Public Business Pages now fully closed (9/9 items).** Two new migrations: (a) `20260418_business_verified.sql` adds `is_verified bool DEFAULT false` + `verified_at timestamptz` to `businesses` with a partial index; (b) `20260418_business_reviews.sql` creates the `business_reviews` table mirroring `product_reviews` (rating 1-5, headline, body, seller_reply, published, replied_at), a unique index on `(business_id, reviewer_id)` to block brigading, and 3 RLS policies (SELECT published-or-own-or-owner-or-admin; INSERT own AND not-own-business; UPDATE reviewer-or-owner-or-admin; no DELETE). Four new files: (1) `/api/admin/business` PATCH verify/unverify with audit logging; (2) `/api/business-reviews` POST + PATCH — POST has 3/24h user-keyed rate limit, `sanitiseText` on headline (max 150) + body (max 4000), catches PG 23505 for the unique-violation 409 path with a friendly "edit your existing review" message; PATCH auto-detects reviewer-edit vs owner-reply by comparing `auth.uid()` to `reviewer_id` / `businesses.user_id` and rejects cross-mode writes; (3) `/api/admin/business-review` PATCH hide/restore for moderator action (super admin bypass; moderators gated on `reports` permission); (4) `/b/[slug]/WriteReviewButton.tsx` client component with 5-star hover+click picker, char-counter textarea, modal with backdrop-click close. Six existing files edited: `/api/report` extended postType union with `'business_review'` and auto-hide branch (uses `published: false` not `is_active`); `/api/admin/reports` DELETE restore extended with business_review branch **and a silent bug fixed** where research/price_report were incorrectly restored to `marketplace_listings` rather than their correct tables; `/b/[slug]` renders Verified ✓ chip next to `<h1>`, fetches + displays published reviews with reviewer avatar/name/stars/date/headline/body/seller-reply/ReportButton, computes `avgRating`, `viewerIsOwner`, `viewerAlreadyReviewed`; `/admin/page.tsx` fetches businesses (with slug/is_public/is_verified/verified_at) + latest 1000 business_reviews and grouper handles the new post type; `/admin/admin-client.tsx` adds Businesses tab (search by name/slug/owner, verified/unverified filter pills, per-row Verify/Unverify button with optimistic update + revert-on-failure) + extended report-moderation wiring; `ReportButton` postType union extended. **Two scratchpad entries added** (#42 Self-Review Blocking Needs Both RLS and API — defence in depth since service-role admin client bypasses RLS; #43 `business_reviews` Uses `published` Not `is_active` — branch the moderation plumbing). `npx tsc --noEmit` EXIT=0 clean. **⚠️ Migration-paste reminder:** both `20260418_business_verified.sql` and `20260418_business_reviews.sql` must be pasted into the Supabase SQL editor post-merge — Vercel deploys don't auto-apply migrations (per scratchpad #30, the lesson learned from the F1 404). Next unit of work: Unicorn **#4 Recurring Invoices** (skipping #3 WhatsApp Templates — still blocked on Termii template approval on their end).

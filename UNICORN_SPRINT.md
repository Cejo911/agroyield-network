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
| 6 | Agri Credit Score (AgroScore)| Moat (data)          | All tiers see score; partner integration post-launch     |
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

### F3. Feature flag table
- `feature_flags` table with user scoping
- Read via server component
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

**Mon–Tue:** Foundations F1, F2, F3. — **F1 complete (17 Apr, Session 3)** (minus sitemap/robots, deferred to Week 2 under #2); **F2 complete (17 Apr, Session 2)**; F3 (feature_flags) still pending.

**Wed–Fri:** Ship **#1 Weekly Digest**.
- Monday 7 AM cron (Africa/Lagos)
- Personalised per user: top 3 price swings in their state, new opportunities/grants matching interests, unread messages count, one business insight ("your collection rate dropped 12% last month")
- Reuses Resend + existing email templates
- Tier-agnostic

**Fri–Sun:** Start **#2 Public Business Pages**.
- `/b/[slug]` route, server-rendered
- Open Graph tags, structured data (LocalBusiness schema)

### Week 2 (24 Apr–1 May) — Public Surface + WhatsApp

**Mon–Wed:** Finish **#2 Public Business Pages**.
- Verified badge rendering
- Products list + reviews
- "Follow" CTA for logged-out visitors
- Sitemap auto-generated from active businesses
- Robots.txt tuned

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
- Partner outreach draft: letters to Carbon, FairMoney, Renmoney, LAPO introducing Credit Score + proposing post-launch integration

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
- **17 Apr 2026 (Session 3)** — **F1 Slug + Public-URL Infrastructure SHIPPED.** `/b/[slug]` route now serves as a proper landing page for businesses. 8 showcase columns added to `businesses` (tagline, about, cover_image_url, website, instagram, facebook, opening_hours, founded_year) via `20260418_business_showcase.sql`. `resolveSlug()` tries live slug first, then `business_slug_aliases.old_slug` for historical redirects, returning 404 only when neither matches. `/business/setup/complete` + `PublicPageCard` lets owners edit showcase fields. Anon nav on `/b/[slug]` matched to AppNav (mobile 44×44 icon, desktop 200×50 horizontal, dark-mode variant). **Production 404 root cause solved:** the F1 migration never ran against prod — Vercel deploys don't auto-apply Supabase migrations. `resolveSlug()` was silently swallowing `column "tagline" does not exist` errors and returning `kind: 'none'`. Lesson saved to auto-memory as `project_migrations_manual.md`. Sitemap/robots still pending (Week 2 scope under #2 Public Business Pages). Unblocks #1 Digest link copy ("view your business page"), #2 public-page work (Open Graph, reviews, Follow CTA, structured data).

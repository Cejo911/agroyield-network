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
| 3 | WhatsApp Invoice Delivery    | Conversion (payment) | Free: ₦50/msg · Pro+: unlimited                          |
| 4 | Recurring Invoices           | Retention + revenue  | Pro+ only                                                |
| 5 | Expense OCR (receipt photos) | Stickiness           | Free: 20/mo · Pro: 100/mo · Growth: unlimited            |
| 6 | Agri Credit Score (AgroScore)| Moat (data)          | All tiers see score; partner integration post-launch     |
| 7 | AI Assistant (scoped chat)   | Daily-use stickiness | Free: 5/day · Pro: 50/day · Growth: unlimited            |
| 8 | Cooperatives (group feature) | Nigerian agri moat   | Free co-op creation; Growth required for admin role      |

---

## Critical Path Dependencies (Day 1)

Three external dependencies block downstream features. Start these **before any code**:

### D1. Termii account + API key
Blocks: #3 WhatsApp Delivery.
Action: Sign up at `termii.com` with AgroYield business email. Request WhatsApp channel enablement.
Lead time: 0–5 days.

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

### F1. Slug + public-URL infrastructure
- `slug` column on `businesses` (unique, auto-generated from name)
- `/b/[slug]` route shell
- `sitemap.xml` + `robots.txt` generators
- Reused by #1 (digest links), #2 (public pages), future SEO plays

### F2. Shared cron harness
- `lib/cron/index.ts` wrapping existing `CRON_SECRET` pattern
- Standardised logging + Slack failure alerts
- Reused by #1 digest, #4 recurring invoices, #6 credit score refresh, beta analytics

### F3. Feature flag table
- `feature_flags` table with user scoping
- Read via server component
- Enables dark-ship to beta cohort first, flip to all users on launch day

---

## Week-by-Week Ship Schedule

### Week 1 (17–24 Apr) — Foundations + Quick Win

**Mon–Tue:** Foundations F1, F2, F3.

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

**Thu–Sun:** Ship **#3 WhatsApp Delivery** (Termii).
- "Send via WhatsApp" button on invoice detail page → template message with PDF link
- Daily payment reminder cron for overdue invoices (opt-in per customer)
- Tier gating: Free ₦50/msg (deducted from wallet balance), Pro+ unlimited

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

## Open Questions (answer when you have a moment)

1. **Solo build or any dev help?** Plan assumes solo. Even 1 day/week of help unlocks significant parallelisation.
2. **Lender outreach (Week 10):** should I draft the Carbon/FairMoney/Renmoney/LAPO letters, or do you want to write those personally?
3. **AI Assistant branding:** "Ada" (Nigerian female agritech assistant, ties to girl-child priority) or neutral ("AgroYield Assistant")? Shapes tone, copy, marketing angle.

---

## Changelog

- **17 Apr 2026** — Document created. Differentiators shortlisted, critical path mapped, 11-week schedule drafted, questions opened.

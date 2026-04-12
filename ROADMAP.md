# AgroYield Network — Launch Roadmap

> **Created:** 12 April 2026
> **Launch:** 5 July 2026 (~12 weeks)
> **Source:** Strategic Product Review (AgroYield-Strategic-Review.docx)

Each item below is a discrete work package. We tackle them in order, top to bottom. Check off as we complete each one.

---

## Phase 1: Foundation Fixes (Weeks 1–2)

These must be done before anything else. They fix what's broken and make existing features actually usable.

### 1.1 — Fix Team Access RLS Gap

> **Why:** Team members you invite currently see nothing. Every business query filters by `user_id = auth.uid()` which excludes invited accountants/staff.
> **Scope:** Create `getAccessibleBusinessId()` helper. Update all 12+ business files. Update RLS policies on all business tables.
> **Status:** ✅ Completed (12 Apr 2026)

### 1.2 — Notifications System

> **Why:** Without this, every feature is invisible. A user gets a comment, a payment, an overdue invoice — they'll never know unless they check manually.
> **Scope:** `notifications` table. `NotificationBell` component in AppNav. Trigger notifications from key events (invoice paid, team invite, comment, follow, overdue). Badge count. Mark as read.
> **Status:** ✅ Completed (12 Apr 2026)

### 1.3 — Loading & Error Boundaries

> **Why:** Users currently see white screens when pages load or queries fail.
> **Scope:** Add `loading.tsx` (skeleton screens) and `error.tsx` (friendly retry UI) to every route group. Create shared skeleton components.
> **Status:** ⬜ Not started

### 1.4 — Wire LinkedIn OAuth

> **Why:** Already configured in developer portal. Quick win for professional users.
> **Scope:** Enable provider in Supabase, add button to login/signup pages, test callback.
> **Status:** ⬜ Not started

### 1.5 — Wire Facebook OAuth

> **Why:** Same as LinkedIn. Major auth provider in Nigeria.
> **Scope:** Enable provider in Supabase, add button to login/signup pages, test callback.
> **Status:** ⬜ Not started

---

## Phase 2: User Experience (Weeks 3–4)

Make the platform feel professional and work for Nigerian SMEs on mobile.

### 2.1 — Onboarding Wizard

> **Why:** New users land on an empty dashboard with no guidance. Nigerian SMEs encountering business software for the first time need hand-holding.
> **Scope:** 3-step wizard after first login: (1) Complete profile, (2) Choose modules, (3) Set up first business OR explore directory. Progress indicators. Contextual tooltips on first visit to each module.
> **Status:** ⬜ Not started

### 2.2 — Invoice PDF Generation & Sharing

> **Why:** SMEs need to send professional PDF invoices via WhatsApp and email. Current print layout is good but not a shareable PDF.
> **Scope:** Server-side PDF generation. Branded template with logo, bank details, QR code. Download button. Email as attachment via Resend. WhatsApp share link.
> **Status:** ⬜ Not started

### 2.3 — PWA / Offline Capability

> **Why:** Many target users have unreliable internet. A farmer at a rural market needs offline access.
> **Scope:** Service worker, manifest.json, install prompt. Cache business dashboard, products, customers for offline viewing. Queue creates/updates for sync.
> **Status:** ⬜ Not started

### 2.4 — WhatsApp Notifications

> **Why:** Email open rates in Nigeria ~15-20%. WhatsApp >90%. Your users live on WhatsApp.
> **Scope:** WhatsApp Business API integration (Twilio / Africa's Talking). Opt-in from profile. Send invoice PDFs, payment confirmations, overdue alerts via WhatsApp.
> **Status:** ⬜ Not started

### 2.5 — API Rate Limiting

> **Why:** Public API routes (invite, contact, auth) have no rate limiting. Abuse risk before launch.
> **Scope:** IP-based rate limiter on all public and sensitive API routes.
> **Status:** ⬜ Not started

---

## Phase 3: Growth Features (Weeks 5–8)

Features that drive daily engagement and create network effects.

### 3.1 — Mentorship Module

> **Why:** High-value networking feature. Creates sticky relationships. Already in middleware matcher.
> **Scope:** Mentor profiles with expertise/availability. Mentee matching. Session booking (Google Calendar integration available). Session notes. Ratings.
> **Status:** ⬜ Not started

### 3.2 — Smart Price Intelligence

> **Why:** Transforms the price tracker from a data dump into a daily-use tool.
> **Scope:** Price trend charts per commodity/state. Cross-state comparisons. Price alerts ("notify me when maize drops below ₦X in Oyo"). Weekly market digest.
> **Status:** ⬜ Not started

### 3.3 — Grant Application Tracker

> **Why:** Unique value prop. Turns AgroYield into an indispensable tool for anyone seeking agri funding.
> **Scope:** `/grants` module. Track applications (applied → review → interview → approved/rejected). Document checklist. Auto-populate from profile. Deadline reminders.
> **Status:** ⬜ Not started

### 3.4 — Multi-Business Support

> **Why:** Agripreneurs run multiple ventures. Accountants serve multiple clients. `business_team` table already supports this.
> **Scope:** Business switcher in sidebar. Create multiple businesses. See all businesses you own or are invited to. Consolidated reporting.
> **Status:** ⬜ Not started

### 3.5 — Subscription Tiers

> **Why:** Single subscription tier limits revenue. Need freemium + pro + growth tiers.
> **Scope:** Free: 1 business, 20 invoices/mo, basic reports. Pro (₦2,500/mo): Unlimited, team, full reports, assets. Growth (₦7,500/mo): Multi-business, benchmarking, API.
> **Status:** ⬜ Not started

---

## Phase 4: Polish & Launch (Weeks 9–12)

Harden the platform, add differentiators, test with real users.

### 4.1 — Marketplace Escrow (Basic)

> **Why:** Capture transactions on-platform. Revenue via commission. Build trust.
> **Scope:** "Request to Buy" flow. Paystack escrow. Buyer pays → seller ships → buyer confirms → funds released. Basic dispute flow.
> **Status:** ⬜ Not started

### 4.2 — Business Benchmarking (Basic)

> **Why:** "Your profit margin is 18%. Average for poultry businesses in Lagos is 23%." Creates a moat — more businesses = better benchmarks.
> **Scope:** Aggregate anonymous metrics by sector/region/size. Peer comparison on dashboard. Actionable recommendations.
> **Status:** ⬜ Not started

### 4.3 — Monitoring & Error Tracking

> **Why:** You need to know when things break before users complain.
> **Scope:** Sentry (free tier) for error tracking. Vercel Analytics. Slack webhook for critical events (signup, payment, overdue).
> **Status:** ⬜ Not started

### 4.4 — Performance Audit

> **Why:** Your users are on mobile phones with 3G connections. Speed is a feature.
> **Scope:** Lighthouse audit. Bundle analysis. Image optimization. Lazy loading. Server component optimization.
> **Status:** ⬜ Not started

### 4.5 — Security Hardening

> **Why:** Before launch, not after.
> **Scope:** CSP headers in next.config.ts. DOMPurify for HTML rendering. Input sanitisation on all API routes. Audit service role usage.
> **Status:** ⬜ Not started

### 4.6 — Beta Testing with Real SMEs

> **Why:** Find what you missed. Real users will break things you never thought of.
> **Scope:** Recruit 10-20 Nigerian SME owners. Give them tasks (create invoice, list product, invite accountant). Collect feedback. Fix top issues.
> **Status:** ⬜ Not started

---

## Post-Launch (Backlog)

These are valuable but can wait until after July 5.

- [ ] Direct messaging between members
- [ ] Connections & Insights feed (posts, polls, articles)
- [ ] Data products (aggregated price intelligence for corporates/NGOs)
- [ ] Mentorship marketplace (paid sessions with commission)
- [ ] Mobile app consideration (React Native or enhanced PWA)
- [ ] Analytics dashboard for admin (signups, active users, module usage)
- [ ] Two-factor authentication
- [ ] Supabase Realtime for live updates
- [ ] Generate Supabase TypeScript types (eliminate `as any` casts)
- [ ] Automated test suite
- [ ] CI/CD pipeline (lint + build checks on PR)
- [ ] `.env.example` file

---

## How to Use This Document

1. We work through items top to bottom, phase by phase
2. Each session, we pick up where we left off
3. When an item is done, change ⬜ to ✅ and note the date
4. If scope changes or priorities shift, we update this document
5. The Strategic Review (docx) has the full reasoning behind each item

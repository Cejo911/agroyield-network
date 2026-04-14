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
> **Status:** ✅ Completed (12 Apr 2026)

### 1.4 — Wire LinkedIn OAuth

> **Why:** Already configured in developer portal. Quick win for professional users.
> **Scope:** Enable provider in Supabase, add button to login/signup pages, test callback.
> **Status:** ✅ Completed (12 Apr 2026)

### 1.5 — Wire Facebook OAuth

> **Why:** Same as LinkedIn. Major auth provider in Nigeria.
> **Scope:** Enable provider in Supabase, add button to login/signup pages, test callback.
> **Status:** ⏸️ Blocked — Meta Business Verification required; proceeding without (12 Apr 2026)

---

## Phase 2: User Experience (Weeks 3–4)

Make the platform feel professional and work for Nigerian SMEs on mobile.

### 2.1 — Onboarding Wizard

> **Why:** New users land on an empty dashboard with no guidance. Nigerian SMEs encountering business software for the first time need hand-holding.
> **Scope:** 3-step wizard after first login: (1) Complete profile, (2) Choose modules, (3) Set up first business OR explore directory. Progress indicators. Contextual tooltips on first visit to each module.
> **Status:** ✅ Completed (12 Apr 2026)

### 2.2 — Invoice PDF Generation & Sharing

> **Why:** SMEs need to send professional PDF invoices via WhatsApp and email. Current print layout is good but not a shareable PDF.
> **Scope:** Server-side PDF generation. Branded template with logo, bank details, QR code. Download button. Email as attachment via Resend. WhatsApp share link.
> **Status:** ✅ Completed (12 Apr 2026) — PDF download (html2canvas + jsPDF), WhatsApp share, email share. Expenses search bar + column sorting added.

### 2.3 — PWA / Offline Capability

> **Why:** Many target users have unreliable internet. A farmer at a rural market needs offline access.
> **Scope:** Service worker, manifest.json, install prompt. Cache business dashboard, products, customers for offline viewing. Queue creates/updates for sync.
> **Status:** ✅ Completed (12 Apr 2026) — @ducanh2912/next-pwa, web manifest, PWA icons (192/512), service worker with NetworkFirst for API + CacheFirst for static assets. Install-to-home-screen enabled.

### 2.4 — WhatsApp Notifications

> **Why:** Email open rates in Nigeria ~15-20%. WhatsApp >90%. Your users live on WhatsApp.
> **Scope:** WhatsApp Business API integration (Twilio / Africa's Talking). Opt-in from profile. Send invoice PDFs, payment confirmations, overdue alerts via WhatsApp.
> **Status:** ⏸️ Blocked — Requires Meta Business Verification (same blocker as Facebook OAuth). WhatsApp share links already available on invoices. Revisit after Meta approval or via Termii.

### 2.5 — API Rate Limiting

> **Why:** Public API routes (invite, contact, auth) have no rate limiting. Abuse risk before launch.
> **Scope:** IP-based rate limiter on all public and sensitive API routes.
> **Status:** ✅ Completed (12 Apr 2026) — In-memory rate limiter on 10 routes: reset-password (3/min), contact (5/min), waitlist (5/min), apply (5/min), follow (20/min), invite (10/min), subscribe (5/min), payment (5/min), like (30/min), notifications (20/min).

---

## Phase 3: Growth Features (Weeks 5–8)

Features that drive daily engagement and create network effects.

### 3.1 — Mentorship Module

> **Why:** High-value networking feature. Creates sticky relationships. Already in middleware matcher.
> **Scope:** Mentor profiles with expertise/availability. Mentee matching. Request workflow (pending/accepted/declined/withdrawn/completed). Session scheduling with date, format, duration, meeting link. Post-session star ratings + reviews (both parties). Notification deduplication. State-machine enforcement via DB trigger. Party-scoped RLS on sessions + reviews.
> **Status:** ✅ Completed (14 Apr 2026) — Mentor profiles, browse/search with expertise + availability filters, request workflow, session scheduling UI (mentor schedules → both see details), mark completed / cancel session, star ratings + review modal, notification link fix, transition enforcement trigger, deduplicated notifications (DB trigger only), tightened RLS on mentorship_sessions + mentorship_requests.

### 3.2 — Smart Price Intelligence

> **Why:** Transforms the price tracker from a data dump into a daily-use tool.
> **Scope:** Price trend charts per commodity/state. Cross-state comparisons. Price alerts ("notify me when maize drops below ₦X in Oyo"). Weekly market digest.
> **Status:** ✅ Completed (12 Apr 2026) — Recharts-powered price trend charts (avg/min/max), cross-state comparison bar charts with auto-insights, price alerts CRUD with live notification triggers, poster attribution on cards. Tab-based UI (Reports / Intelligence).

### 3.3 — Grant Application Tracker

> **Why:** Unique value prop. Turns AgroYield into an indispensable tool for anyone seeking agri funding.
> **Scope:** `/grants` module. Track applications (draft → submitted → shortlisted → rejected → awarded). Document checklist with defaults. Auto-populate from profile. Deadline reminders via notifications. Admin grant posting. Category/status filtering. How-to-use guide.
> **Status:** ✅ Completed (12 Apr 2026) — Full grant listing, application tracker with status pipeline, document checklist (6 defaults + custom), auto-populated profile info, deadline reminders API, admin post form, category + status filters, My Applications dashboard with stats.

### 3.3b — Community Feed

> **Why:** Daily engagement driver. Creates social stickiness — users return to check discussions, vote on polls, and celebrate milestones. Positioned as the #1 card on the dashboard.
> **Scope:** `/community` module. 5 post types (discussion, question, poll, news, milestone). Poll voting with results. Like/comment using existing infrastructure. Post detail page. Filter by type. Pin support.
> **Status:** ✅ Completed (12 Apr 2026) — Post creation (5 types), poll voting API, like toggle, comments via CommentsSection, post detail page, type filters, pinned posts, loading/error boundaries. 9th dashboard card.

### 3.3c — UX Optimisation (Nav + Dashboard)

> **Why:** Reduce cognitive fatigue and maximise engagement. Serial position effect places high-value items at primacy/recency positions. F-pattern scanning optimises dashboard grid layout.
> **Scope:** Reorder NavBar (Community to position 2, cluster transactional tools). Reorder dashboard 3×3 grid (Community top-left, Business bottom-right). Rewrite all card descriptions to action-oriented copy. Replace module icons for distinctness (🌱→🚀, 🛒→🤝, 📊→🏷️, 👥→📇, 🎓→🧭). Update sitewide: dashboard, landing page, onboarding wizard, email templates, notification bell.
> **Status:** ✅ Completed (12 Apr 2026)

### 3.3d — Direct Messages

> **Why:** Core engagement feature. Enables private communication between members — essential for marketplace deals, mentorship coordination, and networking. Pulled forward from post-launch backlog due to high impact on retention.
> **Scope:** `/messages` inbox with conversations list, search, unread badges. Chat thread UI with message bubbles, date separators, read receipts (✓/✓✓), optimistic sends with rollback, 5s polling. Reusable `MessageButton` component on Directory, Marketplace, and Mentorship profiles. Messages icon with live unread badge in NavBar (replaces text link). Service role client for cross-user DB operations. RLS policies on `conversations` and `messages` tables.
> **Status:** ✅ Completed (13 Apr 2026)

### 3.3e — UX Polish (Profiles + Navigation)

> **Why:** Reduce dead ends and improve discoverability. Profile pages had no back navigation, follower/following counts were static text, and the `/u/[slug]` public profile lacked message and follower interaction.
> **Scope:** Reusable `BackButton` component (history-aware with fallback). Clickable follower/following counts on `/directory/[id]` and `/u/[slug]` profiles. `MessageButton` added to `/u/[slug]` public profile. Guest nav logo updated from emoji to brand assets. 404 page logo replaced with brand assets.
> **Status:** ✅ Completed (13 Apr 2026)

### 3.3f — UX Polish Pass 2 + Security + Build Hardening

> **Why:** Close small gaps that erode trust — missing image editing in marketplace, mismatched footer-page branding, missing repost option, dashboard skeleton count drift, no location filter in directory, no login-device email. Also: Next.js 16 upgrade surfaced build-time crashes from module-scope client instantiation that had to be fixed before shipping.
> **Scope:**
> - Marketplace: image upload/removal on edit listing form (was only on new-listing form)
> - Logos on footer-linked pages (About, Contact, Privacy, Terms) replaced with brand assets, light/dark theme toggle wired in
> - Community repost (with optional caption, embedded original post card, self-repost prevention, flattened chain)
> - Waitlist member count on Admin Dashboard (responsive 5-column grid, service-role count query)
> - Dashboard loading skeleton corrected from 7 to 9 cards
> - Member directory location filter (37 Nigerian states, case-insensitive substring match)
> - Login notification emails (Option B — new device/location only): privacy-preserving device fingerprint (IPv4 /24 + SHA-256), opt-out flag, fire-and-forget, first-login suppression, sent from `security@agroyield.africa`
> - Centralised email senders: `lib/email/senders.ts` with `SENDERS` / `INBOXES` constants and env-var overrides (`RESEND_FROM_*`, `CONTACT_INBOX`)
> - Lazy Resend client: `lib/email/client.ts` with `getResend()` helper
> - Lazy Supabase clients: `lib/supabase/admin.ts` with `getSupabaseAdmin()` / `getSupabaseAnon()` — fixes Next.js 16 "Failed to collect page data" build crashes across 11 routes/components
> - Tables added: `login_history` (device fingerprints), `notify_on_login` column on profiles
> **Status:** ✅ Completed (13 Apr 2026)

### 3.4 — Multi-Business Support

> **Why:** Agripreneurs run multiple ventures. Accountants serve multiple clients. `business_team` table already supports this.
> **Scope:** Business switcher in sidebar. Create multiple businesses. See all businesses you own or are invited to. Consolidated reporting.
> **Status:** ✅ Core completed (14 Apr 2026) — Business switcher dropdown with cookie persistence (`active_biz_id`), "Create another business" flow via `/business/setup?new=true`, Suspense boundary fix, gated behind `allow_multi_business` feature flag. RLS audit and consolidated reporting deferred to post-launch.
>
> **Remaining (post-launch):**
> 1. **RLS audit** — confirm all business-table policies scope on `business_id` via the team access helper, not just `user_id`. Any policy that assumes one-business-per-user will leak cross-business data.
> 2. **Consolidated reporting** — optional dashboard view aggregating revenue/expenses across all businesses.

### 3.4b — Module Separation + Image Uploads + Admin Dashboard Hardening

> **Why:** Opportunities and Grants had overlapping types (both offered grants/fellowships). Admin dashboard lacked search/filter at scale and had no visibility into grants. Several sub-pages had no back navigation.
> **Scope:**
> - **Module separation:** Opportunities narrowed to non-funding types (job, internship, partnership, training, conference). Grants owns all funding types (grants, fellowships, scholarships). Updated DB constraints, settings, UI types, landing page, dashboard descriptions.
> - **Image uploads:** Community posts support image attachments. Opportunities and Grants forms support thumbnail upload. Thumbnails displayed on listing cards.
> - **Back navigation audit:** Added `BackButton` or `<Link>` to all 8 sub-pages missing back navigation (opportunities new/edit, grants detail, marketplace detail/new/edit, research new/edit).
> - **Admin dashboard:** Search bars + status filter pills on all content tabs (Opportunities, Marketplace, Members, Reports). New Grants tab with feature/close toggle actions. Grants stat card. Fixed rate limit settings key mismatch (`rate_limit_opportunities` → `opportunity_daily_limit`). Fixed opportunity types fallback to exclude grants.
> - **API:** Created `/api/admin/grant` PATCH endpoint for grant admin actions.
> **Status:** ✅ Completed (14 Apr 2026)

### 3.4c — Admin Settings Panel + Maintenance Mode + Operational Controls

> **Why:** The Settings tab in the admin dashboard had no actual controls — all settings were hardcoded or required DB edits. Platform needed operational kill switches, spam prevention, and access gating before launch.
> **Scope:**
> - **5 new admin settings:** Mentorship module toggle (on/off kill switch), weekly digest email toggle (pause/resume cron), maintenance mode (full-site lockout with admin bypass), community & research daily post limits (spam prevention), mentorship verification gate (require paid subscription for mentorship access).
> - **Maintenance mode infrastructure:** Middleware intercept on all non-admin routes, redirects non-admin users to `/maintenance` page. Admin bypass via `is_admin` check. Branded maintenance page with auto-redirect when mode is turned off.
> - **Settings UI redesign:** Collapsible accordion sections (6 groups: Platform Access, Content & Moderation, Mentorship, Email & Notifications, Pricing & Subscriptions, Feature Flags). Status badges on collapsed headers for at-a-glance state. Tighter spacing, condensed descriptions, red border highlight on active maintenance mode.
> - **Rate limiting enforcement:** Community posts checked client-side against `community_daily_limit` setting. Research posts checked server-side in API route against `research_daily_limit` setting.
> - **Mentorship gating:** Both `/mentorship` (server component) and `/mentorship/become-mentor` (client component) check `mentorship_enabled` and `mentorship_requires_verification` settings. Shows appropriate gate screens.
> - **Digest toggle:** Weekly digest cron early-exits when `digest_enabled` is `false`.
> - **Server-side settings helper:** `lib/settings.ts` with `getSetting()` and `getSettings()` using admin client to bypass RLS.
> - **Logo sizing consistency:** Increased AppNav desktop logo from 160×40 to 200×50, mobile icon from 40 to 44. Matched signup page logos to login/reset sizes (nav 58px, card 120px).
> **Status:** ✅ Completed (14 Apr 2026)

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

- [x] ~~Direct messaging between members~~ — Delivered as Direct Messages (Phase 3.3d)
- [x] ~~Connections & Insights feed (posts, polls, articles)~~ — Delivered as Community Feed (Phase 3.3b)
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

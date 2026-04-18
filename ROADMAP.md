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

> **Why:** Single subscription tier limits revenue. Need freemium + pro + growth tiers with feature gating on business limits while keeping social/network features free for all.
> **Scope:**
> - **Free tier:** 1 business, 15 invoices/mo, 3 team members. All social/network features (directory, community, prices, research, grants, marketplace, messages) remain free.
> - **Pro tier (₦2,000/mo or ₦20,000/yr):** 1 business, unlimited invoices + team members, verified badge, full reports, mentorship access.
> - **Growth tier (₦5,000/mo or ₦50,000/yr):** Unlimited businesses, all Pro features, gold star badge.
> - **Free trial:** 30 days for first-time subscribers (activates immediately, no Paystack redirect).
> - **Pricing page:** 3-tier comparison with billing toggle, feature matrix, FAQ section.
> - **Limit enforcement:** Server-side `/api/tier/check` + client-side `UpgradePrompt` component on invoice creation, business setup, team invites.
> - **Admin controls:** Tier dropdown on member cards (replaces old Verify/Elite buttons), 4 pricing settings + free trial days in Settings panel.
> - **Migration:** `subscription_tier` column added to profiles. Existing verified users migrated to Pro. `is_verified`/`is_elite` kept for backward compat but all reads migrated to `subscription_tier`.
> - **Full codebase migration:** Replaced all old verified/elite markers across 13 files — admin dashboard, directory, profiles, mentorship gate, expiry emails, audit log, analytics. `/verify` redirects to `/pricing`.
> **Status:** ✅ Completed (15 Apr 2026)

### 3.5b — Poll Closing Date

> **Why:** Community polls remained open indefinitely with no way to close them. Polls need a closing date to drive urgency and reveal final results.
> **Scope:** `poll_closes_at` timestamptz column on `community_posts`. Date picker in poll creation form. Vote API rejects votes on closed polls. Feed and detail pages show closed status with results auto-revealed.
> **Status:** ✅ Completed (15 Apr 2026)

### 3.5c — Institutional Member Registration

> **Why:** Universities, government agencies, NGOs, and agri-companies need to join as institutions — not as individuals. Enables them to post opportunities, list on the directory with institutional badges, and be verified by admin.
> **Scope:** Individual/Institution toggle on signup. Conditional profile form (institution details vs personal details). Admin verification workflow with "Institutions" tab. Directory integration with institution badges/filters. Posting gate (unverified institutions can't post). `InstitutionGateBanner` component on all 4 creation pages.
> **Status:** ✅ Completed (15 Apr 2026) — SQL migration pending deployment

### 3.5d — Pre-Phase 4 Quick Wins

> **Why:** Six targeted improvements requested during operational review. Bundled as a single work package since each is small but impactful.
> **Scope:**
> 1. **Multi-business admin preview** — Admin "View Business" shows ALL businesses per member (`.find()` → `.filter().map()`), labelled when multiple exist.
> 2. **Alt phone + WhatsApp in business setup** — Two new fields (`alt_phone`, `whatsapp`) on business setup form + admin business preview page.
> 3. **Unlimited report alert emails** — Admin settings report alert field accepts comma-separated emails; report API sends to all addresses.
> 4. **Birthday + anniversary celebration emails** — Daily cron (`/api/cron/celebrations`) at 7 AM. Birthday (matches `date_of_birth` month+day) and membership anniversary (matches `created_at` month+day, 1+ years). Rich HTML templates, sent from `hello@agroyield.africa`.
> 5. **Meaningful-action follow notifications** — `lib/notify-followers.ts` shared utility. When a user posts an opportunity, marketplace listing, or research post, all followers receive an in-app notification. Fire-and-forget, skips pending-moderation posts.
> 6. **UpgradePrompt redesign** — Gradient background, lightning bolt icon, color-coded progress bar, benefit pills with checkmarks, gradient CTA button, "Compare plans" link.
> **Status:** ✅ Completed (15 Apr 2026) — SQL migration for `alt_phone`/`whatsapp` pending deployment

### 3.5e — Sort, Filter & Admin Enhancements

> **Why:** Users needed sort-by-date across all content modules for better content discovery. Admin needed dynamic control over marketplace categories and price tracker commodities. Several UX gaps in marketplace and business setup needed closing.
> **Scope:**
> 1. **Sort dropdowns on 6 modules** — Opportunities (newest/oldest/deadline), Grants (featured/deadline/newest/oldest), Marketplace (newest/oldest/price low/high), Price Tracker (newest/oldest/price low/high), Research (newest/oldest), Mentorship (newest/oldest). Client-side sorting using `[...filtered].sort()` → `sorted` array pattern.
> 2. **Admin commodity categories + items** — `commodity_categories` (array) and `commodity_items` (nested `Record<string, string[]>`) stored in `settings` table as JSON. Admin UI with per-category pill management (add/remove items). Key normalisation (`toLowerCase().replace(/\s+/g, '_')`).
> 3. **Dynamic price tracker tabs** — Replaced hardcoded `CATEGORIES` with admin-configurable categories from settings. `prices/page.tsx` fetches via `getSettings()` and passes as prop. Fallback to defaults if settings empty.
> 4. **Content-types API fix** — New `parseList()` helper in `/api/content-types/route.ts` that tries `JSON.parse()` first, falls back to comma-split. Fixes garbled JSON arrays from admin settings.
> 5. **Marketplace Equipment condition filter** — New/Used filter pills shown when Equipment category selected. Auto-resets when switching categories. Case-insensitive equipment checks across new listing form (3 sites) and edit listing form (4 sites).
> 6. **Floating business setup guide** — `BusinessSetupGuide.tsx` component tracking 5 setup steps (logo, details, registration, bank, invoice). Collapsed: circular progress ring badge. Expanded: green gradient header, progress bar, contextual tips, completion celebration. Minimise/dismiss controls.
> 7. **Expanded member Excel export** — Admin member export expanded from 8 columns to 32 columns (added phone, WhatsApp, bio, location, role, institution ×3, interests, all social media handles, date of birth, avatar, account type, institution fields). Admin profiles query expanded to match.
> **Status:** ✅ Completed (15 Apr 2026)

---

## Phase 4: Polish & Launch (Weeks 9–12)

Harden the platform, add differentiators, test with real users.

### 4.1 — Marketplace Escrow (Basic)

> **Why:** Capture transactions on-platform. Revenue via commission. Build trust.
> **Scope:** "Request to Buy" flow. Paystack escrow. Buyer pays → seller ships → buyer confirms → funds released. Basic dispute flow.
> **Status:** ✅ Completed (16 Apr 2026)
>
> **Delivered:**
> - 3 new DB tables: `seller_bank_accounts`, `marketplace_orders`, `marketplace_disputes` with full RLS
> - Seller bank account setup with Paystack account verification + transfer recipient creation
> - "Buy Now" button on listing detail page with Paystack payment initialization
> - Paystack webhook extended to handle marketplace payments (separate from subscriptions)
> - Full order lifecycle: pending_payment → paid → shipped → completed/disputed/refunded/cancelled
> - Buyer confirms delivery → auto-releases funds via Paystack Transfer API
> - 7-day auto-release cron for shipped orders not confirmed or disputed
> - Dispute system: buyer/seller can raise, admin resolves (favour seller = release, favour buyer = refund)
> - Admin orders/disputes tab with release, refund, and dispute resolution controls
> - 3% platform commission on all transactions
> - Notifications + Slack alerts at every lifecycle step
> - User-facing pages: orders list (buyer/seller toggle), order detail, bank account setup
> - "My Orders" link on marketplace page

### 4.2 — Business Benchmarking (Basic)

> **Why:** "Your profit margin is 18%. Average for poultry businesses in Lagos is 23%." Creates a moat — more businesses = better benchmarks.
> **Scope:** Aggregate anonymous metrics by sector/region/size. Peer comparison on dashboard. Actionable recommendations.
> **Status:** ✅ Completed (17 Apr 2026)
>
> **Delivered:**
> - 3 new columns on `businesses`: `sector`, `state`, `business_size` with CHECK constraints (10 agri sectors, 36 states + FCT, 4 size brackets) + partial indexes
> - "Sector & Classification" section on business setup page with dropdown selectors
> - `/api/business/benchmarks` API: computes per-business KPIs (profit margin, expense ratio, collection rate, revenue) and peer medians. Peer group = same sector, narrowed to same state when ≥3 peers. Uses medians over averages for outlier resilience. Skips zero-activity businesses.
> - `BenchmarkCard` client component on Business Suite dashboard with 3 states: profile completion nudge, "not enough peers" message, or full comparison with directional arrows + actionable insights
> - Graceful degradation: works with zero peers (shows nudge), 1 peer (shows waiting message), 2+ peers (shows full comparison)

### 4.3 — Monitoring & Error Tracking

> **Why:** You need to know when things break before users complain.
> **Scope:** Sentry (free tier) for error tracking + session replay + performance tracing. Vercel Analytics + Speed Insights for web vitals. PostHog for user-level funnels and retention (1M events/mo free). Slack webhook alerts for critical events (signup, payment, free trial, content reports, subscription expiry).
> **Status:** ✅ Completed (16 Apr 2026) — Sentry SDK v10.48 (20% trace rate, 10% session replay, 100% error replay), Vercel Analytics (free), PostHog EU cloud, Slack alerts on 5 API routes (auth callback, payment verify, payment initiate, content report, subscription expiry cron). All fire-and-forget.

### 4.4 — Performance Audit

> **Why:** Your users are on mobile phones with 3G connections. Speed is a feature.
> **Scope:** Lighthouse audit. Bundle analysis. Image optimization. Lazy loading. Server component optimization.
> **Status:** ✅ Completed (16 Apr 2026) — Migrated 34 user-facing files from raw `<img>` to Next.js `<Image>` (automatic WebP/AVIF, lazy loading, responsive sizing). Dynamic-imported ExcelJS (~2MB) and jsPDF (~600KB) in 3 admin/business components. Lazy-loaded 8 admin tabs via `React.lazy()` + Suspense. Added AVIF/WebP format preference, responsive breakpoints, and 30-day cache TTL in `next.config.ts`. Print pages intentionally left with raw `<img>` to avoid layout interference.

### 4.5 — Security Hardening

> **Why:** Before launch, not after.
> **Scope:** CSP headers in next.config.ts. DOMPurify for HTML rendering. Input sanitisation on all API routes. Audit service role usage.
> **Status:** ✅ Completed (16 Apr 2026) — CSP + 5 security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) in `next.config.ts`. Central sanitisation utility (`lib/sanitise.ts`) applied across 9 API routes (opportunities, marketplace, research, messages, profile, prices, contact, waitlist). Client-side URL guard (`lib/safe-href.ts`) wired into community, profile, directory, and public profile pages to block `javascript:` / `data:` / `vbscript:` XSS. HTML-escape helper applied to contact + waitlist email templates. Service-role usage audited — confined to server-only paths (API routes, server components, cron). DOMPurify not required: no user-supplied HTML is rendered (React auto-escapes).

### 4.6 — Beta Testing with Real SMEs

> **Why:** Find what you missed. Real users will break things you never thought of.
> **Scope:** Recruit 10-20 Nigerian SME owners. Give them tasks (create invoice, list product, invite accountant). Collect feedback. Fix top issues.
> **Status:** ⬜ Not started

### 4.7 — Support Ticket System with Token Verification

> **Why:** Users need a structured way to request support. Token authentication before rendering support prevents impersonation and adds security.
> **Scope:** Support ticket creation (open/closed states). Token verification via email or SMS (member's choice). Admin support dashboard with ticket queue. Audit trail per ticket.
> **Status:** ✅ Completed (16 Apr 2026) — Full support ticket system: 4 DB tables (tickets, messages, events, tokens) with RLS. Email OTP verification (6-digit, 15-min expiry) before accessing support. Ticket CRUD with categories (general/account/billing/technical/content/other), priorities (low/medium/high/urgent), SLA deadlines (72h/48h/24h/4h). Admin SupportTab with claim/resolve/close/escalate actions, status + priority filters, SLA breach indicators. Conversation threads with user/admin messages + audit trail. Email notifications on ticket creation, admin reply, and resolution. Slack alerts on new tickets (severity by priority). Support link in AppNav. SMS verification deferred — structured for plug-in when SMS provider added.

### 4.9 — Invoice Delivery Charges

> **Why:** Nigerian SMEs routinely bill freight/logistics alongside goods. Without a dedicated line, users were stuffing delivery into line items (distorts product pricing analytics) or into notes (not taxable, not summable).
> **Scope:** `delivery_charge` column on `invoices` (NOT NULL DEFAULT 0, CHECK ≥ 0). Delivery input in new invoice Summary section. VAT calculated on `subtotal + delivery` (matches FIRS treatment of freight as taxable). Delivery row rendered on both invoice detail view and print/PDF.
> **Status:** ✅ Completed (17 Apr 2026)
>
> **Delivered:**
> - Migration `20260417_invoice_delivery_charge.sql` with idempotent `ADD COLUMN IF NOT EXISTS` + non-negative CHECK
> - New invoice page: delivery state + input in Summary, VAT now computed on `preVat = subtotal + delivery`
> - Invoice detail + print pages render Delivery line when > 0; VAT label now reflects actual stored rate
> - Backward compatible — existing invoices default to 0 delivery

### 4.10 — F1 Public Business URLs + Showcase Migration

> **Why:** `/b/[slug]` was the shell route from F1 planning; it now has to earn its keep as a real landing page — enough surface for digest links to land on, Open Graph previews to render against, and business owners to feel comfortable sharing. Also: the unique slug + alias infrastructure is the primitive #1 Weekly Digest and #2 Public Business Pages both depend on.
> **Scope:**
> - 8 showcase columns on `businesses`: `tagline`, `about`, `cover_image_url`, `website`, `instagram`, `facebook`, `opening_hours`, `founded_year` (with CHECK range on founded_year: 1800 → current year + 1). Idempotent migration.
> - `business_slug_aliases` table already in place: `resolveSlug()` tries live slug → alias (`301` permanent redirect) → `notFound()`.
> - Admin client (`getAdminClient()`) used to read the 24-column business SELECT, bypassing RLS on the public page (all public fields only — no private financial data).
> - `/business/setup/complete` page with `PublicPageCard` component: owners edit tagline/about/cover image/website/socials/hours/founded year in-place, uploads go to `business-logos` bucket.
> - `/b/[slug]` anon nav logo harmonised with AppNav: 3-image responsive pattern (mobile 44×44 icon, desktop 200×50 horizontal light, desktop 200×50 white for dark mode).
> **Status:** ✅ Completed (17 Apr 2026, Session 3)
>
> **Delivered:**
> - Migration `20260418_business_showcase.sql` applied to production
> - `/b/[slug]` renders full landing page: cover image, logo, tagline, name, about, products, contact, socials, opening hours, founded year. Verified ✓ chip (18 Apr 2026 Checkpoint 27) next to `<h1>` when `businesses.is_verified = true` — admin-set via the new `/admin` Businesses tab → `/api/admin/business` PATCH. Reviews section with star ratings, write-review modal, seller replies, report button and admin hide/restore moderation (18 Apr 2026 Checkpoint 27). JSON-LD LocalBusiness structured data (18 Apr 2026 Checkpoint 26) and Follow CTA for anonymous visitors (18 Apr 2026 Checkpoint 26).
> - `PublicPageCard` + `/business/setup/complete` live for owners
> - Anon nav logo parity with AppNav across all breakpoints + themes
> - Slug alias system verified end-to-end (live slug + alias redirect paths both working)
>
> **Production incident (resolved same day):**
> - `/b/ag-rentworks` 404'd for ~several hours post-deploy. Root cause: `20260418_business_showcase.sql` was merged to the repo but never run against prod Supabase. The 24-column SELECT in `resolveSlug()` errored with `column "tagline" does not exist`, and because the handler destructures `{ data }` without reading `{ error }`, the failure silently returned `kind: 'none'` → `notFound()`.
> - Fix: pasted the migration into Supabase SQL editor (the repo's `.sql` files are source-of-truth, not CI-executed). Confirmed resolved via `curl` title check.
> - Hardening lesson saved as auto-memory `project_migrations_manual.md`: **after every deploy that adds a `supabase/migrations/*.sql` file, paste it into Supabase SQL editor before declaring the feature shipped.**

### 4.8 — Featured Marketplace Listing Billing

> **Why:** Revenue opportunity — members pay to keep their listing promoted for a configurable duration.
> **Scope:** Featured listing request flow. Duration picker (days/weeks/months). Paystack billing on request. Auto-expire featured status when duration lapses. Visual distinction on marketplace feed.
> **Status:** ✅ Completed (16 Apr 2026)
>
> **Delivered:**
> - New DB table: `featured_listing_payments` with RLS + 3 new columns on `marketplace_listings` (`is_featured`, `featured_until`, `featured_at`)
> - Admin-configurable pricing plans (stored in settings table, editable from admin Pricing section)
> - Default plans: 7 days = ₦500, 14 days = ₦900, 30 days = ₦1,500
> - Paystack payment flow for featuring a listing
> - Webhook handler activates featured status on payment success
> - Duration stacking: paying again adds days on top of existing featured period
> - Category-level targeting: featured listings sort to top within their own category (not sitewide)
> - Badge shows on both listing cards (with/without images) and listing detail page
> - Owner sees "Promote this listing" / "Extend featured period" UI with plan picker
> - Auto-expire cron (daily at 5 AM UTC) removes featured status + notifies owners
> - Slack alerts for featured payments and expirations

---

## Post-Launch (Backlog)

These are valuable but can wait until after July 5.

- [x] ~~Direct messaging between members~~ — Delivered as Direct Messages (Phase 3.3d)
- [x] ~~Connections & Insights feed (posts, polls, articles)~~ — Delivered as Community Feed (Phase 3.3b)
- [x] ~~Analytics dashboard for admin (signups, active users, module usage)~~ — Delivered as Analytics tab (14 Apr 2026)
- [ ] Data products (aggregated price intelligence for corporates/NGOs)
- [ ] Mentorship marketplace (paid sessions with commission)
- [ ] Mobile app consideration (React Native or enhanced PWA)
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

---

## Scratchpad — Unresolved Thoughts & Unicorn-Path Intel

> This section captures strategic ideas, observations, and intel that surface during development sessions. Review periodically and promote items to the roadmap or discard them.

### 14 April 2026

**1. Data Products as Revenue Multiplier**
AgroYield's price tracker is collecting commodity prices across Nigerian states daily. This is exactly the kind of data that corporates, NGOs, and government agencies pay for. Think: "Nigeria Agricultural Price Index" — a subscription data product (API or monthly report) sold to Nestlé Nigeria, USAID, World Bank, state agricultural ministries. This is a proven unicorn ingredient: user-generated data → aggregated intelligence → B2B revenue stream that doesn't depend on individual subscriptions. **Action:** After launch, add anonymised price data export API. Start with free tier to build credibility, then gate historical data and cross-state analytics behind enterprise subscriptions.

**2. Mentorship Marketplace (Commission Model)**
The mentorship module currently runs for free. Post-launch, introduce paid mentorship sessions where mentors set hourly rates and AgroYield takes 10-15% commission via Paystack. This is the Toptal/Clarity.fm model applied to agriculture. The mentor profiles, ratings, and session history we're building now are the foundation. **Action:** Add `rate_per_hour` to `mentor_profiles`, integrate Paystack split payments. Wait until you have 50+ active mentors before enabling.

**3. Geographic Expansion Signal**
The waitlist IP capture we just added will reveal demand outside Nigeria. If you see signups from Ghana, Kenya, Tanzania — that's your expansion signal. AgroYield's modules (price tracking, marketplace, mentorship, grants) are not Nigeria-specific. The first pan-African agricultural platform to reach critical mass wins. **Action:** Watch waitlist IPs. If 10%+ are non-Nigerian, start planning multi-country support (currency, language, commodity lists).

**4. Grant Application Data as Institutional Sales Tool**
Every grant application tracked through AgroYield is a signal of demand and intent. Aggregate this: "2,400 Nigerian agripreneurs applied for funding in Q3 2026, 60% in poultry and crop farming, average ask ₦5M." This is intelligence that grant-making institutions (Tony Elumelu Foundation, AGRA, AfDB) would pay for — or better, partner with AgroYield to distribute their grants exclusively. **Action:** Build grant analytics view post-launch. Use it in BD conversations with institutions.

**5. Admin Analytics = Investor Readiness**
The analytics dashboard we're building now isn't just for platform management — it's what investors want to see in a pitch deck. Growth curves, engagement funnels, retention cohorts, module adoption, revenue metrics. Every chart in the Analytics tab is a slide in your Series A deck. **Action:** Keep the analytics tab data-rich and exportable. When fundraising starts, these numbers tell the story.

**6. Community Feed as Content Moat**
Platforms with user-generated discussion (Reddit, Stack Overflow, Farmers' Forum) build organic SEO moats. Every community post becomes an indexed page. "Best poultry feed in Lagos" → AgroYield discussion → organic traffic → new signups. **Action:** Ensure community posts have individual public URLs with proper SEO metadata. Consider making the community feed partially public (read-only for non-members) to drive organic discovery.

**7. Business Suite as SME Lock-in**
Once an SME runs their invoicing, expenses, and inventory through AgroYield, switching cost is high. This is the QuickBooks playbook. The Business Suite is not just a feature — it's the retention engine. Every invoice created is a reason to come back. **Action:** Prioritise Business Suite reliability and add recurring invoices post-launch. The more financial data they store, the stickier the platform.

**8. Girl-Child & Inclusion as Impact Metric**
Impact investors (Omidyar, Acumen, Shell Foundation) increasingly fund platforms with measurable social impact. AgroYield's gender field on profiles + community features + mentorship can produce real metrics: "X% of mentorship sessions involve female mentees", "Y female-led businesses onboarded." **Action:** Build gender-disaggregated stats into the Analytics tab. This becomes part of impact reports for grant applications and impact investor pitches.

### 15 April 2026

**9. No-Card-on-File Free Trial = Conversion Nudge Imperative**
The free trial doesn't capture payment details upfront — the right call given Nigerian payment friction (card failures, bank token issues, general distrust of auto-debit). But it means zero automatic conversion. When that trial clock runs out, the user simply falls to free tier with no friction in the *wrong* direction. You need an in-app nudge sequence starting 7 days before expiry: banner on dashboard, push notification if mobile comes later, and the expiry email we already built. Without this, free trial → churn will be the biggest leak in the funnel. **Action:** Build a `TrialExpiryBanner` component that shows on the dashboard when `subscription_expires_at` is within 7 days. Add a 1-day and same-day email to complement the existing 3-day reminder.

**10. Pricing Headroom for Enterprise Tier**
₦2,000/month (Pro) and ₦5,000/month (Growth) are individual/SME price points. There's clear headroom for an Enterprise tier later — ₦25,000–₦50,000/month for multi-user org accounts, API access to price data, dedicated support, and white-label reports. This tier would serve agricultural cooperatives, state extension services, and agri-input companies. The `subscription_tier` column already supports it — just add `'enterprise'` to the enum. **Action:** Don't build this now. But when BD conversations start with institutions, have the tier ready to activate. The schema supports it with zero migration.

**11. Build Behind Abstractions Early — The 13-File Lesson**
Today's tier migration touched 13 files because `is_verified` and `is_elite` were checked inline everywhere. If we'd had a `getEffectiveTier(profile)` utility from day one, the migration would have been a one-file change. Lesson: any value that gates access or changes UI should be derived through a single utility function, not checked inline. This applies going forward to any new access controls (e.g., feature flags, role checks, trial status). **Action:** Create `lib/utils/tier.ts` with `getEffectiveTier()` and `hasTierAccess()` helpers. Refactor existing inline checks to use them. Future tier changes become one-file edits.

**12. Fail-Open on Tier Checks — Never Break Core for Billing**
During the migration, we ensured that if the tier API fails or `subscription_tier` is null, users default to `'free'` rather than being locked out entirely. This "fail open" pattern is critical — a billing infrastructure bug should never prevent a farmer from viewing commodity prices or browsing the directory. Paid features gate *enhancements* (mentorship, priority listing, badges), not *core access*. **Action:** Document this as a design principle. Any new feature gate should ask: "If this check fails, does the user lose access to something they need, or something they want?" Need → fail open. Want → fail closed is acceptable.

**13. Institutional Members as B2B Wedge**
The institutional registration flow we just built isn't just a feature — it's a B2B wedge. Universities, NGOs, and government agencies registering on AgroYield become potential enterprise customers. They start by posting opportunities and grants for free, then we upsell: "Want priority placement for your fellowship? Want analytics on who applied?" The verification step is key — it makes institutions feel premium while giving us a sales touch point. Every admin verification is a chance for Okoli to personally onboard the institution. **Action:** Track institution signups separately in analytics. Build an "Institutions" dashboard card showing pending/verified/total. When you hit 20 verified institutions, that's the trigger to build the enterprise tier.

**14. Follow Notifications as Engagement Flywheel**
We just wired follower notifications into content creation. This creates a powerful flywheel: User A follows User B → User B posts an opportunity → User A gets notified → User A engages → User B sees traction → User B posts more. The key metric to watch is follow-to-notification-to-click-through rate. If people follow but ignore notifications, the notification copy needs work. If they click but don't engage, the content quality is the issue. **Action:** After launch, add a `clicked_at` column to notifications to measure CTR. Build a "Notification Performance" card in admin analytics.

**15. Celebration Emails as Retention Touchpoint**
Birthday and anniversary emails seem like a nice-to-have, but they're actually high-ROI retention touchpoints. They arrive when the user is NOT actively using the platform — exactly when churn risk is highest. A warm "Happy 1-year anniversary" email with a dashboard CTA pulls dormant users back in. The birthday email creates emotional connection with the brand. Nigerian culture values celebrations — this hits different here than it would in a Western SaaS context. **Action:** After launch, A/B test celebration emails with and without a small incentive (e.g., "Enjoy 20% off Pro this week — our birthday gift to you"). Measure reactivation rate.

**16. Support Tickets Need Careful Scoping**
We deferred the support ticket system to Phase 4. The token verification idea (email or SMS before rendering support) is smart for preventing impersonation but adds complexity. Consider: do you need a full ticket system at launch, or would a simple "Contact Support" form that creates a notification for admins suffice? The ticket system becomes essential at 500+ users; before that, Okoli is personally handling support anyway. **Action:** Build the simple version first (form → notification → admin queue). Add token verification and SLA tracking only when support volume exceeds what one person can manually track.

**17. Featured Marketplace Listings — The Marketplace Monetisation Seed**
Also deferred to Phase 4, but this is actually the easiest revenue feature after subscriptions. Farmers and agri-businesses already pay for visibility on WhatsApp groups and local noticeboards. A "Boost this listing for ₦500/week" button is immediately understood. The Paystack integration is already in place from subscriptions. The only new logic is auto-expiry of featured status, which is a cron job similar to what we already have. **Action:** When building this, consider a "Featured" badge + sort-to-top rather than a separate section. Users scrolling the marketplace should see featured listings naturally, not in a ghetto.

### 15 April 2026 (Session 2)

**18. Dynamic Settings Are a Schema Debt Trap**
We now have `commodity_categories`, `commodity_items`, `marketplace_categories`, `opportunity_types`, and various rate limits all stored as JSON strings in a flat key-value `settings` table. This works for now but has no validation — an admin can save malformed JSON and break frontend parsing silently. The `parseList()` helper we built today is a bandaid. Post-launch, consider a typed settings schema or at least a validation layer in `saveSettings()` that JSON.parse-checks all array/object fields before writing. **Action:** Add try/catch validation in `saveSettings()` before persisting. Log malformed values to admin audit log.

**19. Price Submit/Edit Pages Still Hardcoded**
While we made the price tracker *search* tabs dynamic from admin settings, the price submit form (`app/prices/submit/page.tsx`) and edit form (`app/prices/[id]/edit/page.tsx`) still use hardcoded `COMMODITIES` constant. This means if an admin adds a new commodity category in settings, users can *search* for it but can't *submit* reports for it. Quick fix — wire these forms to fetch from `/api/content-types` the same way the marketplace new/edit forms do. **Action:** Wire up in next session.

**20. Client-Side Sorting Has a Scale Ceiling**
All 6 sort dropdowns we added today sort in-memory on the client. This is fine now when data sets are small (hundreds of items). But the marketplace and price tracker could grow to thousands of listings. At ~2,000+ records, client-side sorting becomes visibly sluggish on mobile devices. The fix is server-side sorting with cursor pagination — but that's a bigger architectural change. **Action:** Monitor page load times on marketplace and prices. If either hits 1,000+ records, implement server-side sorting with `order()` + `limit()` in the Supabase query.

**21. Business Setup Guide as Onboarding Template**
The floating `BusinessSetupGuide` we built today is a reusable pattern. The same approach (form state → derived completion checks → floating progress widget) could be applied to: profile completion, first invoice creation, first marketplace listing, first price report. Each of these "first action" flows benefits from contextual tips and visible progress. **Action:** After launch, extract the guide into a generic `SetupGuide` component that accepts steps config. Apply to profile form first (it already has a completeness tracker but no floating UX).

### 17 April 2026

**22. Database Version Control Baseline**
Until today, roughly half the schema (all tables created via Supabase dashboard during rapid prototyping) was not in the migrations folder — only the changes made via SQL files during structured sessions. Today we generated a 1,500-line baseline snapshot of all 81 public tables from `information_schema.columns` and committed it as `00000000000000_baseline.sql`. It uses `CREATE TABLE IF NOT EXISTS` so it's idempotent — running it against the existing DB is a no-op. This restores the "infrastructure as code" discipline and means a fresh environment can now be bootstrapped from the repo. **Action:** Post-launch, set up a pre-merge check that fails if a schema change is made without a corresponding migration file. `supabase db diff` against the committed schema will flag drift.

**23. Invoice Totals Logic Should Live on the DB**
The delivery charge amendment made me realise: invoice totals are currently computed in 3 places — the new invoice page (calculates and inserts), the detail view (reads stored `total`), and the print page (falls back to local math). Every time we add a new cost bucket (discount, service fee, shipping insurance), we touch all three. A generated column on `invoices` — `total_amount GENERATED ALWAYS AS (subtotal + delivery_charge + vat_amount) STORED` — would eliminate drift risk and make the print page's fallback unnecessary. **Action:** Post-launch, migrate to a generated column once we're confident the formula is stable (watch for discount/credit-note scope changes first).

**24. VAT-Inclusive vs VAT-Exclusive Pricing**
Right now all invoices treat line items as pre-VAT and add VAT on top. Some Nigerian B2C businesses quote VAT-inclusive prices (the number on the shelf includes VAT). We don't support this, and if a user in that mode enters their selling price as the line item unit price, they'd be over-charging their customer. A per-business setting (`vat_pricing_mode: 'exclusive' | 'inclusive'`) with clear form labelling would close this gap. **Action:** Monitor support tickets for VAT confusion. Add the setting if it surfaces more than twice.

**25. Delivery Charge Opens the Door to a Logistics Module**
We now capture delivery on every invoice. Aggregate this across all businesses and suddenly we have logistics demand data — "₦2.3M in delivery fees moved through AgroYield invoices in April, 60% in Lagos, 20% Ogun, 15% Oyo." This could seed either (a) a marketplace for vetted logistics partners that businesses can one-click-hire, or (b) an AgroYield Logistics offering that plugs into a last-mile partner like Kwik or GIG Logistics for commission. Don't build now, but tag it as a strategic observation. **Action:** Post-launch, build a "Delivery Analytics" admin view showing aggregated delivery volume/value/geography. Use it to decide whether to pursue the logistics angle or monetise via partnerships.

### 17 April 2026 (Session 2 — Cron Hardening)

**26. Crons Are Now First-Class Operational Surface**
We closed the gap on what was arguably the most fragile part of the stack: six scheduled jobs running with no uniform logging, no idempotency protection, no kill switches, and three of them not even registered in Vercel's scheduler. After this session: all 6 crons are wrapped in the F2 harness (`runCron()` + `cron_runs` audit rows), all 6 are registered via the root `vercel.json`, and every one is toggle-able from `/admin` via the `settings` table pattern. The harness response shape is uniform, the idempotency keys prevent double-execution within a day/week, and every run — success, skip, or failure — writes a persisted row. **Why this matters strategically:** at launch we'll be running automated emails to real users' inboxes. A bug that double-sends a birthday email to 500 users is a trust event. Idempotency is no longer a "someday" problem.

**27. Admin Audit Log for Settings Saves**
The kill-switch round-trip test today worked end-to-end (toggle OFF in `/admin` → Save → DB persists `'false'` → cron returns skipped envelope). But during verification we had one transient mismatch where the DB showed `'true'` after a save attempt — resolved before becoming systemic. The episode points to a gap worth closing before launch: there's currently no audit record of *who changed what setting when*. At production scale, an admin could disable the digest cron or change pricing and we'd have no forensic trail. **Action:** Post-launch (or during Week 8 integration pass), add an admin audit log entry for every `settings` save showing `key, old_value, new_value, actor_id, changed_at`. Reuse the existing `audit_log` table. Low effort, high operational insurance.

**28. `cron_runs` is a Free Operational Dashboard**
The audit table we just started populating is rich enough to power an admin "Cron Health" card with zero new infrastructure. One SQL query against `cron_runs` returns: last run time per job, success rate last 30 days, median duration, skipped count, failure messages. Post-launch, exposing this in the admin dashboard turns "is the digest broken?" from a guess into a glance. **Action:** Build a tiny `CronHealthTab.tsx` under admin → Email section once we're within 2 weeks of launch. Uses `supabaseAdmin.from('cron_runs').select(...).order('started_at', {ascending: false}).limit(50)`.

**29. Idempotency Keys Expose a Re-Run Pattern Question**
The dailyKey/weeklyKey scheme we used means once a cron runs today, it physically cannot run again until tomorrow — even if an admin *wants* to re-run it (e.g. to re-send a digest after a bug fix, or re-try after a known outage). Today we had to `delete from cron_runs` manually to re-test. For production, we should add an admin "Re-run this job" button that (a) deletes today's row for that job, (b) POSTs to the cron route with a force flag, (c) audit-logs the manual re-run. **Action:** Build after launch, during the Week 8 integration pass. Low priority but saves Okoli from SQL when things break.

### 17 April 2026 (Session 3 — F1 Public Business URLs)

**30. Migrations Don't Ship — Only Code Does**
The `/b/ag-rentworks` 404 incident exposed a gap we've been living with since day one: Vercel deploys don't run Supabase migrations. Every `supabase/migrations/*.sql` file we commit is source-of-truth documentation, but nothing executes it against prod — the DB changes only when Okoli manually pastes the SQL into the Supabase SQL editor. Today that gap became a production outage: the F1 showcase migration had been merged to the repo, code shipped expecting the 8 new columns, but prod DB didn't have them. `resolveSlug()` destructures `{ data }` without checking `{ error }`, so the Supabase error was swallowed and the route returned `notFound()` silently. **Action (immediate):** After every merge that adds a migration, paste it into SQL editor before declaring the feature shipped. Treat code-deploy and schema-deploy as two steps. **Action (post-launch):** Add `supabase db push` as a GitHub Actions step gated on `supabase/migrations/**` path filter, or a Vercel pre-build hook. Kills this class of bug for good.

**31. Silent Error Swallowing Is a Reliability Smell**
`resolveSlug()` is not alone — the `const { data } = await supabase.from(...)` pattern (without pulling `error`) is probably littered across the codebase. Each instance is a silent 404, empty list, or "feature doesn't work" with no trace in logs. Sentry doesn't see it because it's not thrown. The only way to find out is via user report. **Action:** After launch, add an ESLint rule or grep audit that flags any `const { data }` destructure missing `error`, at minimum on server components and API routes. Second-best is a centralised `supabaseQuery()` wrapper that throws on `.error` — but that's a bigger refactor and has cost/benefit implications for `maybeSingle()` flows.

**32. The `/business/setup/complete` Split Makes the Product Feel Deeper**
F1 introduced a deliberate UX split: `/business/setup` for the essentials (legal name, logo, bank), `/business/setup/complete` for the showcase fields that aren't required for invoicing but make the public page sing (tagline, about, cover image, socials, hours, founded year). This two-step pattern — required first, enriching second — is how QuickBooks, Shopify, and Linear onboard. It lowers time-to-first-value (get to invoicing faster) while still pulling users deeper once they've converted. **Action:** Apply the same split pattern to profile completion post-launch: required identity fields in `/profile/setup`, enriching fields (bio, interests, socials, professional photos) in `/profile/setup/complete` with a similar progress indicator. Reuses the `PublicPageCard` mental model.

**33. Anon Nav Consistency Is a Trust Signal**
The `/b/[slug]` anon nav was originally built with a single `<Image>` tag at a different size than AppNav. A visitor landing on a public business page from search or WhatsApp would see a slightly-wrong logo — nothing they could articulate, but enough to feel like they'd stumbled onto a sub-site rather than AgroYield itself. Matching to AppNav's 3-image responsive pattern (mobile 44×44 icon, desktop 200×50 horizontal, dark-mode white variant) closes that gap. **Action:** Audit all non-AppNav logo instances before launch — 404 page, maintenance page, support token email templates, Paystack receipt landing pages. Anywhere a logo renders, it should follow the same 3-image pattern. Rough count from today's scan: 4–5 more places to audit.

**34. Production 404s Are Diagnostically Expensive**
Today's debug took ~45 minutes across multiple hypotheses (env vars, service role key, project ref, build cache) before arriving at the actual root cause (missing migration). The reason: the error surfaced as a generic `notFound()` render, with no log breadcrumb anywhere — Sentry didn't see it because nothing threw, Vercel runtime logs only show what actually ran, and the DB layer had no visibility into what was asking and failing. **Action:** Post-launch, add a `console.error('resolveSlug query failed', { slug, error })` in `resolveSlug()` (and every similar swallowing pattern). In production these flow to Vercel's function logs — next incident gets 45 minutes shorter. This is a pure observability upgrade, no product impact.

### 18 April 2026 (BD Collateral)

**35. Lender Outreach Collateral Ready — The Spec Sheet Is the Real Unlock**
Drafted the 6 lender letters (Carbon, FairMoney, Renmoney, LAPO, OPay, Moniepoint) and a one-page **AgroScore Technical Spec Sheet v1**. The letters alone are cold outreach — easily ignored. The spec sheet changes the dynamic: it signals that AgroScore is a real, specified, sub-sector-calibrated signal with a documented output schema and three defined integration patterns, not a pitch-deck abstraction. Any risk or partnerships lead reading it can immediately picture an API contract, a consent model, and a revenue-share commercial. That is what moves a cold email from "we'll circle back" to "let's talk". **Action:** Attach the spec sheet as a PDF to every one of the 6 outreach emails when they go out in Week 10. Before sending, research the named risk/partnerships lead at each institution (generic "Dear Sir/Madam" reduces reply rate materially) and stand up a `founder@agroyield.africa` alias so the From address matches the domain in the signature.

**36. Pre-Launch Credibility Requires Honest Language**
First draft of the letters said things like "anonymised sample", "anonymised distribution", and "NPL divergence over six months". All three misrepresent our actual position: we have no live-user data to anonymise yet (pre-launch), and six months is too short to observe true default patterns in poultry and aquaculture cycles. Corrected to "synthetic distribution" and "early-warning divergence over a full agri cycle (nine to twelve months)". A lender's risk team will read these documents with a sceptical eye — the first false claim kills the second meeting. **Rule going forward:** every claim in BD collateral is either (a) verifiable today, (b) explicitly marked as post-launch projection, or (c) cut. No in-between.

**37. Memory Hygiene Has Real-World Cost**
The founder signature in the first draft of the letters was "Chijiokei Okoli" — a straight inheritance from the gmail handle `okolichijiokei@`. It nearly went out under the wrong name. The fix was a one-line memory update ("Full name is Chijioke, NOT Chijiokei") but the near-miss is the lesson: every generated artefact that names the founder is a chance to repeat this error across a session boundary. **Action:** Before launch-week collateral (press release, founder LinkedIn post, waitlist email, Paystack receipt footer), grep every draft for the exact string "Chijiokei" and treat any hit as a blocker. Same rule for the domain "agroyield.africa" (not `.com` or `.ng`).

### 18 April 2026 (Session 2 — Verification Pass)

**38. Doc Drift Is Silent Until You Grep the Code**
Tonight's verification pass surfaced three stale claims across UNICORN_SPRINT.md and ROADMAP.md that a casual read would have carried into a wrong next-action plan. (a) UNICORN_SPRINT.md line 123 said "F3 (feature_flags) still pending" — but `supabase/migrations/20260417_feature_flags.sql` and `lib/feature-flags.ts` have been in the repo since 17 Apr. (b) Week 1 Wed–Fri #1 Weekly Digest block carried no shipped marker despite `app/api/cron/weekly-digest/route.ts` being 879 lines of Unicorn #1 implementation. (c) ROADMAP.md Phase 4.10 "Delivered" list claimed `/b/[slug]` renders a "verified badge" — the code has no such element, and `businesses` has no `is_verified` column at all. The pattern: Session 3 closing notes were written with optimistic intent, and the next session inherited them as facts. **Action:** Treat every "Delivered" bullet in a Phase completion note as a claim that must be grep-verifiable against the filesystem before carrying forward. Any Phase completion write-up should end with a 3-line self-check: "grep confirmed routes/tables/columns exist: [list]". Cheaper than discovering drift in a session that actually matters.

**39. Phase 4.5 Re-verification Is a Free Canary**
Tonight's re-apply exercise was originally framed as "the previous session's mount was broken, re-run the edits". The actual finding: the workspace was fine, every Phase 4.5 edit had in fact landed, and `npx tsc --noEmit` came back clean. Took ~10 minutes of read-only checks to confirm. **Observation:** A misbehaving mount that gets reported as "nothing shipped" would be catastrophic the session after a complex migration. **Action (operational):** Any session that opens with "re-apply last session's work" should start with a 60-second read-only audit (grep for key imports / hit key functions / read the known-target files) before any edits. If the code is already in place, the session pivots to doc reconciliation and next-phase scoping. Cost: minute a session. Saves: entire sessions of phantom edits to a workspace that's actually fine.

**41. JSON-LD Introduces First `dangerouslySetInnerHTML` — Acceptable But Worth Noting**
The LocalBusiness structured data block on `/b/[slug]` uses `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript }} />`. This is the codebase's first `dangerouslySetInnerHTML` — Phase 4.5 audit had explicitly noted zero uses and therefore no DOMPurify requirement. The pattern is unavoidable for inline JSON-LD (the standard Next.js approach per official docs), and the injection is safe because: (a) the payload is a deterministic `JSON.stringify` output, not user HTML; (b) every source field is already sanitised at the API boundary via `lib/sanitise.ts`; (c) `<` characters are pre-escaped to `\u003c` which prevents any `</script>` breakout while still producing valid JSON. **Action:** If a second `dangerouslySetInnerHTML` use ever lands (analytics pixels, breadcrumb JSON-LD, etc.), introduce a `<JsonLd>` wrapper component that enforces the escaping pattern once, rather than re-inlining the escape at each call site. Low priority — single use today, wrapper is premature.

**40. #2 Public Business Pages — Four Gaps, Known Effort**
The 18 Apr audit mapped #2 to a clean five-shipped / four-pending split. Shipped: `/b/[slug]` landing page, products list, Open Graph + canonical, sitemap.ts, robots.ts. Pending: verified badge (needs `is_verified` column on `businesses` + admin toggle, ~1 hr), business-level reviews (no `business_reviews` table exists — `product_reviews` is product-scoped, ~3 hr), Follow CTA for logged-out visitors (current footer is generic signup wedge — needs `?intent=follow&biz={slug}` threading OR extend `FollowButton` to accept a business's owner `user_id`, ~30 min), LocalBusiness JSON-LD (~30 min additive). **Sequencing observation:** JSON-LD first, Follow CTA second, verified badge third, reviews last. Rationale: JSON-LD is pure SEO, no UX risk. Follow CTA is a conversion wedge — higher-impact than the badge. Verified badge is a schema change with admin flow, deserves its own deploy. Reviews touch write-flow + RLS + read UI and need moderation thinking (self-reviews, dispute flow, published/unpublished toggle) — properly a half-day minimum.

### 18 April 2026 (Session 3 — Verified Badge + Business Reviews)

**42. Self-Review Blocking Needs Both RLS and API — Defence in Depth Pays**
Tonight's `business_reviews` migration enforces the "no reviewing your own business" rule at two layers: the RLS INSERT WITH CHECK excludes businesses owned by `auth.uid()`, and `/api/business-reviews` POST does an explicit lookup against `businesses.user_id` before calling insert. At first glance this looks redundant — RLS alone would block the write. In practice the double-check earns its keep because: (a) the service-role admin client bypasses RLS, and the API route uses exactly that client to get better error messages (unique-violation 23505 becomes a friendly "edit your existing review instead" 409 instead of RLS's opaque 403). Without the API-layer check, a code path that ran under the admin client could silently allow self-reviews. (b) Per scratchpad #31, error destructuring mistakes have silently produced 404s in production before — the explicit check is a canary. **Action:** Any route that bypasses RLS via the admin client for UX reasons should restate the ownership / authorisation rule in TypeScript immediately above the insert/update call. Treat RLS policies as schema-level invariants, not as the only line of defence when the route itself uses the service role.

**43. `business_reviews` Uses `published`, Everything Else Uses `is_active` — Branch the Moderation Plumbing**
The new `business_reviews` table mirrors the pre-existing `product_reviews` schema, which uses a `published boolean DEFAULT true` column for moderation — not the `is_active` pattern used by opportunities, marketplace_listings, research_posts, and price_reports. This surfaced in three places that needed a second branch: the `/api/report` POST auto-hide-on-threshold logic, the `/api/admin/reports` DELETE restore path (which had an existing silent bug where `research` and `price_report` restores would hit `marketplace_listings` instead of their correct tables — now fixed), and the admin Reports-tab `isActive` status pill (normalised to the same field in the grouper so the UI doesn't need to know about the two flavours). **Observation:** The path of least resistance was to rename the column to `is_active`, which would have kept everything uniform. I chose to keep `published` because (a) product_reviews already uses it and diverging reviews tables would hurt future rollups and (b) `published` semantically fits reviews better — "hidden" is weird when the creator still sees their own row. **Action:** Next time a new content type is added, decide moderation-column naming before writing the migration, and keep a one-line map in `lib/` (e.g. `MODERATION_COLUMN_BY_POST_TYPE`) so the branching in `/api/report` and `/api/admin/reports` is data-driven rather than hand-branched. Future post types (business_products reviews, mentor-session reviews, grant applications) will hit the same fork.

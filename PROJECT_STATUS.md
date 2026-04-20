# AgroYield Network — Project Status

> **Last updated:** 20 April 2026 (Checkpoint 38)
> **Maintained by:** Okoli (okolichijiokei@gmail.com)
> **Launch Target:** 5 July 2026 (~11 weeks remaining)
> **Purpose:** Permanent reference for any developer or Claude session to get up to speed instantly.

---

## Tech Stack

| Layer           | Technology                             | Notes                                               |
| --------------- | -------------------------------------- | --------------------------------------------------- |
| Frontend        | Next.js 16.2, React 19, Tailwind CSS 4 | App Router, TypeScript, `next-themes` for dark mode |
| Database & Auth | Supabase                               | PostgreSQL, Row Level Security, email + OAuth auth  |
| Deployment      | Vercel                                 | Preview deploys on every push                       |
| Email           | Resend                                 | Sender domain: `agroyield.africa`                   |
| Payments        | Paystack                               | NGN currency, 3-tier subscriptions (free/pro/growth) |
| Version Control | GitHub + GitHub Desktop                | macOS local development                             |

**Environment variables:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`

---

## Feature Completion Status

### Authentication

| Feature                        | Status     | Location                                                                      |
| ------------------------------ | ---------- | ----------------------------------------------------------------------------- |
| Email + password sign-up       | ✅ Done    | `app/signup/page.tsx`                                                         |
| Email + password sign-in       | ✅ Done    | `app/login/page.tsx`                                                          |
| Google OAuth                   | ✅ Done    | Login + signup pages, callback at `app/auth/callback/route.ts`                |
| LinkedIn OAuth                 | ✅ Done    | `app/login/page.tsx`, `app/signup/page.tsx` — provider: `linkedin_oidc`       |
| Facebook OAuth                 | ⏸️ Blocked | Button added to login/signup pages, but Meta Business Verification incomplete |
| Welcome email on first login   | ✅ Done    | Sent via Resend in `app/auth/callback/route.ts`                               |
| Registration open/close toggle | ✅ Done    | Controlled via `settings` table                                               |
| Forgot password                | ✅ Done    | `app/forgot-password/page.tsx`, `app/api/auth/reset-password/route.ts`        |
| Password reset                 | ✅ Done    | `app/reset-password/page.tsx`                                                 |
| New-device login email alerts  | ✅ Done    | `lib/auth/login-notification.ts`, `login_history` table, `security@` sender   |
| Individual/Institution signup toggle | ✅ Done | `app/signup/page.tsx` — `account_type` saved to profile via auth callback     |

### Module 1 — Member Directory

| Feature                                                   | Status  | Location                                                     |
| --------------------------------------------------------- | ------- | ------------------------------------------------------------ |
| Browse members with filters (role, interests, location, institution) | ✅ Done | `app/directory/directory-client.tsx` — 37 Nigerian states dropdown |
| Individual member profile view                            | ✅ Done | `app/directory/[id]/page.tsx`                                |
| Follow / unfollow                                         | ✅ Done | `app/directory/follow-button.tsx`, `app/api/follow/route.ts` |
| Public profile via username slug                          | ✅ Done | `app/u/[slug]/page.tsx`                                      |
| Shareable profile link                                    | ✅ Done | `app/profile/share-profile-link.tsx`                         |
| Institution profiles with admin verification              | ✅ Done | `app/profile/profile-form.tsx` — conditional form, `InstitutionGateBanner.tsx`, admin verification workflow |
| Institution badges + filter in directory                  | ✅ Done | `app/directory/directory-client.tsx` — institution type badges, verified badges, "Institution" role filter |
| Profile completeness tracker (13 fields)                  | ✅ Done | `app/profile/profile-form.tsx`                               |
| Avatar upload to Supabase Storage                         | ✅ Done | `app/profile/profile-form.tsx`                               |
| Experience section (CRUD timeline with duration math)     | ✅ Done | `lib/profile-experience.ts`, `app/components/ExperienceList.tsx`, `app/profile/experience-editor.tsx`, `app/api/profile/experience/route.ts`, migration `20260420_profile_experience.sql` |
| Profile view count + recent viewers (Pro)                 | ✅ Done | `lib/profile-views.ts`, `app/profile/profile-view-stats-panel.tsx`, migration `20260420_profile_views.sql` — view tracked on /directory/[id] + /u/[slug] server renders |
| Open to Opportunities toggle + notify-on-match            | ✅ Done | `app/profile/open-to-opportunities-toggle.tsx`, `lib/notify-open-to-opportunities.ts`, migration `20260420_open_to_opportunities.sql` |
| Global site search (5-surface, pg_trgm, palette + page)   | ✅ Done | `lib/global-search.ts`, `app/api/search/route.ts`, `app/search/page.tsx`, `app/components/GlobalSearchBar.tsx`, migration `20260420_global_search_trgm.sql` |
| Saves (opportunities, marketplace listings, grants) + `/saved` hub | ✅ Done | `app/api/saves/route.ts`, `app/saved/page.tsx`, migration `20260420_saves.sql` |

### Module 2 — Opportunities

| Feature                                                          | Status  | Location                                  |
| ---------------------------------------------------------------- | ------- | ----------------------------------------- |
| List opportunities (jobs, internships, partnerships, training)   | ✅ Done | `app/opportunities/`                      |
| Create / edit / close opportunity                                | ✅ Done | `app/opportunities/new/`, `[id]/edit/`    |
| Thumbnail image upload on create/edit                            | ✅ Done | `ImageUploader` component                 |
| Search + type filter on listing page                             | ✅ Done | `app/opportunities/opportunities-client.tsx` |
| Sort dropdown (newest/oldest/deadline)                           | ✅ Done | `app/opportunities/opportunities-client.tsx` — client-side sort |
| Apply to opportunity                                             | ✅ Done | `app/opportunities/[id]/apply-button.tsx` |
| Rate limiting (configurable per 24h)                             | ✅ Done | Via `settings` table (`opportunity_daily_limit`) |
| Moderation modes (immediate / approval)                          | ✅ Done | Admin configurable                        |
| Comments                                                         | ✅ Done | `CommentsSection.tsx`                     |
| Back navigation on all sub-pages                                 | ✅ Done | `BackButton` on new + edit pages          |

### Module 3 — Price Tracker

| Feature                                                    | Status  | Location                                                                                                  |
| ---------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------- |
| View commodity prices (filter by commodity, state, market) | ✅ Done | `app/prices/`                                                                                             |
| Submit a price report                                      | ✅ Done | `app/prices/submit/page.tsx`                                                                              |
| Edit price report                                          | ✅ Done | `app/prices/[id]/edit/page.tsx`                                                                           |
| Price alerts with notifications                            | ✅ Done | `app/prices/price-intelligence.tsx` — create/delete alerts; triggers in-app notification when a matching price report is submitted |
| Price trend charts                                         | ✅ Done | Recharts LineChart (avg/min/max) with commodity + state selectors                                         |
| Cross-state comparison                                     | ✅ Done | Horizontal BarChart with auto-generated insights                                                          |
| Poster attribution on cards                                | ✅ Done | Each price card shows poster name, avatar, and link to profile                                            |
| Sort dropdown (newest/oldest/price low/high)               | ✅ Done | `app/prices/prices-client.tsx` — client-side sort by `reported_at` or `price`                             |
| Dynamic category tabs from admin settings                  | ✅ Done | `app/prices/page.tsx` fetches `commodity_categories` via `getSettings()`, passes to client as prop        |

### Module 4 — Marketplace

| Feature                             | Status  | Location                             |
| ----------------------------------- | ------- | ------------------------------------ |
| Browse listings with filters        | ✅ Done | `app/marketplace/`                   |
| Create / edit / close listing       | ✅ Done | `app/marketplace/new/`, `[id]/edit/` — image upload/removal on both forms |
| Listing detail with contact actions | ✅ Done | `app/marketplace/[id]/page.tsx`      |
| Rate limiting                       | ✅ Done | Via `settings` table (`listing_daily_limit`) |
| Admin moderation                    | ✅ Done | `app/api/admin/listing/route.ts`     |
| Sort dropdown (newest/oldest/price low/high) | ✅ Done | `app/marketplace/marketplace-client.tsx` — client-side sort |
| Equipment condition filter (New/Used) | ✅ Done | `app/marketplace/marketplace-client.tsx` — filter pills shown when Equipment selected, auto-reset on category change |
| Back navigation on all sub-pages    | ✅ Done | `BackButton` on new + edit, `<Link>` on detail |

### Module 5 — Research Board

| Feature                                                   | Status  | Location                           |
| --------------------------------------------------------- | ------- | ---------------------------------- |
| Browse research posts (papers, questions, collaborations) | ✅ Done | `app/research/`                    |
| Create / edit research post                               | ✅ Done | `app/research/new/`, `[id]/edit/`  |
| Tags and type filtering                                   | ✅ Done | `app/research/research-client.tsx` |
| Sort dropdown (newest/oldest)                             | ✅ Done | `app/research/research-client.tsx` — client-side sort |
| Admin moderation (lock/unlock, activate/deactivate)       | ✅ Done | `app/api/admin/`                   |
| Back navigation on all sub-pages                          | ✅ Done | `BackButton` on new + edit pages   |

### Module 6 — Business Suite

| Feature                                                              | Status  | Location                                                                         |
| -------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------- |
| Business profile setup (name, logo, address, phone, alt phone, WhatsApp, bank details) | ✅ Done | `app/business/setup/page.tsx`                                      |
| Floating business setup guide (5-step checklist)                                       | ✅ Done | `app/business/setup/BusinessSetupGuide.tsx` — circular progress ring, contextual tips, completion celebration |
| Product catalogue with stock tracking                                | ✅ Done | `app/business/products/page.tsx`                                                 |
| Customer management                                                  | ✅ Done | `app/business/customers/page.tsx`                                                |
| Customer statement generation + print                                | ✅ Done | `app/business/customers/[id]/statement/`                                         |
| Invoice creation (invoice/receipt/proforma/delivery note)            | ✅ Done | `app/business/invoices/new/page.tsx`                                             |
| Invoice line items with product lookup + stock warnings              | ✅ Done | Stock availability indicator, amber warnings                                     |
| Invoice status workflow (draft → sent → paid / overdue)              | ✅ Done | `app/business/invoices/[id]/InvoiceActions.tsx`                                  |
| Invoice print layout                                                 | ✅ Done | `app/invoice-print/[id]/`                                                        |
| Record payment against invoice                                       | ✅ Done | `RecordPaymentButton.tsx`                                                        |
| VAT/tax toggle with customisable percentage                          | ✅ Done | Default 7.5% (Nigeria)                                                           |
| Invoice delivery / logistics charge (VAT applied on subtotal + delivery) | ✅ Done | `app/business/invoices/new/page.tsx`, `[id]/page.tsx`, print page                |
| Peer benchmarking on Business dashboard (profit margin, expense ratio, collection rate, revenue) | ✅ Done | `app/business/BenchmarkCard.tsx`, `app/api/business/benchmarks/route.ts` — medians, graceful degradation |
| Sector / state / business size classification                        | ✅ Done | `app/business/setup/page.tsx` — 10 agri sectors, 36 states + FCT, 4 size brackets |
| Auto-increment invoice numbering                                     | ✅ Done |                                                                                  |
| Stock deduction on invoice send                                      | ✅ Done | Creates stock_movements records                                                  |
| Stock restoration on invoice cancel/delete                           | ✅ Done | Reverse stock_movements                                                          |
| Expense tracking by category                                         | ✅ Done | `app/business/expenses/page.tsx`                                                 |
| Expense spread (annual rent over N months)                           | ✅ Done | Presets: 3/6/12/custom months, rounding handled                                  |
| Fixed asset register                                                 | ✅ Done | `app/business/assets/page.tsx` — 4 categories, conditions, status lifecycle      |
| Financial reports (P&L, inventory valuation, top products/customers) | ✅ Done | `app/business/reports/page.tsx`                                                  |
| Report Excel export                                                  | ✅ Done | `app/business/reports/ReportExport.tsx`                                          |
| Report print layout                                                  | ✅ Done | `app/business/reports/print/`                                                    |
| Business Health Score (5-factor, green/amber/red)                    | ✅ Done | `app/business/page.tsx`                                                          |
| Low stock alerts on dashboard                                        | ✅ Done | Amber alert card                                                                 |
| Period filtering (month / quarter / year / all)                      | ✅ Done | `PeriodToggle.tsx`                                                               |
| Onboarding checklist (4 steps)                                       | ✅ Done | `app/business/page.tsx`                                                          |
| Team Access — invite by email                                        | ✅ Done | `app/business/team/page.tsx`, `app/api/business/invite/route.ts`                 |
| Team Access — accept invite flow                                     | ✅ Done | `app/business/accept-invite/page.tsx`, `app/api/business/accept-invite/route.ts` |
| Team Access — role management (owner/accountant/staff)               | ✅ Done | Revoke, resend, change role                                                      |
| Dark mode across all business pages                                  | ✅ Done | Including forms (globals.css fix)                                                |

### Module 7 — Mentorship

| Feature                                              | Status  | Location                                                        |
| ---------------------------------------------------- | ------- | --------------------------------------------------------------- |
| Browse mentors with expertise + availability filters | ✅ Done | `app/mentorship/mentor-browser.tsx`                             |
| Sort dropdown (newest/oldest)                        | ✅ Done | `app/mentorship/mentor-browser.tsx` — client-side sort          |
| Mentor profile creation/editing                      | ✅ Done | `app/mentorship/become-mentor/page.tsx`                         |
| Request workflow (send/accept/decline/withdraw)      | ✅ Done | `app/mentorship/[id]/mentor-detail.tsx`, `app/mentorship/sessions/page.tsx` |
| Session scheduling (date, duration, format, link)    | ✅ Done | `app/mentorship/sessions/page.tsx` — mentor schedules, both parties see details |
| Mark completed / cancel session                      | ✅ Done | `app/mentorship/sessions/page.tsx` — cascades to request status |
| Star ratings + reviews after sessions                | ✅ Done | `app/mentorship/sessions/page.tsx` — both parties review independently |
| LinkedIn auto-populate from profile                  | ✅ Done | Fetches profile LinkedIn on mentor form load                    |
| Availability enum (Open/Limited/Waitlist/Closed)     | ✅ Done | Custom PostgreSQL enum `mentor_availability`                    |
| Status transition enforcement (DB trigger)           | ✅ Done | `enforce_mentorship_request_transition()` — blocks illegal state changes |
| Party-scoped RLS on sessions                         | ✅ Done | SELECT restricted to mentor + mentee via `mentorship_requests` join |
| Notification deduplication                           | ✅ Done | Removed client-side API notify; DB trigger `on_mentorship_request()` is single source |
| Notification link fix                                | ✅ Done | Updated trigger from legacy `/agroyield-mentorship.html` to `/mentorship/sessions` |

### Module 8 — Grant Tracker

| Feature                                        | Status  | Location                                         |
| ---------------------------------------------- | ------- | ------------------------------------------------ |
| Browse grants with category + status filters   | ✅ Done | `app/grants/grants-client.tsx`                   |
| Sort dropdown (featured/deadline/newest/oldest) | ✅ Done | `app/grants/grants-client.tsx` — Featured sort pins featured grants first |
| Admin grant posting with thumbnail             | ✅ Done | `app/grants/post/page.tsx` — `ImageUploader`     |
| Thumbnail displayed on listing cards           | ✅ Done | `app/grants/grants-client.tsx`                   |
| Application tracker (status pipeline)          | ✅ Done | `app/grants/[id]/grant-detail.tsx`               |
| Document checklist (6 defaults + custom)       | ✅ Done | `app/grants/[id]/grant-detail.tsx`               |
| Auto-populate profile info                     | ✅ Done | Pulls name, email, institution, LinkedIn         |
| My Applications dashboard with stats           | ✅ Done | `app/grants/my-applications/page.tsx`            |
| Deadline reminder notifications                | ✅ Done | `app/api/grants/deadline-reminders/route.ts`     |
| How-to-use guide                               | ✅ Done | Green info box on grant detail page              |
| Admin management (feature/close toggle)        | ✅ Done | Admin dashboard Grants tab, `/api/admin/grant`   |
| Back navigation on detail page                 | ✅ Done | `<Link>` back to `/grants`                       |

### Module 9 — Community Feed

| Feature                                                              | Status  | Location                                             |
| -------------------------------------------------------------------- | ------- | ---------------------------------------------------- |
| Post creation (5 types: discussion, question, poll, news, milestone) | ✅ Done | `app/community/community-client.tsx`                 |
| Post type filtering                                                  | ✅ Done | `app/community/community-client.tsx`                 |
| Repost with optional caption (embedded original card)                | ✅ Done | `app/community/community-client.tsx` — self-repost prevented, repost-of-repost flattened to original |
| Poll voting with results                                             | ✅ Done | `app/api/community/vote/route.ts`                    |
| Like toggle (reuses existing like system)                            | ✅ Done | `app/community/community-client.tsx`                 |
| Comments on posts                                                    | ✅ Done | `app/community/[id]/page.tsx` + CommentsSection      |
| Post detail page                                                     | ✅ Done | `app/community/[id]/page.tsx`                        |
| Pinned post support                                                  | ✅ Done | `is_pinned` column, sorted to top                    |
| Image attachment on posts                                            | ✅ Done | `ImageUploader` in `community-client.tsx`, stored in `community-images` bucket |
| Delete own posts (soft delete)                                       | ✅ Done | Sets `is_active = false`                             |
| Loading + error boundaries                                           | ✅ Done | `app/community/loading.tsx`, `error.tsx`             |

### Module 10 — Direct Messages

| Feature                                                | Status  | Location                                                          |
| ------------------------------------------------------ | ------- | ----------------------------------------------------------------- |
| Conversations inbox with search                        | ✅ Done | `app/messages/page.tsx`, `app/messages/messages-inbox.tsx`        |
| Chat thread with message bubbles and date separators   | ✅ Done | `app/messages/[id]/message-thread.tsx`                            |
| Read receipts (✓ sent, ✓✓ read)                       | ✅ Done | `app/messages/[id]/message-thread.tsx`                            |
| Optimistic sends with rollback on error                | ✅ Done | `app/messages/[id]/message-thread.tsx`                            |
| 5-second polling for new messages                      | ✅ Done | `app/api/messages/poll/route.ts`                                  |
| Mark messages as read (server + client)                | ✅ Done | `app/api/messages/read/route.ts`                                  |
| MessageButton on Directory, Marketplace, Mentorship    | ✅ Done | `app/components/MessageButton.tsx`                                |
| Messages icon with unread badge in NavBar              | ✅ Done | `app/components/AppNav.tsx` — 30s polling for count               |
| Inbox search (filter by name + message preview)        | ✅ Done | `app/messages/messages-inbox.tsx`                                 |
| Service role client for cross-user operations          | ✅ Done | `app/api/messages/route.ts`, `app/api/messages/send/route.ts`    |
| Loading + error boundaries                             | ✅ Done | `app/messages/loading.tsx`, `app/messages/error.tsx`              |

### Platform Features

| Feature                                  | Status  | Location                                                                                           |
| ---------------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| Notifications system                     | ✅ Done | `NotificationBell.tsx` in AppNav, `lib/notifications.ts`, triggers on follow/invite/accept/comment |
| Onboarding wizard                        | ✅ Done | `OnboardingWizard.tsx` — 3-step modal after first login, `has_onboarded` flag on profiles          |
| Loading boundaries                       | ✅ Done | `loading.tsx` for business, profile, pricing, admin route groups                                   |
| Error boundaries                         | ✅ Done | `ErrorBoundary.tsx` shared component + `error.tsx` for 8 route groups                              |
| Invoice PDF & sharing                    | ✅ Done | `InvoiceShareActions.tsx` — PDF download (html2canvas + jsPDF), WhatsApp share, email share        |
| Expenses search & sort                   | ✅ Done | Search bar + column sorting (date, amount) on `app/business/expenses/page.tsx`                     |
| PWA / offline capability                 | ✅ Done | `@ducanh2912/next-pwa`, web manifest, service worker, install-to-home-screen                       |
| API rate limiting                        | ✅ Done | `lib/rate-limit.ts` — IP-based limiter on 10 routes (3–30 req/min per route)                       |
| Dark / light theme                       | ✅ Done | `ThemeProvider.tsx`, `ThemeToggle.tsx`, `SidebarThemeToggle.tsx`                                   |
| SEO (OpenGraph, Twitter cards, metadata) | ✅ Done | `app/layout.tsx`, per-page metadata                                                                |
| Mobile responsive navigation             | ✅ Done | `AppNav.tsx` (desktop), `MobileNav.tsx` (business mobile bottom nav)                               |
| Cross-module search                      | ✅ Done | `app/api/search/route.ts`                                                                          |
| Like system                              | ✅ Done | `LikeButton.tsx`, `app/api/like/route.ts`                                                          |
| Comments                                 | ✅ Done | `CommentsSection.tsx`                                                                              |
| Content reporting                        | ✅ Done | `ReportButton.tsx`, `app/api/report/route.ts`                                                      |
| Subscription tiers (free/pro/growth)     | ✅ Done | `lib/tiers.ts`, `app/pricing/`, `app/api/tier/check/`, `app/api/payment/initiate/` — 30-day free trial, Paystack one-time billing |
| Tier limit enforcement                   | ✅ Done | Server-side `/api/tier/check` + `UpgradePrompt.tsx` on invoice creation, business setup, team invites |
| Tier badges on profiles                  | ✅ Done | Pro (green ✓) and Growth (gold ⭐) badges on directory, profile pages, admin dashboard             |
| Tier-aware admin controls                | ✅ Done | Tier dropdown (free/pro/growth) replaces old Verify/Elite buttons, 4 pricing settings + free trial days |
| /verify → /pricing redirect              | ✅ Done | `app/verify/page.tsx` — server redirect to pricing page                                            |
| Poll closing date                        | ✅ Done | `poll_closes_at` on community_posts, date picker in form, API enforcement, auto-reveal results     |
| Announcement banner                      | ✅ Done | `AnnouncementBanner.tsx`                                                                           |
| Registration open/close toggle           | ✅ Done | Admin settings                                                                                     |
| Weekly email digest                      | ✅ Done | `app/api/cron/weekly-digest/route.ts` — F2-wrapped, `weeklyKey()` idempotency, kill switch `digest_enabled` |
| Subscription expiry cron                 | ✅ Done | `app/api/cron/expire-subscriptions/route.ts` — F2-wrapped, `dailyKey()` idempotency               |
| Expiry reminder emails                   | ✅ Done | `app/api/cron/expiry-reminder/route.ts` — F2-wrapped, `dailyKey()`, kill switch `expiry_reminder_enabled` |
| Birthday + anniversary celebration emails | ✅ Done | `app/api/cron/celebrations/route.ts` — F2-wrapped, `dailyKey()`, kill switch `celebrations_enabled`, `SENDERS.hello`, rich HTML |
| Featured listing expiry cron             | ✅ Done | `app/api/cron/expire-featured/route.ts` — F2-wrapped, `dailyKey()`, kill switch `expire_featured_enabled` |
| Shared cron harness (F2)                 | ✅ Done | `lib/cron/index.ts` — `runCron()` + `startRun/finishRun` logger + `dailyKey`/`weeklyKey` idempotency + `verifyCronAuth` |
| Cron audit log                           | ✅ Done | `cron_runs` table — id, job_name, idempotency_key, status, started/finished, duration, counts, metadata |
| Cron kill-switch admin UI                | ✅ Done | `app/admin/admin-client.tsx` — Email section toggles for celebrations/expiry-reminder/expire-featured/digest |
| Root Vercel cron scheduler               | ✅ Done | `/vercel.json` — 6 cron entries registered (digest, business-digest, expire-subs, expiry-reminder, celebrations, expire-featured) |
| Follow notifications on new content      | ✅ Done | `lib/notify-followers.ts` — notifies followers when user posts opportunities, listings, or research |
| Multi-email report alerts                | ✅ Done | Admin settings accepts comma-separated emails; `app/api/report/route.ts` sends to all              |
| Multi-business admin preview             | ✅ Done | Admin panel shows ALL businesses per member, labelled when multiple exist                           |
| UpgradePrompt redesign                   | ✅ Done | Gradient background, benefit pills, color-coded progress bar, gradient CTA                         |
| Institution posting gate                 | ✅ Done | `InstitutionGateBanner.tsx` on opportunities/marketplace/research/grants creation pages             |
| Admin Institutions tab                   | ✅ Done | `admin-client.tsx` — pending/verified sections, verify button, institution count                    |
| Admin commodity categories + items       | ✅ Done | `admin-client.tsx` — JSON-stored `commodity_categories` array + `commodity_items` nested record in settings, per-category pill management |
| Admin member Excel export (32 columns)   | ✅ Done | `admin-client.tsx` — expanded from 8 to 32 columns (phone, socials, institution, bio, DOB, etc.)   |
| Content-types API parseList fix          | ✅ Done | `app/api/content-types/route.ts` — `parseList()` tries JSON.parse then comma-split fallback        |
| Data deletion page                       | ✅ Done | `app/data-deletion/page.tsx`                                                                       |
| History-aware back button                | ✅ Done | `app/components/BackButton.tsx` — used on all sub-pages (directory, opportunities, marketplace, research, grants, public profiles) |
| Admin search/filter on all tabs          | ✅ Done | Search bars + status filter pills on Opportunities, Marketplace, Members, Grants, Reports tabs     |
| Admin Grants management tab              | ✅ Done | Feature/close toggle, status filters, search — `app/api/admin/grant/route.ts`                      |
| Multi-business support (feature-flagged) | ✅ Done | `BusinessSwitcher.tsx`, cookie persistence, `?new=true` flow, gated by `allow_multi_business`      |
| Clickable follower/following counts      | ✅ Done | `app/directory/[id]/page.tsx`, `app/u/[slug]/page.tsx`                                             |
| Branded 404 page with logo               | ✅ Done | `app/not-found.tsx` — updated from emoji to `/logo-horizontal-white.png`                           |
| Footer-linked pages theme-aware logos    | ✅ Done | About, Contact, Privacy, Terms — dual light/dark brand assets synced to theme toggle               |
| Waitlist member count on Admin Dashboard | ✅ Done | `app/admin/page.tsx` — service-role count on `waitlist_signups`, 5-column responsive stats grid    |
| Dashboard loading skeleton (9 cards)     | ✅ Done | `app/dashboard/loading.tsx` — matches 3×3 module grid                                              |
| Centralised email senders                | ✅ Done | `lib/email/senders.ts` — SENDERS / INBOXES with env-var overrides (`RESEND_FROM_*`, `CONTACT_INBOX`) |
| Lazy Resend client                       | ✅ Done | `lib/email/client.ts` — `getResend()` to avoid Next.js 16 build-time module-eval crash             |
| Lazy Supabase clients                    | ✅ Done | `lib/supabase/admin.ts` — `getSupabaseAdmin()` / `getSupabaseAnon()` for the same reason           |
| Maintenance mode                         | ✅ Done | Middleware redirect for non-admin users, branded `/maintenance` page, admin bypass, toggle in settings |
| Admin settings panel (8 operational controls) | ✅ Done | Mentorship toggle, digest toggle, maintenance mode, community/research daily limits, mentorship verification gate, 4 tier prices (pro/growth × monthly/annual), free trial duration, subscription grace period |
| Admin settings UI (grouped accordion)    | ✅ Done | 6 collapsible sections with status badges on collapsed headers, red highlight for active maintenance |
| Server-side settings helper              | ✅ Done | `lib/settings.ts` — `getSetting()` / `getSettings()` using admin client to bypass RLS             |
| Community daily post rate limit          | ✅ Done | Client-side check against `community_daily_limit` setting before insert                            |
| Research daily post rate limit           | ✅ Done | Server-side check in `app/api/research/route.ts` against `research_daily_limit` setting            |
| Mentorship subscription gate             | ✅ Done | Both `/mentorship` (server) and `/mentorship/become-mentor` (client) check `subscription_tier` — free users see upgrade prompt linking to `/pricing` |
| Weekly digest admin toggle               | ✅ Done | Cron early-exits when `digest_enabled` is `false` in settings                                      |
| Consistent logo sizing                   | ✅ Done | AppNav 200×50 (desktop), 44×44 (mobile). Signup matched to login/reset (nav 58px, card 120px). `/b/[slug]` anon nav now matches AppNav (3-image responsive pattern + dark-mode variant) |
| Public business pages (`/b/[slug]`)      | ✅ Done | `app/b/[slug]/page.tsx` — server route, `resolveSlug()` live → alias → 404, admin client for public fields, 8 showcase columns rendered (tagline, about, cover image, socials, opening hours, founded year) |
| Business slug aliases                    | ✅ Done | `business_slug_aliases` table — `old_slug` → `business_id` redirect map, 301 permanent redirect path in `resolveSlug()` |
| Business showcase edit UI                | ✅ Done | `/business/setup/complete` + `PublicPageCard` — in-place edit for tagline, about, cover image, website, socials, hours, founded year. Cover image uploads to `business-logos` bucket |

---

## Known Issues & Technical Debt (as of April 14, 2026)

### Resolved (Checkpoint 3)

1. ~~**Team Access RLS gap**~~ — ✅ Fixed. `getBusinessAccess()` helper in `lib/business-access.ts`. All 12+ business files updated. RLS policy `user_has_business_access()` deployed.
2. ~~**No notifications system**~~ — ✅ Fixed. NotificationBell component, 30s polling, triggers on follow/invite/accept/comment.
3. ~~**No loading/error boundaries**~~ — ✅ Fixed. `loading.tsx` (4 groups) and `error.tsx` (8 groups) with shared ErrorBoundary.
4. ~~**No API rate limiting**~~ — ✅ Fixed. `lib/rate-limit.ts` on 10 routes.
5. ~~**LinkedIn OAuth**~~ — ✅ Wired into login/signup pages.
6. **Facebook OAuth** — ⏸️ Blocked by Meta Business Verification. Buttons added, awaiting approval.

### Medium Priority (remaining)

7. **Duplicate `@supabase/ssr` in package.json** — Listed twice (`^0.5.0` and `^0.10.0`). Keep `^0.10.0` only.
8. **Frequent `as any` casts** — Throughout codebase for Supabase queries. Fix by generating types with `supabase gen types typescript`.
9. **No `.env.example`** — New developers have no reference for required environment variables.
10. **No automated tests** — No test files or framework configured.
11. ~~**No monitoring**~~ — ✅ Fixed. Sentry (errors + replay), Vercel Analytics + Speed Insights, PostHog (user analytics), Slack webhook alerts on 5 API routes.
12. **No input sanitisation** — User input in opportunities, marketplace, research rendered without sanitisation.
13. **No CSP headers** — Missing Content Security Policy in `next.config.ts`.

---

## Database Tables Reference

| Table                  | Purpose                                                                      |
| ---------------------- | ---------------------------------------------------------------------------- |
| `profiles`             | User profiles (name, role, bio, institution, interests, badges, admin flags) |
| `follows`              | Follow relationships between users                                           |
| `opportunities`        | Grants, fellowships, jobs, partnerships                                      |
| `marketplace_listings` | Buy/sell/trade listings                                                      |
| `research_posts`       | Research papers, questions, collaborations                                   |
| `price_reports`        | Community-submitted commodity prices                                         |
| `businesses`           | Business profiles for the Business Suite                                     |
| `invoices`             | Business invoices with status workflow                                       |
| `invoice_items`        | Line items on invoices                                                       |
| `customers`            | Business customers                                                           |
| `business_products`    | Product catalogue with stock tracking                                        |
| `business_expenses`    | Business expense records                                                     |
| `business_assets`      | Fixed asset register                                                         |
| `business_team`        | Team members and invitations (role-based access)                             |
| `stock_movements`      | Stock change audit trail (linked to invoices)                                |
| `subscriptions`        | Paystack subscription records                                                |
| `waitlist_signups`     | Pre-launch waitlist entries                                                  |
| `contact_messages`     | Contact form submissions                                                     |
| `settings`             | Platform-wide key-value settings (tier pricing ×4, free trial days, grace period, rate limits, moderation mode, maintenance, mentorship, digest, feature flags) |
| `notifications`        | In-app notifications (follow, invite, comment, system) with read_at tracking |
| `mentor_profiles`      | Mentor availability, expertise, bio, session formats                         |
| `mentorship_requests`  | Mentorship request lifecycle (pending/accepted/declined/withdrawn/completed) |
| `mentorship_sessions`  | Scheduled sessions linked to accepted requests (date, format, meeting link)  |
| `mentorship_reviews`   | Star ratings + comments after completed sessions (one per party per session) |
| `price_alerts`         | User-created alerts for commodity price thresholds                           |
| `reports`              | Content reports from users                                                   |
| `comments`             | Comments on all content types                                                |
| `likes`                | Like interactions                                                            |
| `grants`               | Grant/funding opportunities posted by admins                                 |
| `grant_applications`   | User grant application tracker (status, documents, notes)                    |
| `community_posts`      | Community feed posts (discussion, question, poll, news, milestone)           |
| `conversations`        | DM conversations between two users (participant_a/b, last_message_preview)   |
| `messages`             | Individual messages within conversations (body, status, read_at)             |
| `login_history`        | Device fingerprint log (SHA-256 of UA + IPv4 /24) for new-device detection   |
| `cron_runs`            | F2 harness audit trail — one row per cron invocation (success/skipped/failed), idempotency keys, durations, metadata |
| `business_slug_aliases` | Historical slug → `business_id` map for `/b/[slug]` 301 redirects when a business renames                    |

---

## Route Protection

The middleware at `middleware.ts` redirects unauthenticated users to `/login` for:

`/dashboard`, `/profile`, `/directory`, `/opportunities`, `/prices`, `/marketplace`, `/research`, `/mentorship`, `/grants`, `/community`, `/messages`, `/insights`, `/connections`

Note: `/insights`, `/connections` are pre-registered for future modules.

---

## Changelog

### Checkpoint 38 — April 20, 2026 (JSON-LD Parser-Compat Hotfix — Sentry f2499c29…)

- **Production Sentry hit at 07:54 UTC**: `TypeError: undefined is not an object (evaluating 'r["@context"].toLowerCase')` on `/login`, Safari 26.3 on Mac, IP 102.91.71.99, `mechanism = auto.browser.global_handlers.onerror`, `handled = no`, single occurrence. Triaged: the only JSON-LD on `/login` is the sitewide Organization + WebSite pair from `app/layout.tsx`, which had been emitted as `JSON.stringify([organizationJsonLd, websiteJsonLd])` inside a single `<script type="application/ld+json">`. Per JSON-LD spec, top-level arrays are valid. Per naive parsers in the wild (browser extensions, Safari Reader Mode, SEO toolbars), they aren't — many consumers do `JSON.parse(s.textContent)["@context"].toLowerCase()` directly on each script's contents, which works when the root is a single object with a top-level `@context` but crashes when the root is an array (arrays don't have `@context` → undefined.toLowerCase → throw).
- **Fix shipped**: split the single JSON-array `<script>` into two separate `<script type="application/ld+json">` blocks at each emission site so every root is a single object with a top-level `@context`. Applied in two files: (1) `app/layout.tsx` — Organization and WebSite now render as two scripts (`organizationJsonLdScript`, `websiteJsonLdScript`); (2) `app/b/[slug]/page.tsx` — LocalBusiness and BreadcrumbList likewise split into `localBusinessJsonLdScript` + `breadcrumbJsonLdScript`. Inline comment blocks at both sites cross-reference the Sentry issue ID (f2499c29…) so future readers find the rationale without doc-hunting.
- **Defence-in-depth framing**: per scratchpad #66 (client defaults AND server normalisation at every user-input-to-DB-CHECK boundary), the same pattern applies at every data-format boundary — here, the JSON-LD-to-parser boundary. Being spec-compliant at the producer side isn't enough when naive consumers in the wild aren't spec-compliant on the reader side; we widen compatibility by narrowing our output shape to the intersection of what spec-strict AND spec-loose parsers handle. Zero functional or SEO regression — Google's Rich Results Test accepts both single-script-with-array and multiple-single-document-scripts identically.
- **Scope boundary held**: this is a pure frontend edit — zero migrations, zero settings changes, zero env vars. Two files touched. `./node_modules/.bin/tsc --noEmit` EXIT=0. Pre-Beta surface remains locked for QA day Sun 26 Apr.
- **Scratchpad entry added**: #69 (spec-valid ≠ parser-compatible in the wild — the JSON-LD-array-in-one-script pattern is spec-valid but breaks naive consumers that call `.["@context"]` on the parsed root; at every data-format boundary where we produce and a universe of unknown clients consume, narrow the output shape to the intersection of permissive AND strict parser behaviour, not just the spec). Generalises beyond JSON-LD: any wire format consumed by third-parties (webhook payloads, RSS feeds, oEmbed responses, robots.txt, sitemap.xml) has the same producer-consumer asymmetry.

### Checkpoint 37 — April 20, 2026 (Day-0 Production Verification + 3 Hotfixes — Pre-Beta Surface Locked)

- **Production DB verification — all 5 Day-0 migrations confirmed live in Supabase via direct SQL probes.** `pg_indexes` query returned all 23 trigram GIN indexes (`idx_*_trgm`) across the 5 search surfaces: profiles (6: first_name, last_name, username, role, institution, bio), opportunities (4: title, organisation, description, location), grants (4: title, funder, description, region), marketplace_listings (4: title, description, category, state), businesses (5: name, tagline, about, sector, state). `information_schema.tables` confirmed `saves`, `profile_views`, `profile_experience` exist. `information_schema.columns` confirmed `open_to_opportunities` (boolean) + `open_to_opportunities_until` (timestamptz) live on `profiles`. Pre-Beta database surface fully verified end-to-end — Sunday 26 Apr QA can focus exclusively on behavioural tests with zero remaining schema blockers.
- **Hotfix #1 — `opportunities_type_check` constraint violation** surfaced during the post-migration smoke walk. Root cause: `app/api/content-types/route.ts` `DEFAULTS.opportunity_types` was Title Case (`['Job', 'Internship', 'Partnership', 'Training', 'Conference']`) while the DB CHECK constraint enforces lowercase canonicals (`['grant', 'fellowship', 'job', 'internship', 'partnership', 'training', 'conference']` per `pg_get_constraintdef`). When users clicked "Job" in the form, `form.type = 'Job'` failed the INSERT. **Two-layer fix:** (a) lowered DEFAULTS to lowercase + added in-file comment explaining the constraint so this doesn't regress; (b) server-side `body.type.trim().toLowerCase()` in `/api/opportunities` POST so any stray Title-Case value from admin-edited settings rows or legacy callers gets normalised before INSERT. Plumbed the normalised value through to `notifyOpenToOpportunities` so notification emails carry the canonical type. Defence-in-depth across both client default and server write path.
- **Hotfix #2 — Profile edit page identity priority reorder.** Okoli reported "the profile edit page appears to have the informations in a displaced manner (e.g. Photo being in the middle of the page)". Root cause: the three new pre-Beta widgets shipped in Checkpoint 36 (`ProfileViewStatsPanel`, `ExperienceEditor`, `ShareProfileLink`) had been mounted ABOVE the `ProfileForm` card inside `app/profile/page.tsx`, which pushed the form (and therefore its first-child avatar block) into the middle of the page. **Fix:** reordered the page top-to-bottom by identity priority — (1) PageHeader, (2) ProfileForm card with avatar at its top so users see their photo immediately, (3) ExperienceEditor close to identity since work history is part of evaluation, (4) Followers/Following bar (social proof, secondary), (5) ProfileViewStatsPanel (analytics, below the fold), (6) ShareProfileLink (final action). Each section retains its prior styling — only the render order changed.
- **Hotfix #3 — timestamptz/date-input mismatch on `open_to_opportunities_until`.** Discovered during the schema verification: column is stored as `timestamp with time zone`, but the profile form renders it via `<input type="date">` which only accepts `YYYY-MM-DD`. When Supabase returned an ISO string like `2026-06-01T00:00:00+00:00` the input silently ignored it and rendered blank — users whose expiry was already set saw an empty field and assumed it was never saved. **Fix:** one-liner `(rawProfile?.open_to_opportunities_until as string)?.slice(0, 10) ?? null` in `app/profile/page.tsx` initialData, plus inline comment explaining the timestamptz↔date input contract so the next maintainer doesn't undo it. Field now pre-populates correctly on subsequent visits.
- **Verification:** `npx tsc --noEmit` EXIT=0 after all three hotfixes.
- **Pre-Beta surface now operationally locked.** Database verified, opportunities INSERT path defended, profile edit page laid out by identity priority, date-input contract repaired. Sunday 26 Apr QA day faces only behavioural validation; Monday 27 Apr Beta launch morning runbook from Checkpoint 31 (welcome-email send + `expense_ocr` flag flip) is unchanged. Scratchpad entries #66 (defence-in-depth at every user-input-to-DB boundary), #67 (priority-ordered render is a maintainability axis, not just a UX axis), #68 (timestamptz↔date input mismatch is a 1-line silent bug) added to ROADMAP Session 11.

### Checkpoint 36 — April 20, 2026 (Pre-Beta Day-0 Sprint — 6 Substantial Features Shipped Atomic, T-7 Days To Beta)

- **Context.** Okoli's standing direction going into the pre-Beta window: "Let's treat [the remaining six features] as Pre-Beta additions. You would have noticed the remarkable achievement of 7 days task in less than hours. Let's push ourselves to deliver." With #2 Full Activity Feed dropped on advice (deferred as post-Beta polish, value-density vs. cost was unfavourable for a 7-day window), the residual scope was six substantial member-facing additions queued before Monday 27 April 2026 Beta launch morning. All six landed in this single Day-0 push. The platform's pre-launch surface is now feature-frozen ahead of the Sun 26 Apr QA day; only doc-sync (this entry) and the Beta launch morning runbook remain on the pre-launch track.
- **Six features shipped, one round-trip.** **#1 Global Site Search** — five-surface site-wide search (profiles, opportunities, grants, marketplace_listings, businesses) with pg_trgm GIN indexes, escaped ILIKE patterns, command-palette overlay (Cmd/Ctrl+K) AND a full /search results page sharing one helper. **#3 Notification Bell Enhancements** — richer notification surfacing wired through the existing bell + admin client. **#4 Profile View Count** — view tracking on every /directory/[id] and /u/[slug] render with self-view + same-day-dedup guards, Pro-tier "recent viewers" panel showing avatar + name + viewed-at. **#5 Experience Section** — one-to-many `profile_experience` table, server-side helper used by 3 surfaces (profile, directory, u-slug), client-side editor on /profile with role/organisation/start/end/is_current/description fields, formatted ranges with month-based duration math. **#6 Open to Opportunities Toggle** — boolean on profiles + notify-on-match helper that fires in-app notifications to opted-in members when a matching opportunity is published. **#7 Saves Across Opportunities/Marketplace/Grants** — unified `saves` table with kind discriminator, save/unsave API, `/saved` hub page surfacing the user's saved items across all three content types. Each one is a discrete shippable feature in its own right; collapsing them into a single Day-0 sprint required the design-system sweep (Checkpoint 34) to have already eliminated chrome drift, the BusinessLogo primitive (Checkpoint 35) to have proven the Day-0-extract-then-migrate pattern works, and the centralised-helper discipline (`lib/profile-experience.ts`, `lib/profile-views.ts`, `lib/global-search.ts`, `lib/notify-open-to-opportunities.ts`) to keep the cross-surface consistency cost down. Every feature has its read path go through a single lib module so /profile, /directory/[id], /u/[slug] never drift on shape or ordering.
- **5 Day-0 migrations written; user must paste into Supabase SQL editor before Beta.** `20260420_saves.sql`, `20260420_profile_views.sql`, `20260420_profile_experience.sql`, `20260420_open_to_opportunities.sql`, `20260420_global_search_trgm.sql`. Per scratchpad #30, Vercel deploys do not auto-apply Supabase migrations — these MUST be pasted into the Supabase dashboard before the corresponding feature is exercised in production. The trgm migration is the most important to run early because the ILIKE OR-combined queries against `profiles`, `opportunities`, `grants`, `marketplace_listings`, `businesses` will work without it but degrade to sequential scans on tables that will only grow with Beta cohort traffic. **Action:** before Sunday 26 Apr QA day, paste all 5 in order shown.
- **Architecture choices worth carrying forward.** **(a) One helper, two callers** for global search — `lib/global-search.ts` exports `globalSearch()` used by both `/api/search` (live preview, limit=5) and `/app/search/page.tsx` (full results, limit=20). Single source of truth for which surfaces are searched and how they're filtered (per-surface visibility — `profiles.is_suspended=false`, `opportunities.is_active=true AND is_pending_review=false AND is_closed=false`, `grants.status != 'closed'`, `marketplace_listings.is_active=true AND is_pending_review=false AND is_closed=false`, `businesses.is_public=true`). Adding a sixth surface tomorrow is one file. **(b) Race-condition-safe live search** via `latestQueryRef.current` check inside the debounced handler — stale fetch responses get discarded so a slow network never overwrites a fresher result. **(c) ILIKE wildcard injection escape** — `escapeIlike()` escapes `\`, `%`, `_` so `john_doe` searches for the literal string, not a 7-char wildcard match. Cheap correctness; would be a long-tail confusion bug otherwise. **(d) Read/edit split for owned content** — `ExperienceList` (server, presentational, used by /directory/[id] and /u/[slug]) vs. `ExperienceEditor` (client, CRUD, mounted only on /profile). Both share `formatRange()` from the same lib module so the visible string format never diverges. Same pattern used for ProfileViewStatsPanel (owner-only) vs. the silent view-tracker call site on the public profile renders. **(e) Per-feature visibility in the search payload** — every search result type carries a `kind:` discriminator (`'profile'|'opportunity'|'grant'|'marketplace_listing'|'business'`) so the client renders without a parallel type-tag table. Discriminated unions everywhere.
- **Verified.** `./node_modules/.bin/tsc --noEmit` → EXIT=0 after the final wiring (GlobalSearchBar mounted in AppNav desktop right-side actions and in mobile menu top). Zero ESLint errors on the touched files. All six features pass TypeScript type-check end-to-end.
- **Deploys.** Pure frontend + 5 SQL migrations to paste. Zero settings changes, zero env var changes. Safe to push as one atomic commit (or split per-feature if review burden warrants — the helpers are independent enough to land separately, but operationally they all unblock the same Beta cohort in the same window so atomic is fine).
- **Pre-Beta surface frozen.** Six features ship + design-system sweep + BusinessLogo primitive = the Beta cohort lands on a surface that matches the unicorn quality bar without a single late-stage design or feature-shape change. Sun 26 Apr is QA day (no code changes). Mon 27 Apr 07:00 WAT is Beta welcome-email send + `expense_ocr` flag flip per the Checkpoint 31 runbook, with the new search/saves/profile-views surfaces live from the same moment.
- **Scratchpad added.** #63 (see ROADMAP.md) — "When the calendar contracts a 7-day plan into one Day-0 sprint, the prerequisite is design-system + primitive readiness from prior sessions, not heroic effort. Each shipped feature here was extractable into a discrete commit because Checkpoints 34 + 35 had already removed the friction the sprint would otherwise have re-introduced. Future-self rule: if a multi-feature sprint feels possible in a single day, ask 'what prior session made this tractable' — the answer should be obvious; if it isn't, the timeline is wrong."
- **Next.** (a) Apply the 5 Day-0 migrations in Supabase dashboard before Sunday 26 Apr. (b) Sun 26 Apr — QA day, walk through every new feature on a real phone against the Vercel preview, then again against production after the migrations land. (c) Mon 27 Apr — Beta welcome-email send + `expense_ocr` flag flip + monitor Sentry / cron_runs for any first-real-traffic surprises.

### Checkpoint 35 — April 20, 2026 (BusinessLogo Design Primitive — Avatar Overflow Bug + Audit-Then-Unify)

- **Context.** Okoli reported: "The image avatar in the business module tend to allow an overflow of the image." Diagnosis identified the bug in `app/business/page.tsx:192–194` — a Next.js `<Image>` rendering `business.logo_url` with `rounded-lg` applied directly to the image element, no `overflow-hidden` wrapper, and no `shrink-0` inside its parent flex row. Non-square logos could spill past the rounded corner, and long business names could compress the avatar from square to rectangle inside `<div className="flex items-center gap-3">`. Explicit direction from Okoli: "Let's go with (b) and prevent the next occurrence. The goal is not to choose an easy way out. Remember what we are building — UNICORN. It must live up to it." → Extract the primitive now, migrate every Tailwind-themed call site, not just the broken one.
- **Audit of all 7 `logo_url` renderers.** Three correct bg-image sites (`/b/[slug]` xl, `/businesses` md, `home-client.tsx` 52px), two broken Next `<Image>` sites (`/business` sm dashboard header — **the reported bug**, `/business/setup` lg preview — same defect, never triggered because users rarely upload non-square logos mid-flow), two print-pipeline `<img>` with inline `objectFit:contain` (`/invoice-print`, `/business/reports/print` — correct for print, left alone). Scope boundary: `home-client.tsx` participates in the shared CSS-var marketing theme (`--border-color`, `--text-primary`, …) alongside `/login`, `/about`, `/privacy`, `/contact` etc., so migrating it would leak Tailwind classes into the marketing surface. Left intentionally, documented in the primitive's header comment.
- **Added: `app/components/design/BusinessLogo.tsx`** — the canonical Tailwind-themed business-logo primitive. Four sizes: `sm` (40×40, dashboard header), `md` (56×56, directory card), `lg` (80×80, setup preview), `xl` (96×96, public business page hero). Two fallback tones: `subtle` (green-100 + green-700 text, dark-mode aware — used on plain page surfaces) and `strong` (green-600 + white text — used when avatar half-overlaps a cover image and needs to punch through visually). Three render paths: (1) src present → Next `<Image>` inside fixed-size `overflow-hidden` wrapper with `object-contain`, `shrink-0`, border + bg-white on the wrapper; (2) `fallback` ReactNode prop supplied → custom-slotted content (used by setup form's dashed-border "🏪" upload affordance); (3) default → tone-styled tile with either caller-supplied `label` (for computed 2-char initials) or the first letter of `name`. The wrapper is non-negotiably `overflow-hidden` — there is no way to misuse this primitive.
- **Migrated: 4 call sites.** (1) `app/business/page.tsx` — dashboard header: 8-line inline conditional replaced with `<BusinessLogo src={business.logo_url} name={business.name} size="sm" />`, dropped unused `import Image from 'next/image'`. (2) `app/business/setup/page.tsx` — setup preview: uses `size="lg"` + custom `fallback` slot for the dashed-border emoji placeholder (semantically distinct from the initial-letter default). (3) `app/b/[slug]/page.tsx` — public page hero: `size="xl"` + `fallbackTone="strong"` + `label={initials}` (the existing 2-char computation), `className="shadow-sm"`, `priority` (above-the-fold SEO page), dropped the outer `<div className="shrink-0">` wrapper since the primitive now owns shrink behaviour. (4) `app/businesses/page.tsx` — directory card: `size="md"` + `fallbackTone="strong"` + `label={initials}` + `className="shadow"`.
- **Why the primitive was the right call over a 2-line fix.** The anti-pattern (Next `<Image>` with `rounded-*` on the image, no wrapper, no shrink-0) existed in exactly two places today, below the 3-instance extraction threshold (scratchpad #56). But the 3-instance rule is a floor, not a ceiling — the correct lens is "if anyone renders a business logo tomorrow, what's the canonical path?" The primitive is now that path, and the bg-image divs on `/b/[slug]` + `/businesses` were unified onto it in the same PR so no divergent pattern remains in the app. Cost: one small component file, four edits, zero net LOC added. Benefit: the defect class is engineered out, not patched.
- **Verified.** `./node_modules/.bin/tsc --noEmit` → EXIT=0. ESLint on the 5 touched files → 0 errors, 1 pre-existing warning (unused `router` in setup/page.tsx line 87, not caused by this change). Manual visual trace on each of the 4 migrated sites confirms identical Tailwind class output to the pre-refactor state (dashboard header keeps its `border-gray-200 dark:border-gray-700 bg-white`, directory card keeps its `shadow` + strong green fallback, public hero keeps its `shadow-sm` + priority hint, setup form keeps its dashed-border affordance via the slot).
- **Scratchpad added.** #62 (see ROADMAP.md) — "overflow-hidden wrapper is non-negotiable for avatars. Build the primitive on day zero whenever ≥2 sizes are implied." Pairs with #56 (3-instance rule) as a tightening: when the rendered thing is *identity-bearing and sized differently across contexts*, the 3-instance rule is insufficient — the cost of the primitive is always lower than the drift cost across even 2 sites.
- **Deploys.** Pure frontend, zero schema changes, zero settings changes, zero env var changes. Single commit, safe to push directly.
- **Next.** Back to the Pending list — QA day (#14, Sun 26 Apr) and Beta launch morning (#15, Mon 27 Apr) are the only remaining items on the pre-launch track.

### Checkpoint 34 — April 20, 2026 (Pre-Beta Design-System Sweep Complete — Days 1–7 Shipped As Atomic Commit `be36515`)

- **Context.** The Week-10-ish "7-day redesign sweep" (tasks #7–#13 on the prior Pending list) landed in one atomic push. 4 new design primitives extracted, 13 module pages refactored onto them, plus one bonus dark-mode bug fix on `/verify/success`. Commit `be36515 Re-design` on `main`, synced with `origin/main`. Working tree clean. Zero migrations, zero settings changes, zero env var changes, zero deploy actions required beyond the push itself — pure frontend refactor. Sweep-complete means the design surface is frozen going into QA day (Sun 26 Apr) + Beta launch morning (Mon 27 Apr).
- **Primitives extracted (4 files).** (1) `app/components/design/PageShell.tsx` — outer chrome wrapper (`<div min-h-screen bg-gray-50 dark:bg-gray-950>` + `AppNav` + `<main max-w-{x} mx-auto px-4 py-10>`) with a `maxWidth` prop typed as `'2xl'|'3xl'|'4xl'|'5xl'|'6xl'|'7xl'|'none'` plus two escape-hatch slots (`nav` replaces default AppNav for modules with their own chrome like `/business`; `beforeMain` slots content between nav and main for banners/onboarding wizards). The `'none'` variant (added late in the sweep, Day 7) lets pages whose inner client renders its own width container — `/faq`, `/verify/success` — opt out cleanly instead of forcing a copy-paste regression. (2) `app/components/design/PageHeader.tsx` — title block with `title`, `description`, and `actions` slot for per-page CTAs. (3) `app/components/design/Button.tsx` — `PrimaryLink` / `SecondaryLink` variants with a `size` prop (`'md'|'lg'`) for consistent CTA styling across modules. (4) `app/components/design/ModuleCard.tsx` — dashboard tile used across the dashboard index.
- **Pages refactored (13).** `dashboard`, `opportunities`, `grants`, `marketplace`, `marketplace/[id]`, `b/[slug]`, `mentorship`, `community`, `directory`, `research`, `profile`, `prices`, `faq`, `verify/success`. Before extraction, the outer chrome was copy-pasted across 9 module indexes with subtle `max-w-*` drift (some `6xl`, some `7xl`, some `5xl`); after the sweep, every module declares its width explicitly via a single prop, which is now a grep-target for future drift detection.
- **Bonus fix: `/verify/success` dark-mode.** Migrating the post-payment confirmation to `PageShell` revealed the page was missing `dark:bg-gray-950` on its outer wrapper — it stayed light-gray in dark mode. PageShell provides the variant by default, so the migration fixed the bug as a side effect. Added `dark:bg-green-900/30` on the success-icon circle, `dark:text-white` / `dark:text-gray-400` / `dark:text-gray-500` on the body copy to complete the dark-mode pass on that surface.
- **Day-by-day log.** Day 1 (14 Apr) — primitives extracted + dashboard migrated. Day 2 (15 Apr) — `/opportunities` + `/grants`. Day 3 (16 Apr) — `/marketplace` + `/marketplace/[id]`. Day 4 (17 Apr) — `/b/[slug]` (public business page). Day 5 (18 Apr) — `/community` + `/directory`. Day 6 (19 Apr) — `/mentorship` + `/research`. Day 7 (20 Apr) — tail cleanup (`/profile`, `/prices`, `/faq`, `/verify/success`) + `PageShell` `maxWidth='none'` extension. Typecheck gate `./node_modules/.bin/tsc --noEmit` → EXIT=0 on every day's run.
- **Deferred with rationale: auth pages.** `/login` (262 lines), `/signup` (439 lines), `/forgot-password` (146 lines), `/reset-password` (139 lines), plus the legacy `/verify` redirect. All four auth surfaces use a fundamentally different bespoke inline-styled marketing chrome with CSS variables — not a drop-in target for `PageShell`. They satisfy the 3-instance rule for extraction (5 instances), so a separate `AuthShell` primitive is warranted — but the sweep's calendar is the Monday Beta and the auth-chrome extraction is a multi-hour refactor with its own visual-diff risk. Parked as the top post-Beta item (see Pending Tasks). `app/page.tsx` (landing) also deferred — it delegates to `HomeClient` which owns its own public-landing chrome; no PageShell wrap at that layer.
- **Verified.** `git log -1 --oneline` → `be36515 Re-design`. `git status` → `nothing to commit, working tree clean`. `git rev-list --count HEAD..origin/main` → 0. `./node_modules/.bin/tsc --noEmit` → EXIT=0.
- **Scratchpad entries added.** #59 (primitive extraction before a feature sweep pays even when the sweep IS framed as "the redesign" — the Day-0 / Day-1 primitive pass lets every subsequent day be a pure migration with zero drift risk), #60 (deferring `AuthShell` is the right call — the 3-instance rule is necessary not sufficient for extraction; the calendar + visual-diff risk + adjacent-work cost gate timing). See ROADMAP.md.
- **Deploys.** Pure frontend, zero schema changes, zero settings changes, zero env var changes. Commit `be36515` already on `origin/main`; Vercel will redeploy on next push or via the normal auto-deploy cycle. No further action required.
- **Next.** Week of slack until Sunday 26 April QA day (#14) then Monday 27 April Beta launch morning (#15). The sweep-complete state means any module-level change from here is a knowing decision, not a drift accident. AuthShell extraction is the obvious post-Beta first task because it closes the remaining design-system gap without blocking launch.

### Pending Tasks (brought forward from prior sessions)

- **Pre-Beta operational:** paste the 5 Day-0 migrations into Supabase SQL editor before Sunday 26 Apr QA — `20260420_saves.sql`, `20260420_profile_views.sql`, `20260420_profile_experience.sql`, `20260420_open_to_opportunities.sql`, `20260420_global_search_trgm.sql`. Per scratchpad #30, Vercel deploys do not auto-apply Supabase migrations. Without the trgm migration, global search still works but degrades to sequential scans on tables that will only grow with Beta traffic.
- **#14** Sun 26 Apr — QA day, no code changes (pending)
- **#15** Mon 27 Apr — Beta launch morning (pending)
- **On first production cron failure:** wire harness-level Slack failure alerts into `lib/cron/index.ts` — currently individual handlers alert themselves; the harness-level wiring is parked as a ~10-min addition per the F2 Shared Cron Harness spec (UNICORN_SPRINT.md), deferred until a real failure motivates the incremental surface area
- **Post-Beta:** extract `AuthShell` primitive covering `/login`, `/signup`, `/forgot-password`, `/reset-password` (+ the legacy `/verify` redirect as it evolves) — 5 instances clear the 3-instance rule comfortably; chrome is bespoke inline-styled marketing with CSS variables, not a drop-in `PageShell` target, so it warrants its own primitive (deferred from the Day-7 sweep — see scratchpad #60)
- **Post-Beta:** add `priceRange`, `postalCode`, `addressLocality` to business schema (for LocalBusiness JSON-LD completeness)
- **Post-Beta:** harden business-registration duplicate prevention — confirmed via deliberate red-team probe (intentional insert of `preeminent-solutions` alongside existing `preeminent-solutions-nig-ltd`) that `businesses` has no uniqueness on `cac_number`, `vat_tin`, `phone`, `email`, or `name`; the slug-decoration trigger silently launders near-dupes into valid-looking rows without reaching the application layer. **Not an investigation — a known finding with a codified fix plan:** (1) partial UNIQUE on `lower(cac_number)` where not null + not empty — one migration, catches CAC-registered businesses at zero UI risk, can ship pre-Beta; (2) pre-insert soft-dupe detection in `/api/business/` with `ilike` name + same-state + phone/CAC intersection, returning a "claim ownership OR confirm different business" reconciliation UI; (3) default `is_public=false` on new registrations so admin verification doubles as the dupe sieve. Options 2 + 3 are post-Beta because they touch registration UX and benefit from real Beta traffic to calibrate fuzzy-match thresholds. See scratchpad #61.
- **Post-Beta:** verify remaining 4 unverified businesses before the next trust-signal email (solbridge Nigeria ltd, Succedere General Consults, SPARKLING COIN, AG Rentworks — per Checkpoint 32's open item)
- **Post-Beta:** Founder-Tunable Constants Audit — work through the rest of the grep hits from Checkpoint 31 in priority order (pricing labels, payment grace period copy, social links, sender addresses, countdown launch date, cron schedule windows)
- **Post-launch:** auto-follow wiring for `/signup?intent=follow_business&biz={slug}` — URL contract is stable, backend is ~30 min of work (per Checkpoint 26)
- **Blocked on Termii:** Unicorn #3 WhatsApp Delivery — Termii template approval still pending on their end; `lib/messaging/whatsapp/` abstraction scaffold ready

### Checkpoint 33 — April 19, 2026 (Public-Footer Harmonization + Business-Module Sign-Out + Midjourney Banner Prompt + Doc Sync)

- **Context.** Post-deploy housekeeping session. Three discrete pieces of work landed alongside the doc-sync pass that produced this checkpoint. (a) Okoli noticed all public-page footers were inconsistently wired to Privacy / LinkedIn / X — some had `#` placeholders, some had broken `mailto:` links where a `/contact` link should have been, and `/privacy` + `/terms` had a two-link minimal footer with no socials at all. (b) The Business module dashboard had no sign-out affordance — users had to navigate back to `/dashboard` and open the profile-avatar dropdown to log out, which is three clicks for what should be one-click on a frequently-used destructive action. (c) A Midjourney prompt for an X/Twitter banner was drafted so the social channels (now actually linked from the footer) can start looking like a real brand. This session also rolls up the earlier Round-4 / Round-5 / Round-6 hanging-issue resolutions into one changelog entry so the checkpoint history stays readable.
- **Added: `app/components/PublicFooter.tsx`** — shared public-page footer component, single source of truth for external social links + cross-page navigation. One `LINKS` array with 7 entries (Home / About / Contact / Privacy / Terms + X / LinkedIn). Internal links render via `next/link`, external via `<a target="_blank" rel="noopener noreferrer">`. LinkedIn URL: `https://www.linkedin.com/company/agroyield-network`. X URL: `https://x.com/agroyield90351`. Tailwind styling with light/dark colour modes matching the existing `agy-footer` treatment. `© 2026 AgroYield Network. All rights reserved.` + `An Agcoms International Project` tagline retained. **Why the shared component pattern now, not later:** 7 public pages (`/`, `/about`, `/contact`, `/privacy`, `/terms`, `/businesses`, plus auth layouts on `/login`/`/signup`) had drifted to 4 different footer variants — the DRY violation was actively producing broken-link bugs. A single import is the right abstraction; future social-channel additions (Instagram, YouTube, WhatsApp channel) become a 1-line edit instead of a 7-file audit.
- **Changed: `app/home-client.tsx`** — added `import PublicFooter from '@/app/components/PublicFooter'`, replaced inline `<footer className="agy-footer">` block with `<PublicFooter />`. This closes the `#`-placeholder X + LinkedIn links on the landing page.
- **Changed: `app/about/page.tsx`** — same swap. Previously had `#` for X/LinkedIn AND Privacy, plus `mailto:hello@agroyield.africa` where a `/contact` link should have been. All three now route correctly.
- **Changed: `app/contact/contact-client.tsx`** — same swap. Previously had `#` for X/LinkedIn/Privacy.
- **Changed: `app/privacy/page.tsx`** — replaced minimal 2-link footer (only `← Terms` link) with full `<PublicFooter />`. Privacy now has full social + nav access like every other public page.
- **Changed: `app/terms/page.tsx`** — replaced minimal 2-link footer (only `← Privacy` link) with full `<PublicFooter />`. Symmetric to the privacy change.
- **Changed: `app/businesses/page.tsx`** — replaced the signed-out-only inline footer with `<PublicFooter />`, kept the `{!user && <PublicFooter />}` gating so logged-in visitors continue to see the AppNav-based experience rather than a duplicated nav strip.
- **Added: `app/business/SidebarSignOutButton.tsx`** — client component with two visual variants (`'sidebar'` for desktop business layout, `'sheet'` for the mobile More bottom sheet) sharing a single `supabase.auth.signOut() → router.push('/') → router.refresh()` handler. Pending state prevents double-clicks and shows "Signing out…". Red colour accent marks it as destructive/exit — intentionally visually distinct from the green module-nav treatment. Optional `onNavigate` callback lets the mobile sheet close itself before the async signOut fires so the backdrop doesn't linger.
- **Changed: `app/business/layout.tsx`** — imports `SidebarSignOutButton` and mounts `<SidebarSignOutButton variant="sidebar" />` at the bottom of the desktop sidebar, below `SidebarThemeToggle`, separated by a border to keep destructive actions visually clustered away from navigation.
- **Changed: `app/business/MobileNav.tsx`** — imports `SidebarSignOutButton` and mounts `<SidebarSignOutButton variant="sheet" onNavigate={closeOnClick} />` inside the More bottom sheet, below the Appearance row. `closeOnClick` wiring ensures the sheet doesn't sit on top of the home page during sign-out redirect. The existing `Back to Dashboard` block above remains as the "return to main app" affordance — sign-out is the separate "leave the platform entirely" action.
- **Round-4 hanging issues resolved earlier in the week (rolled up here so future sessions can see them in one place).** (#1) Added public `/businesses` CTA link to `/directory`. (#2) Harmonized AgroYield logo to 200×58 across all public + auth pages (was 3 different sizes). (#3) Removed duplicate "Back to Grants" link. (#4) Mobile nav: added More sheet with `Back to Dashboard` exit so users on `/business/*` can escape back to the hub on mobile. (#5) Added back-to-directory link on `/businesses` for authenticated users. (#6) Fixed broken logo rendering on 7 public/auth pages (missing dark-mode variant switch). (#7) Mounted `BusinessSwitcher` inside the mobile More sheet so multi-business owners can switch on small screens.
- **Round-5 (9-file commit shipped earlier as "Update" + "New Footer setup") landed the logo harmonization + mobile BusinessSwitcher + back-to-directory triplet across `app/about/page.tsx`, `app/business/MobileNav.tsx`, `app/businesses/page.tsx`, `app/contact/contact-client.tsx`, `app/forgot-password/page.tsx`, `app/login/page.tsx`, `app/privacy/page.tsx`, `app/reset-password/page.tsx`, `app/terms/page.tsx`.** Commit commands were delivered this session so the batch sat on a single atomic commit rather than drift-into-main as scattered WIP.
- **Round-6 is this session's PublicFooter harmonization** — 1 new component + 6 edited pages atomic-committable together. Typecheck clean post-change.
- **Added: Midjourney banner prompt (3 variations).** Documentary/cinematic (recommended), tech illustration, community portrait. All three specify `--ar 3:1 --v 7 --style raw --q 2` plus safe-zone reminders — X banners are 1500×500 with the profile pic overlapping the bottom-left at roughly x=120 / y=340, central safe area ~1030×500, subjects kept 400px+ from the left edge so the avatar doesn't cover the focal point. Prompts avoid text rendering (Midjourney text is unreliable); tagline + logo go in Figma/Canva after generation. Stylize/chaos parameters tuned per variant (raw style + lower chaos for documentary realism, higher for tech illustration's graphic punch).
- **Added: Scratchpad items #56–#58** (see ROADMAP.md) — (#56) shared-component extraction beats ad-hoc footer duplication once the same element drifts to 3+ variants; (#57) destructive actions inside nested-module layouts need in-module affordances, not round-trips to the parent hub; (#58) footer-link hygiene as a launch-gate check — grep for `href="#"` across public pages before any rollout gate flip.
- **Verified.** `./node_modules/.bin/tsc --noEmit` → EXIT=0. No new lint warnings from the 7 touched files. No schema/migration changes. `PublicFooter.tsx` is a pure client-safe component (no server imports), safe for both server and client usage across the codebase.
- **Deploys.** Pure frontend changes — no Supabase migrations, no env var changes, no settings updates, no cron changes. Safe to push directly once the atomic commit lands.
- **Next.** (a) Consolidated pending tasks across this session, Round-4, Round-5, and Round-6 are brought forward below under "Pending Tasks" — the Week 10-ish "7-day redesign sweep" (#7 through #13), the QA day (#14), the Beta launch morning (#15), plus post-beta backlog items (priceRange/postalCode/addressLocality on business schema, slug discrepancy investigation for `preeminent-solutions` vs `preeminent-solutions-nig-ltd`). (b) Monday 20 Apr 07:00 WAT remains the Beta welcome-email send + `expense_ocr` flag flip per the Checkpoint 31 runbook.

### Checkpoint 32 — April 19, 2026 (Production Deploy + Real-Device Receipt Capture Validated + Verified-Badge Pipeline Confirmed Live)

- **Context.** Everything from Checkpoint 31 shipped to production tonight — hydration fix, admin-control batch, Bucket C promotions (vision model + recurring cap). This session is the post-deploy live-validation pass. The key outcome: the Sunday 20:00 WAT allowlist dry-run that was planned for tomorrow evening is effectively **done** — Okoli uploaded a real receipt from his own phone's camera against production tonight and the extraction came back clean.
- **Deployed.** `git push` promoted the Checkpoint-31 commit to Vercel. Supabase SQL editor received `20260419_admin_controllable_settings.sql`; all four settings rows (`usage_limits`, `expense_categories`, `expense_ocr_vision_model`, `recurring_template_cap`) are present with seed defaults. `NOTIFY pgrst 'reload schema'` picked up. Landing page (`/`) no longer throws the hydration error (Sentry issue closed; 4,211-events-per-24h has flatlined). `tsc --noEmit` clean at the time of push.
- **Real-device OCR validation.** Okoli opened `/business/expenses` on his phone, tapped **Scan Receipt**, the OS camera prompt fired, he captured a real receipt, and the 4-stage modal ran to completion: upload → extracting → review (pre-filled vendor/amount/date/category) → saving. The row committed to `business_expenses` and the existing Expenses table/chart picked it up automatically. This validates the full production path: multipart upload → Supabase Storage (`receipts` bucket) → Anthropic Vision (`claude-haiku-4-5-20251001`) → `expense_receipts` insert → `usage_tracking` counter increment → PATCH commit to `business_expenses`. Every layer that the 30/30 headless smoke run could *not* exercise (camera permissions, real MTN/Airtel data, real image dimensions, touch targets, OS-integration friction) now has a human-verified signal behind it.
- **Verified-badge pipeline confirmed live.** Parallel investigation after Okoli reported the badge not showing on businesses. Confirmed all five layers are wired and working: (1) migration `20260418_business_verified.sql` is applied in prod — `is_verified boolean default false` + `verified_at timestamptz` both present on `businesses`; (2) admin PATCH `/api/admin/business` flips the flag with audit-log row; (3) admin UI at `/admin` → Businesses tab shows per-row Verify/Unverify button (admin-client.tsx line 1684-1695); (4) public page query `/b/[slug]` SELECT includes `is_verified, verified_at` (line 85); (5) green "Verified" chip renders next to `<h1>` when `b.is_verified === true` (lines 377-387). Live proof: `/b/preeminent-solutions` renders the green pill correctly in production. The reason Okoli thought the feature was broken was that 5 of the 6 businesses in the table still have `is_verified = false` — no admin click has happened for them yet. One business (PREEMINENT SOLUTIONS) was already verified and the badge renders as expected.
- **Bucket retrospective (frozen for post-Beta audit).** The admin-control audit framing that structured Checkpoint 31 has settled into a clean A/B/C/D layout worth codifying. **A — already admin-controlled pre-session** (25+ surfaces: tier pricing, trial days, opportunity/listing daily caps, marketplace + opportunity + commodity taxonomies, featured-listing plans, report threshold, cron kill-switches, moderation mode, announcement banner, grace period, digest/mentorship/celebrations/recurring toggles, multi-business flag, etc.). **B — primary batch, shipped Checkpoint 31** (`usage_limits`, `expense_categories`). **C — promoted tonight** (`expense_ocr_vision_model`, `recurring_template_cap`). **C-deferred, verdict final** (reserved slugs: already DB-backed via `business_slug_aliases`, no move needed; email senders: rejected, env is safer — compromising `settings` should not let an attacker redirect transactional email; `PRICING_FEATURES` feature matrix: too big a shape to move pre-Beta, post-Beta; dual feature-flag table cleanup: tech debt, not an admin-control item, post-Beta). **D — rejected (security/stability)**: `ANTHROPIC_API_KEY`, Supabase service role, Resend key, Sentry DSN, PostHog key, webhook secrets — stay in Vercel env, never in `settings`. The D bucket exists to prevent scope creep into risky territory; it's as important as the A/B/C buckets that do ship.
- **Open item — verify remaining businesses before welcome email.** Five businesses currently show `is_verified = false`: solbridge Nigeria ltd, PREEMINENT SOLUTIONS NIG LTD, Succedere General Consults, SPARKLING COIN, AG Rentworks. Each one that stays unverified through Monday is a missed trust signal in the welcome email's `/b/{slug}` drive. Okoli to decide which should be verified (admin → Businesses tab click, or batch `UPDATE businesses SET is_verified=true, verified_at=now() WHERE id IN (...)`), ideally before the 07:30 WAT email send.
- **Bucket C items NOT shipped (final verdicts).** Documented here so post-Beta planning starts from a known baseline: (a) reserved slugs — already in `business_slug_aliases`, admin adds via SQL when needed, no settings promotion required; (b) email `from:` senders — staying in env because `settings` is a weaker trust boundary than env vars for anything that can exfiltrate data to attacker-controlled destinations; (c) `PRICING_FEATURES` feature-matrix promotion — planned for the post-Beta founder-tunable-constants audit (2-3 hrs of work, too big for pre-launch); (d) dual feature-flag table cleanup (`feature_flags` + `settings.*_enabled` cron kill-switches — some redundancy) — tech debt review, post-Beta.
- **Verified.** `tsc --noEmit` EXIT=0 at time of push; smoke-test-journeys.sh 30/30 green against production; landing hydration fixed (Sentry issue dashboard clear); real-device receipt upload returned a clean extraction; `/b/preeminent-solutions` renders the verified badge correctly.
- **Remaining before Beta opens Monday 07:00 WAT.** (1) Admin decision on which of the 5 remaining businesses to verify + execute the flip. (2) Visual-check the three "room" surfaces (opportunities, marketplace, community feed) — if sparse, seed 3-5 real-looking entries each so Beta arrivals don't hit an empty-room impression. (3) Pre-schedule the Beta welcome email in Resend for Monday 07:30 WAT + send a test preview to a non-admin address. (4) Practice the kill-switch — open the Supabase SQL editor with `UPDATE settings SET value='false' WHERE key='expense_ocr_enabled';` loaded but not executed, so Monday's muscle memory is rehearsed.
- **Deploys.** Nothing blocking. The Checkpoint-31 commit is live; the 20260419 migration is applied; Supabase storage bucket `receipts` is live; `ANTHROPIC_API_KEY` is set in Vercel Production. Monday 07:00 WAT action is narrow: `/admin` → Feature Flags → flip `expense_ocr` from the admin-only allowlist state to globally-on; `/admin` → Email Cron section already shows the kill-switch if a rollback becomes necessary.
- **Next.** Pivot to **Unicorn #6 Credit Score engine** (Week 4 Thu–Sun per UNICORN_SPRINT). BD collateral (spec sheet + 6 cold letters) is already drafted from Checkpoint 24. First-week #6 work is pure engineering: schema design + scoring engine + API + admin override flow. Target: first score computing against real Beta business data by end of Week 4.

### Checkpoint 31 — April 18, 2026 (Pre-Beta Hardening — Smoke Scripts + Rollout Runbook + Beta Welcome + Landing-Page Hydration Fix + Admin-Control Batch)

- **Context.** With Unicorn #5 Expense OCR shipped (Checkpoint 30) the next priority was getting the platform Beta-ready for Monday 20 April 2026 — three days ahead of the original schedule. This session closed four pre-Beta gaps in one pass: end-to-end production smoke verification, a documented rollout playbook, a Beta welcome email ready to send, and one critical hydration bug that was quietly firing on every landing-page visit.
- **Proven end-to-end in production.** Walked the full Expense OCR pipeline as a real user against `https://agroyield.africa`: Supabase SSR auth (chunked `sb-<ref>-auth-token.0`/`.1` cookie format) → feature flag check → tier quota lookup → 5MB multipart upload → Supabase Storage put → Anthropic Vision (claude-haiku-4-5-20251001) extraction → `expense_receipts` insert → quota counter increment → DELETE cleanup. A real receipt photo from Okoli's phone returned vendor/amount/date/category at high confidence. The scratchpad #50 invariant (quota only increments on successful extraction) held against a placeholder image: a deliberate Vision-failure write `status='failed'` with full audit row, and `usage_tracking.count` did not advance.
- **Fixed: `scripts/smoke-test-expense-ocr.ts`** — two corrections from the live walk-through. (1) The multipart field name was `'file'`; the route's `form.get('receipt')` expected `'receipt'`. Edited to `form.append('receipt', ...)`. (2) An HTTP-error response with `status='failed'` is the *expected* outcome on an unreadable test image (the gates all passed, Vision just couldn't extract) — the script now treats that combination as a soft-warn and proceeds to steps 3+4 (postflight verification + DELETE cleanup) instead of hard-exiting on the first non-2xx.
- **Added: `scripts/peek-receipt.sh`** — bash inspector that uploads a receipt with `CLEANUP=off`, then jq-pretty-prints the per-business receipt list and offers to `open` the latest 1-hour signed URL in the browser. Reuses the same `TARGET_URL` / `AUTH_COOKIE` / `BUSINESS_ID` env contract as the TS smoke script. Made executable (`chmod +x`). Useful for spot-checking extraction quality during the +4h post-rollout checkpoint without a SQL editor round-trip.
- **Added: `scripts/smoke-test-journeys.sh`** — 30-check pre-Beta route-level smoke: 14 public pages (landing, about, pricing, directory, marketplace, opportunities, grants, research, prices, faq, privacy, terms, contact, signup), 13 authed pages (dashboard, business overview, business setup, invoices list, new invoice, recurring invoices, expenses, customers, products, reports, team, messages, admin), and 3 GET API endpoints (expense-ocr list, business benchmarks, search). Color-coded output with millisecond timing; prints a failure summary at the bottom. Two macOS bash-3.2 portability fixes after the first run: (a) dropped `set -u` from `set -uo pipefail` because empty-array expansion under `-u` errors with "unbound variable" on bash 3.2; (b) replaced `date +%s%3N` (GNU `%N` specifier) with `python3 -c 'import time; print(int(time.time()*1000))'` for portable millisecond timestamps; (c) switched curl invocation to `${cookie_arg[@]+"${cookie_arg[@]}"}` as belt-and-braces against any future `-u` reintroduction. Final run: **30/30 passed** against production. Public pages 200/307, authed pages 200, APIs 200.
- **Added: `docs/runbooks/expense-ocr-rollout.md`** — full controlled-rollout playbook for Monday morning. Sections: (1) Three-layer guardrails (admin kill-switch via `settings.expense_ocr_enabled`, feature flag with allowlist + percentage rollout, tier quota with `period_yyyymm` natural rollover); (2) current pre-rollout state; (3) two-step rollout — Sunday evening Okoli-only allowlist dry-run, then Monday morning either Option A full switch-on or Option B 25→50→100 gradual ramp; (4) emergency procedures — kill-switch SQL (`UPDATE settings SET value='false' WHERE key='expense_ocr_enabled'`) for sub-30-second stop, flag rollback for cohort-specific issues, full nuclear rollback with bucket purge for data-corruption scenarios; (5) known Beta limitations (5MB cap, JPEG/PNG/WebP, ~85% printed / ~40% handwritten confidence, NGN assumed); (6) +1h / +4h / +24h / +48h post-rollout checklist with daily-health SQL paste-blocks; (7) cross-references to the smoke scripts + scratchpad #50 + every related route/migration.
- **Added: `marketing/beta-welcome.md`** — Beta cohort welcome email ready to send Monday 20 April 07:30 WAT via Resend. Two A/B subject lines ("You're in. Welcome to the AgroYield Beta." vs. "The Beta is live, and I built something I think you'll love"), preheader, founder-voice markdown body covering the four shipped Beta features (Verified Badge, Business Reviews, Recurring Invoices, Scan-a-Receipt OCR) with honest disclaimers (printed-receipt confidence ~85%, handwritten ~40%, NGN-only, free tier 20 scans/month), where-to-start CTA, three-channel feedback ladder (in-app Report a Problem → email reply → WhatsApp for critical), plain-text fallback for Resend, internal notes with personalisation tokens, suppression rules (no unverified emails, no admin domains), 3-touch follow-up cadence sketch, and a Resend `fetch()` snippet that mirrors the existing `weekly-digest` cron pattern (no SDK dependency).
- **Fixed: `app/home-client.tsx` — landing-page hydration mismatch (Sentry issue, 4,211 events in 24h on `/`).** The lone Sentry issue on the 24h dashboard turned out not to be lone — it was a 100%-reproducibility hydration error firing on every visitor. Diagnosed via parallel grep + Read: the `Countdown` component's initial state was `useState(calc)` where `calc` read `Date.now()` inline, so SSR resolved against the server clock and client hydration resolved against the browser clock — guaranteed to mismatch on the seconds digit every time. Compounding this, the launch literal `new Date('2026-07-05T00:00:00')` (no `Z` suffix) parsed as UTC on the server and as LOCAL time in the browser, drifting the days/hours/minutes by the user's timezone offset on top of the per-second clock skew. **Fix shipped:** (a) hoisted the launch instant to module scope as `const LAUNCH_MS = new Date('2026-07-05T00:00:00Z').getTime()` — explicit `Z` locks both runtimes to the same absolute millisecond; (b) extracted `calcTimeLeft()` to a pure module-scope function; (c) initialised `useState<TimeLeft | null>(null)` so SSR and the client's first paint render identical markup by construction; (d) moved the live tick + first real calculation into `useEffect`, which by spec only runs after hydration; (e) rendered `—` placeholders for all four units while `time === null`. `npx tsc --noEmit` clean post-fix. The fix lives in code and needs to ship via the next push to Vercel before Beta opens.
- **Added: admin-control batch — moved every post-launch tunable out of code into `settings`, so the founder never has to return to Cursor to retune OCR quotas, add an expense category, or adjust AI Assistant limits.** The trigger was the carried-over Okoli principle — "most of the tasks that lead us back to the code after launch can be controlled from the Admin Dashboard" — paired with the squeeze-it-in-before-Monday instruction. A grep pass across the codebase surfaced ~dozen hardcoded lists and magic numbers with plausible post-launch tune frequency. The two highest-risk ones shipped this session in the same commit as the hydration fix. **Migration:** `supabase/migrations/20260419_admin_controllable_settings.sql` — seeds `settings.usage_limits` (JSON quota grid: `{expense_ocr: {free: 20, pro: 100, growth: null}, ai_assistant: {free: 5, pro: 50, growth: null}}` — byte-identical to the previous hardcoded constant) and `settings.expense_categories` (10-entry JSON array). Idempotent via `ON CONFLICT (key) DO NOTHING`; ends with `NOTIFY pgrst, 'reload schema'`. **Lib rewrite:** `lib/usage-tracking.ts` now exports `SAFE_DEFAULTS` (the old USAGE_LIMITS values) + `getUsageLimits()` async getter with 60s in-memory cache (mirrors `lib/feature-flags.ts`); `checkQuota()` reads from the settings-backed getter instead of the const; back-compat `export const USAGE_LIMITS = SAFE_DEFAULTS` marked `@deprecated` so existing imports don't break. Plus new `lib/expense-categories.ts` — `SAFE_DEFAULT_EXPENSE_CATEGORIES` readonly array + `getExpenseCategories()` with same 60s cache; `parseList()` accepts native array, JSON string, or comma-separated. Both libs export `__clearCache()` helpers for tests. **Route rewiring:** `/api/expense-ocr` removes the hardcoded 10-entry category array; `callVision()` now takes `categories` as a parameter used both in the Vision prompt interpolation AND the response validator (`categories.includes(obj.suggested_category)`); GET handler reads `getUsageLimits()` instead of the const. `/api/content-types` extended to also serve `expenseCategories` (so the `'use client'` Expenses page can consume without pulling the server-only supabase admin client into the browser bundle — scratchpad #53's client-vs-server caveat). **Client page:** `app/business/expenses/page.tsx` renamed `CATEGORIES` → `FALLBACK_CATEGORIES` (kept at module scope so SSR and first-paint markup are identical — scratchpad #51), added a mount-time fetch to `/api/content-types` that swaps in the dynamic list once loaded, with the fallback rendering during the loading window. **Marketing copy auto-tracks enforcement:** `/pricing` page now calls `getUsageLimits()` server-side and passes `usageRows` to `pricing-client.tsx`, which appends "Receipt scans per month: {n}" rows to each tier's feature list — so an admin retune updates the pricing-page copy on next request without any code change. **Admin UI:** `app/admin/admin-client.tsx` adds two new cards — "Usage Limits (Monthly)" in the Pricing & Subscriptions section (per-feature 3-column grid across Starter/Pro/Growth with number input + Unlimited checkbox; tickbox sets value=null and disables input) and "Expense Categories (Receipt OCR + Expenses Page)" in the Content & Moderation section (pill-list editor with add/remove, length ≤32, case-insensitive dedupe). **Option B mid-month protection:** Save button goes through `handleSaveClick` preflight — if `usage_limits` changed, a confirmation modal opens showing a `Feature | Tier | From | To` diff table with Cancel + "Apply changes" buttons; quota tightening can lock out users mid-month so explicit acknowledgement is worth the extra click. **Write-time validation (scratchpad #18 in flight):** `app/api/admin/settings/route.ts` gains a `validateValue(key, rawValue)` function — for `usage_limits`, requires object with `expense_ocr`+`ai_assistant` each with `free`/`pro`/`growth` keys, values null (unlimited) or non-negative integers ≤1,000,000; for `expense_categories`, array of 1–30 entries, each 1–32 chars trimmed, no case-insensitive duplicates. Validator runs preflight before any write and rejects the ENTIRE batch (400) if any single value is malformed — so the admin sees a clear error message instead of a partial save that silently falls back to SAFE_DEFAULTS at read time. **Bucket C promotions (same commit):** two more hardcoded knobs followed the same pattern into `settings`. (i) `expense_ocr_vision_model` — the Anthropic model id used by the receipt OCR Vision path (was `DEFAULT_MODEL` in `/api/expense-ocr/route.ts`). Seeded `'claude-haiku-4-5-20251001'`. `lib/usage-tracking.ts` gains `ALLOWED_VISION_MODELS` (haiku-4-5-20251001, sonnet-4-6, opus-4-6), `getVisionModel()` async getter with the standard 60s cache + fail-open to the default, plus `__clearVisionModelCache()`. The expense-ocr route threads the chosen model through `callVision()` and the failed-row insert's `model_used` audit column. (ii) `recurring_template_cap` — per-business limit of ACTIVE recurring-invoice templates (was `MAX_ACTIVE_PER_BUSINESS = 50` in `/api/recurring-invoices/route.ts`). New `lib/recurring-limits.ts` mirrors the usage-tracking pattern: `SAFE_DEFAULT_RECURRING_CAP = 50`, bounds `[1, 1000]`, `getRecurringTemplateCap()` with 60s cache, fail-open on DB error. Route POST now reads the cap dynamically and returns the literal cap in the 409 error message so the admin-facing message auto-updates too. Admin UI adds a "Receipt OCR Vision Model" allowlist dropdown (3 options with cost/accuracy hints) and a "Recurring Template Cap" number input (1–1000) in the Pricing & Subscriptions section. `saveSettings()` PATCH payload includes both new keys; validator in `/api/admin/settings/route.ts` rejects out-of-allowlist vision-model values and non-integer or out-of-range cap values with a clear 400 before any write. Rationale: both are the highest-ROI post-launch tune points on their respective features — handwritten-receipt accuracy complaints during Beta Week 1 are the most-likely OCR regression (model swap from Haiku to Sonnet takes 30 s from /admin instead of a redeploy), and an enterprise trial lifting the 50-template cap was already on the pre-launch wishlist. Both behaviours are byte-identical to the retiring constants on first deploy (default values match).
- **Added: ROADMAP scratchpad #51 + #52 + #53** — `useState(initFn)` + `Date.now()` is a hydration bomb (rule: any state initialiser that reads a side-effectful global must move into useEffect, and every date literal must end in `Z`); "investigate the lone Sentry issue" was the highest-ROI pre-Beta task this week (rule: read Sentry counts as `events / unique_users` not raw totals; triage every open issue on launch-affected surfaces before any rollout-gate flip); and settings-backed constants with SAFE_DEFAULTS + 60s cache + write-time validators + Option B confirmation is the right pattern for any tunable the founder will want to change post-launch — client components access via API extensions, not direct imports of server helpers, and initial render uses the static fallback so hydration cannot disagree.
- **Verified: monitoring pipeline is live.** Both Sentry (`NEXT_PUBLIC_SENTRY_DSN` wired into `instrumentation-client.ts` + `sentry.server.config.ts`) and PostHog (`NEXT_PUBLIC_POSTHOG_KEY` + `_HOST` in `app/components/PostHogProvider.tsx`) are reporting from production — confirmed via the dashboards directly. PostHog showing `$pageview` history as expected; Sentry showing the now-fixed hydration issue plus zero other errors. Dashboard observation > regex-grep of inlined HTML for telemetry verification (some chunks load asynchronously and never appear in the first-byte payload).
- **Verified.** `./node_modules/.bin/tsc --noEmit` → EXIT=0. `./scripts/smoke-test-journeys.sh` → 30/30 passed. End-to-end Expense OCR walk-through against production → green at every layer. Sentry + PostHog dashboards live.
- **Deploys.** Four things are needed before Beta opens Monday morning: (1) paste `supabase/migrations/20260419_admin_controllable_settings.sql` into the Supabase SQL editor BEFORE promoting this commit — without it the new admin cards will save but `getUsageLimits()` / `getExpenseCategories()` will fall through to SAFE_DEFAULTS (harmless, but enforcement edits won't take effect until the seed rows exist). Byte-identical defaults means zero behaviour change on first deploy; (2) `git commit && git push` this session's changes so the Countdown hydration fix + admin-control batch land in production — without this, every Beta welcome-email recipient who lands on `/` will trigger 4,000+ Sentry events again, and the admin retune workflow won't exist yet; (3) Sunday evening 20:00 WAT — run the Okoli-only allowlist dry-run per `docs/runbooks/expense-ocr-rollout.md` Step 1; (4) Monday 07:00 WAT — flip `expense_ocr.enabled = true` in `/admin` → Feature Flags tab, then send the Beta welcome email per `marketing/beta-welcome.md`.
- **Next.** After the +48h post-Beta checkpoint passes, pivot to **Unicorn #6 Credit Score** (Week 4 Thu–Sun). The lender BD collateral (spec sheet + 6 cold letters in `/Documents/AgroYield Docs/`) is already drafted from Checkpoint 24, so the first-week #6 work is purely engineering: schema design + scoring engine + API + admin override flow.

### Checkpoint 30 — April 18, 2026 (Unicorn #5 Expense OCR — SHIPPED, Week 3 Thu–Sun)

- Shipped Unicorn #5 Expense OCR end-to-end in a single session, reusing the gate-stacking and defence-in-depth patterns from #4. Receipt photo → Anthropic Vision (Claude Haiku 4.5) → editable review form → commits to the existing `business_expenses` table. Per-business monthly quota (Free 20 / Pro 100 / Growth unlimited) with natural calendar-month rollover — no reset cron needed.
- Added: `supabase/migrations/20260418_expense_ocr.sql` — two new tables plus storage bucket policies. `expense_receipts` holds the upload metadata + extracted fields + `raw_extraction jsonb` audit trail + status enum (pending/reviewed/discarded/failed) + confidence + model_used (for later eval comparisons when we A/B test vision models). FKs to businesses, auth.users, and business_expenses. `usage_tracking` is a per-business monthly counter keyed on `(business_id, feature_key, period_yyyymm)` with a UNIQUE constraint for atomic upsert. Storage policies gate the `receipts` bucket by business ownership (path: `{businessId}/{uuid}.{ext}`). Admin kill-switch `settings.expense_ocr_enabled = 'true'` mirrors recurring_invoices pattern. Full RLS on both tables. `NOTIFY pgrst, 'reload schema'`.
- Added: `lib/usage-tracking.ts` — typed `UsageFeatureKey` + `USAGE_LIMITS` single-source-of-truth (expense_ocr: free=20, pro=100, growth=null). `getMonthlyUsage()` reads, `incrementUsage()` does atomic increment via insert-or-fallback-to-update on unique-constraint conflict, `checkQuota()` returns {allowed, used, limit, reason, upgradeToTier}. Period is calendar-month UTC — pricing copy says "20 receipts/month" so calendar matches user expectations (rolling-window quotas are confusing).
- Added: `app/api/expense-ocr/route.ts` — POST accepts multipart/form-data (receipt + businessId), layered gates: rate-limit 5/min/IP → auth → kill-switch → feature flag `expense_ocr` → business ownership → tier quota → file validation (jpg/png/webp, ≤5MB) → upload to Storage → Vision via direct `fetch('https://api.anthropic.com/v1/messages', ...)` (no SDK dependency — matches Resend-via-fetch pattern) → insert pending `expense_receipts` row → increment usage counter ONLY on successful extraction. Scratchpad #50: quota increment AFTER expensive work, not before, so a Vision failure doesn't burn the user's quota. GET returns current usage + tier + recent receipts for the modal's counter.
- Added: `app/api/expense-ocr/[id]/route.ts` — PATCH commits user-edited values to `business_expenses` (chosen so existing Expenses page + reports + charts light up automatically with no other page changes), links back via `expense_receipts.expense_id` + flips status='reviewed'. Idempotent on duplicate PATCH. DELETE soft-discards + removes the storage object.
- Added: `app/business/expenses/ReceiptScanButton.tsx` — 4-stage client modal: upload (mobile `capture="environment"` opens rear camera directly) → extracting (spinner) → review (editable prefilled form, low-confidence warning if <0.75) → saving. Usage counter in the modal header; upgrade nag at 75%+ utilisation on Free tier. Every server error surfaces in a red box in the modal — no silent fire-and-forget per scratchpad #49.
- Changed: `app/business/expenses/page.tsx` — imports + renders `ReceiptScanButton` next to "+ Add Expense". Passes the business ID + reload callback so the table refreshes after a successful commit.
- Added: `app/api/cron/usage-reset/route.ts` + `vercel.json` entry (`10 0 1 * *` = 00:10 UTC on the 1st). Not a destructive reset — natural period_yyyymm rollover handles that. The cron logs per-feature monthly summary (total events, unique businesses) to cron_runs metadata for observability/billing reconciliation, and prunes usage_tracking rows older than 12 months for retention.
- Added: Scratchpad #50 in ROADMAP.md (Quota Increment Belongs AFTER The Expensive Work, Not Before). Read-check-work-increment pattern for any quota-gated feature where the underlying work can fail for non-user reasons (Vision, AI Assistant, Credit Score refresh). Natural monthly rollover via unique-period-key means no reset cron is strictly needed.
- Verified: `./node_modules/.bin/tsc --noEmit` clean (EXIT=0) on first pass.
- Deploys: **Three manual Supabase steps before the feature works:** (1) paste `20260418_expense_ocr.sql` into SQL editor; (2) create storage bucket `receipts` in Dashboard → Storage → New bucket (public: NO, 5MB limit, MIMEs: image/jpeg,image/png,image/webp) — the bucket must exist BEFORE the storage.objects policies in the migration can apply; (3) when ready for rollout, flip `expense_ocr` ON in `/admin` → Feature Flags tab (no SQL needed — admin UI already exists per Checkpoint 29). **Env var:** `ANTHROPIC_API_KEY` must be set in Vercel Production + Preview environments before the first real upload.
- Next: Unicorn #5 Week 4 Mon–Wed tail is already covered by the usage-reset cron + tier gating shipped here. Pivot directly to **Unicorn #6 Credit Score engine** (Week 4 Thu–Sun). BD collateral is already in `/Documents/AgroYield Docs/` (spec sheet + 6 cold letters for Carbon/FairMoney/Renmoney/LAPO/OPay/Moniepoint) — no parallel doc work needed.

### Checkpoint 29 — April 18, 2026 (Recurring Page Empty-State Bug — FIXED — Two Independent Causes)

- Bug: Okoli reported that two recurring invoices had been created but `/business/invoices/recurring` was still showing the empty state "No recurring invoices yet." After the first round of fixes (FK migration + page error surfacing), the bug persisted. **A SQL diagnostic — `select count(*) from recurring_invoices` returning `0` — proved the rows weren't in the table at all.** Investigation surfaced two independent bugs that compounded.
- **Cause #1 (read-side, false lead but worth fixing anyway):** `20260418_recurring_invoices.sql` declared `customer_id uuid NOT NULL` without a `REFERENCES customers(id)` clause. The page query used PostgREST's `customers(name)` nested-select syntax to embed the customer name — which requires a foreign-key constraint to resolve. Without the FK, Supabase returned "Could not find a relationship between 'recurring_invoices' and 'customers' in the schema cache", the page discarded the error (only destructured `data`, not `error`), and `data` fell to null → rows.length === 0 → empty state. The existing invoices page works because someone manually added the FK on `invoices.customer_id` via the Supabase dashboard at some point — the baseline migration for `invoices` has the same gap.
- **Cause #2 (write-side, the actual blocker):** `recurring_invoices` is one of the 8 unicorn flags seeded as `is_enabled = false` in `20260417_feature_flags.sql` (correct, deliberate — staged-rollout default per F3 spec). When Okoli ticked "Make this recurring" and submitted, `/api/recurring-invoices` POST returned 403 with `{ error: "Recurring invoices aren't available for your account yet" }`. The new-invoice page's POST was wrapped in `try { await fetch(...) } catch { /* non-blocking */ }` — but `await fetch()` only throws on network errors; HTTP 4xx/5xx resolves normally with `res.ok = false`. The bare catch caught nothing. User got a regular invoice + zero indication their recurring schedule didn't save.
- Added: `supabase/migrations/20260418_recurring_invoices_fks.sql` — idempotent follow-up migration that adds three foreign keys: `customer_id → customers(id) ON DELETE RESTRICT` (blocks orphaning live templates), `user_id → auth.users(id) ON DELETE CASCADE`, re-asserts `business_id → businesses(id) ON DELETE CASCADE`. Each FK wrapped in `DO $$ ... IF NOT EXISTS ... END$$`. Ends with `NOTIFY pgrst, 'reload schema'` to refresh PostgREST cache live.
- Changed: `app/business/invoices/recurring/page.tsx` — two-step fetch (recurring_invoices, then customers via `.in()`) instead of FK embed. Destructures `error` and renders visible red error box.
- Changed: `app/business/invoices/new/page.tsx` — recurring POST now checks `res.ok`, reads error body, and stashes human-readable warning in `sessionStorage.recurring_create_warning`. Network throws follow same path. Console-logs the failure for Vercel observability.
- Added: `app/business/invoices/[id]/RecurringCreateWarning.tsx` — client component that reads `sessionStorage.recurring_create_warning` on mount, renders dismissible amber banner with link to `/business/invoices/recurring`, then clears the key so reload doesn't re-show.
- Changed: `app/business/invoices/[id]/page.tsx` — imports + renders `RecurringCreateWarning` above the header.
- Added: Scratchpad #48 in ROADMAP.md (PostgREST Nested Selects Need FKs — And A Missing FK Silently Hides Rows). Two go-forward rules: every uuid column that names a parent table must have an explicit REFERENCES clause in the migration that creates it; every server-rendered query must destructure `error` and render it visibly.
- Added: Scratchpad #49 in ROADMAP.md (Feature-Flag-Default-False + Fire-And-Forget UI = Phantom Success). Two go-forward rules: any "non-blocking" fetch after a successful primary write must still surface non-2xx — "best-effort with visible failure", not "fire and forget"; the admin flag-toggle UI already exists at `/app/admin/tabs/FeatureFlagsTab.tsx` (super-admin-only, PATCH `/api/admin/feature-flags` audit-logged) — this was a discoverability failure, not missing tooling. The SQL flip could have been one click. Rollout checklist for future default-false flags: confirm the flag row appears in `/admin` → Feature Flags tab (it will — the tab reads all rows from the table) and click-through the toggle once per flag.
- Verified: `./node_modules/.bin/tsc --noEmit` clean (EXIT=0).
- Deploys: **Two manual steps needed in Supabase, both before the feature works:** (1) paste `20260418_recurring_invoices_fks.sql` into SQL editor (makes the page query resilient); (2) run `update feature_flags set is_enabled = true where key = 'recurring_invoices';` (this is what actually unblocks writes — without it the API keeps returning 403 silently). Flag flip takes effect after the 60s in-memory cache TTL in `lib/feature-flags.ts`.
- Next: Unicorn #5 Expense OCR per Week 3 Thu–Sun in UNICORN_SPRINT. The admin feature-flag toggle UI already exists (super-admin → `/admin` → Feature Flags), so #5 will be flippable from day one without any additional tooling work.

### Checkpoint 28 — April 18, 2026 (Unicorn #4 Recurring Invoices — SHIPPED)

- Added: `supabase/migrations/20260418_recurring_invoices.sql` — new `recurring_invoices` table. Columns: template fields (`document_type, notes, apply_vat, vat_rate, delivery_charge, due_days`), `line_items jsonb` (avoids a separate recurring_invoice_items sub-table — items are only materialised when a real invoice is generated), schedule state (`start_on, next_run_on, last_run_on, end_on, status`), observability (`last_error, generated_count`), plus standard id/business_id/user_id/customer_id/cadence columns. CHECK constraint on `cadence IN ('weekly','monthly','quarterly')` and `status IN ('active','paused','ended')`. Partial index `(next_run_on) WHERE status='active'` keeps the cron scan cheap as ended rows pile up. Plus `(business_id, status)` for list views and `(user_id)` for owner audits. Full RLS: SELECT/UPDATE/DELETE gated on (template owner OR business owner); INSERT WITH CHECK requires both `user_id = auth.uid()` AND business ownership. Service role bypass is used by the cron. `updated_at` trigger included. Seeds `settings.recurring_invoices_enabled = 'true'` as the admin kill-switch row.
- Added: `app/api/recurring-invoices/route.ts` — three verbs. **POST** has Pro+ gate (reads `profiles.subscription_tier` and applies `getEffectiveTier`, returns 402 for free), feature-flag gate via `isFeatureEnabled('recurring_invoices', { userId, businessId })`, business ownership check, rate limit 10/min/IP, sanitised line items with quantity/unit_price validation, per-business cap of 50 active templates. **PATCH** handles `action: 'pause' | 'resume' | 'end'` plus template edits (cadence, notes, VAT, delivery, due_days, lineItems, endOn) — the resume branch bumps `next_run_on` forward if it's in the past so paused-for-a-while templates don't back-generate on the next cron tick. **DELETE** is soft-end (sets status='ended') — rows are kept for audit. All writes through the service-role admin client for cleaner errors; defence-in-depth with RLS (same pattern as business_reviews per scratchpad #42).
- Added: `app/api/cron/recurring-invoices/route.ts` — daily cron wrapped in `runCron` with `dailyKey()`. Admin kill-switch read (`settings.recurring_invoices_enabled`); bulk pre-fetch of businesses/customers/profiles to avoid N+1; per-row try/catch so one bad template never poisons the batch. Flow per row: Pro+ check → flag check → line_items validation → increment `businesses.invoice_counter` (abort before invoice insert on counter failure, so no duplicate numbers) → insert `invoices` row (status='sent') + `invoice_items` → Resend email to `customers.email` if present (best-effort; failure surfaces in `last_error` but doesn't block invoice creation) → advance `next_run_on` by cadence + clear `last_error` + increment `generated_count`; if `next_run_on > end_on` flip status to `ended`. Metadata returned: `skipped_tier`, `skipped_flag`, `email_sent`, `email_failed`.
- Added: `app/business/invoices/recurring/page.tsx` — server component listing a business's recurring templates with customer name, cadence, next-run, last-run, end date, generated count, and `last_error` if any. Empty state explains the "Make this recurring" flow. Hands rows to the client list.
- Added: `app/business/invoices/recurring/RecurringInvoicesList.tsx` — client component rendering per-row cards with Pause / Resume / End buttons that PATCH `/api/recurring-invoices`. Optimistic state flip + revert on error. End button gated behind a confirm() since it's destructive to the schedule.
- Changed: `app/business/invoices/new/page.tsx` — added "Make this recurring" toggle + cadence picker below the VAT block in the Notes panel. The toggle is fully disabled and shows a `Pro+` badge for free users (with an upgrade link to `/pricing`); for Pro+ users the cadence picker appears when the toggle is on. After the initial invoice successfully inserts, a non-blocking POST to `/api/recurring-invoices` creates the template (startOn = today + one cadence step, so the customer gets today's invoice now and the next one on schedule). Template-POST failures don't block navigation to the new invoice.
- Changed: `app/business/invoices/page.tsx` — new "🔁 Recurring" nav button alongside the "+ New Document" button, linking to `/business/invoices/recurring`.
- Changed: `app/admin/admin-client.tsx` — added `recurringInvoicesEnabled` state (reads `settings.recurring_invoices_enabled !== 'false'`), persisted in `saveSettings`, rendered as a toggle in the Email & Cron section (same pattern as digest / celebrations / expire-featured), and surfaced in the `emailBadges` summary chips.
- Changed: `vercel.json` — registered `/api/cron/recurring-invoices` at `"0 6 * * *"` (06:00 UTC = 07:00 WAT). Chosen before the existing 07:00 UTC weekly-digest slot so recurring invoices always go out before any same-day platform emails.
- Note: WhatsApp delivery is intentionally not wired into the cron. The invoice email template reuses the SENDERS.noreply address and escapes all user-provided fields via `escapeHtml`. WhatsApp will plug in alongside Unicorn #3 once Termii approves a recurring-invoice message template.
- Verified: `npx tsc --noEmit` clean (EXIT=0).
- Deploys: ⚠️ `20260418_recurring_invoices.sql` must be pasted into the Supabase SQL editor before the code is promoted to production (scratchpad #30 — Vercel doesn't run migrations). The code tolerates the missing table only on the recurring list page, which will 400; the cron will also 500 on first run.
- Next: Unicorn #5 Expense OCR per Week 3 Thu–Sun in UNICORN_SPRINT. #3 WhatsApp Templates still blocked on Termii approval.

### Checkpoint 27 — April 18, 2026 (#2 Public Business Pages — Verified Badge + Business Reviews → #2 9/9 SHIPPED)

- Added: Two migrations close out the remaining #2 gaps.
  - `supabase/migrations/20260418_business_verified.sql` — `businesses.is_verified boolean NOT NULL DEFAULT false` + `businesses.verified_at timestamptz`. Partial index `idx_businesses_is_verified WHERE is_verified = true` keeps the admin "Verified" filter fast even as the unverified long tail grows. No backfill — chip only appears after an admin explicitly verifies.
  - `supabase/migrations/20260418_business_reviews.sql` — new `business_reviews` table mirroring `product_reviews` (rating 1–5, headline, body, seller_reply, replied_at, published, created_at). Unique index `(business_id, reviewer_id)` prevents brigading at the DB level. Three RLS policies: SELECT (published OR reviewer OR owner OR admin), INSERT (reviewer = auth.uid() AND NOT the business owner — self-review blocked at RLS), UPDATE (reviewer OR owner OR admin with matching WITH CHECK). No DELETE granted — retractions go through edit or support.
- Added: `app/api/admin/business/route.ts` — PATCH with `verify` / `unverify` actions. Base `is_admin` gate (any admin, matching `verify_institution`). Updates `is_verified` + `verified_at`. Logs `business.verify` / `business.unverify` to `admin_audit_log`.
- Added: `app/api/business-reviews/route.ts` — POST creates a review (auth required, business-owner self-review blocked, 3-per-user-per-24h rate limit keyed on user id, `sanitiseText` on headline + body, unique-violation `23505` returns 409 with a reviewer-friendly "edit existing review instead" message). PATCH supports two paths: the original reviewer editing their review (rating / headline / body) OR the business owner posting a `seller_reply` — auto-detected by matching `auth.uid()` to `reviewer_id` vs `businesses.user_id`; cross-mode writes rejected at the API layer.
- Added: `app/api/admin/business-review/route.ts` — PATCH `hide` / `restore` for admin moderation of reviews. Super admin bypass; moderators gated on the `reports` permission. Logs `business_review.hide` / `business_review.restore`. This is distinct from the auto-hide-on-threshold flow inside `/api/report` POST, which stays put.
- Added: `app/b/[slug]/WriteReviewButton.tsx` — client component with star picker, 150-char headline, 4000-char body, inline errors. POSTs to `/api/business-reviews`. Page-reloads after success so the new review renders.
- Changed: `app/b/[slug]/page.tsx` — `BusinessRow` + `BUSINESS_SELECT` extended with `user_id, is_verified, verified_at`. Verified chip with checkmark icon renders next to the `<h1>` when `is_verified = true`. New Reviews section between Payment Details and the Follow CTA: average rating + count, list of published reviews (reviewer avatar/name, stars, date, optional headline/body, seller_reply thread styled as a green-border aside), `WriteReviewButton` rendered for logged-in non-owners who haven't already reviewed, gentle "sign in to review" link for anonymous visitors when the section is empty, and per-review `ReportButton` (hidden on own review) using the new `business_review` post type.
- Changed: `app/api/report/route.ts` — `postType` union extended with `business_review`. Auto-hide branch switches on the post type: business_review uses `published: false` against `business_reviews` (matches the table's moderation column); everything else still hits `is_active: false` on opportunities / marketplace_listings / research_posts / price_reports. Slack-alert and notification-email `postLabel` + `postPath` cases added (`postPath = 'admin'` — reviews moderate from the Reports tab, they don't have a dedicated public URL).
- Changed: `app/api/admin/reports/route.ts` — DELETE restore extended. business_review restores `published: true`; other types now correctly route research→`research_posts`, price_report→`price_reports`, listing→`marketplace_listings` (previously only opportunity and listing branches existed, which silently restored research/price reports to the listings table).
- Changed: `app/admin/page.tsx` — `ReportGroup.postType` union extended with `business_review`. New `business_reviews` fetch (latest 1000) feeds a third grouping branch that displays the review headline, or a 60-char body preview, or `Review (N★)` fallback. `businesses` SELECT extended to include `slug, is_public, is_verified, verified_at` for the new tab.
- Changed: `app/admin/admin-client.tsx` — `Business` interface extended with the new fields. `Tab` union + `regularTabs` + `TAB_PERMISSION` add `'businesses'` (shares the `marketplace` permission). New tab UI: search (name / slug / owner), verified/unverified/all filter pill, per-business row with name + Verified/Private chips + owner + clickable `/b/{slug}` link + Verify/Unverify button wired to `/api/admin/business`. `removeReportedPost` extended with a `business_review` branch calling `/api/admin/business-review` with `action: 'hide'`. `dismissReports` updated so the generic listings fallback no longer applies to business_review (it has no local state to mutate).
- Changed: `app/components/ReportButton.tsx` — `postType` prop union extended with `business_review`. No logic changes.
- Result: **#2 Public Business Pages is now 9 of 9 shipped.** Week 2 block can flip to ✅.
- Verified: `npx tsc --noEmit` clean (EXIT=0).
- Deploys: Migrations do NOT auto-ship (per scratchpad #30). Both `20260418_business_verified.sql` and `20260418_business_reviews.sql` must be pasted into the Supabase SQL editor before the admin Businesses tab, the public `/b/{slug}` chip, or the reviews API will work in production. Code-only changes are safe to ship first — the UI tolerates missing columns only insofar as the chip simply won't render (is_verified defaults to false after migration); the reviews fetch will 400 until the table exists, so run the migrations before promoting the branch.
- Next: per Okoli's direction, move to Unicorn #4 Recurring Invoices. #3 SMS is skipped this week — WhatsApp template approval still pending on Termii's end.

### Checkpoint 26 — April 18, 2026 (#2 Public Business Pages — JSON-LD + Follow CTA Shipped)

- Added: LocalBusiness JSON-LD structured data on `/b/[slug]`. Server-built payload with conditional fields (name, url, slogan, description, logo, image, telephone, email, PostalAddress with `addressCountry: 'NG'`, foundingDate, openingHours, knowsAbout, sameAs). Empty/null fields omitted rather than emitted as blanks. `<` → `\u003c` escape on the stringified JSON prevents `</script>` breakout inside the inline script tag.
- Changed: anonymous-visitor footer CTA on `/b/[slug]` rewritten from generic "Create free account / Sign in" to a follow-specific wedge. Primary button: "Follow {b.name}" → `/signup?intent=follow_business&biz={encodeURIComponent(slug)}`. Secondary: "Already a member? Sign in" → `/login?next=/b/{slug}` so returning members bounce back to the business page after auth. Supporting copy now reads "Get updates from {b.name}, message them directly, and discover other Nigerian agri businesses."
- Note: This is the codebase's first `dangerouslySetInnerHTML` use. Narrowly scoped to a server-built object literal (not user HTML) with `<` pre-escaped. Previous Phase 4.5 audit's "zero uses" claim is now superseded for JSON-LD specifically. Rationale captured as ROADMAP scratchpad entry #41. No DOMPurify needed — all source fields are sanitised at the API boundary per Phase 4.5.
- Note: Post-signup auto-follow wiring (reading `searchParams.intent` on `/signup` and triggering a follow of the business owner) is a separate follow-up task — not blocking launch. The URL contract is now stable so the backend step can land any time.
- Docs: UNICORN_SPRINT.md Week 2 #2 block promoted 2 of 4 gaps from ⚠️ to ✅; changelog entry added. ROADMAP.md scratchpad entry #41 documents the JSON-LD `dangerouslySetInnerHTML` security rationale.
- Verified: `npx tsc --noEmit` clean.
- **#2 Public Business Pages status after this checkpoint:** 7 of 9 sub-items shipped (landing page, products list, OG metadata, sitemap, robots.txt, JSON-LD, Follow CTA). 2 gaps remain: verified badge (~1 hr — schema + admin toggle + render), business reviews (~3 hr — new table + RLS + UI).

### Checkpoint 25 — April 18, 2026 (Verification Pass — Phase 4.5 Re-audit + F3 / #1 / #2 State Reconciliation)

- Re-verified: **Phase 4.5 Security Hardening fully in place.** Previous session had reported the work missing due to a broken workspace mount; this session confirmed otherwise. All 10 target files (`lib/sanitise.ts`, `lib/safe-href.ts`, `app/api/opportunities/route.ts`, `app/api/marketplace/route.ts`, `app/api/research/route.ts`, `app/api/messages/send/route.ts`, `app/api/profile/route.ts`, `app/api/prices/route.ts`, `app/api/contact/route.ts`, `app/api/waitlist/route.ts`), the 5 client-side URL guard pages, and `next.config.ts` CSP + 5 security headers all present with correct implementations. `npx tsc --noEmit` clean. No code changes made.
- Re-verified: **F3 Feature Flag Table SHIPPED** (contrary to UNICORN_SPRINT.md line 123 claiming "still pending"). `supabase/migrations/20260417_feature_flags.sql` (table with RLS, `updated_at` trigger, 8 seeded unicorn keys) + `lib/feature-flags.ts` (118 lines — `isFeatureEnabled({ userId, businessId })` with global/user-allowlist/business-allowlist/percentage-rollout logic, 60s cache, fail-closed). Committed 17 Apr 2026.
- Re-verified: **#1 Weekly Digest SHIPPED.** `app/api/cron/weekly-digest/route.ts` (879 lines) is a full Unicorn #1 implementation — Monday 07:00 Africa/Lagos via `runCron` harness, idempotent per ISO week, personalises 4 modules per user (top 3 price swings in state, matched opportunities + grants via interests intersection, unread messages count, business insight on revenue/collection delta). Double-gated by `weekly_digest` feature flag + `settings.digest_enabled` admin kill switch. Graceful fallbacks for empty interests/location.
- Audited: **#2 Public Business Pages partially shipped.** Five of nine sub-items complete: `/b/[slug]` landing page (cover/logo/tagline/about/contact/socials/hours/founded year/alias-redirect), products list from `business_products` (active, ordered, limit 50), Open Graph metadata + canonical URL, dynamic sitemap (`app/sitemap.ts` — 8 static routes + up to 5k public businesses), robots.txt (`app/robots.ts` — allows `/`, `/b/`, `/u/`; blocks all authenticated surfaces). Four gaps identified: (1) verified badge rendering — no `is_verified` column exists on `businesses` (only on `profiles`); original F1 delivery note claimed this was shipped but the code has no badge element. (2) Business-level reviews — `product_reviews` is product-scoped; no `business_reviews` table. (3) Follow CTA for logged-out visitors — current footer is generic "Create account / Sign in"; no follow-intent wedge. `FollowButton` exists but is user-scoped. (4) LocalBusiness JSON-LD structured data — zero `application/ld+json` scripts on `/b/[slug]`. Estimated total to close all four: ~5 hrs.
- Corrected doc drift: ROADMAP.md Phase 4.10 "Delivered" list — removed stale "verified badge" claim from the `/b/[slug]` rendered-elements line; now accurately lists what actually renders and flags the badge as a Week 2 #2 gap. UNICORN_SPRINT.md — F3 status changed from "still pending" to "✅ SHIPPED (17 Apr 2026)" with delivery details; #1 Weekly Digest Wed–Fri block marked ✅ SHIPPED with spec confirmation; Week 2 #2 block rewritten as ⏳ PARTIAL with the five-shipped / four-pending split; F1 changelog "sitemap/robots still pending" corrected since both have shipped; 18 Apr Session 2 changelog entry added.
- Added: ROADMAP.md scratchpad entries #38 (Doc Drift Is Silent Until You Grep the Code), #39 (Phase 4.5 Re-verification Is a Free Canary), #40 (#2 Public Business Pages — Four Gaps, Known Effort + sequencing rationale: JSON-LD → Follow CTA → Verified badge → Reviews).
- **Note:** No code, schema, migration, or deployment changes in this checkpoint. Pure verification + doc reconciliation. Workspace mount confirmed healthy at `/sessions/trusting-lucid-heisenberg/mnt/agroyield-network`.

### Checkpoint 24 — April 18, 2026 (Lender Outreach Collateral — BD Documentation)

- Added: `/Documents/AgroYield Docs/AgroScore-Spec-Sheet-v1.docx` — one-page lender-facing technical spec for AgroScore. Sections: Summary, Input Signals v1 (5-factor table: Invoice Volume & Cadence, Collection Rate, Business Tenure, Expense Discipline, Sector Volatility), Sub-Sector Calibration (crop, poultry, aquaculture, horticulture, livestock, agri-processing), Output Schema (compact JSON with `business_id`, `agro_score`, `grade`, `sub_sector`, `consent_ref`, `sub_factors`, `generated_at`), Integration Patterns (A Risk-signal API / B Pre-qualified referral / C Cohort underwriting pilot), Methodology & Status. Intentionally NDA-gates per-factor weights and backtest AUC — no made-up numbers at pre-launch stage.
- Added: `/Documents/AgroYield Docs/AgroYield-Lender-Outreach-Letters-v2.docx` — 6 letters, one per page, addressed to Carbon, FairMoney, Renmoney, LAPO, OPay, Moniepoint. Standard signOff: "Chijioke Okoli, Founder, AgroYield Network, okolichijiokei@gmail.com · agroyield.africa".
- Changed: Founder signature across all outreach collateral corrected from "Chijiokei" → **"Chijioke"** (the trailing `i` was an email-handle artefact, not the name spelling).
- Changed (Carbon letter): "anonymised sample so we can see how AgroScore distributes" → "synthetic distribution so we can see how AgroScore spreads" — pre-launch credibility, no real-user data has been shared.
- Changed (FairMoney letter): "anonymised distribution against a synthetic portfolio" → "synthetic distribution against a model portfolio" — same reasoning.
- Changed (Renmoney letter): "We measure NPL divergence over six months" → "We measure early-warning divergence over a full agri cycle (nine to twelve months)" — realistic ag-cycle window; 6 months is too short to observe poultry/aquaculture default patterns.
- Changed (OPay letter): "anonymised AgroScore distribution" → "synthetic AgroScore distribution" — consistent with Carbon/FairMoney fix.
- Changed (Moniepoint letter): "across tens of thousands of SMEs via your POS footprint" → "across the SME footprint served by your POS estate" (scale claim softened — we don't have numbers on their SME count); "a few thousand overlapping" → "overlapping".
- Fixed (docx rendering): first render of letters produced 7 pages with a phantom blank page 2 because `docx-js`'s standalone `PageBreak` paragraph forces an extra empty page. Resolved by switching to `pageBreakBefore: true` on the first paragraph of each subsequent letter's letterhead and removing the separator loop. Carbon letter keeps `letterhead(false)`; the other five use `letterhead(true)`. Final render: 6 pages.
- Fixed (docx rendering): spec sheet v1 first render spilled to page 2. Compressed body font to 9pt (size 18), reduced spacing (before 0, after 40, line 240), collapsed JSON schema from 16 lines to 6, dropped an unverified "Supabase eu-central-1" infra line and the standalone "Revenue share" marker. Final render: one page.
- Updated: `.auto-memory/user_okoli.md` — added explicit rule "full name is **Chijioke Okoli**, NOT Chijiokei" to prevent the email-handle misreading recurring in future sessions.
- **Note:** No code, schema, migration, or deployment changes in this checkpoint. Pure BD collateral. Outreach is gated on (a) named-addressee research per target lender and (b) founder@agroyield.africa email alias being live before sending.

### Checkpoint 23 — April 17, 2026 (F1 Public Business URLs + Showcase Migration — Phase 4.10)

- Added: `supabase/migrations/20260418_business_showcase.sql` — idempotent `ADD COLUMN IF NOT EXISTS` for 8 showcase columns on `businesses`: `tagline`, `about`, `cover_image_url`, `website`, `instagram`, `facebook`, `opening_hours`, `founded_year`. CHECK constraint on `founded_year` (1800 → current year + 1). Column comments added for each.
- Added: `/b/[slug]` server route — `resolveSlug()` tries live `businesses.slug` first, then `business_slug_aliases.old_slug` (301 redirect to canonical), then `notFound()`. Uses `getAdminClient()` (service-role) to bypass RLS on public fields only.
- Added: `/business/setup/complete` page with `PublicPageCard` component — owners edit showcase fields in-place: tagline, about (long-form), cover image upload (to `business-logos` bucket), website, Instagram, Facebook, opening hours, founded year.
- Changed: `/b/[slug]` anon nav logo harmonised with AppNav — replaced single 110×58 `<Image>` with 3-image responsive pattern: `block sm:hidden` mobile icon (44×44 `/logo-icon-colored.png`), `hidden sm:block dark:hidden` desktop light horizontal (200×50 `/logo-horizontal-colored.png`), `hidden dark:sm:block` desktop dark horizontal (200×50 `/logo-horizontal-white.png`). Matches AppNav sizing lockup + dark-mode variant.
- Production incident (resolved same day): `/b/ag-rentworks` and other business slugs returned 404 for several hours post-deploy. Root cause: the `20260418_business_showcase.sql` migration was in the repo but had never been run against prod Supabase. The 24-column SELECT in `resolveSlug()` errored with `column "tagline" does not exist`. Because the handler destructures `{ data }` without reading `{ error }`, the failure silently returned `kind: 'none'` → `notFound()`. Resolved by pasting the migration into Supabase SQL editor. Lesson persisted to auto-memory as `project_migrations_manual.md`.
- Verified: `curl -I https://agroyield.africa/b/ag-rentworks` returns HTTP/2 200 with `<title>AG Rentworks — AgroYield Network | AgroYield Network</title>` (was "Business not found" pre-migration).
- Pending for Week 2 under Unicorn #2: `sitemap.xml` + `robots.txt` auto-generation from active businesses, Open Graph / LocalBusiness structured data on `/b/[slug]`, verified badge rendering, products list + reviews, logged-out "Follow" CTA.
- Deployment: Migration applied in Supabase SQL editor (manual). No Vercel re-deploy needed since the code expecting the columns was already live.

### Checkpoint 22 — April 17, 2026 (F2 Cron Harness + Kill Switches + Root Vercel.json)

- Added: `lib/cron/runner.ts` + `lib/cron/logger.ts` + `lib/cron/idempotency.ts` + `lib/cron/auth.ts` consolidated via `lib/cron/index.ts` barrel. Exports: `runCron`, `verifyCronAuth`, `startRun`, `finishRun`, `dailyKey`, `weeklyKey`, `hourlyKey`, `monthlyKey`.
- Added: `cron_runs` table (migration ran before today's session) — PK `id`, columns `job_name`, `idempotency_key`, `status` (success/skipped/failed), `started_at`, `finished_at`, `duration_ms`, `processed_count`, `success_count`, `failure_count`, `error_message`, `metadata` jsonb. Idempotency keys scoped per `(job_name, idempotency_key)` — duplicate runs within the same day/week are rejected.
- Changed: **All 5 legacy crons wrapped in the F2 harness** — `app/api/cron/celebrations/route.ts`, `expiry-reminder/route.ts`, `expire-featured/route.ts`, `expire-subscriptions/route.ts`, `weekly-digest/route.ts`. Each now calls `runCron(request, { jobName, idempotencyKey, handler })`. The handler returns `{ processedCount, successCount, failureCount, metadata }`; the harness wraps response in `{ success, jobName, runId, ... }` envelope and persists the `cron_runs` row.
- **Breaking (internal):** response shape for all 5 wrapped crons changed from ad-hoc payloads (`{ birthdaySent, anniversarySent, ... }`, `{ skipped: true, reason: ... }`) to the uniform harness envelope. Per-cron counters moved into `metadata`. Manual curl scripts grepping specific fields must read from `metadata.*`.
- Added: 3 new admin kill switches — `celebrations_enabled`, `expiry_reminder_enabled`, `expire_featured_enabled` (matches existing `digest_enabled` pattern). Wired into Email section of `app/admin/admin-client.tsx` with UI toggles + status pills. Each cron handler short-circuits to `status='skipped'` with metadata reason when its switch is `'false'`.
- Added: `/vercel.json` at project root — registers all 6 crons with Vercel scheduler: weekly-digest (Mon 07:00), business-weekly-digest (Mon 08:00), expire-subscriptions (00:00), expiry-reminder (08:00), celebrations (07:00), expire-featured (05:00). Times in UTC. Excludes `/api/marketplace/orders/auto-release` until `marketplace_orders`/`seller_bank_accounts` migrations ship.
- Removed (via `git rm`): `app/vercel.json` — Vercel only reads `vercel.json` from project root; the App-Router-scoped file was dead config. 3 crons (celebrations, expire-featured, business-weekly-digest) had previously been listed there and were effectively inactive until today's root-file migration.
- Verified: All 6 cron routes responded to manual curl with the new envelope. `cron_runs` rows were written for both success paths (`expire_featured` returned `processedCount: 0` with "No listings to expire" metadata) and idempotency block path (second curl same day returned `{ skipped: true, reason: "Duplicate run detected..." }`). Kill switch skip path verified end-to-end (status='skipped', reason in metadata).
- Verified: Admin UI toggle save round-trip confirmed working — toggling a kill switch in `/admin` and clicking Save now correctly persists to the `settings` table, and the kill-switch skip path was tested end-to-end via curl (returned the skipped envelope with reason in metadata).
- SQL already applied: `cron_runs` table exists in prod (applied before today's session).
- Deployment: 5 route rewrites + 1 admin-client edit + `/vercel.json` created + `app/vercel.json` removed. Typecheck clean (`npx tsc --noEmit`). Ready to commit.

### Checkpoint 21 — April 17, 2026 (Invoice Delivery Charges — Phase 4.9 + DB Baseline)

- Added: `supabase/migrations/20260417_invoice_delivery_charge.sql` — `delivery_charge numeric NOT NULL DEFAULT 0` on `invoices` with `invoices_delivery_charge_nonneg` CHECK constraint. Idempotent (`ADD COLUMN IF NOT EXISTS`).
- Changed: `app/business/invoices/new/page.tsx` — New `deliveryCharge` state. Summary section now has a delivery / logistics input between Subtotal and VAT. Calculation updated: `preVatTotal = subtotal + delivery`, `vatAmount = preVatTotal × vatRate`, `totalAmount = preVatTotal + vatAmount`. VAT label shows `VAT (7.5% of ₦X)` to expose the base. Insert now persists `delivery_charge`.
- Changed: `app/business/invoices/[id]/page.tsx` — Delivery row shown between Subtotal and VAT when `> 0`. VAT label now reflects actual stored `vat_rate` instead of hardcoded 7.5%.
- Changed: `app/invoice-print/[id]/page.tsx` — Delivery row added to printable totals block (between Subtotal and VAT). Total fallback math updated to `subtotal + delivery + vat`. Prefers persisted `invoice.total` over `total_amount`.
- Rationale: Matches Nigerian FIRS treatment where freight is taxable alongside goods. Prevents users from stuffing delivery into line items (which distorted product-level analytics) or into notes (not taxable, not summable).
- Added: `supabase/migrations/00000000000000_baseline.sql` — 1,500-line snapshot of all 81 public tables generated from `information_schema.columns` CSV export. Uses `CREATE TABLE IF NOT EXISTS`, so safe to commit — running it against the existing DB is a no-op. Restores database-as-code discipline after a period of rapid dashboard-driven prototyping.
- SQL pending: Run `20260417_invoice_delivery_charge.sql` in Supabase before deployment.

### Checkpoint 20 — April 17, 2026 (Business Benchmarking — Phase 4.2)

- Added: `supabase/migrations/20260417_business_benchmarking.sql` — 3 new columns on `businesses`: `sector` (10 agri sectors), `state` (36 states + FCT), `business_size` (4 brackets: micro, small, medium, large). CHECK constraints enforce valid values. Partial indexes (`WHERE sector IS NOT NULL`, etc.) for peer-group lookups.
- Changed: `app/business/setup/page.tsx` — New "Sector & Classification" section with 3 dropdowns (Sector, State, Business Size) between Business Details and Registration & Tax sections. Constants `SECTORS`, `NIGERIAN_STATES`, `BUSINESS_SIZES` exported. `load()` hydrates the new fields.
- Added: `app/api/business/benchmarks/route.ts` — GET endpoint computing per-business KPIs (profit margin, expense ratio, collection rate, revenue) against peer medians. Peer group = same sector, narrowed to same state when ≥3 state peers. Medians (not averages) for outlier resilience. Skips zero-activity peers. Returns graceful-degradation states: `no_sector`, `too_few_peers`, `too_few_active_peers`, `ok`.
- Added: `app/business/BenchmarkCard.tsx` — Client component with 3 display states: profile completion nudge, "not enough peers" message, or full comparison with directional arrows (↑/↓), color-coded good/bad, and actionable insights like "Your margin is X% below peers — review pricing or cut costs".
- Changed: `app/business/page.tsx` — Placed `<BenchmarkCard businessId={bizId} period={period} />` between Health Score and stat cards.
- SQL pending: Run `20260417_business_benchmarking.sql` in Supabase before deployment.

### Checkpoint 19 — April 16, 2026 (Featured Listing Billing — Phase 4.8)

- Added: `supabase/migrations/20260416_featured_listings.sql` — new `featured_listing_payments` table (tracks Paystack payments for featuring) with RLS. 3 new columns on `marketplace_listings`: `is_featured` (boolean), `featured_until` (timestamptz), `featured_at` (timestamptz). Index on `is_featured, featured_until` for sorting + cron expiry.
- Added: `app/api/marketplace/feature/route.ts` — GET returns admin-configurable plans from settings (with defaults: 7d/₦500, 14d/₦900, 30d/₦1,500). POST initiates Paystack payment for a listing the user owns, validates listing is active/open, creates payment record in pending state.
- Changed: `app/api/webhooks/paystack/route.ts` — Added `metadata.type === 'featured_listing'` handler. On payment success: marks payment as paid, sets `is_featured = true` + `featured_until` on listing with duration stacking (if already featured, new days added to existing expiry). Notifies user + Slack alert.
- Added: `app/api/cron/expire-featured/route.ts` — Daily cron (5 AM UTC) finds `is_featured = true` listings past `featured_until`, sets `is_featured = false`, notifies owners. Uses `CRON_SECRET` auth. Added to `app/vercel.json`.
- Changed: `app/marketplace/page.tsx` — Query now selects `is_featured, featured_until`. Sort is handled client-side for category-level targeting.
- Changed: `app/marketplace/marketplace-client.tsx` — Added `is_featured` and `featured_until` to Listing type. Category-level targeting: featured listings sort to top within their own category (when filtering by category, featured tops that view; when viewing "All", featured tops within same-category groups). Amber border + ring highlight. "FEATURED" badge: overlay on image (if images), or inline pill badge (if no images).
- Added: `app/marketplace/[id]/FeatureListingButton.tsx` — Owner-only component: fetches plans from API, shows duration picker (7/14/30 day buttons with prices), initiates Paystack payment. If listing already featured, shows current expiry + "Extend featured period" option.
- Changed: `app/marketplace/[id]/page.tsx` — Added FeatureListingButton for owners (below ListingActions). Added FEATURED badge to detail page badges row when listing is actively featured.
- Changed: `app/admin/admin-client.tsx` — Added `featuredPlans` state with JSON parse from `featured_listing_plans` setting (defaults to 3 tiers). Added "Featured Listing Pricing" UI in Pricing & Subscriptions section: editable days + price per plan, add/remove plans (max 4). Saved as `featured_listing_plans` JSON in settings.
- SQL pending: Run `20260416_featured_listings.sql` migration in Supabase before deployment

### Checkpoint 18 — April 16, 2026 (Marketplace Escrow — Phase 4.1)

- Added: `supabase/migrations/20260416_marketplace_escrow.sql` — 3 tables: `seller_bank_accounts` (Paystack recipient codes), `marketplace_orders` (full lifecycle with 7 statuses, payment tracking, delivery deadline), `marketplace_disputes` (buyer/seller disputes with admin resolution). Full RLS: sellers see own bank account, buyer+seller see own orders, order participants see/raise disputes. Indexes on buyer_id, seller_id, listing_id, status, paystack_reference, delivery_deadline.
- Added: `app/api/marketplace/bank-account/route.ts` — GET/POST seller bank account. POST resolves account name via Paystack, fetches bank name, creates Paystack transfer recipient, upserts in DB. Rate limited.
- Added: `app/api/marketplace/orders/route.ts` — GET lists user's orders (buyer/seller/all filter), POST creates order + initializes Paystack payment. Validates listing (sell type, price > 0, not own, not closed, seller has bank account, no existing active order). 3% commission. Returns Paystack authorization_url.
- Added: `app/api/marketplace/orders/[id]/route.ts` — GET order detail (buyer/seller/admin only, includes dispute + profiles). PATCH handles 5 actions: `ship` (seller marks shipped, sets 7-day auto-release deadline), `confirm` (buyer confirms delivery, triggers Paystack Transfer to seller), `cancel` (before shipping, auto-refunds if paid), `admin_release` (force release to seller), `admin_refund` (refund buyer). All actions send notifications + Slack alerts + audit logs.
- Added: `app/api/marketplace/orders/[id]/dispute/route.ts` — POST raises dispute (buyer or seller, only on paid/shipped orders, one per order). PATCH admin-only resolution: `resolved_seller` (releases funds via Transfer) or `resolved_buyer` (refunds via Paystack Refund API). Audit logged.
- Added: `app/api/marketplace/orders/auto-release/route.ts` — Cron endpoint (CRON_SECRET auth). Finds shipped orders past delivery_deadline, releases funds via Paystack Transfer, notifies both parties. Slack summary with released/failed counts.
- Added: `app/api/admin/marketplace-orders/route.ts` — Admin-only endpoint returning all orders + disputes for admin tab.
- Added: `app/marketplace/bank-account/page.tsx` + `bank-account-form.tsx` — Seller payout account setup page: bank dropdown (28 Nigerian banks including OPay, PalmPay, Kuda), 10-digit account number input, Paystack verification, current account display.
- Added: `app/marketplace/orders/page.tsx` + `orders-list.tsx` — Orders list page with buyer/seller/all toggle, order cards with thumbnail, status badge, amount, date.
- Added: `app/marketplace/orders/[id]/page.tsx` + `order-detail.tsx` — Order detail with status timeline, amounts breakdown (total/payout/fee), action buttons (ship/confirm/cancel/dispute/admin), inline dispute form, dispute display, admin release/refund controls.
- Added: `app/marketplace/[id]/BuyNowButton.tsx` — "Buy Now — ₦X" button with escrow explanation, handles Paystack redirect. Shows fallback message if seller has no bank account.
- Changed: `app/marketplace/[id]/page.tsx` — Added BuyNowButton for sell-type listings with price (checks seller bank account via admin client). Buy Now section appears above Contact Seller.
- Changed: `app/marketplace/page.tsx` — Added "My Orders" link in marketplace header next to "Post listing".
- Changed: `app/api/webhooks/paystack/route.ts` — Extended to handle marketplace payments. Routes `charge.success` by `metadata.type === 'marketplace_order'` to new handler that updates order status pending_payment→paid and notifies seller. Migrated from inline `createAdminClient()` to `getSupabaseAdmin()`. Added notifications + Slack alerts.
- Changed: `app/admin/admin-client.tsx` — Added lazy-loaded `OrdersTab`, `'orders'` tab type, orders tab button after Support, orders permission mapped to marketplace.
- Added: `app/admin/tabs/OrdersTab.tsx` — Admin orders dashboard: active/disputed/commission stats, status filter, order cards with buyer/seller info + amounts + dispute details, release/refund/resolve actions, inline dispute resolution form (favour seller vs favour buyer).
- SQL pending: Run `20260416_marketplace_escrow.sql` migration in Supabase before deployment
- ENV pending: Add `CRON_SECRET` to Vercel env vars for auto-release cron job

### Checkpoint 17 — April 16, 2026 (Support Ticket System — Phase 4.7)

- Added: `supabase/migrations/20260416_support_tickets.sql` — 4 tables: `support_tickets` (with category/priority/status constraints, SLA deadlines, assignment), `support_ticket_messages` (conversation threads), `support_ticket_events` (audit trail), `support_tokens` (email OTP). Full RLS: users see own tickets/messages/events/tokens only. Indexes on user_id, status, assigned_to, sla_deadline, ticket_id.
- Added: `lib/support/sla.ts` — SLA constants (low: 72h, medium: 48h, high: 24h, urgent: 4h), `getSlaDeadline()` and `isSlaBreached()` helpers
- Added: `app/api/support/verify/route.ts` — POST sends 6-digit OTP via email (15-min expiry, branded HTML template), PUT verifies OTP against `support_tokens` table
- Added: `app/api/support/tickets/route.ts` — GET lists user's tickets with assigned admin names, POST creates ticket (requires OTP verification within 30 min) with SLA deadline, admin notifications, Slack alert, confirmation email
- Added: `app/api/support/tickets/[id]/route.ts` — GET returns ticket + messages + events + profiles map, PATCH (admin-only) updates status/priority/assignment/category with audit events, `logAdminAction()`, and email notification to user on resolution
- Added: `app/api/support/tickets/[id]/messages/route.ts` — GET/POST for conversation thread. Admin replies auto-transition open→in_progress. Email + Slack notifications on new messages. Audit events for each reply.
- Added: `app/support/page.tsx` + `app/support/support-client.tsx` — User-facing support centre: OTP verification gate (masked email, 6-digit code input), ticket list with status/priority/SLA badges, create ticket form (subject, category, priority, description)
- Added: `app/support/[id]/page.tsx` + `app/support/[id]/ticket-detail.tsx` — Ticket conversation: chronological message + event thread, user messages (green, right) vs admin messages (gray, left), system events inline, reply form, SLA breach indicator, back navigation
- Added: `app/admin/tabs/SupportTab.tsx` — Admin ticket queue: open/in-progress/SLA-breached stat cards, search + status + priority filters, ticket cards with claim/resolve/close/escalate actions
- Changed: `app/admin/page.tsx` — Added `support_tickets` fetch to parallel Promise.all, passed as prop to AdminClient
- Changed: `app/admin/admin-client.tsx` — Added `SupportTicket` interface, `supportTickets` prop, `'support'` tab type, lazy-loaded `SupportTab`, support tab in permission system with badge showing active ticket count
- Changed: `app/components/AppNav.tsx` — Added `{ href: '/support', label: 'Support' }` to NAV_LINKS between Business and FAQ
- SQL pending: Run `20260416_support_tickets.sql` migration in Supabase before deployment

### Checkpoint 16 — April 16, 2026 (Performance Audit — Phase 4.4)

- Changed: Migrated 34 user-facing files from raw `<img>` to Next.js `<Image>` component — enables automatic WebP/AVIF conversion, lazy loading, responsive sizing, and blur placeholders. Categories: logo images (11 files), avatar images in community/directory/messages (8 files), listing/post images in marketplace/research/grants/opportunities/mentorship/prices (9 files), business logos (2 files), community feed avatars + post images (2 files), public profile page (1 file), admin business preview (1 file)
- Changed: `app/admin/tabs/AnalyticsTab.tsx` — jsPDF import converted from top-level to dynamic `await import('jspdf')` inside export handler (~600KB deferred until click)
- Changed: `app/business/reports/ReportExport.tsx` — ExcelJS import converted from top-level to dynamic `await import('exceljs')` inside export handler (~2MB deferred until click)
- Changed: `app/admin/admin-client.tsx` — ExcelJS import converted to dynamic; 8 admin tab components (`CommunityTab`, `ResearchTab`, `CommentsTab`, `PricesTab`, `MentorshipTab`, `AuditLogTab`, `NotifyPanel`, `AnalyticsTab`) converted from static imports to `React.lazy()` with `<Suspense>` boundary — only the active tab's JS is loaded
- Changed: `next.config.ts` images config — added `formats: ['image/avif', 'image/webp']` (prefer AVIF, smallest format), `deviceSizes` and `imageSizes` breakpoints for responsive optimization, `minimumCacheTTL: 2592000` (30-day cache for optimized images)
- Decision: Print pages (`app/business/reports/print/page.tsx`, `app/invoice-print/[id]/page.tsx`) intentionally left with raw `<img>` — Next.js Image lazy loading and optimization can interfere with print/PDF layouts
- Decision: Email template `<img>` tags in API routes left unchanged — `next/image` only works in React components, not HTML email strings

### Checkpoint 15 — April 16, 2026 (Security Hardening — Phase 4.5)

- Added: `next.config.ts` `async headers()` returning Content-Security-Policy + HSTS (2-year preload) + X-Frame-Options `DENY` + X-Content-Type-Options `nosniff` + Referrer-Policy `strict-origin-when-cross-origin` + Permissions-Policy (camera/microphone/geolocation/interest-cohort disabled). CSP allows Supabase REST/websocket, Sentry, PostHog (US + EU), Vercel Analytics + Speed Insights, Paystack (API + frames), Resend API; `'unsafe-inline'` + `'unsafe-eval'` retained for Next.js runtime / Tailwind / theme-flash script.
- Added: `lib/sanitise.ts` — server utility with `stripHtml`, `sanitiseText`, `escapeHtml`, `safeHref`, `sanitiseUrl` helpers for API boundary defence
- Added: `lib/safe-href.ts` — client-safe URL protocol guard blocking `javascript:` / `data:` / `vbscript:` XSS on rendered `<a href>` elements
- Changed: 9 API routes now sanitise free-text input at insert — `opportunities`, `marketplace`, `research`, `messages/send`, `profile`, `prices`, `contact`, `waitlist` (plus URL fields via `sanitiseUrl`)
- Fixed: HTML injection in `/api/contact` and `/api/waitlist` email templates — user-supplied `name`, `email`, `subject`, `message` now HTML-entity-escaped (`escapeHtml`) before interpolation into both confirmation and internal notification emails; email regex validation on both routes
- Changed: Profile/directory/public-profile/community pages now pass all user-supplied URLs through `safeHref()` before rendering — `app/profile/[id]/page.tsx`, `app/directory/[id]/page.tsx`, `app/u/[slug]/page.tsx`, `app/community/[id]/page.tsx`, `app/community/community-client.tsx`
- Audited: Service-role (`SUPABASE_SERVICE_ROLE_KEY`) usage confined to server-only paths — API routes, server components, cron jobs, `lib/` utilities. Never imported into client components. `lib/supabase/admin.ts` lazy-loads the admin client server-side only.
- Decision: DOMPurify not required — React auto-escapes all text in JSX, and no route renders user-supplied HTML via `dangerouslySetInnerHTML`. Defence focused on CSP, input sanitisation, URL protocol validation, and email HTML escape instead.

### Checkpoint 14 — April 16, 2026 (Monitoring & Error Tracking — Phase 4.3)

- Added: Sentry Next.js SDK v10.48 — error tracking, session replay (10% normal / 100% errors), performance tracing (20% sample rate). Tunnel route at `/monitoring` to bypass ad-blockers.
- Added: `instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `app/global-error.tsx` — Sentry instrumentation files
- Added: Vercel Analytics (`@vercel/analytics/react`) + Speed Insights (`@vercel/speed-insights/next`) — zero-config React components in root layout
- Added: PostHog user analytics — `app/components/PostHogProvider.tsx` with SPA-aware `$pageview` capture, `person_profiles: 'identified_only'`, EU cloud (`eu.i.posthog.com`)
- Added: `lib/slack.ts` — centralised Slack webhook alert utility with color-coded levels (info/warning/error), Block Kit attachments, graceful no-op when `SLACK_WEBHOOK_URL` not set
- Added: Slack alert on new user signup — `app/auth/callback/route.ts` (fires for first-time users only)
- Added: Slack alert on successful payment — `app/api/payment/verify/route.ts` (includes tier, billing, amount, reference)
- Added: Slack alert on free trial activation — `app/api/payment/initiate/route.ts` (includes tier, trial days, expiry date)
- Added: Slack alert on content reports — `app/api/report/route.ts` (escalates to warning level when auto-hidden)
- Added: Slack alert on subscription expiry — `app/api/cron/expire-subscriptions/route.ts` (fires when profiles revoked)
- Changed: Sentry DSN moved from hardcoded string to `NEXT_PUBLIC_SENTRY_DSN` env var across all 3 config files
- Changed: `next.config.ts` wrapped with `withSentryConfig()` — source map uploads, tunnel route, automatic Vercel Cron monitors
- Changed: Root layout (`app/layout.tsx`) now wraps children in `PostHogProvider`, renders `<Analytics />` and `<SpeedInsights />`
- Fixed: Build prerender failure on `/mentorship/sessions` and `/business/accept-invite` — `useSearchParams()` without Suspense boundary. Fixed by wrapping `PostHogPageView` in Suspense and adding wrapper component pattern on accept-invite page.
- Fixed: Duplicate `postLabel` variable in `app/api/report/route.ts` — removed duplicate in email block, reuses Slack alert declaration
- Env vars added: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `SLACK_WEBHOOK_URL`

### Checkpoint 13 — April 15, 2026 (Sort dropdowns + admin commodity settings + UX enhancements)

- Added: Sort dropdowns on 6 modules — Opportunities (newest/oldest/deadline), Grants (featured/deadline/newest/oldest), Marketplace (newest/oldest/price low/high), Price Tracker (newest/oldest/price low/high), Research (newest/oldest), Mentorship (newest/oldest). All client-side with `[...filtered].sort()` pattern.
- Added: Admin commodity categories + commodity items management — `commodity_categories` as JSON array, `commodity_items` as nested `Record<string, string[]>` in settings table. Per-category pill UI with add/remove. Key normalisation (`toLowerCase().replace(/\s+/g, '_')`).
- Added: Dynamic price tracker category tabs — `prices/page.tsx` fetches `commodity_categories` from settings via `getSettings()`, passes as prop to `PricesClient`. Fallback to hardcoded defaults.
- Added: Marketplace Equipment condition filter — "New" / "Used" filter pills shown when Equipment category is selected. Auto-resets on category change. Wired into `hasActiveFilters` and "Clear all" logic.
- Added: `BusinessSetupGuide.tsx` — floating 5-step checklist for business setup (logo, details, registration, bank, invoice). Collapsed: circular progress ring badge with step count. Expanded: green gradient header, animated progress bar, contextual tips per step, "All done" celebration, minimise/dismiss controls.
- Added: `parseList()` helper in `/api/content-types/route.ts` — tries `JSON.parse()` first, falls back to comma-split. Fixes garbled values when admin settings stores JSON arrays.
- Changed: Admin member Excel export expanded from 8 to 32 columns — added phone, WhatsApp, bio, location, role, institution ×3, interests, LinkedIn, Twitter, Facebook, TikTok, website, DOB, avatar URL, account type, institution type, institution display name, contact person name/role, institution website, institution CAC, is_institution_verified
- Changed: Admin `profiles` query expanded to fetch all new fields for Excel export
- Changed: `Member` interface in `admin-client.tsx` expanded from ~17 to ~40 fields
- Fixed: "Oils" label in Price Tracker search tabs — was hardcoded; now dynamic from admin settings which have the correct "Oil" value
- Fixed: Equipment condition (New/Used) not showing in Post a Listing form — category values from admin settings came as `"Equipment"` (capital E) but form checks used lowercase `'equipment'`. Changed all 7 comparison sites (3 in new form, 4 in edit form) to `.toLowerCase() === 'equipment'`
- Pending: Price submit/edit pages (`app/prices/submit/page.tsx`, `app/prices/[id]/edit/page.tsx`) still use hardcoded COMMODITIES — should fetch from settings

### Checkpoint 12 — April 15, 2026 (Institutional registration + pre-Phase 4 quick wins)

- Added: Institutional member registration — Individual/Institution toggle on signup, conditional profile form, admin verification workflow, directory badges/filters, posting gate on 4 creation pages
- Added: `InstitutionGateBanner.tsx` — amber banner shown to unverified institutions on all content creation pages
- Added: Admin "Institutions" tab — pending/verified sections, verify action via `/api/admin/member` with `verify_institution` action
- Added: 8 profile columns for institutions: `account_type`, `institution_type`, `institution_display_name`, `contact_person_name`, `contact_person_role`, `institution_website`, `institution_cac`, `is_institution_verified`
- Added: Alt phone + WhatsApp fields on business setup form (`alt_phone`, `whatsapp` columns on `businesses`)
- Added: Alt phone + WhatsApp display on admin business preview page
- Added: Multi-email report alerts — admin settings accepts comma-separated emails, API sends to all addresses via Resend array `to`
- Added: Birthday + anniversary celebration emails — `/api/cron/celebrations/route.ts`, daily 7 AM cron, birthday (matches `date_of_birth` month+day) and anniversary (matches `created_at` month+day, 1+ years), rich HTML templates, `SENDERS.hello`
- Added: Follower notifications on meaningful actions — `lib/notify-followers.ts` shared utility, wired into `/api/opportunities`, `/api/marketplace`, `/api/research`; fire-and-forget, skips pending-moderation posts; notification types: `new_opportunity`, `new_listing`, `new_research`
- Added: Vercel cron entry for celebrations (`0 7 * * *`)
- Changed: Multi-business admin preview — `.find()` → `.filter().map()` to show ALL businesses per member, labelled when multiple exist
- Changed: `UpgradePrompt.tsx` redesigned — gradient background (green→emerald→amber), lightning bolt icon, color-coded progress bar (green/amber/red), benefit pills with checkmarks, gradient CTA button, "Compare plans" link
- Changed: Admin report alert input from `type="email"` to `type="text"` with comma-separated hint
- Changed: `useProfileGate` hook extended with `isInstitution` and `isInstitutionVerified` return values
- Changed: Directory filter updated from `.not('role', 'is', null)` to `.or('role.not.is.null,account_type.eq.institution')` to include institutions
- Changed: Auth callback persists `account_type` from signup metadata to profile
- Fixed: Business preview 404 — admin page used user-scoped Supabase client; RLS blocked reads of other users' businesses. Switched all queries to service-role `admin` client after admin auth check.
- SQL pending: Institution fields on `profiles` (8 columns), `alt_phone`/`whatsapp` on `businesses` (2 columns)

### Checkpoint 11 — April 15, 2026 (Subscription tiers + poll closing date)

- Added: 3-tier subscription system (free/pro/growth) with `lib/tiers.ts` configuration, Paystack integration, 30-day free trial
- Added: Pricing page with monthly/annual billing toggle, feature matrix, FAQ section
- Added: Server-side `/api/tier/check` + client-side `UpgradePrompt.tsx` for tier limit enforcement
- Added: Tier badges on directory, profile pages, admin dashboard (Pro green ✓, Growth gold ⭐)
- Added: Admin tier dropdown replacing old Verify/Elite buttons, 4 pricing settings + free trial days
- Added: Poll closing date — `poll_closes_at` column, date picker, vote API enforcement, auto-reveal results
- Changed: `/verify` redirects to `/pricing`
- Changed: 13 files migrated from `is_verified`/`is_elite` to `subscription_tier` checks
- Added: `subscription_tier` column on profiles with migration of existing verified users to Pro

### Checkpoint 10 — April 14, 2026 (Admin settings panel + maintenance mode + operational controls)

- Added: 5 new admin settings — mentorship toggle, weekly digest toggle, maintenance mode, community/research daily post limits, mentorship verification gate
- Added: Maintenance mode infrastructure — middleware intercept, admin bypass, branded `/maintenance` page
- Added: Settings UI redesign — 6 collapsible accordion sections with status badges, red highlight on active maintenance
- Added: `lib/settings.ts` — `getSetting()` / `getSettings()` using admin client to bypass RLS
- Added: Rate limiting enforcement on community + research posts via settings
- Added: Mentorship gating on both server and client components
- Changed: Consistent logo sizing across AppNav (200×50 desktop, 44×44 mobile) and signup page

### Checkpoint 9 — April 14, 2026 (Module separation + image uploads + admin dashboard hardening)

- Added: Multi-business support — `BusinessSwitcher` dropdown with cookie persistence (`active_biz_id`), "Create another business" flow via `/business/setup?new=true`, Suspense boundary fix, gated behind `allow_multi_business` feature flag
- Added: Community post image attachments — `ImageUploader` on new post form, images stored in `community-images` bucket, displayed inline on feed cards
- Added: Thumbnail upload on Opportunities (new + edit), Grants (post form) — thumbnails displayed on listing cards
- Added: Search + type filter on Opportunities main listing page
- Added: Admin dashboard search bars + status filter pills on all 5 content tabs (Opportunities, Marketplace, Members, Grants, Reports)
- Added: Admin Grants tab — browse all grants, feature/unfeature toggle, open/close status toggle, search + status filters
- Added: `/api/admin/grant` PATCH endpoint (admin-gated) for grant feature + status toggling
- Added: Grants stat card on admin dashboard header (6-column grid)
- Added: Back navigation to 8 sub-pages — `BackButton` on opportunities new/edit, marketplace new/edit, research new/edit; `<Link>` on grants detail, marketplace detail
- Changed: Opportunities module narrowed to non-funding types only (job, internship, partnership, training, conference) — grants/fellowships removed from types, DB constraint updated, settings updated, landing page + dashboard descriptions updated
- Changed: Grants module confirmed as sole owner of all funding types (grants, fellowships, scholarships)
- Changed: Admin opportunity types fallback updated from `['Job', 'Internship', 'Grant', 'Fellowship', 'Training', 'Conference']` to `['Job', 'Internship', 'Partnership', 'Training', 'Conference']`
- Fixed: Rate limit settings key mismatch — admin UI saved `opportunity_daily_limit` / `listing_daily_limit` but APIs read `rate_limit_opportunities` / `rate_limit_marketplace`; unified to admin keys
- Fixed: `businesses_user_id_key` UNIQUE constraint blocking multi-business creation — dropped constraint
- Fixed: `BusinessSwitcher` not refreshing after new business creation — changed from `router.push` to `window.location.href` for hard navigation
- Fixed: `opportunities_type_check` constraint violations from capitalized/legacy types in settings
- SQL required: `DELETE FROM public.settings WHERE key IN ('rate_limit_opportunities', 'rate_limit_marketplace');`

### Checkpoint 8 — April 14, 2026 (Mentorship module hardening — scheduling, reviews, security)

- Added: Session scheduling UI — mentors schedule accepted requests with date/time, duration, format, meeting link; both parties see blue info panel with Africa/Lagos timezone
- Added: `mentorship_reviews` table with RLS (reviewer inserts own, parties can read) + review modal on completed sessions with star rating + optional comment
- Added: `mentorship_requests` table (corrected — was previously routing through `mentorship_sessions` by mistake)
- Added: `enforce_mentorship_request_transition()` BEFORE UPDATE trigger — state machine blocks illegal transitions (mentee self-accepting, completing without session, reopening declined/withdrawn)
- Added: `handle_new_user()` SECURITY DEFINER trigger on `auth.users` INSERT — auto-creates profile row, prevents orphan users
- Changed: `/mentorship/sessions` page fully rewritten against `mentorship_requests` as source of truth (was incorrectly querying `mentorship_sessions`)
- Changed: `on_mentorship_request()` trigger notification link updated from legacy `/agroyield-mentorship.html` to `/mentorship/sessions`; existing rows backfilled
- Changed: Mentor notification path deduplicated — removed client-side `fetch('/api/mentorship/sessions')`, DB trigger is now single source; API route returns 410 Gone
- Changed: `on_mentorship_request()` set to SECURITY DEFINER (was failing RLS when mentee triggered cross-user notification insert)
- Changed: `mentorship_sessions` SELECT policy tightened from `qual = true` (any authenticated user) to party-scoped via `mentorship_requests` join
- Fixed: `mentor_profiles_user_id_fkey` repointed from `auth.users` to `public.profiles` (PostgREST embed was silently returning empty)
- Fixed: `mentorship_requests_{mentee,mentor}_id_fkey` repointed from `public.users` (empty table) to `public.profiles`
- Fixed: 6 orphan `auth.users` rows without profile rows — backfilled from `raw_user_meta_data`
- Tables added: `mentorship_reviews`; tables modified: `mentorship_requests` (FKs), `mentorship_sessions` (RLS), `mentor_profiles` (FK), `notifications` (link backfill)

### Checkpoint 7 — April 13, 2026 (Phase 3.3f — UX polish pass 2 + security + build hardening)

- Added: Marketplace edit-listing image upload/removal (previously only available on new-listing form)
- Added: Community repost — optional caption, embedded original post card, self-repost prevention, flattened chain
- Added: Waitlist member count on Admin Dashboard (responsive 5-column grid, service-role count query)
- Added: Member Directory location filter — 37 Nigerian states, case-insensitive substring match
- Added: Login notification emails (new device/location only) — privacy-preserving device fingerprint (IPv4 /24 + SHA-256), opt-out flag, fire-and-forget, first-login suppression, sent from `security@agroyield.africa`
- Added: `login_history` table for device fingerprint tracking; `notify_on_login` column on `profiles`
- Added: `lib/email/senders.ts` — centralised `SENDERS` / `INBOXES` constants with env-var overrides (`RESEND_FROM_*`, `CONTACT_INBOX`)
- Added: `lib/email/client.ts` — lazy Resend client via `getResend()` helper
- Added: `lib/supabase/admin.ts` — lazy Supabase clients via `getSupabaseAdmin()` / `getSupabaseAnon()`
- Changed: Footer-linked pages (About, Contact, Privacy, Terms) logos replaced with brand assets and wired to light/dark theme toggle
- Changed: Dashboard loading skeleton corrected from 7 to 9 cards
- Changed: 20+ files refactored to use lazy Resend + Supabase client helpers (eliminates module-scope side effects)
- Changed: 11 files migrated from hardcoded `'AgroYield Network <x@agroyield.africa>'` strings to `SENDERS` constants
- Fixed: Next.js 16 "Failed to collect page data" build failures — `new Resend(undefined)` and `createClient(undefined, undefined)` at module load time across 11 routes/components
- Fixed: `/api/business/invite` and `/api/auth/reset-password` build crashes resolved by lazy client initialisation

### Checkpoint 6 — April 13, 2026 (Phase 3.3d complete — 10 modules live)

- Added: Direct Messages module — conversations inbox with search, chat thread UI with message bubbles, date separators, read receipts (✓/✓✓), optimistic sends with rollback, 5-second polling for new messages
- Added: `MessageButton` component integrated into Directory profiles, Marketplace listings, Mentorship profiles, and `/u/[slug]` public profiles
- Added: Messages icon with live unread count badge in NavBar utility area (replaces text link, 30s polling)
- Added: Messages inbox search bar — client-side filter by conversation name and message preview
- Added: `BackButton` component — history-aware navigation with fallback, used on directory and public profile pages
- Added: Clickable follower/following counts on `/directory/[id]` and `/u/[slug]` profile pages (link to followers/following list pages)
- Added: `conversations` and `messages` tables with RLS policies (SELECT, INSERT, UPDATE)
- Added: `/messages` to middleware route protection
- Changed: Messages removed from NavBar text links, now an icon button between ThemeToggle and NotificationBell
- Changed: 404 page logo updated from emoji placeholder (🌾) to brand asset (`/logo-horizontal-white.png`)
- Changed: Guest nav on `/u/[slug]` updated from emoji logo to brand asset (`/logo-horizontal-colored.png`)
- Fixed: `conversations` RLS policies dropped by CASCADE — recreated SELECT, INSERT, UPDATE policies
- Fixed: `messages` RLS policies missing — created policies for viewing messages in own conversations, sending, and updating
- Fixed: `conversations_participant_a_fkey` and `conversations_participant_b_fkey` FK constraints pointing to `public.users` instead of `auth.users`
- Fixed: `messages_sender_id_fkey` FK constraint pointing to `public.users` instead of `auth.users`
- Fixed: Broken JSX comment in `not-found.tsx` (`// NEW` inside JSX) causing Vercel build failures
- Fixed: Orphan `participant_1`/`participant_2` columns dropped from conversations table
- API routes added: `POST /api/messages` (start/find conversation), `POST /api/messages/send`, `POST /api/messages/read`, `GET /api/messages/poll`

### Checkpoint 5 — April 12, 2026 (Phase 3.3 complete — 9 modules live)

- Added: Grant Tracker module — browse grants, admin posting, application tracker with 5-stage status pipeline (draft → submitted → shortlisted → rejected → awarded), document checklist (6 defaults + custom), auto-populated profile info, My Applications dashboard with stats, deadline reminder notifications, how-to-use guide
- Added: Community Feed module — 5 post types (discussion, question, poll, news, milestone), poll voting API, like toggle (reuses existing system), comments via CommentsSection, post detail page, type filters, pinned posts, delete own posts (soft delete), loading/error boundaries
- Added: Community as 9th dashboard card (3×3 grid complete), Community in AppNav
- Added: Connection filters in Directory — Following, Followers, Mentors, Mentees tabs with counts
- Added: `institution_2` and `institution_3` fields on profiles (for programmes like Stanford LEAD, Harvard specialisations)
- Added: LinkedIn auto-populate on mentor form from existing profile data
- Changed: NavBar reordered for engagement — Community at position 2, transactional tools clustered, Business at recency slot
- Changed: Dashboard grid reordered following F-pattern attention hierarchy — Community top-left, Business bottom-right
- Changed: All dashboard card descriptions rewritten with action-oriented, value-first copy
- Changed: Module icons updated sitewide for distinctness — Opportunities 🌱→🚀, Marketplace 🛒→🤝, Prices 📊→🏷️, Directory 👥→📇, Mentorship 🎓→🧭
- Changed: Icons updated across dashboard, landing page, onboarding wizard, welcome email, waitlist email, notification bell, marketplace empty state
- Fixed: Mentor availability enum values across browser + detail pages (Open/Limited/Waitlist/Closed)
- Fixed: Mentor badge not showing on directory detail (query selected non-existent `id` column, changed to `user_id`)
- Fixed: `mentor_profiles` FK constraint pointing to `public.users` instead of `auth.users`
- Fixed: `grants` FK constraint pointing to `public.users` instead of `auth.users`
- Fixed: `grant_applications` FK constraint pointing to `public.users` instead of `auth.users`
- Fixed: Community comment count query using wrong column names (`entity_id`/`entity_type` → `post_id`/`post_type`)
- Fixed: TypeScript `Set<unknown>` not assignable to `string[]` in directory and community pages
- Tables added: `grants`, `grant_applications`, `community_posts` with RLS policies

### Checkpoint 4 — April 12, 2026 (Phase 3.1 + Phase 3.2 complete)

- Added: Mentorship module — browse mentors, create/edit profiles, session booking (request/accept/decline/complete/cancel), star ratings + reviews
- Added: Mentorship card on dashboard (7 modules total), updated loading skeleton to match
- Added: Price Intelligence tab — Recharts trend charts (avg/min/max), cross-state comparison with auto-insights, price alerts CRUD
- Added: Price alerts trigger in-app notifications when a matching price report is submitted (`app/api/prices/route.ts`)
- Added: Poster attribution on price report cards — name, avatar, link to profile
- Added: Tab-based UI on Price Tracker (Reports / Intelligence toggle)
- Added: `mentor_profiles`, `mentorship_sessions`, `mentorship_reviews`, `price_alerts` tables with RLS
- Added: Mentorship link in AppNav, `price_alert` + `mentorship` icons in NotificationBell
- Added: Loading + error boundaries for mentorship route group
- Changed: Price report submission now routes through `/api/prices` (server-side) instead of direct client insert

### Checkpoint 3 — April 12, 2026 (Phase 1 + Phase 2 complete)

- Added: Team Access RLS fix — `getBusinessAccess()` helper, updated 12+ files, RLS policy `user_has_business_access()`
- Added: Notifications system — `NotificationBell.tsx`, `lib/notifications.ts`, triggers on follow/invite/accept/comment
- Added: Loading boundaries (4 route groups) + Error boundaries (8 route groups) with shared `ErrorBoundary.tsx`
- Added: LinkedIn OAuth on login/signup pages
- Added: Facebook OAuth buttons (blocked by Meta Business Verification)
- Added: Onboarding wizard — 3-step modal for new users (`has_onboarded` flag on profiles)
- Added: Invoice PDF download, WhatsApp share, email share (`InvoiceShareActions.tsx`)
- Added: Expenses search bar + column sorting (date/amount)
- Added: PWA support — `@ducanh2912/next-pwa`, web manifest, service worker, install-to-home-screen
- Added: API rate limiting — `lib/rate-limit.ts` on 10 routes (3–30 req/min)
- Fixed: Notification FK constraint (dropped references to `public.users`, uses `auth.users` IDs)
- Fixed: ErrorBoundary missing `<a` tag
- Fixed: 4 stale `biz.id` references → `access.businessId`
- Removed: Redundant PrintButton from invoice toolbar
- Updated: `next.config.ts` with PWA config + `--webpack` build flag for Next.js 16

### Checkpoint 2 — April 12, 2026

- Added: Fixed asset register (`business_assets` table, full CRUD page)
- Added: Expense spread feature (annual costs split over N months)
- Added: Business Health Score (5-factor scoring widget on dashboard)
- Added: Low stock alerts on business dashboard
- Added: Inventory valuation in reports
- Added: Team Access module (invite, accept, role management)
- Fixed: Dark mode form text invisibility (globals.css override)
- Fixed: Reports page dark mode (converted inline styles to Tailwind)
- Fixed: Invoice line item description bug (was using product name instead of description)
- Fixed: Team invitation insert error (FK constraint on auth.users, switched to service role)
- Updated: Navigation — Assets in sidebar and mobile nav, Team in sidebar
- Created: Strategic Product Review document (AgroYield-Strategic-Review.docx)

### Checkpoint 1 — April 11, 2026

- Initial audit completed
- All 6 core modules operational
- Business suite: setup, products, customers, invoices, expenses, reports
- Admin dashboard with moderation
- Payments via Paystack
- Email system via Resend

# AgroYield Network — Project Status

> **Last updated:** 17 April 2026 (Checkpoint 21)
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
| Weekly email digest                      | ✅ Done | `app/api/cron/weekly-digest/route.ts`                                                              |
| Subscription expiry cron                 | ✅ Done | `app/api/cron/expire-subscriptions/route.ts`                                                       |
| Expiry reminder emails                   | ✅ Done | `app/api/cron/expiry-reminder/route.ts`                                                            |
| Birthday + anniversary celebration emails | ✅ Done | `app/api/cron/celebrations/route.ts` — daily 7 AM cron, `SENDERS.hello`, rich HTML templates      |
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
| Consistent logo sizing                   | ✅ Done | AppNav 200×50 (desktop), 44×44 (mobile). Signup matched to login/reset (nav 58px, card 120px)      |

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

---

## Route Protection

The middleware at `middleware.ts` redirects unauthenticated users to `/login` for:

`/dashboard`, `/profile`, `/directory`, `/opportunities`, `/prices`, `/marketplace`, `/research`, `/mentorship`, `/grants`, `/community`, `/messages`, `/insights`, `/connections`

Note: `/insights`, `/connections` are pre-registered for future modules.

---

## Changelog

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

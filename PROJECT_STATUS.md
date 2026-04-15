# AgroYield Network — Project Status

> **Last updated:** 15 April 2026 (Checkpoint 11)
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

### Module 1 — Member Directory

| Feature                                                   | Status  | Location                                                     |
| --------------------------------------------------------- | ------- | ------------------------------------------------------------ |
| Browse members with filters (role, interests, location, institution) | ✅ Done | `app/directory/directory-client.tsx` — 37 Nigerian states dropdown |
| Individual member profile view                            | ✅ Done | `app/directory/[id]/page.tsx`                                |
| Follow / unfollow                                         | ✅ Done | `app/directory/follow-button.tsx`, `app/api/follow/route.ts` |
| Public profile via username slug                          | ✅ Done | `app/u/[slug]/page.tsx`                                      |
| Shareable profile link                                    | ✅ Done | `app/profile/share-profile-link.tsx`                         |
| Profile completeness tracker (13 fields)                  | ✅ Done | `app/profile/profile-form.tsx`                               |
| Avatar upload to Supabase Storage                         | ✅ Done | `app/profile/profile-form.tsx`                               |

### Module 2 — Opportunities

| Feature                                                          | Status  | Location                                  |
| ---------------------------------------------------------------- | ------- | ----------------------------------------- |
| List opportunities (jobs, internships, partnerships, training)   | ✅ Done | `app/opportunities/`                      |
| Create / edit / close opportunity                                | ✅ Done | `app/opportunities/new/`, `[id]/edit/`    |
| Thumbnail image upload on create/edit                            | ✅ Done | `ImageUploader` component                 |
| Search + type filter on listing page                             | ✅ Done | `app/opportunities/opportunities-client.tsx` |
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

### Module 4 — Marketplace

| Feature                             | Status  | Location                             |
| ----------------------------------- | ------- | ------------------------------------ |
| Browse listings with filters        | ✅ Done | `app/marketplace/`                   |
| Create / edit / close listing       | ✅ Done | `app/marketplace/new/`, `[id]/edit/` — image upload/removal on both forms |
| Listing detail with contact actions | ✅ Done | `app/marketplace/[id]/page.tsx`      |
| Rate limiting                       | ✅ Done | Via `settings` table (`listing_daily_limit`) |
| Admin moderation                    | ✅ Done | `app/api/admin/listing/route.ts`     |
| Back navigation on all sub-pages    | ✅ Done | `BackButton` on new + edit, `<Link>` on detail |

### Module 5 — Research Board

| Feature                                                   | Status  | Location                           |
| --------------------------------------------------------- | ------- | ---------------------------------- |
| Browse research posts (papers, questions, collaborations) | ✅ Done | `app/research/`                    |
| Create / edit research post                               | ✅ Done | `app/research/new/`, `[id]/edit/`  |
| Tags and type filtering                                   | ✅ Done | `app/research/research-client.tsx` |
| Admin moderation (lock/unlock, activate/deactivate)       | ✅ Done | `app/api/admin/`                   |
| Back navigation on all sub-pages                          | ✅ Done | `BackButton` on new + edit pages   |

### Module 6 — Business Suite

| Feature                                                              | Status  | Location                                                                         |
| -------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------- |
| Business profile setup (name, logo, address, phone, bank details)    | ✅ Done | `app/business/setup/page.tsx`                                                    |
| Product catalogue with stock tracking                                | ✅ Done | `app/business/products/page.tsx`                                                 |
| Customer management                                                  | ✅ Done | `app/business/customers/page.tsx`                                                |
| Customer statement generation + print                                | ✅ Done | `app/business/customers/[id]/statement/`                                         |
| Invoice creation (invoice/receipt/proforma/delivery note)            | ✅ Done | `app/business/invoices/new/page.tsx`                                             |
| Invoice line items with product lookup + stock warnings              | ✅ Done | Stock availability indicator, amber warnings                                     |
| Invoice status workflow (draft → sent → paid / overdue)              | ✅ Done | `app/business/invoices/[id]/InvoiceActions.tsx`                                  |
| Invoice print layout                                                 | ✅ Done | `app/invoice-print/[id]/`                                                        |
| Record payment against invoice                                       | ✅ Done | `RecordPaymentButton.tsx`                                                        |
| VAT/tax toggle with customisable percentage                          | ✅ Done | Default 7.5% (Nigeria)                                                           |
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
11. **No monitoring** — No Sentry, no structured logging, no uptime monitoring.
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

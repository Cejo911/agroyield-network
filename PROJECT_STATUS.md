# AgroYield Network — Project Status

> **Last updated:** 12 April 2026 (Checkpoint 4)> **Last updated:** 12 April 2026 (Checkpoint 4)
> **Maintained by:** Okoli (okolichijiokei@gmail.com)
> **Launch Target:** 5 July 2026 (~12 weeks remaining)
> **Purpose:** Permanent reference for any developer or Claude session to get up to speed instantly.

---

## Tech Stack

| Layer           | Technology                             | Notes                                               |
| --------------- | -------------------------------------- | --------------------------------------------------- |
| Frontend        | Next.js 16.2, React 19, Tailwind CSS 4 | App Router, TypeScript, `next-themes` for dark mode |
| Database & Auth | Supabase                               | PostgreSQL, Row Level Security, email + OAuth auth  |
| Deployment      | Vercel                                 | Preview deploys on every push                       |
| Email           | Resend                                 | Sender domain: `agroyield.africa`                   |
| Payments        | Paystack                               | NGN currency, verification subscriptions            |
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

### Module 1 — Member Directory

| Feature                                                   | Status  | Location                                                     |
| --------------------------------------------------------- | ------- | ------------------------------------------------------------ |
| Browse members with filters (role, location, institution) | ✅ Done | `app/directory/`                                             |
| Individual member profile view                            | ✅ Done | `app/directory/[id]/page.tsx`                                |
| Follow / unfollow                                         | ✅ Done | `app/directory/follow-button.tsx`, `app/api/follow/route.ts` |
| Public profile via username slug                          | ✅ Done | `app/u/[slug]/page.tsx`                                      |
| Shareable profile link                                    | ✅ Done | `app/profile/share-profile-link.tsx`                         |
| Profile completeness tracker (13 fields)                  | ✅ Done | `app/profile/profile-form.tsx`                               |
| Avatar upload to Supabase Storage                         | ✅ Done | `app/profile/profile-form.tsx`                               |

### Module 2 — Opportunities

| Feature                                                      | Status  | Location                                  |
| ------------------------------------------------------------ | ------- | ----------------------------------------- |
| List opportunities (grants, fellowships, jobs, partnerships) | ✅ Done | `app/opportunities/`                      |
| Create / edit / close opportunity                            | ✅ Done | `app/opportunities/new/`, `[id]/edit/`    |
| Apply to opportunity                                         | ✅ Done | `app/opportunities/[id]/apply-button.tsx` |
| Rate limiting (configurable per 24h)                         | ✅ Done | Via `settings` table                      |
| Moderation modes (immediate / approval)                      | ✅ Done | Admin configurable                        |
| Comments                                                     | ✅ Done | `CommentsSection.tsx`                     |

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
| Create / edit / close listing       | ✅ Done | `app/marketplace/new/`, `[id]/edit/` |
| Listing detail with contact actions | ✅ Done | `app/marketplace/[id]/page.tsx`      |
| Rate limiting                       | ✅ Done | Via `settings` table                 |
| Admin moderation                    | ✅ Done | `app/api/admin/listing/route.ts`     |

### Module 5 — Research Board

| Feature                                                   | Status  | Location                           |
| --------------------------------------------------------- | ------- | ---------------------------------- |
| Browse research posts (papers, questions, collaborations) | ✅ Done | `app/research/`                    |
| Create / edit research post                               | ✅ Done | `app/research/new/`, `[id]/edit/`  |
| Tags and type filtering                                   | ✅ Done | `app/research/research-client.tsx` |
| Admin moderation (lock/unlock, activate/deactivate)       | ✅ Done | `app/api/admin/`                   |

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

### Pending Modules

| Module                      | Status         | Notes                                                                                          |
| --------------------------- | -------------- | ---------------------------------------------------------------------------------------------- |
| Mentorship                  | ✅ Done        | `app/mentorship/` — browse mentors, create profile, request/manage sessions, ratings + reviews |
| Grants tracker              | ❌ Not started | Route `/grants` in middleware matcher                                                          |
| Connections & Insights feed | ❌ Not started | Routes in middleware matcher, described on landing page                                        |

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
| Verified badge (paid via Paystack)       | ✅ Done | `verify/page.tsx`, `VerifiedBadge.tsx`                                                             |
| Elite badge (admin-awarded)              | ✅ Done | `EliteBadge.tsx`                                                                                   |
| Announcement banner                      | ✅ Done | `AnnouncementBanner.tsx`                                                                           |
| Registration open/close toggle           | ✅ Done | Admin settings                                                                                     |
| Weekly email digest                      | ✅ Done | `app/api/cron/weekly-digest/route.ts`                                                              |
| Subscription expiry cron                 | ✅ Done | `app/api/cron/expire-subscriptions/route.ts`                                                       |
| Expiry reminder emails                   | ✅ Done | `app/api/cron/expiry-reminder/route.ts`                                                            |
| Data deletion page                       | ✅ Done | `app/data-deletion/page.tsx`                                                                       |

---

## Known Issues & Technical Debt (as of April 12, 2026)

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
| `settings`             | Platform-wide settings (pricing, rate limits, moderation mode)               |
| `notifications`        | In-app notifications (follow, invite, comment, system) with read_at tracking |
| `mentor_profiles`      | Mentor availability, expertise, bio, session formats                         |
| `mentorship_sessions`  | Session requests between mentors and mentees with status workflow            |
| `mentorship_reviews`   | Star ratings and comments after completed sessions                           |
| `price_alerts`         | User-created alerts for commodity price thresholds                           |
| `reports`              | Content reports from users                                                   |
| `comments`             | Comments on all content types                                                |
| `likes`                | Like interactions                                                            |

---

## Route Protection

The middleware at `middleware.ts` redirects unauthenticated users to `/login` for:

`/dashboard`, `/profile`, `/directory`, `/opportunities`, `/prices`, `/marketplace`, `/research`, `/mentorship`, `/grants`, `/insights`, `/connections`

Note: `/grants`, `/insights`, `/connections` are pre-registered for future modules.

---

## Changelog

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

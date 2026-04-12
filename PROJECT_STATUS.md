# AgroYield Network — Project Status

> **Last updated:** 12 April 2026 (Checkpoint 2)
> **Maintained by:** Okoli (okolichijiokei@gmail.com)
> **Launch Target:** 5 July 2026 (~12 weeks remaining)
> **Purpose:** Permanent reference for any developer or Claude session to get up to speed instantly.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 16.2, React 19, Tailwind CSS 4 | App Router, TypeScript, `next-themes` for dark mode |
| Database & Auth | Supabase | PostgreSQL, Row Level Security, email + OAuth auth |
| Deployment | Vercel | Preview deploys on every push |
| Email | Resend | Sender domain: `agroyield.africa` |
| Payments | Paystack | NGN currency, verification subscriptions |
| Version Control | GitHub + GitHub Desktop | macOS local development |

**Environment variables:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`

---

## Feature Completion Status

### Authentication

| Feature | Status | Location |
|---------|--------|----------|
| Email + password sign-up | ✅ Done | `app/signup/page.tsx` |
| Email + password sign-in | ✅ Done | `app/login/page.tsx` |
| Google OAuth | ✅ Done | Login + signup pages, callback at `app/auth/callback/route.ts` |
| LinkedIn OAuth | ⏳ Pending | Credentials in LinkedIn developer portal, not wired into Next.js auth |
| Facebook OAuth | ⏳ Pending | Credentials in Facebook developer portal, not wired into Next.js auth |
| Welcome email on first login | ✅ Done | Sent via Resend in `app/auth/callback/route.ts` |
| Registration open/close toggle | ✅ Done | Controlled via `settings` table |
| Forgot password | ✅ Done | `app/forgot-password/page.tsx`, `app/api/auth/reset-password/route.ts` |
| Password reset | ✅ Done | `app/reset-password/page.tsx` |

### Module 1 — Member Directory

| Feature | Status | Location |
|---------|--------|----------|
| Browse members with filters (role, location, institution) | ✅ Done | `app/directory/` |
| Individual member profile view | ✅ Done | `app/directory/[id]/page.tsx` |
| Follow / unfollow | ✅ Done | `app/directory/follow-button.tsx`, `app/api/follow/route.ts` |
| Public profile via username slug | ✅ Done | `app/u/[slug]/page.tsx` |
| Shareable profile link | ✅ Done | `app/profile/share-profile-link.tsx` |
| Profile completeness tracker (13 fields) | ✅ Done | `app/profile/profile-form.tsx` |
| Avatar upload to Supabase Storage | ✅ Done | `app/profile/profile-form.tsx` |

### Module 2 — Opportunities

| Feature | Status | Location |
|---------|--------|----------|
| List opportunities (grants, fellowships, jobs, partnerships) | ✅ Done | `app/opportunities/` |
| Create / edit / close opportunity | ✅ Done | `app/opportunities/new/`, `[id]/edit/` |
| Apply to opportunity | ✅ Done | `app/opportunities/[id]/apply-button.tsx` |
| Rate limiting (configurable per 24h) | ✅ Done | Via `settings` table |
| Moderation modes (immediate / approval) | ✅ Done | Admin configurable |
| Comments | ✅ Done | `CommentsSection.tsx` |

### Module 3 — Price Tracker

| Feature | Status | Location |
|---------|--------|----------|
| View commodity prices (filter by commodity, state, market) | ✅ Done | `app/prices/` |
| Submit a price report | ✅ Done | `app/prices/submit/page.tsx` |
| Edit price report | ✅ Done | `app/prices/[id]/edit/page.tsx` |
| Price alerts | ❌ Not built | Promised on landing page but no implementation |

### Module 4 — Marketplace

| Feature | Status | Location |
|---------|--------|----------|
| Browse listings with filters | ✅ Done | `app/marketplace/` |
| Create / edit / close listing | ✅ Done | `app/marketplace/new/`, `[id]/edit/` |
| Listing detail with contact actions | ✅ Done | `app/marketplace/[id]/page.tsx` |
| Rate limiting | ✅ Done | Via `settings` table |
| Admin moderation | ✅ Done | `app/api/admin/listing/route.ts` |

### Module 5 — Research Board

| Feature | Status | Location |
|---------|--------|----------|
| Browse research posts (papers, questions, collaborations) | ✅ Done | `app/research/` |
| Create / edit research post | ✅ Done | `app/research/new/`, `[id]/edit/` |
| Tags and type filtering | ✅ Done | `app/research/research-client.tsx` |
| Admin moderation (lock/unlock, activate/deactivate) | ✅ Done | `app/api/admin/` |

### Module 6 — Business Suite

| Feature | Status | Location |
|---------|--------|----------|
| Business profile setup (name, logo, address, phone, bank details) | ✅ Done | `app/business/setup/page.tsx` |
| Product catalogue with stock tracking | ✅ Done | `app/business/products/page.tsx` |
| Customer management | ✅ Done | `app/business/customers/page.tsx` |
| Customer statement generation + print | ✅ Done | `app/business/customers/[id]/statement/` |
| Invoice creation (invoice/receipt/proforma/delivery note) | ✅ Done | `app/business/invoices/new/page.tsx` |
| Invoice line items with product lookup + stock warnings | ✅ Done | Stock availability indicator, amber warnings |
| Invoice status workflow (draft → sent → paid / overdue) | ✅ Done | `app/business/invoices/[id]/InvoiceActions.tsx` |
| Invoice print layout | ✅ Done | `app/invoice-print/[id]/` |
| Record payment against invoice | ✅ Done | `RecordPaymentButton.tsx` |
| VAT/tax toggle with customisable percentage | ✅ Done | Default 7.5% (Nigeria) |
| Auto-increment invoice numbering | ✅ Done | |
| Stock deduction on invoice send | ✅ Done | Creates stock_movements records |
| Stock restoration on invoice cancel/delete | ✅ Done | Reverse stock_movements |
| Expense tracking by category | ✅ Done | `app/business/expenses/page.tsx` |
| Expense spread (annual rent over N months) | ✅ Done | Presets: 3/6/12/custom months, rounding handled |
| Fixed asset register | ✅ Done | `app/business/assets/page.tsx` — 4 categories, conditions, status lifecycle |
| Financial reports (P&L, inventory valuation, top products/customers) | ✅ Done | `app/business/reports/page.tsx` |
| Report Excel export | ✅ Done | `app/business/reports/ReportExport.tsx` |
| Report print layout | ✅ Done | `app/business/reports/print/` |
| Business Health Score (5-factor, green/amber/red) | ✅ Done | `app/business/page.tsx` |
| Low stock alerts on dashboard | ✅ Done | Amber alert card |
| Period filtering (month / quarter / year / all) | ✅ Done | `PeriodToggle.tsx` |
| Onboarding checklist (4 steps) | ✅ Done | `app/business/page.tsx` |
| Team Access — invite by email | ✅ Done | `app/business/team/page.tsx`, `app/api/business/invite/route.ts` |
| Team Access — accept invite flow | ✅ Done | `app/business/accept-invite/page.tsx`, `app/api/business/accept-invite/route.ts` |
| Team Access — role management (owner/accountant/staff) | ✅ Done | Revoke, resend, change role |
| Dark mode across all business pages | ✅ Done | Including forms (globals.css fix) |

### Pending Modules

| Module | Status | Notes |
|--------|--------|-------|
| Mentorship | ❌ Not started | Route `/mentorship` in middleware matcher, no pages or DB tables |
| Grants tracker | ❌ Not started | Route `/grants` in middleware matcher |
| Connections & Insights feed | ❌ Not started | Routes in middleware matcher, described on landing page |

### Platform Features

| Feature | Status | Location |
|---------|--------|----------|
| Dark / light theme | ✅ Done | `ThemeProvider.tsx`, `ThemeToggle.tsx`, `SidebarThemeToggle.tsx` |
| SEO (OpenGraph, Twitter cards, metadata) | ✅ Done | `app/layout.tsx`, per-page metadata |
| Mobile responsive navigation | ✅ Done | `AppNav.tsx` (desktop), `MobileNav.tsx` (business mobile bottom nav) |
| Cross-module search | ✅ Done | `app/api/search/route.ts` |
| Like system | ✅ Done | `LikeButton.tsx`, `app/api/like/route.ts` |
| Comments | ✅ Done | `CommentsSection.tsx` |
| Content reporting | ✅ Done | `ReportButton.tsx`, `app/api/report/route.ts` |
| Verified badge (paid via Paystack) | ✅ Done | `verify/page.tsx`, `VerifiedBadge.tsx` |
| Elite badge (admin-awarded) | ✅ Done | `EliteBadge.tsx` |
| Announcement banner | ✅ Done | `AnnouncementBanner.tsx` |
| Registration open/close toggle | ✅ Done | Admin settings |
| Weekly email digest | ✅ Done | `app/api/cron/weekly-digest/route.ts` |
| Subscription expiry cron | ✅ Done | `app/api/cron/expire-subscriptions/route.ts` |
| Expiry reminder emails | ✅ Done | `app/api/cron/expiry-reminder/route.ts` |
| Data deletion page | ✅ Done | `app/data-deletion/page.tsx` |

---

## Known Issues & Technical Debt (as of April 12, 2026)

### Critical (must fix before team access works properly)

1. **Team Access RLS gap** — All 12+ business module files query with `.eq('user_id', user.id)`. Invited team members (accountant/staff) cannot see the business data. Need a helper function `getAccessibleBusinessId()` that checks both `businesses` and `business_team` tables, and update all business queries + RLS policies.

### High Priority

2. **No notifications system** — No in-app notifications, no bell icon, no real-time alerts. Features are invisible to users.
3. **No loading/error boundaries** — Most routes lack `loading.tsx` and `error.tsx` files. Only `/research` has loading state.
4. **No API rate limiting** — API routes (invite, contact, auth) have no rate limiting beyond content posting limits.
5. **LinkedIn OAuth** — Configured but not wired into Next.js auth flow.
6. **Facebook OAuth** — Configured but not wired into Next.js auth flow.

### Medium Priority

7. **Duplicate `@supabase/ssr` in package.json** — Listed twice (`^0.5.0` and `^0.10.0`). Keep `^0.10.0` only.
8. **Frequent `as any` casts** — Throughout codebase for Supabase queries. Fix by generating types with `supabase gen types typescript`.
9. **No `.env.example`** — New developers have no reference for required environment variables.
10. **No automated tests** — No test files or framework configured.
11. **No monitoring** — No Sentry, no structured logging, no uptime monitoring.
12. **No input sanitisation** — User input in opportunities, marketplace, research rendered without sanitisation.
13. **No CSP headers** — Missing Content Security Policy in `next.config.ts`.

---

## Database Tables Reference

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (name, role, bio, institution, interests, badges, admin flags) |
| `follows` | Follow relationships between users |
| `opportunities` | Grants, fellowships, jobs, partnerships |
| `marketplace_listings` | Buy/sell/trade listings |
| `research_posts` | Research papers, questions, collaborations |
| `price_reports` | Community-submitted commodity prices |
| `businesses` | Business profiles for the Business Suite |
| `invoices` | Business invoices with status workflow |
| `invoice_items` | Line items on invoices |
| `customers` | Business customers |
| `business_products` | Product catalogue with stock tracking |
| `business_expenses` | Business expense records |
| `business_assets` | Fixed asset register |
| `business_team` | Team members and invitations (role-based access) |
| `stock_movements` | Stock change audit trail (linked to invoices) |
| `subscriptions` | Paystack subscription records |
| `waitlist_signups` | Pre-launch waitlist entries |
| `contact_messages` | Contact form submissions |
| `settings` | Platform-wide settings (pricing, rate limits, moderation mode) |
| `reports` | Content reports from users |
| `comments` | Comments on all content types |
| `likes` | Like interactions |

---

## Route Protection

The middleware at `middleware.ts` redirects unauthenticated users to `/login` for:

`/dashboard`, `/profile`, `/directory`, `/opportunities`, `/prices`, `/marketplace`, `/research`, `/mentorship`, `/grants`, `/insights`, `/connections`

Note: `/mentorship`, `/grants`, `/insights`, `/connections` are pre-registered for future modules.

---

## Changelog

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

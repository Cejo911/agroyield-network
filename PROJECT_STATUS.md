# AgroYield Network — Project Status

> **Last updated:** 11 April 2026  
> **Maintained by:** Okoli (okolichijiokei@gmail.com)  
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

**Environment variables:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`

---

## Feature Completion Status

### Authentication

| Feature | Status | Location |
|---------|--------|----------|
| Email + password sign-up | Done | `app/signup/page.tsx` |
| Email + password sign-in | Done | `app/login/page.tsx` |
| Google OAuth | Done | Login + signup pages, callback at `app/auth/callback/route.ts` |
| LinkedIn OAuth | **Not started** | Credentials exist in LinkedIn developer portal but are not wired into Supabase or the UI |
| Facebook OAuth | **Not started** | Credentials exist in Facebook developer portal but are not wired into Supabase or the UI |
| Welcome email on first login | Done | Sent via Resend in `app/auth/callback/route.ts` |
| Registration open/close toggle | Done | Controlled via `settings` table, checked in `app/signup/page.tsx` |

### Module 1 — Member Directory

| Feature | Status | Location |
|---------|--------|----------|
| Browse members with filters (role, location, institution) | Done | `app/directory/` |
| Individual member profile view | Done | `app/directory/[id]/page.tsx` |
| Follow / unfollow | Done | `app/directory/follow-button.tsx`, `app/api/follow/route.ts` |
| Public profile via username slug | Done | `app/u/[slug]/page.tsx` |
| Shareable profile link | Done | `app/profile/share-profile-link.tsx` |
| Profile completeness tracker (13 fields) | Done | `app/profile/profile-form.tsx` |
| Avatar upload to Supabase Storage | Done | `app/profile/profile-form.tsx` |

### Module 2 — Opportunities

| Feature | Status | Location |
|---------|--------|----------|
| List opportunities (grants, fellowships, jobs, partnerships) | Done | `app/opportunities/` |
| Create / edit / close opportunity | Done | `app/opportunities/new/`, `[id]/edit/` |
| Apply to opportunity | Done | `app/opportunities/[id]/apply-button.tsx` |
| Admin moderation (activate/deactivate) | Done | `app/api/admin/opportunity/route.ts` |

### Module 3 — Price Tracker

| Feature | Status | Location |
|---------|--------|----------|
| View commodity prices (filter by commodity, state, market) | Done | `app/prices/` |
| Submit a price report | Done | `app/prices/submit/page.tsx` |
| Edit price report | Done | `app/prices/[id]/edit/page.tsx` |
| **Price alerts (email/push when a commodity hits a threshold)** | **Not built** | Described on landing page but no implementation exists |

### Module 4 — Marketplace

| Feature | Status | Location |
|---------|--------|----------|
| Browse listings with filters | Done | `app/marketplace/` |
| Create / edit / close listing | Done | `app/marketplace/new/`, `[id]/edit/` |
| Listing detail with contact actions | Done | `app/marketplace/[id]/page.tsx` |
| Admin moderation | Done | `app/api/admin/listing/route.ts` |

### Module 5 — Research Board

| Feature | Status | Location |
|---------|--------|----------|
| Browse research posts (papers, questions, collaborations) | Done | `app/research/` |
| Create / edit research post | Done | `app/research/new/`, `[id]/edit/` |
| Tags and type filtering | Done | `app/research/research-client.tsx` |
| Admin moderation (lock/unlock, activate/deactivate) | Done | `app/api/admin/` |

### Module 6 — Business Suite

| Feature | Status | Location |
|---------|--------|----------|
| Business profile setup (name, logo, address, phone) | Done | `app/business/setup/page.tsx` |
| Product catalogue | Done | `app/business/products/page.tsx` |
| Customer management | Done | `app/business/customers/page.tsx` |
| Customer statement generation | Done | `app/business/customers/[id]/statement/` |
| Invoice creation with line items | Done | `app/business/invoices/new/page.tsx` |
| Invoice status workflow (draft → sent → paid / overdue) | Done | `app/business/invoices/` |
| Invoice print layout | Done | `app/business/invoices/[id]/`, `app/invoice-print/[id]/` |
| Record payment against invoice | Done | `app/business/invoices/RecordPaymentButton.tsx` |
| Expense tracking by category | Done | `app/business/expenses/page.tsx` |
| Financial reports (revenue, expenses, P&L, profit margin) | Done | `app/business/reports/` |
| Report print layout | Done | `app/business/reports/print/` |
| Period filtering (month / quarter / year / all) | Done | `app/business/PeriodToggle.tsx` |
| Onboarding checklist (4 steps) | Done | `app/business/page.tsx` |

### Mentorship Module

| Feature | Status | Location |
|---------|--------|----------|
| Mentorship module | **Not started** | Route `/mentorship` is in middleware matcher but no pages or DB tables exist |

### Connections & Insights Feed

| Feature | Status | Location |
|---------|--------|----------|
| Network feed (posts, polls, articles, market flash) | **Not built** | Described as Module 01 on landing page; no implementation |
| Direct messaging | **Not built** | — |

### Platform Features

| Feature | Status | Location |
|---------|--------|----------|
| Dark / light theme | Done | `app/components/ThemeProvider.tsx`, `ThemeToggle.tsx` |
| SEO (OpenGraph, Twitter cards, structured metadata) | Done | `app/layout.tsx`, per-page metadata |
| Mobile responsive navigation | Done | `app/components/AppNav.tsx` |
| Cross-module search | Done | `app/api/search/route.ts` |
| Like system | Done | `app/components/LikeButton.tsx`, `app/api/like/route.ts` |
| Comments | Done | `app/components/CommentsSection.tsx` |
| Content reporting | Done | `app/components/ReportButton.tsx`, `app/api/report/route.ts` |
| Verified badge (paid via Paystack) | Done | `app/verify/page.tsx`, `app/components/VerifiedBadge.tsx` |
| Elite badge (admin-awarded) | Done | `app/components/EliteBadge.tsx` |
| Announcement banner | Done | `app/components/AnnouncementBanner.tsx` |
| Admin dashboard | Done | `app/admin/` |
| Weekly email digest | Done | `app/api/cron/weekly-digest/route.ts` |
| Subscription expiry cron | Done | `app/api/cron/expire-subscriptions/route.ts` |
| Expiry reminder emails | Done | `app/api/cron/expiry-reminder/route.ts` |
| Waitlist (pre-launch) | Done | `app/api/waitlist/route.ts`, landing page form |
| Contact form | Done | `app/contact/`, `app/api/contact/route.ts` |
| About page | Done | `app/about/page.tsx` |
| Privacy policy | Done | `app/privacy/page.tsx` |
| Terms of service | Done | `app/terms/page.tsx` |

---

## Known Issues & Gaps

### Code Quality

1. **Duplicate dependency in `package.json`** — `@supabase/ssr` is listed twice (versions `^0.5.0` and `^0.10.0`). Only one should remain (keep `^0.10.0`).
2. **Frequent `as any` casts** — `supabase as any` is used throughout to work around TypeScript type inference issues with Supabase queries on tables like `follows`, `profiles`, `settings`. Consider generating Supabase types with `supabase gen types typescript` to eliminate these.
3. **Inline styles vs Tailwind** — The public-facing pages (landing, about, contact, login, signup, verify) use extensive inline `style={{}}` objects with CSS custom properties, while authenticated pages use Tailwind classes. This is a deliberate choice (public pages have custom theming) but creates two styling patterns to maintain.

### Security & RLS

4. **Service role key usage** — `SUPABASE_SERVICE_ROLE_KEY` is used in pricing, admin, and cron routes. This is correct for server-only admin operations but every new API route should be audited to ensure the service role is never exposed client-side.
5. **Waitlist and contact routes** use the anon key with `createClient` from `@supabase/supabase-js` (not the SSR client). This works but bypasses cookie-based auth. Ensure the relevant tables have appropriate RLS policies for anonymous inserts.
6. **Profile API** — The `POST /api/profile` endpoint accepts `id` from the request body. It also validates via `getUser()`, but the `id` in the body should be cross-checked against the authenticated user to prevent profile spoofing.

### Missing Implementations

7. **Price Alerts** — Promised on the landing page ("Set price alerts for your crops") but no alert subscription or notification system exists.
8. **Connections & Insights Feed** — Listed as Module 01 on the landing page with messaging, polls, articles, and market flash. None of this is built.
9. **Mentorship module** — Route is in the middleware matcher but nothing else exists.
10. **Forgot password flow** — Login page links to `/forgot-password` but no page exists at that route.
11. **LinkedIn OAuth** and **Facebook OAuth** — Buttons not present on login/signup pages; Supabase providers not configured.

### Infrastructure

12. **No `.env.example`** — New developers have no reference for required environment variables.
13. **No automated tests** — No test files, no test framework configured.
14. **No CI/CD pipeline** — Relies on Vercel auto-deploy from GitHub pushes, but no linting or build checks on PR.

---

## Recommended Next Steps

### Immediate (before launch)

1. **Wire LinkedIn OAuth** — Enable provider in Supabase dashboard, add button to login/signup pages, test callback flow.
2. **Wire Facebook OAuth** — Same as above for Facebook.
3. **Scope and build Mentorship module** — Define DB schema (mentors, mentees, requests, sessions), create pages, add to AppNav.
4. **Build forgot password page** — Use `supabase.auth.resetPasswordForEmail()` with a Resend-styled email.
5. **Fix duplicate `@supabase/ssr` in `package.json`** — Remove the `^0.5.0` entry.

### Before or shortly after launch

6. **Generate Supabase TypeScript types** — Eliminate `as any` casts across the codebase.
7. **Add `.env.example`** — Document all required environment variables.
8. **Implement Price Alerts** — Either remove the promise from the landing page or build a basic email alert system using the existing cron infrastructure.
9. **Build Connections & Insights Feed** — Or update the landing page copy to reflect what's actually available at launch.
10. **Add basic test coverage** — At minimum, test critical API routes (auth callback, profile save, payment webhook).

### Post-launch

11. **Direct messaging** between members.
12. **Notification system** (in-app + email) for follows, applications, price alerts.
13. **Analytics dashboard** for admin (signups over time, active users, module usage).
14. **Mobile app** consideration (React Native or PWA).

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
| `customers` | Business customers |
| `business_expenses` | Business expense records |
| `waitlist_signups` | Pre-launch waitlist entries |
| `contact_messages` | Contact form submissions |
| `settings` | Platform-wide settings (pricing, registration toggle) |
| `reports` | Content reports from users |

---

## Route Protection

The middleware at `middleware.ts` redirects unauthenticated users to `/login` for these route patterns:

`/dashboard`, `/profile`, `/directory`, `/opportunities`, `/prices`, `/marketplace`, `/research`, `/mentorship`, `/grants`, `/insights`, `/connections`

Note: `/mentorship`, `/grants`, `/insights`, `/connections` are pre-registered in the matcher for future modules.

# AgroYield Network — Codebase Audit & Record

**Date:** 12 April 2026 (Checkpoint 2)
**Domain:** agroyield.africa
**Launch Target:** 5 July 2026
**Tech Stack:** Next.js 16.2 · React 19 · Supabase (DB + Auth) · Vercel · Resend · Paystack · Tailwind CSS 4 · TypeScript

---

## 1. Project Structure

```
agroyield-network/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # Root layout (Geist fonts, ThemeProvider, AnnouncementBanner)
│   ├── page.tsx              # Landing page (server component → HomeClient)
│   ├── home-client.tsx       # Landing page client (hero, countdown, waitlist, modules grid)
│   ├── globals.css           # Global styles + dark mode form overrides
│   ├── error.tsx             # Global error boundary
│   ├── not-found.tsx         # 404 page
│   ├── loading.tsx           # Global loading state
│   │
│   ├── login/page.tsx        # Email + password + Google OAuth sign-in
│   ├── signup/page.tsx       # Email + password + Google OAuth sign-up (registration toggle)
│   ├── forgot-password/page.tsx  # Password reset request
│   ├── reset-password/page.tsx   # Password reset form
│   ├── verify/page.tsx       # Verification (paid badge) purchase page
│   ├── verify/success/       # Post-verification success page
│   │
│   ├── auth/
│   │   ├── callback/route.ts # OAuth callback — exchanges code, sends welcome email (Resend)
│   │   └── signout/route.ts  # Sign-out handler
│   │
│   ├── dashboard/page.tsx    # Authenticated dashboard — 6 module cards, profile completion nudge
│   ├── profile/
│   │   ├── page.tsx          # Profile page (followers/following stats, share link)
│   │   ├── profile-form.tsx  # Profile editor (avatar, role, bio, institution, interests, contacts, links)
│   │   ├── share-profile-link.tsx  # Shareable profile URL component
│   │   └── [id]/page.tsx     # Public profile view
│   │
│   ├── directory/
│   │   ├── page.tsx          # Member directory (server)
│   │   ├── directory-client.tsx  # Client-side filtering & search
│   │   ├── follow-button.tsx # Follow/unfollow functionality
│   │   ├── [id]/page.tsx     # Individual member profile view
│   │   └── loading.tsx
│   │
│   ├── opportunities/
│   │   ├── page.tsx          # Opportunities listing
│   │   ├── opportunities-client.tsx  # Client filtering
│   │   ├── new/page.tsx      # Create new opportunity
│   │   ├── [id]/page.tsx     # Opportunity detail
│   │   ├── [id]/edit/page.tsx # Edit opportunity
│   │   ├── [id]/apply-button.tsx   # Apply button
│   │   ├── [id]/OpportunityActions.tsx  # Edit/delete actions
│   │   └── loading.tsx
│   │
│   ├── prices/
│   │   ├── page.tsx          # Commodity price tracker
│   │   ├── prices-client.tsx # Client filtering & display
│   │   ├── submit/page.tsx   # Submit a new price report
│   │   ├── [id]/edit/page.tsx # Edit price report
│   │   └── loading.tsx
│   │
│   ├── marketplace/
│   │   ├── page.tsx          # Marketplace listings
│   │   ├── marketplace-client.tsx  # Client filtering
│   │   ├── new/page.tsx      # Create new listing
│   │   ├── [id]/page.tsx     # Listing detail
│   │   ├── [id]/edit/page.tsx # Edit listing
│   │   ├── [id]/ListingActions.tsx  # Actions on listings
│   │   └── loading.tsx
│   │
│   ├── research/
│   │   ├── page.tsx          # Research board
│   │   ├── research-client.tsx  # Client filtering
│   │   ├── new/page.tsx      # Post new research
│   │   ├── [id]/page.tsx     # Research post detail
│   │   ├── [id]/edit/page.tsx # Edit research post
│   │   ├── [id]/ResearchActions.tsx
│   │   └── loading.tsx
│   │
│   ├── business/             # Business Suite (SME management)
│   │   ├── layout.tsx        # Sidebar nav (Dashboard, Setup, Products, Customers, Invoices, Expenses, Assets, Reports, Team)
│   │   ├── page.tsx          # Business dashboard (P&L, health score, low stock alerts, onboarding checklist, recent activity)
│   │   ├── MobileNav.tsx     # Mobile bottom nav (Home, Products, Invoices, Expenses, Assets)
│   │   ├── PeriodToggle.tsx  # Month/Quarter/Year/All filter
│   │   ├── SidebarThemeToggle.tsx  # Theme toggle for sidebar
│   │   ├── setup/page.tsx    # Business profile setup
│   │   ├── products/page.tsx # Product catalogue with stock tracking
│   │   ├── customers/
│   │   │   ├── page.tsx      # Customer management
│   │   │   └── [id]/statement/ # Customer statement + print
│   │   ├── invoices/
│   │   │   ├── page.tsx      # Invoice listing with table + mobile cards
│   │   │   ├── InvoicesTable.tsx
│   │   │   ├── RecordPaymentButton.tsx  # Direct payment recording (with stock deduction)
│   │   │   ├── new/page.tsx  # Create invoice (multi-type, VAT, stock warnings)
│   │   │   └── [id]/
│   │   │       ├── page.tsx  # Invoice detail
│   │   │       └── InvoiceActions.tsx  # Status changes + stock deduction/restore
│   │   ├── expenses/page.tsx # Expense tracking + spread feature
│   │   ├── assets/page.tsx   # Fixed asset register (4 categories, conditions, lifecycle)
│   │   ├── reports/
│   │   │   ├── page.tsx      # Reports (P&L, inventory valuation, top products/customers, Excel export)
│   │   │   ├── ReportExport.tsx  # Excel export component
│   │   │   └── print/page.tsx    # Print layout
│   │   ├── team/page.tsx     # Team management (invite, roles, revoke)
│   │   └── accept-invite/page.tsx  # Accept team invitation flow
│   │
│   ├── invoice-print/[id]/   # Public invoice print view
│   │
│   ├── pricing/
│   │   ├── page.tsx          # Pricing page
│   │   └── pricing-client.tsx # Paystack checkout
│   │
│   ├── subscribe/success/page.tsx  # Post-payment success
│   │
│   ├── admin/
│   │   ├── page.tsx          # Admin dashboard
│   │   └── admin-client.tsx  # Admin client (moderation, members, reports, settings)
│   │
│   ├── about/page.tsx
│   ├── contact/
│   │   ├── page.tsx
│   │   └── contact-client.tsx
│   ├── privacy/page.tsx
│   ├── terms/page.tsx
│   ├── data-deletion/page.tsx
│   ├── u/[slug]/page.tsx     # Public profile by username slug
│   │
│   ├── components/
│   │   ├── AppNav.tsx        # Authenticated navigation (desktop + mobile, user dropdown, admin link)
│   │   ├── AnnouncementBanner.tsx
│   │   ├── ThemeProvider.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── VerifiedBadge.tsx
│   │   ├── EliteBadge.tsx
│   │   ├── LikeButton.tsx
│   │   ├── ReportButton.tsx
│   │   └── CommentsSection.tsx
│   │
│   └── api/
│       ├── profile/route.ts
│       ├── waitlist/route.ts
│       ├── contact/route.ts
│       ├── search/route.ts
│       ├── follow/route.ts
│       ├── like/route.ts
│       ├── apply/route.ts
│       ├── report/route.ts
│       ├── opportunities/route.ts
│       ├── marketplace/route.ts
│       ├── research/route.ts
│       ├── prices/route.ts
│       ├── pricing/route.ts
│       ├── subscribe/route.ts
│       ├── content-types/route.ts
│       ├── registration-status/route.ts
│       ├── business/
│       │   ├── invite/route.ts        # Team invitation (Resend email)
│       │   └── accept-invite/route.ts  # Accept invitation (service role)
│       ├── payment/
│       │   ├── initiate/route.ts
│       │   ├── verify/route.ts
│       │   └── webhook/route.ts
│       ├── webhooks/paystack/route.ts
│       ├── auth/
│       │   ├── reset-password/route.ts
│       │   └── facebook-deletion/route.ts
│       ├── admin/
│       │   ├── listing/route.ts
│       │   ├── member/route.ts
│       │   ├── opportunity/route.ts
│       │   ├── reports/route.ts
│       │   └── settings/route.ts
│       └── cron/
│           ├── weekly-digest/route.ts
│           ├── expire-subscriptions/route.ts
│           └── expiry-reminder/route.ts
│
├── lib/supabase/
│   ├── client.ts             # Browser Supabase client
│   └── server.ts             # Server Supabase client (cookie-based)
│
├── middleware.ts              # Auth middleware
├── next.config.ts
├── tsconfig.json
├── package.json
├── postcss.config.mjs
├── eslint.config.mjs
├── PROJECT_STATUS.md          # Project status tracker
├── CODEBASE_AUDIT.md          # This file
└── AgroYield-Strategic-Review.docx  # Strategic product review document
```

---

## 2. Supabase Database Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `profiles` | id, first_name, last_name, role, bio, location, institution, interests, linkedin, twitter, website, avatar_url, phone, whatsapp, username, is_verified, is_elite, is_admin, admin_role, email, created_at, updated_at | User profiles |
| `follows` | follower_id, following_id | Follow relationships |
| `opportunities` | id, user_id, title, type, organisation, location, description, deadline, is_closed, is_active, is_pending_review, created_at | Grants, jobs, fellowships |
| `marketplace_listings` | id, user_id, title, category, type, price, price_negotiable, description, state, is_closed, is_active, is_pending_review, created_at | Buy/sell/trade |
| `research_posts` | id, user_id, title, type, content, tags, abstract, is_locked, is_active, created_at | Research board |
| `price_reports` | id, user_id, commodity, category, price, unit, market_name, state, reported_at | Commodity prices |
| `businesses` | id, user_id, name, logo_url, address, phone | Business profiles |
| `business_products` | id, business_id, user_id, name, description, unit, unit_price, cost_price, stock_quantity, low_stock_threshold, is_active | Product catalogue |
| `customers` | id, business_id, user_id, name, email, phone, address | Business customers |
| `invoices` | id, business_id, user_id, invoice_number, status, total, subtotal, vat_amount, issue_date, due_date, customer_id, type, notes | Invoices |
| `invoice_items` | id, invoice_id, product_id, description, quantity, unit_price, amount | Line items |
| `business_expenses` | id, business_id, user_id, description, category, amount, date, notes | Expenses |
| `business_assets` | id, business_id, user_id, name, category, description, serial_number, tag_number, purchase_date, purchase_price, current_value, location, condition, assigned_to, photo_url, status, notes | Fixed assets |
| `business_team` | id, business_id, invited_by, email, role, status, user_id, invite_token, invited_at, accepted_at | Team invitations & members |
| `stock_movements` | id, business_id, user_id, product_id, quantity, type, reason, note, invoice_id, created_at | Stock audit trail |
| `subscriptions` | id, user_id, plan, status, paystack_reference, started_at, expires_at | Paystack subscriptions |
| `comments` | id, user_id, post_id, post_type, content, created_at | Comments on all content |
| `likes` | id, user_id, post_id, post_type | Likes |
| `reports` | id, user_id, post_id, post_type, reason, created_at | Content reports |
| `waitlist_signups` | email, source | Pre-launch waitlist |
| `contact_messages` | name, email, subject, message | Contact form |
| `settings` | key, value | Platform config (rate limits, moderation mode, pricing) |

---

## 3. Authentication

| Method | Status | Notes |
|--------|--------|-------|
| Email + Password | ✅ Working | Sign up with first/last name, email confirmation required |
| Google OAuth | ✅ Working | Via Google Console, `signInWithOAuth` |
| LinkedIn OAuth | ⏳ Pending | Credentials in portal, not wired into app |
| Facebook OAuth | ⏳ Pending | Credentials in portal, not wired into app |

Auth callback (`/auth/callback`) handles all OAuth providers: exchanges code for session, checks if profile exists, sends welcome email, redirects to profile setup or dashboard.

---

## 4. Key Patterns & Architecture Notes

### Data Fetching
- Server components for initial page loads (Supabase server client with cookies)
- Client components (`'use client'`) for interactive features
- Service role client (`SUPABASE_SERVICE_ROLE_KEY`) for admin operations and bypassing RLS in API routes

### UI Patterns
- Desktop table + mobile cards: `hidden md:table` for desktop, `md:hidden` for mobile cards
- Dark mode: class-based via `next-themes` with `attribute="class"`, global CSS overrides for form elements
- Status badges: consistent colour-coded badges across modules
- Currency: `Intl.NumberFormat('en-NG')` with NGN → ₦ replacement
- Dates: `en-GB` locale (2-digit day, short month, numeric year)

### Business Suite Specifics
- Stock movements linked to invoices via `invoice_id` for audit trail
- Invoice types: invoice, receipt, proforma_invoice, delivery_note
- Health Score: 5 factors (profitability 30pts, cash collection 25pts, overdue exposure 20pts, expense control 15pts, stock health 10pts)
- Expense spread: splits amount across N months, handles rounding remainder on first entry
- Team roles: owner (full), accountant (invoices/expenses/reports), staff (view-only)

### Email Templates
- Branded dark-theme HTML (background: #060d09, accent: #22c55e)
- Logo: `https://agroyield.africa/logo-horizontal-white.png`
- From: `noreply@agroyield.africa` (contact confirmations, invites, digests)

---

## 5. Middleware (Protected Routes)

Routes protected by auth middleware at `middleware.ts`:

`/dashboard`, `/profile`, `/directory`, `/opportunities`, `/prices`, `/marketplace`, `/research`, `/mentorship`, `/grants`, `/insights`, `/connections`

---

## 6. Dependencies

**Production:** `@supabase/ssr`, `@supabase/supabase-js`, `next`, `react`, `react-dom`, `next-themes`, `resend`, `exceljs`
**Dev:** `@tailwindcss/postcss`, `typescript`, `eslint`, `eslint-config-next`

---

## 7. Audit History

| Date | Auditor | Summary |
|------|---------|---------|
| April 11, 2026 | Claude | Initial audit — 6 modules working, business suite core complete |
| April 12, 2026 | Claude | Checkpoint 2 — added assets, expense spread, health score, team access, dark mode fixes, strategic review |

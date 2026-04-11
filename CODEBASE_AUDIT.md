# AgroYield Network — Codebase Audit & Record

**Date:** 11 April 2026  
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
│   ├── globals.css           # Global styles
│   ├── error.tsx             # Global error boundary
│   ├── not-found.tsx         # 404 page
│   ├── loading.tsx           # Global loading state
│   │
│   ├── login/page.tsx        # Email + password + Google OAuth sign-in
│   ├── signup/page.tsx       # Email + password + Google OAuth sign-up (registration toggle)
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
│   │   ├── layout.tsx        # Side navigation (Dashboard, Setup, Products, Customers, Invoices, Expenses, Reports)
│   │   ├── page.tsx          # Business dashboard (P&L hero, invoice status, onboarding checklist, recent activity)
│   │   ├── PeriodToggle.tsx  # Month/Quarter/Year/All filter
│   │   ├── setup/page.tsx    # Business profile setup
│   │   ├── products/page.tsx # Product catalogue
│   │   ├── customers/page.tsx # Customer management
│   │   ├── customers/[id]/statement/ # Customer statement views
│   │   ├── invoices/
│   │   │   ├── page.tsx      # Invoice listing with table
│   │   │   ├── InvoicesTable.tsx
│   │   │   ├── RecordPaymentButton.tsx
│   │   │   ├── new/page.tsx  # Create new invoice
│   │   │   └── [id]/         # Invoice detail + actions
│   │   ├── expenses/page.tsx # Expense tracking
│   │   └── reports/          # Financial reports (with print layouts)
│   │
│   ├── invoice-print/[id]/   # Public invoice print view (with PrintButton)
│   │
│   ├── pricing/
│   │   ├── page.tsx          # Pricing page (reads prices from settings table via service role)
│   │   └── pricing-client.tsx # Client pricing display + Paystack checkout
│   │
│   ├── subscribe/success/page.tsx  # Post-payment success page
│   │
│   ├── admin/
│   │   ├── page.tsx          # Admin dashboard (stats, manage content/members/reports/settings)
│   │   └── admin-client.tsx  # Admin client (tabs for opportunities, listings, members, reports, settings)
│   │
│   ├── about/page.tsx        # About page (mission, vision, timeline, advisory board)
│   ├── contact/
│   │   ├── page.tsx          # Contact page (metadata)
│   │   └── contact-client.tsx # Contact form
│   ├── privacy/page.tsx      # Privacy policy
│   ├── terms/page.tsx        # Terms of service
│   │
│   ├── u/[slug]/page.tsx     # Public profile by username slug
│   │
│   ├── components/
│   │   ├── AppNav.tsx        # Authenticated navigation (desktop + mobile responsive, user dropdown, admin link)
│   │   ├── AnnouncementBanner.tsx  # Top announcement banner
│   │   ├── ThemeProvider.tsx # Dark/light theme context
│   │   ├── ThemeToggle.tsx   # Theme toggle button
│   │   ├── VerifiedBadge.tsx # Green verification badge
│   │   ├── EliteBadge.tsx    # Gold elite badge
│   │   ├── LikeButton.tsx    # Like/unlike component
│   │   ├── ReportButton.tsx  # Report content button
│   │   └── CommentsSection.tsx # Comments component
│   │
│   └── api/                  # API Routes
│       ├── profile/route.ts          # Profile upsert (auto-generates username slug)
│       ├── waitlist/route.ts         # Waitlist signup + confirmation email (Resend)
│       ├── contact/route.ts          # Contact form submission + email (Resend)
│       ├── search/route.ts           # Cross-module search (profiles, opportunities, listings, research)
│       ├── follow/route.ts           # Follow/unfollow
│       ├── like/route.ts             # Like/unlike
│       ├── apply/route.ts            # Apply to opportunity
│       ├── report/route.ts           # Report content
│       ├── opportunities/route.ts    # CRUD for opportunities
│       ├── marketplace/route.ts      # CRUD for marketplace listings
│       ├── research/route.ts         # CRUD for research posts
│       ├── prices/route.ts           # CRUD for price reports
│       ├── pricing/route.ts          # Read pricing from settings
│       ├── subscribe/route.ts        # Subscription initiation
│       ├── content-types/route.ts    # Content type definitions
│       ├── registration-status/route.ts  # Check if registration is open
│       ├── payment/
│       │   ├── initiate/route.ts     # Paystack payment initialization
│       │   ├── verify/route.ts       # Paystack payment verification
│       │   └── webhook/route.ts      # Paystack webhook handler
│       ├── webhooks/paystack/route.ts # Alternative Paystack webhook
│       ├── admin/
│       │   ├── listing/route.ts      # Admin listing management
│       │   ├── member/route.ts       # Admin member management
│       │   ├── opportunity/route.ts  # Admin opportunity management
│       │   ├── reports/route.ts      # Admin reports view
│       │   └── settings/route.ts     # Admin settings management
│       └── cron/
│           ├── weekly-digest/route.ts    # Weekly email digest
│           ├── expire-subscriptions/route.ts  # Auto-expire subscriptions
│           └── expiry-reminder/route.ts  # Subscription expiry reminders
│
├── lib/supabase/
│   ├── client.ts             # Browser Supabase client
│   └── server.ts             # Server Supabase client (cookie-based)
│
├── middleware.ts              # Auth middleware (protects dashboard, profile, directory, etc.)
├── next.config.ts
├── tsconfig.json
├── package.json
├── postcss.config.mjs
└── eslint.config.mjs
```

---

## 2. Supabase Database Tables (Inferred from Queries)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `profiles` | id, first_name, last_name, role, bio, location, institution, interests, linkedin, twitter, website, avatar_url, phone, whatsapp, username, is_verified, is_elite, is_admin, admin_role, email, created_at, updated_at | User profiles |
| `follows` | follower_id, following_id | Follow relationships |
| `opportunities` | id, user_id, title, type, organisation, location, description, deadline, is_closed, is_active, created_at | Grants, jobs, fellowships |
| `marketplace_listings` | id, user_id, title, category, type, price, price_negotiable, description, state, is_closed, is_active, created_at | Buy/sell/trade listings |
| `research_posts` | id, user_id, title, type, content, tags, abstract, is_locked, is_active, created_at | Research publications |
| `price_reports` | id, user_id, commodity, category, price, unit, market_name, state, reported_at | Commodity price data |
| `waitlist_signups` | email, source | Pre-launch waitlist |
| `contact_messages` | name, email, subject, message | Contact form submissions |
| `businesses` | id, user_id, name, logo_url, address, phone | Business profiles |
| `invoices` | id, user_id, invoice_number, status (draft/sent/paid/overdue), total, issue_date, customer_id | Invoices |
| `customers` | id, user_id, name | Business customers |
| `business_expenses` | id, user_id, description, category, amount, date | Business expenses |
| `settings` | key, value | Platform settings (prices, registration toggle) |
| `reports` | post_id, post_type, reason, created_at | Content reports |

---

## 3. Authentication

| Method | Status | Notes |
|--------|--------|-------|
| Email + Password | **Working** | Sign up with first/last name, email confirmation via Supabase + Resend welcome email |
| Google OAuth | **Working** | Configured via Google Console, uses `signInWithOAuth` |
| LinkedIn OAuth | **Pending** | Credentials not yet wired into Supabase or the app |
| Facebook OAuth | **Pending** | Credentials not yet wired into Supabase or the app |

Auth callback (`/auth/callback`) handles all OAuth providers: exchanges code for session, checks if profile exists, sends welcome email for new users, redirects to profile setup or dashboard.

---

## 4. Core Modules — Current State

### Module 1: Connections & Directory ✅ Working
- Member directory with search/filter by role, location, institution
- Follow/unfollow functionality
- Individual member profile pages
- Public profile via `/u/[slug]`
- Profile completeness tracker (13 fields)

### Module 2: Opportunities ✅ Working
- Post, edit, close opportunities (grants, fellowships, jobs, partnerships)
- Apply to opportunities
- Admin moderation (activate/deactivate)

### Module 3: Price Tracker ✅ Working
- Community-submitted commodity prices
- Filter by commodity, state, market
- Report a price with market name, state, unit

### Module 4: Marketplace ✅ Working
- Post listings (produce, equipment, inputs)
- Category & type filtering
- Price negotiation flag
- Admin moderation

### Module 5: Research Board ✅ Working
- Post research (papers, questions, collaborations)
- Tags and type filtering
- Lock/unlock posts
- Admin moderation

### Module 6: Business Suite ✅ Working
- Business profile setup (name, logo, address, phone)
- Product catalogue management
- Customer management with statement generation
- Invoice creation, editing, status tracking (draft → sent → paid/overdue)
- Invoice printing (dedicated print layouts)
- Expense tracking by category
- Financial reports with P&L, profit margin
- Period filtering (month/quarter/year/all)
- Onboarding checklist (4 steps)

---

## 5. Payments (Paystack) ✅ Working
- Verification subscription (monthly/annual)
- Paystack payment initialization and verification
- Webhook handling for async payment confirmation
- Cron jobs for subscription expiry and reminders
- Admin-configurable pricing via settings table

---

## 6. Admin Dashboard ✅ Working
- Stats overview (opportunities, listings, members, removed)
- Content moderation (activate/deactivate opportunities and listings)
- Member management (verify, elite badge, admin role assignment)
- Report review (grouped by post with reason counts)
- Platform settings (registration toggle, pricing)
- Role-based access (super admin vs moderator)

---

## 7. Email System (Resend) ✅ Working
- Welcome email on account creation
- Waitlist confirmation + admin notification
- Contact form confirmation + admin notification
- Weekly digest cron
- Subscription expiry reminders
- All emails use branded HTML templates (dark green theme)
- Sender: `noreply@agroyield.africa`

---

## 8. Additional Features

| Feature | Status |
|---------|--------|
| Dark/Light theme | ✅ Working (ThemeProvider + localStorage) |
| SEO (OpenGraph, Twitter cards, metadata) | ✅ Working |
| Mobile responsive navigation | ✅ Working |
| Cross-module search | ✅ Working |
| Like system | ✅ Working |
| Comments system | ✅ Working |
| Content reporting | ✅ Working |
| Verified badge (paid) | ✅ Working |
| Elite badge (admin-awarded) | ✅ Working |
| Public profile links (`/u/slug`) | ✅ Working |
| Announcement banner | ✅ Working |
| Registration open/close toggle | ✅ Working |
| Invoice printing | ✅ Working |

---

## 9. Middleware (Protected Routes)

Routes protected by auth middleware:
`/dashboard`, `/profile`, `/directory`, `/opportunities`, `/prices`, `/marketplace`, `/research`, `/mentorship`, `/grants`, `/insights`, `/connections`

Note: `/mentorship`, `/grants`, `/insights`, `/connections` are in the matcher but pages don't exist yet — ready for future modules.

---

## 10. Pending Work

1. **LinkedIn OAuth** — needs Supabase provider config + UI buttons on login/signup
2. **Facebook OAuth** — needs Supabase provider config + UI buttons on login/signup
3. **Mentorship Module** — not yet scoped or built
4. **Connections & Insights Feed** — described on landing page but no feed/messaging implementation yet
5. **Price Alerts** — described on landing page but not implemented

---

## 11. Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
PAYSTACK_SECRET_KEY
NEXT_PUBLIC_APP_URL
```

---

## 12. Dependencies

**Production:** `@supabase/ssr`, `@supabase/supabase-js`, `next`, `react`, `react-dom`, `next-themes`, `resend`, `xlsx`  
**Dev:** `tailwindcss`, `@tailwindcss/postcss`, `typescript`, `eslint`, `eslint-config-next`

# Pre-Beta-Launch QA Walk — 26 Apr 2026

**Owner:** @okoli **Target window:** Sun 26 Apr (anytime) **Est. time:** 90–120 min full walk; 15 min smoke-only
**Beta launch:** Mon 27 Apr 06:30 WAT — DO NOT ship code Sunday after the walk; this is validation, not iteration.

This walks through **everything** shipped in the multi-day push that landed in the run-up to beta. Feature flags, RLS migrations, server endpoints, UI polish, design system. Each test has an ID, a one-line action, the expected outcome, and a severity tier for if it fails:

- **BLOCKER** — fix before Mon 27 Apr 06:30 WAT or hold launch
- **HIGH** — ship anyway but file a P0 to fix this week
- **MEDIUM** — ship anyway, fix during beta window
- **LOW** — log for the post-launch backlog

Walk through in order. Some tests have setup requirements that earlier tests confirm.

---

## Prerequisites (do these first)

Open in tabs:
- Production: `https://agroyield.africa`
- Vercel project dashboard (latest deploy commit hash)
- Supabase Studio → SQL editor + Logs Explorer
- Sentry → recent issues (filter `vercel-production`)
- Slack `#beta-alerts`
- Better Stack uptime dashboard

Have on hand:
- Two test accounts that are accepted-connection peers (call them **tester_a** and **tester_b**). Both must have `username` set on their profile.
- A non-connected third account (**tester_c**) to verify connection-gating.
- A staging admin account if you want to test admin-only flows.
- A real iPhone and an Android phone open to the prod URL.

Quick state confirmation in Supabase SQL editor.

> **NOTE:** `supabase_migrations.schema_migrations` only tracks migrations
> applied via the Supabase CLI. If migrations were applied manually via
> the SQL editor (which has been the pattern this session), they will
> NOT show up there. Don't rely on that table — instead verify the
> downstream effects below (column / setting / table existence).

```sql
-- Effects-based check: each migration's signature artefact exists.

-- 20260422_comment_mentions.sql applied?
SELECT to_regclass('public.comment_mentions');                               -- non-NULL
SELECT to_regprocedure('public.tg_comment_mentions_validate_post_type()');   -- non-NULL

-- 20260423_drop_dead_post_comments.sql applied?
SELECT to_regclass('public.post_comments');                                  -- NULL (dropped)

-- 20260423_reports_post_type_check_widen.sql applied?
SELECT pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conname = 'reports_post_type_check';
-- Expect CHECK list including 'price_report', 'research', 'community_post'

-- 20260426_auto_suspend_users.sql applied?
SELECT column_name FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'reports'
   AND column_name = 'post_author_id';
-- Expect: 1 row

-- Comment-mentions flag still OFF (must be at launch)
SELECT key, is_enabled FROM public.feature_flags
 WHERE key = 'comment_mentions_enabled';
-- Expect: is_enabled = false  (column is is_enabled, not enabled)

-- Auto-suspend threshold seeded
SELECT key, value FROM public.settings
 WHERE key IN ('user_suspension_threshold', 'report_threshold');
-- Expect: user_suspension_threshold = '3', report_threshold = '3'

-- post_comments dropped
SELECT to_regclass('public.post_comments');
-- Expect: NULL

-- post_author_id backfilled on existing reports
SELECT count(*) FILTER (WHERE post_author_id IS NULL) AS null_author,
       count(*) FILTER (WHERE post_author_id IS NOT NULL) AS with_author
  FROM public.reports;
-- Expect: null_author = 0 (or very small if any orphans)
```

---

## Section A — Pre-flight smoke (10 min, do these even if skipping the rest)

| ID | Action | Expected | Severity |
|---|---|---|---|
| **A1** | Load `https://agroyield.africa` in an incognito window. | Marketing landing renders, countdown shows "Public launch in" + "Beta is live now (invite-only). Public launch 5 July 2026 — join the waitlist for early access." | BLOCKER |
| **A2** | On the marketing landing, submit the waitlist form with a real test email. | Email lands, success state shown, no console errors. | HIGH |
| **A3** | Click "Sign in" / navigate to `/login`. | Login page loads, dark-mode toggle works, no CLS. | BLOCKER |
| **A4** | On `/login`, focus the email field. On iPhone, the input does NOT zoom. | Page stays at 100% zoom on input focus. | BLOCKER |
| **A5** | Tap into the password field. iOS shows the saved-passwords keyboard suggestion (if you have one saved). | iOS suggests autofill; Chrome offers password manager. | MEDIUM |
| **A6** | Sign in with tester_a. | Redirect to dashboard; no errors. | BLOCKER |
| **A7** | Tap the AppNav avatar (top-right). | Dropdown opens with Heroicon SVG icons (no emoji glyphs); items: My Profile, Saved, [Admin Dashboard if admin], Support, FAQ, Sign out. | HIGH |
| **A8** | On mobile width (or DevTools mobile emulation), tap the hamburger. | Menu opens, screen reader announces "navigation menu, expanded"; tap target is comfortably ≥44px. | HIGH |

---

## Section B — Mentions system (flag still OFF)

The flag stays OFF at launch. These tests verify the **dormant** state behaves correctly — server returns 404, client falls back to direct-insert, no behaviour change visible to users.

| ID | Action | Expected | Severity |
|---|---|---|---|
| **B1** | In DevTools Network tab, post a comment on any community post. Watch the request. | Either: (a) `POST /api/comments` returns **404**, OR (b) the client never calls `/api/comments` at all and goes straight to Supabase. Comment appears as before. | BLOCKER |
| **B2** | Verify in Supabase SQL: `SELECT count(*) FROM public.comments WHERE created_at > now() - interval '5 min';` | Count grew by 1 per comment posted in B1. | HIGH |
| **B3** | Verify in Supabase: the new comment's `content` column is **plain text** (no `<@uuid>` tokens). | Plain text only — no tokenization while flag is off. | HIGH |
| **B4** | Verify `public.comment_mentions` is empty: `SELECT count(*) FROM public.comment_mentions;` | 0. (Stays 0 until flag is flipped.) | HIGH |
| **B5** | Verify `notifications` has no `comment_mention` rows: `SELECT count(*) FROM public.notifications WHERE type = 'comment_mention';` | 0. | HIGH |
| **B6** | DevTools Network → call `/api/comments` directly with `POST` and a JSON body. | Returns 404 with `{"error":"Not found"}`. | HIGH |

When ready to flip the flag, follow `docs/runbooks/comment-mentions-flag-flip.md`. **Do not flip it as part of this QA walk.**

---

## Section C — Reports + moderation pipeline

| ID | Action | Expected | Severity |
|---|---|---|---|
| **C1** | As tester_b, navigate to a price card posted by tester_a. Click the report flag → pick any reason → submit. | Button transitions to "✓ Reported" (in muted gray, not red); no native browser alert; in Supabase, `SELECT * FROM public.reports WHERE post_type='price_report' ORDER BY created_at DESC LIMIT 1;` returns the new row with `post_author_id = tester_a.id`. | BLOCKER |
| **C2** | Refresh the prices page. The Report flag on that card now shows "Reported" (the persistent state). | "Reported" indicator visible. | MEDIUM |
| **C3** | Sign in as admin. Open `/admin` → Reports tab. Find the report from C1. | Group title reads `"<commodity> @ <market>, <state>"` (NOT "Untitled"). count = 1. Status pill shows the post is still active. | BLOCKER |
| **C4** | On the same admin Reports tab, click "Remove" on that group. | Server flips `price_reports.is_active = false`; the group's local-state status updates to "Hidden"; in another tab, refreshing `/prices` shows the price report is gone from the public listing. | BLOCKER |
| **C5** | Click "Dismiss" on a different report (or recreate one). | Reports cleared from `public.reports`; the post's `is_active` is restored to true. | HIGH |
| **C6** | Repeat C1 with a community post (tester_b reports tester_a's post). | Same flow; admin tab shows "Community Post" with first 60 chars of content as the title. | BLOCKER |
| **C7** | Repeat with a research post and an opportunity, if you have those types posted. | Admin tab shows research title and opportunity title respectively. | HIGH |
| **C8** | Try to report your OWN post (tester_a reporting tester_a's price). | Either the Report button is hidden, OR clicking it shows the dropdown but the server rejects with a sensible error toast. Should NOT auto-suspend you when you cross the threshold. | HIGH |

### Auto-hide threshold (3 reports)

| ID | Action | Expected | Severity |
|---|---|---|---|
| **C9** | From tester_b, tester_c, and a fourth account, each report the same post. After the 3rd report (assuming `report_threshold = 3`), the post should auto-hide. | Post `is_active = false` on the underlying table; Slack `#beta-alerts` gets a "Content Auto-Hidden" message; admin email at `settings('admin_notification_email')` gets the auto-hide notification. | HIGH |

### Auto-suspend threshold (3 distinct reporters)

| ID | Action | Expected | Severity |
|---|---|---|---|
| **C10** | Have 3 distinct reporters flag any 3 of tester_a's posts (one report each). After the 3rd report, tester_a should be auto-suspended. | `SELECT is_suspended, last_suspension_cleared_at FROM public.profiles WHERE id = '<tester_a.id>';` shows `is_suspended = true`; Slack gets "User Auto-Suspended" warning; `admin_audit_log` has a row with `admin_id = '00000000-0000-0000-0000-000000000000'` and `action = 'auto_suspend'` and `details->>'distinct_reporters' = '3'`; tester_a's session is killed (try logging in as them — should fail). | BLOCKER |
| **C11** | As super admin, open Admin → Members → find tester_a → click Unsuspend. | `is_suspended = false` AND `last_suspension_cleared_at` set to a recent timestamp; tester_a can log in again; auth ban removed. | BLOCKER |
| **C12** | After C11, have ONE more reporter flag tester_a's content. tester_a should NOT be re-suspended (only 1 distinct reporter since `last_suspension_cleared_at`). | `is_suspended = false` still; `SELECT count(DISTINCT user_id) FROM reports WHERE post_author_id = '<tester_a.id>' AND created_at > <last_suspension_cleared_at>;` = 1. | BLOCKER |
| **C13** | Verify a super admin cannot be auto-suspended even with 5+ reports against them. | Reports rows land but `is_suspended` stays false. | HIGH |

---

## Section D — Self-delete pipelines

| ID | Action | Expected | Severity |
|---|---|---|---|
| **D1** | As tester_a, post a community post. Click the ✕ → confirm. | Post disappears immediately. Refresh the page — it stays gone. `SELECT is_active FROM public.community_posts WHERE id = '<post_id>';` returns `false`. | BLOCKER |
| **D2** | As tester_a, post a price report. Click Delete on it → confirm. | Same: row's `is_active=false`, gone from listing on refresh. | BLOCKER |
| **D3** | As tester_b (NOT the author), try to delete tester_a's post via DevTools direct API call: `DELETE /api/community/post {"postId":"<a's post id>"}`. | Returns 403 with `{"error":"You can only delete your own posts"}`. | HIGH |
| **D4** | Same as D3 but for `/api/prices` DELETE. | Returns 403 with the prices equivalent message. | HIGH |
| **D5** | DELETE the same post twice (idempotency check). | Second call returns `{"ok":true,"alreadyDeleted":true}` — no 404. | MEDIUM |

---

## Section E — Storage uploads (business logo / cover)

| ID | Action | Expected | Severity |
|---|---|---|---|
| **E1** | As tester_a, navigate to `/business/setup` (must own a business or be in new-mode). Upload a logo. | Upload succeeds; logo appears in the preview within 1–2 sec; `businesses.logo_url` updates to a `userId/businessId/logo.<ext>?v=<ts>` URL. | BLOCKER |
| **E2** | Upload a cover image on the same page. | Same: succeeds, `cover_image_url` updates. The cover renders correctly on `/b/<slug>` page. | BLOCKER |
| **E3** | DevTools Network → confirm both uploads went to `POST /api/business/upload` (not direct Supabase storage). | Network tab shows multipart POSTs to `/api/business/upload` returning `{publicUrl, path}`. | HIGH |
| **E4** | As tester_a (who owns business X), try to POST `/api/business/upload` with `businessId=<some other business they don't own>`. | Returns 403 `"Only the business owner can update the logo or cover"`. | HIGH |
| **E5** | Try uploading a non-image file (a PDF or .txt). | Returns 415 `"Only image files are allowed"`. | MEDIUM |
| **E6** | Try uploading an image >10 MB. | Returns 413 `"File too large (max 10 MB)"`. | MEDIUM |

---

## Section F — Auth forms + accessibility

| ID | Action | Expected | Severity |
|---|---|---|---|
| **F1** | Open `/login` in iOS Safari. Tap the email input. | NO zoom. Page stays at 100%. (Mid-tier Android in Chrome should also not zoom.) | BLOCKER |
| **F2** | iOS Safari → tap email field. The keyboard shows the email layout (with `@`). | Email-style keyboard. | HIGH |
| **F3** | Same on `/signup`. | Email field shows email keyboard, password fields show secure-text-entry behaviour. | HIGH |
| **F4** | On `/login`, submit with wrong credentials. | Red error banner appears; turn on VoiceOver/TalkBack — the error is announced. | HIGH |
| **F5** | Inspect the error banner in DevTools — confirm `role="alert"` is present. | Yes. (Same for `/signup` and `/prices/submit` and `ReportButton`.) | MEDIUM |
| **F6** | On `/login` after page load, the email field already has focus (cursor ready). | `autoFocus` working. | LOW |
| **F7** | iOS Safari saved-credentials prompt or Chrome password manager offers to fill on `/login` and to save on `/signup`. | Autocomplete works (requires having credentials saved or willing to save). | MEDIUM |

---

## Section G — AppNav + navigation

| ID | Action | Expected | Severity |
|---|---|---|---|
| **G1** | Mobile: tap hamburger. The button is ≥44×44 (use DevTools "Inspect" → check w-11 h-11). | 44×44 hit area. | HIGH |
| **G2** | Hamburger has VoiceOver/TalkBack label "Open navigation menu" / "Close navigation menu" depending on state. | Yes. | MEDIUM |
| **G3** | Hamburger icon is an SVG (not a `☰` glyph). When tapped, swap to ✕ SVG without layout shift. | No flicker, no shift. | MEDIUM |
| **G4** | Open user dropdown (top-right avatar). Items show inline SVG icons (not emoji). | All 5–6 items have Heroicon SVGs. | HIGH |
| **G5** | DevTools accessibility tree → SVG children of buttons have `aria-hidden="true"`. | True for the new icons. | LOW |
| **G6** | Tap "Sign out" — session ends, redirect to `/`. | Session cleared. | HIGH |

---

## Section H — Toast system

These verify the toast pattern works across all the surfaces we migrated. Each one is "trigger an error path → expect a toast, not an alert dialog."

| ID | Action | Expected | Severity |
|---|---|---|---|
| **H1** | As tester_a, try to post 21 community posts in one day (assuming daily limit is 20) — on the 21st, see "You can post a maximum of 20 community posts per day." | Toast appears top-right (desktop) or bottom-center (mobile), red, auto-dismisses after 5s. NO native browser alert. | BLOCKER |
| **H2** | On the community feed, click Repost on YOUR OWN post. | Toast: "You can't repost your own post." | HIGH |
| **H3** | On a price report card you own, click Delete → confirm. (D2 above already tests success path; this verifies the error path.) Disconnect WiFi mid-confirm. | Toast: "Network error — please check your connection and retry." | MEDIUM |
| **H4** | On a profile page that has a Message button, take that user's profile offline somehow OR pretend the API fails. | Toast: "Could not start conversation" or "Network error". | MEDIUM |
| **H5** | Multiple toasts: trigger 2 errors quickly. | Both toasts stack vertically; each auto-dismisses on its own timer. | LOW |
| **H6** | Click the X on a toast manually. | Toast disappears immediately. | LOW |
| **H7** | DevTools accessibility tree → toast container has `aria-live="polite"`. Error toasts have `role="alert"`; success toasts have `role="status"`. | Yes. | MEDIUM |

---

## Section I — Composer textareas

| ID | Action | Expected | Severity |
|---|---|---|---|
| **I1** | Comment composer on a community post. Type a multi-paragraph comment (press Enter for newline). | Newlines are preserved (textarea behavior). The composer expands to 2 visible rows. | HIGH |
| **I2** | Same composer: type a comment and press **Cmd+Enter** (Mac) / **Ctrl+Enter** (Win/Linux). | Submits the comment. Plain Enter does NOT submit. | HIGH |
| **I3** | Reply composer (click "Reply" on a top-level comment). | Same behaviour: textarea, multi-line, Cmd/Ctrl+Enter to submit. Placeholder hints `(⌘+Enter to send)`. | HIGH |
| **I4** | DM composer at `/messages/<id>`. Type a long message. | Composer auto-grows up to ~5 lines (~120px), then scrolls internally. | HIGH |
| **I5** | DM composer: press **Enter** alone. | **Submits** (matches WhatsApp/Telegram convention — different from comments). | HIGH |
| **I6** | DM composer: press **Shift+Enter**. | Inserts a newline. | MEDIUM |
| **I7** | Both composers on iOS Safari: tap into them and verify NO page zoom. | No zoom (the 16px floor in globals.css). | BLOCKER |

---

## Section J — Public surface dark mode

| ID | Action | Expected | Severity |
|---|---|---|---|
| **J1** | Open `/u/<some-user-slug>` in a fresh incognito window with system dark mode ON. | Page renders dark. Background is dark gray, text is light, accents are bright green. No flash of white. | BLOCKER |
| **J2** | Same for `/b/<some-business-slug>` (e.g. one with logo + cover + reviews). | Page renders dark uniformly: header card, business info, reviews, related listings — all dark. | BLOCKER |
| **J3** | Toggle system theme to light. Both pages re-render correctly. | No leftover dark colors, no contrast issues. | HIGH |
| **J4** | Share `/b/<slug>` URL to WhatsApp (in a personal chat with yourself). Tap the preview. | Open Graph preview is correct (image + title + description); destination renders correctly in WhatsApp's webview (which inherits system theme). | MEDIUM |
| **J5** | Inspect any "View profile" / "Open business" link card — make sure colors weren't accidentally inverted. | Looks intentional, brand-consistent. | LOW |

---

## Section K — Marketing landing

| ID | Action | Expected | Severity |
|---|---|---|---|
| **K1** | Open `/` (incognito, no auth). | Hero says "Now Building — Join the Founding Members"; countdown reads "Public launch in"; subtext: "Beta is live now (invite-only). Public launch 5 July 2026 — join the waitlist for early access." | BLOCKER |
| **K2** | Submit waitlist form. Confirm success state. | Confirmation panel shown, no console errors. | HIGH |
| **K3** | Inspect featured-business cards (lower on the page). Logo box renders the full logo (no edge-cropping for non-square logos). | `backgroundSize: contain` working. | HIGH |
| **K4** | Same cards: cover image fills the banner area as expected. | `backgroundSize: cover` (intentional for cover images). | HIGH |

---

## Section L — Database verification (run all in Supabase SQL editor)

```sql
-- L1. Migration effects (effects-based — schema_migrations only tracks
-- CLI-applied migrations; SQL-editor-applied migrations don't appear there).
SELECT
  to_regclass('public.comment_mentions') AS comment_mentions_table,        -- non-NULL
  to_regclass('public.post_comments') AS post_comments_table,              -- NULL (dropped)
  (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reports'
      AND column_name = 'post_author_id') AS post_author_id_col,           -- 1
  (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'last_suspension_cleared_at') AS last_cleared_col, -- 1
  (SELECT value FROM public.settings
    WHERE key = 'user_suspension_threshold') AS suspension_threshold;      -- '3'

-- L2. No orphan reports without post_author_id (post-backfill)
SELECT count(*) FROM public.reports WHERE post_author_id IS NULL;
-- Expect: 0 (or close to)

-- L3. Reports CHECK constraint widened
SELECT pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conname = 'reports_post_type_check';
-- Expect CHECK list including 'price_report', 'research', 'community_post'

-- L4. comment_mentions table + trigger present
SELECT to_regclass('public.comment_mentions');           -- non-NULL
SELECT to_regprocedure('public.tg_comment_mentions_validate_post_type()'); -- non-NULL

-- L5. last_suspension_cleared_at column exists on profiles
SELECT column_name FROM information_schema.columns
 WHERE table_schema='public' AND table_name='profiles'
   AND column_name='last_suspension_cleared_at';
-- Expect: 1 row

-- L6. user_suspension_threshold setting exists
SELECT key, value FROM public.settings
 WHERE key = 'user_suspension_threshold';
-- Expect: ('user_suspension_threshold', '3')

-- L7. Storage policies on business-logos still in place
SELECT polname FROM pg_policy
 WHERE polrelid = 'storage.objects'::regclass
   AND polname LIKE 'business_logos%';
-- Expect 3 rows (insert_owner, update_owner, delete_owner)

-- L8. RLS enabled on public.reports
SELECT relrowsecurity FROM pg_class WHERE relname = 'reports';
-- Expect: true

-- L9. Comment_mentions_enabled flag is OFF (must be at launch)
SELECT key, is_enabled FROM public.feature_flags
 WHERE key = 'comment_mentions_enabled';
-- Expect: is_enabled = false  (column is is_enabled, not enabled)
```

If any of L1–L9 fail, that's a BLOCKER until resolved.

---

## Section M — Production observability

| ID | Action | Expected | Severity |
|---|---|---|---|
| **M1** | Open Sentry project → recent issues. Filter by environment=`vercel-production`. | No new issue spikes since latest deploy. The Supabase auth-token lock errors should be **filtered out** (instrumentation-client.ts ignoreErrors). | HIGH |
| **M2** | Open Slack `#beta-alerts`. | No critical errors flagged in the past hour. | HIGH |
| **M3** | Open Better Stack uptime dashboard. | All probes green. | HIGH |
| **M4** | Hit `/api/health` (or your equivalent). | Returns 200. | MEDIUM |
| **M5** | Check Vercel function logs for the latest deploy. | No 500s on `/api/comments`, `/api/report`, `/api/business/upload`, `/api/community/post`, `/api/prices`. | HIGH |

---

## Section N — Rollback procedures

If anything blocking surfaces during the walk and you can't fix it before Monday 06:30 WAT:

**Mentions system breaks:**
- Already OFF. Nothing to roll back unless someone flipped it.
- Verify with L9.

**Auto-suspend mis-firing:**
- Bump the threshold:
  ```sql
  UPDATE public.settings SET value = '99' WHERE key = 'user_suspension_threshold';
  ```
- This effectively disables auto-suspend without code rollback.

**Reports system broken (insert failing):**
- Check the CHECK constraint via L3.
- If a new post_type is being rejected, widen the constraint with another migration.

**Storage uploads failing:**
- Server endpoint is at `/api/business/upload`. Check Vercel logs for the actual error.
- Worst case: service-role client bypass means RLS isn't the gate; check `SUPABASE_SERVICE_ROLE_KEY` env in Vercel.

**Public surface dark mode renders broken:**
- Add `style={{ colorScheme: 'light' }}` to the `<html>` or `<body>` in `app/layout.tsx` to lock light mode while you investigate.

**Toast system broken (no toasts appear):**
- Verify `<ToastProvider>` is in `app/layout.tsx`.
- Check console for "useToast must be called inside `<ToastProvider>`" errors.

**Auth form auto-zoom regression on iOS:**
- Verify `app/globals.css` has the `@media (max-width: 640px) { input/select/textarea { font-size: 16px } }` rule.

**Marketing copy regression:**
- One-line revert in `app/home-client.tsx`. Trivial.

If a BLOCKER cannot be resolved, **delay the launch by 24h** rather than ship broken. The waitlist users will tolerate "launching tomorrow" better than "launched and broken."

---

## Sign-off

After completing the walk:

```
[ ]  Section A — Pre-flight smoke         (8 tests)
[ ]  Section B — Mentions flag-OFF        (6 tests)
[ ]  Section C — Reports + moderation     (13 tests including auto-suspend)
[ ]  Section D — Self-delete              (5 tests)
[ ]  Section E — Storage uploads          (6 tests)
[ ]  Section F — Auth + a11y              (7 tests)
[ ]  Section G — AppNav                   (6 tests)
[ ]  Section H — Toast system             (7 tests)
[ ]  Section I — Composer textareas       (7 tests)
[ ]  Section J — Public surface dark mode (5 tests)
[ ]  Section K — Marketing landing        (4 tests)
[ ]  Section L — Database integrity       (9 SQL checks)
[ ]  Section M — Observability            (5 checks)
```

Total: ~88 individual checks across 13 areas.

Done? Capture screenshots of any FAILs, paste them into this doc as comments, file the high-severity ones as tasks before bed Sunday.

— @okoli's launch-readiness checklist, 26 Apr 2026

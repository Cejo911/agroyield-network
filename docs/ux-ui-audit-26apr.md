# AgroYield Network — UX/UI Audit · 26 Apr 2026

**Owner:** @okoli **Reviewer:** Claude (UX/UI specialist hat)
**Scope:** every user-facing surface in `app/` plus the core components in `app/components/`
**Method:** code-grounded inspection (file + line citations throughout). I haven't seen rendered screenshots of every screen; some findings are pattern-level inferences. Verify visually where flagged.

This audit was triggered the night before the QA walk (Sun 26 Apr) and two days before beta launch (Mon 27 Apr 06:30 WAT). Findings are graded **P0** (launch-blocking, fix before Monday), **P1** (pre-public-launch, next 72 days), **P2** (post-launch polish).

---

## Executive summary

1. **The platform is functionally there.** Most surfaces work; the moderation, prices, mentions, and report-button pipelines we shipped this week put it ahead of where most beta-stage apps land. Keep the BusinessLogo / PageShell / PageHeader / PrimaryLink primitives — they're genuinely good.
2. **The gap to "world's best" is mostly polish, not architecture.** The biggest single win is killing every `alert()` and `confirm()` call (~45 sites) and replacing them with one toast system + one ConfirmModal. Cumulative effect on perceived quality is dramatic.
3. **Mobile is treated as "smaller desktop", not the primary surface.** Bottom-nav missing, modals don't adapt to phones, iOS auto-zooms every form because inputs are <16px, hamburger has no aria-label, touch targets are 32×32 in places. Your beta audience is largely Nigerian on mid-tier Android — this is a P0 cluster.
4. **Public-facing surfaces (`/b/[slug]`, `/u/[slug]`) have no dark mode.** Anyone who shares a business or profile link externally lands on a glaring white page next to a dark AppNav. The most viral thing on the platform is currently the worst-looking thing.
5. **Accessibility is below the floor in places that matter.** Failing color contrast (`text-gray-400` on white = 3:1, fails WCAG AA), error banners without `role="alert"`, modals without focus trap, decorative SVGs not `aria-hidden`. Each is small; collectively they fail any screen-reader audit.

If you fix nothing else before Monday, fix the **Weekend Punch List** at the bottom of this doc.

---

## Strategic themes

These are the cross-cutting issues that show up as dozens of individual findings below. Solving each at the system level removes 5–10 P1 items in one go.

### Theme 1 — No toast system; `alert()` is the moderation muscle

**~33 `alert()` calls** sitewide. **~12 `confirm()` calls.** Both are mid-1990s browser modals: ugly, can't be styled, break on mobile, inaccessible to screen readers, jarring on Android Chrome where they render as full-screen overlays. Every error path in the app currently feels like an error path because of this.

The fix is one component. `app/admin/tabs/FeatureFlagsTab.tsx:58-72` already has the right pattern (a `useState<{ text; color } | null>` + 3-second auto-dismiss). Promote that into `app/components/Toast.tsx`, wire a `<ToastProvider>` into `app/layout.tsx`, and migrate the 33 `alert()` sites in one PR. Same exercise for `confirm()` → `<ConfirmModal>`.

### Theme 2 — Design primitives cover ~30% of what they should

You have `BusinessLogo`, `PageShell`, `PageHeader`, `PrimaryLink`, `SecondaryLink`. What's missing and gets re-implemented per-surface:

- `<UserAvatar size profileUrl name fallbackTone>` — currently rolled by hand on every feed card, comment, message thread, profile, directory, dashboard
- `<PrimaryButton>` / `<SecondaryButton>` — Link variants exist; native form submits paste an 80-char Tailwind string
- `<EmptyState icon title body action>` — currently 5 different empty states across community/marketplace/grants/research/opportunities
- `<FilterPill active>` — duplicated in 5 list-view clients
- `<TextInput>` — `inputClass` constant copy-pasted across 6 forms with subtle drift (`dark:placeholder-gray-500` present on some, omitted on others)
- `<ConfirmModal>` — covered above
- `<Toast>` — covered above
- `<StatusBanner tone>` — dashboard rolls 3 banners (incomplete profile/pending verification/verified) with bespoke markup each

Each of these is small (50-150 lines). The cumulative impact is ending up with a real design system rather than convergent-by-accident styling.

### Theme 3 — Mobile is the responsive afterthought, not the primary surface

The single most-impactful mobile finding is **iOS auto-zoom on form inputs**. iOS Safari zooms whenever a focused input has `font-size < 16px`. The codebase uses `text-sm` (14px) and `text-xs` (12px) liberally on inputs. Result: every Nigerian beta user on iPhone gets a jarring zoom every time they tap any input, then has to pinch back out. This is invisible to anyone testing on desktop. **One CSS rule fixes it sitewide:**

```css
@media (max-width: 640px) {
  input, select, textarea { font-size: 16px; }
}
```

Add to `app/globals.css`. Five lines, kills the regression.

Other mobile gaps:
- AppNav uses `xl:` (1280px) as the desktop-nav breakpoint, so most laptops see the hamburger experience. Should be `lg:` (1024px) at most.
- No bottom-tab navigation — every primary destination is two taps deep on mobile (open hamburger → tap link). LinkedIn / Twitter / Instagram all have a thumb-zone bottom bar.
- Modals (repost, image preview) are centred dialogs — on phones these should be bottom sheets.
- Touch targets are 32×32 in several places (avatar dropdown, hamburger). Apple HIG minimum is 44×44; Material is 48×48.
- No `safe-area-inset` support — iPhones with notches will lose content under the status bar in fullscreen.

### Theme 4 — Accessibility is below WCAG AA floor

Specific, fixable, mostly invisible to non-AT users. The cluster:

- `text-gray-400` on white = ~3:1 contrast, **fails WCAG AA (4.5:1 required for body text)**. Used in maybe 80+ places. `text-gray-500` is borderline; `text-gray-600` passes.
- Error banners across `login`, `signup`, `prices/submit`, `ReportButton` lack `role="alert"` — invisible to screen readers when they appear post-submit.
- Mobile hamburger has no `aria-label`, no `aria-expanded`, no `aria-controls`.
- Decorative SVG icons inside buttons aren't `aria-hidden="true"` — screen readers read them as part of the button label, doubling announcements.
- No skip-to-content link. Keyboard users tab through 5+ chrome elements before reaching content.
- Modals don't trap focus; Tab escapes the modal silently.
- Form labels often aren't associated with their inputs via `htmlFor`/`id` — clicking the label doesn't focus the input. (Anti-pattern enabled by Tailwind's lack of label-input shorthand.)
- Some buttons rely on emoji glyphs (`☰`, `✕`, `♥`, `🔁`) without text labels — screen readers announce "white heart suit" not "Like".

### Theme 5 — Public/shared surfaces are the worst-looking surfaces

`/b/[slug]` and `/u/[slug]` are the pages that get **shared externally on WhatsApp, LinkedIn, Twitter** — they're the platform's free marketing. Right now both have **zero dark-mode classes** in 700-line files, so users sharing on dark-mode-default platforms (every modern messenger) land on a glaring white page next to a dark AppNav. The contrast is jarring and reads as broken.

This is a high-leverage P0 because the cost of fixing it is "add `dark:` Tailwind variants" (a few hundred small edits, mechanical) and the upside is the platform's external face stops looking unfinished.

---

## P0 — Launch blockers (fix before Mon 27 Apr)

### Marketing & first-impression

- **[P0]** `app/home-client.tsx:27` — *Issue:* Countdown hardcodes "Launching 5 July 2026" but beta goes live Monday. On launch day the public homepage will read "70 days to launch" while users are signing up. *Fix:* swap copy to "Now in beta — sign up" (or feature-flag the hero); keep 5 July as "Public launch" date.
- **[P0]** `app/u/[slug]/page.tsx` (entire file) — *Issue:* Public profile has 0 `dark:` classes vs 45 in marketplace-client. Anyone sharing a profile to a dark-mode messenger lands on a glaring white page beside a dark AppNav. *Fix:* mirror the dark variants used on `/directory/[id]/page.tsx`.
- **[P0]** `app/b/[slug]/page.tsx:323-712` — *Issue:* Same problem on the public business page (the SEO-indexed marketing landing for every business). 2 `dark:` classes in 700 lines. *Fix:* either add dark variants throughout or set an explicit `bg-white text-gray-900` lock and document as intentional light-only marketing chrome.

### Mobile-fundamental

- **[P0]** `app/globals.css:36-65` — *Issue:* No `font-size: 16px` floor for inputs on small viewports. Every `text-sm` / `text-xs` input across the app triggers iOS auto-zoom. Sitewide regression. *Fix:* add the @media rule shown in Theme 3 above.
- **[P0]** `app/community/community-client.tsx:263-276` (and ~10 sibling forms) — *Issue:* Inputs at `text-sm` (14px) on iOS auto-zoom on focus. *Fix:* downstream of the globals.css fix; nothing per-component needed if the global rule lands.
- **[P0]** `app/components/AppNav.tsx:343-348` — *Issue:* Mobile hamburger uses unicode `☰`/`✕` as the only label. No `aria-label`, no `aria-expanded`, no `aria-controls`. Padding is `p-2 text-lg` (~36px) — below Apple HIG 44×44 and Material 48×48 on the most-tapped element on the platform. *Fix:* swap unicode for SVG, add ARIA attributes, bump padding to `p-3`.
- **[P0]** `app/components/AppNav.tsx:347` — *Issue:* The unicode glyph swap (`☰` ↔ `✕`) causes layout shift mid-tap because the two characters aren't the same width. *Fix:* solved by the SVG swap above.
- **[P0]** `app/components/CommentsSection.tsx:453-466` — *Issue:* Comment composer is `<input type="text">` (single-line). Multi-paragraph comments collapse, Enter submits instead of inserting newline, mobile keyboard shows "Go" not "Return". This is the highest-volume form on the platform. LinkedIn / Twitter use a textarea here. *Fix:* swap to `<textarea rows={2}>` with Cmd/Ctrl+Enter to submit; allow `\n` for newline.
- **[P0]** `app/messages/[id]/message-thread.tsx:469-476` — *Issue:* DM composer is `<input type="text">` so multi-line messages can't be typed. WhatsApp / Telegram / Messenger all use auto-growing textareas. *Fix:* `<textarea>` with auto-grow capped at ~5 lines + bump to `text-base`.

### Trust & error UX

- **[P0]** `app/components/MessageButton.tsx:28,32` — *Issue:* The "Message" CTA on every public profile / marketplace listing / business page falls back to native `alert()` on failure. The most-clicked button on the platform on Mon 27 Apr will show browser-chrome modals when something goes wrong. *Fix:* inline error banner pattern (see `CommentsSection.tsx:427-442`).
- **[P0]** `app/community/community-client.tsx:88,104,119,164,180,207,212` — *Issue:* 7 `alert()` calls on the most-trafficked surface, including the daily-post-limit and "you can't repost your own post" prompts new users will hit first. *Fix:* migrate to toast pattern (Theme 1).
- **[P0]** `app/grants/[id]/grant-detail.tsx:72,97,119` — *Issue:* Grant detail page uses `alert()` on save error AND uses `prompt('Document name:')` to add a checklist item — the headline interaction of the Grant Tracker module dumps users into a native browser prompt. *Fix:* replace `prompt()` with an inline input row at the bottom of the checklist; replace `alert()` with the inline-error pattern.
- **[P0]** `app/components/AppNav.tsx:275-326` — *Issue:* User dropdown items use emoji glyphs (`👤 My Profile`, `🔖 Saved`, `⚙️ Admin Dashboard`, `🎫 Support`, `❓ FAQ`, `🚪 Sign out`). Emoji rendering varies wildly across Windows / Android / iOS and looks unpolished on a B2B agricultural network. The Messages icon two lines up uses a Heroicon SVG — the inconsistency in one component is jarring. *Fix:* replace dropdown emoji with Heroicons SVGs.

---

## P1 — Pre-public launch (next 72 days)

### Design system gaps

- **[P1]** No `<UserAvatar>` primitive — *Issue:* Avatars rolled by hand in 8+ surfaces (community feed, comments, marketplace card, prices card, research card, dashboard, profile, directory, message inbox) with `w-10 h-10` vs `w-11 h-11` vs `w-12 h-12` drift. Same user shows up as a coloured letter disc in comments and a photo in the feed above. *Fix:* build `<UserAvatar size profileUrl name fallbackTone>` mirroring `BusinessLogo`'s structure; migrate the 8 known call sites.
- **[P1]** `app/components/design/Button.tsx` — *Issue:* Only `PrimaryLink` / `SecondaryLink` exist; ~30 `<button type="submit">` elements paste the same 80-char class string. *Fix:* export `<PrimaryButton>` and `<SecondaryButton>` companions sharing the same `PRIMARY_BASE` / `SECONDARY_BASE` constants.
- **[P1]** No `<EmptyState>` primitive — *Issue:* 5 modules render bespoke empty states. Marketplace shows `🤝`, prices `📊`, research `🔬`, grants uses the AgroYield logo image, opportunities a generic "No opportunities yet". None has a "Clear filters" / "Post the first one" CTA inside the empty block itself. *Fix:* `<EmptyState icon title body action />` primitive with consistent CTA pattern.
- **[P1]** No `<FilterPill>` — *Issue:* Filter pill style duplicated 4 times with the same Tailwind string but slightly different helper functions (`filterBtn(active)` vs inline ternary). Drift will compound. *Fix:* `<FilterPill active>{label}</FilterPill>` primitive.
- **[P1]** No `<TextInput>` — *Issue:* `inputClass` constant defined inline in marketplace-client, prices-client, research-client, community-client, opportunities-client with subtly different class strings. *Fix:* `<TextInput>` design primitive.
- **[P1]** No global toast system — *Issue:* `app/admin/tabs/FeatureFlagsTab.tsx:58-72` has the right pattern (3s auto-dismiss); nothing else uses it. ~33 `alert()` sites would migrate cleanly. *Fix:* extract to `app/components/Toast.tsx` + `<ToastProvider>` in `app/layout.tsx`.

### Information architecture

- **[P1]** `app/components/AppNav.tsx:23` — *Issue:* Desktop nav has 10 top-level links (Dashboard, Community, Opportunities, Grants, Marketplace, Price Tracker, Directory, Research, Mentorship, Business). At the `xl:` breakpoint (1280px) on a 13" laptop this wraps unpredictably; on most laptops (1024–1280px) the hamburger appears instead. A B2B network expects desktop nav at 1024px (`lg:`). *Fix:* drop to 7 visible links + an overflow "More" menu, and lower the breakpoint to `lg:`.
- **[P1]** `app/dashboard/page.tsx:11-66` vs `app/components/AppNav.tsx:13-22` — *Issue:* Module names drift. Dashboard says "Grant Tracker", "Research Board", "Business Suite"; AppNav says "Grants", "Research", "Business". Same module, different label. *Fix:* canonical names in `lib/modules.ts`, import everywhere.
- **[P1]** Detail pages roll their own back link — *Issue:* `app/marketplace/[id]/page.tsx:87`, `app/grants/[id]/page.tsx:35`, `app/research/[id]/page.tsx:54`, `app/opportunities/[id]/page.tsx:58`, `app/community/[id]/page.tsx:138` — five different inline "← Back to X" links with subtly different markup (one uses `&larr;`, others `←`; one is `<a href>`, others are `<Link>`; classes drift between gray and green) — even though `app/components/BackButton.tsx` exists and is used on `/u` and `/directory`. *Fix:* migrate all 5 to `<BackButton fallbackHref label />`.
- **[P1]** No bottom-tab nav on mobile — *Issue:* Every primary destination requires opening the hamburger first (2 taps minimum). LinkedIn / Twitter / Instagram all have a fixed bottom bar with 4-5 icons in the thumb zone. *Fix:* fixed bottom nav on `<sm` with Home, Community, Marketplace, Messages, Profile.

### Forms & validation

- **[P1]** `app/login/page.tsx:216,220` and `app/signup/page.tsx:473-492` — *Issue:* No `autoComplete` attributes on email / password / first-name / last-name. iOS / Android / Chrome won't surface saved credentials autofill. Returning Nigerian users on shared mid-tier Androids hit real friction. Stripe / Apple HIG / LinkedIn all require these. *Fix:* add `autoComplete="email|current-password|given-name|family-name|new-password"` on the respective fields.
- **[P1]** `app/login/page.tsx:213-243` — *Issue:* No `autoFocus` on the email field; users tap-to-focus before typing. *Fix:* `autoFocus` on email (and signup `firstName`).
- **[P1]** `app/signup/page.tsx:488-489` — *Issue:* Password field has no strength meter, no inline validation. Users learn "Password must be at least 8 characters" only on submit. Stripe / LinkedIn / Notion all show real-time strength feedback. *Fix:* small strength bar + length/diversity hints on input.
- **[P1]** `app/signup/page.tsx:93-94` — *Issue:* Password-match validation only on submit. *Fix:* validate on blur of confirm field; show inline error.
- **[P1]** Numeric input keyboards — *Issue:* `app/marketplace/new/page.tsx:206-211` (price), `app/prices/submit/page.tsx:150-160` (price), `app/grants/post/page.tsx:171-181` (amount min/max), `app/business/setup/page.tsx:362-364` (account_number, cac_number) all use `type="number"` or `type="text"` without `inputMode="decimal"|"numeric"`. Stripe Checkout uses `inputmode=numeric` on every numeric field for the native numeric pad. *Fix:* add `inputMode="decimal"` for currency, `inputMode="numeric"` for whole-number IDs.
- **[P1]** `app/business/setup/page.tsx:559-565` — *Issue:* Submit button at the bottom of a 25-field form disables on missing required fields, but with no scroll-to-first-error, no anchor, no way to know which one. Big LinkedIn / Notion forms scroll-to-first-error on submit attempt. *Fix:* on invalid submit, scroll to first empty required field and `el.focus()`.
- **[P1]** `app/community/community-client.tsx:344` — *Issue:* New-post Cancel silently discards typed content. A user typing a 200-word milestone post on shaky mobile data and tapping Cancel by accident loses everything. *Fix:* if `content.trim()` non-empty, show "Discard this post?" confirmation.
- **[P1]** Multiple forms missing required-field markers — *Issue:* `app/profile/profile-form.tsx:447-459` shows First Name / Last Name with no `*` — signup does it right. *Fix:* mark required consistently with `*` and `aria-required="true"`.
- **[P1]** Cancel/back without unsaved-changes guard — *Issue:* most multi-field forms don't warn on navigate-away with unsaved input. *Fix:* `useBeforeUnload` hook for any form with `dirty` state.

### Accessibility

- **[P1]** Sitewide `text-gray-400` on white — *Issue:* ~80+ places. ~3:1 contrast; fails WCAG AA (needs 4.5:1 for body text). Visible at: `app/components/CommentsSection.tsx:299-307,313-321,323-329` (timestamps + actions), `app/components/AppNav.tsx:225` (user email), `app/community/community-client.tsx:236-241` (composer placeholder), `app/components/ReportButton.tsx:71-79` (Reported state), `app/community/community-client.tsx:529-535` (poll close info). *Fix:* sitewide bump to `text-gray-500 dark:text-gray-400` minimum, `text-gray-600` for body-weight muted text.
- **[P1]** Error banners missing `role="alert"` — *Issue:* `app/login/page.tsx:226`, `app/signup/page.tsx:494`, `app/prices/submit/page.tsx:101`, `app/components/ReportButton.tsx:99`. Screen readers don't announce post-submit errors. *Fix:* add `role="alert"` to every dynamically-injected error element.
- **[P1]** Modals without focus trap — *Issue:* `app/community/community-client.tsx:587-588` (repost modal). No `role="dialog" aria-modal="true"`, no Escape-to-close keyboard handler, no focus trap, no body-scroll lock, no focus restore on close. The mobile menu in AppNav has the same issues. *Fix:* extract a `<Modal>` primitive that handles all four; migrate.
- **[P1]** Decorative SVGs not `aria-hidden` — *Issue:* ~80% of icon-only buttons sitewide have `<svg>` children that aren't `aria-hidden="true"`, so screen readers double-announce. *Fix:* sitewide `aria-hidden="true"` on every decorative `<svg>`. Could be done via a lint rule.
- **[P1]** No skip-to-content link — *Issue:* Keyboard users tab through 5+ chrome elements before reaching the page content. *Fix:* hidden-until-focused `<a href="#main">Skip to main content</a>` in layout, anchor `<main id="main">`.
- **[P1]** Form labels not associated with inputs — *Issue:* Most forms (`login`, `signup`, `prices/submit:111,126,147,163,177,193,206`, etc.) have `<label>` next to `<input>` without `htmlFor`/`id` pairs. Clicking the label doesn't focus the input. *Fix:* generate ids and pair `htmlFor`/`id` (or wrap input inside label).

### Mobile beyond the P0 cluster

- **[P1]** `app/components/CommentsSection.tsx:282-334` — *Issue:* Replies indent by `ml-10` (40px). On a 360-wide phone the actual reply content area is ~264px, so 4-line replies wrap aggressively. Twitter/X uses a single 12-16px indent on mobile. *Fix:* on `<sm` reduce to `ml-4` (or use only `pl-3 border-l`).
- **[P1]** `app/components/AppNav.tsx:202-219` — *Issue:* Avatar dropdown trigger is 32×32 (`w-8 h-8`). Below mobile-tap minimum. *Fix:* `w-10 h-10` or wrap in a 44×44 hit area.
- **[P1]** `app/messages/[id]/message-thread.tsx:280-282` — *Issue:* Mobile back link is the literal `←` glyph with no `aria-label`, only colour to indicate interactivity, ~16px tap target. *Fix:* `aria-label="Back to messages"`, wrap in 44×44 area.
- **[P1]** `app/components/AppNav.tsx:352-502` — *Issue:* Mobile menu is a `display:block` panel below the sticky header. No swipe-to-dismiss, no overlay, no focus-trap, body scroll continues underneath. *Fix:* render as overlay with `role="dialog" aria-modal="true"`, focus trap, body-scroll lock, Escape to close.
- **[P1]** `app/community/community-client.tsx:587` — *Issue:* Repost modal click-outside closes only when `!reposting`, but no Escape key listener. *Fix:* attach `keydown` listener for Escape; covered by `<Modal>` primitive.

### Visual consistency

- **[P1]** H1 sizing drift — *Issue:* `PageHeader` uses `text-3xl font-bold` (dashboard, opportunities, grants index). Marketplace detail uses `text-2xl`, community detail has no H1, business overview uses `text-xl`. *Fix:* codify two sizes (`text-3xl` index, `text-2xl` detail) in a `<DetailHeader>` companion.
- **[P1]** Card border-radius drift — *Issue:* Most module cards use `rounded-2xl`; Grants and Community use `rounded-xl`; Comments modal uses `rounded-xl`. *Fix:* document the rule "module list card = `rounded-2xl`, modal/inner panel = `rounded-xl`" and migrate the 3-4 outliers.
- **[P1]** Featured/Pinned visual treatment — *Issue:* Marketplace card gets amber border + amber ring + corner badge; Grants gets only a small "⭐ Featured" pill; Community pinned posts get "📌 Pinned" text in the corner with no border treatment. *Fix:* all featured/pinned content gets (a) coloured top-left badge AND (b) a 1px ring; apply consistently.
- **[P1]** Date format drift — *Issue:* `timeAgo()` implemented 5+ times with subtly different boundaries (community uses `'just now'` lowercase, marketplace/research/comments use `'Just now'` capital, grants returns full date with year for >30 days, marketplace returns date without year). Same comment thread renders `2h ago` and `Just now` with different casing. *Fix:* extract to `lib/format-time.ts`; one canonical implementation.
- **[P1]** `app/dashboard/page.tsx:131` — *Issue:* "Set up profile" / "Continue setup" CTA on the dashboard onboarding banner uses `bg-amber-500 hover:bg-amber-600`. Diverges from every other primary CTA in the app (`bg-green-600`). The first CTA a logged-in user sees is off-brand. *Fix:* use the green PrimaryLink primitive; if amber is intentional to signal "incomplete", use a coloured banner ring but keep the button green.
- **[P1]** Empty-state icons too brand-heavy — *Issue:* Community and Grants empty states use the AgroYield logo image (44×44) as the empty-state hero. Reads as a placeholder. *Fix:* topic-relevant Heroicon (chat-bubbles for community, currency-dollar for grants).
- **[P1]** Anonymous user CTA inconsistency — *Issue:* `app/community/[id]/page.tsx:256-260` and the same patterns on `/b/[slug]` and `/u/[slug]` have subtly different "Sign In / Join Free" button styles and casing ("Sign In" vs "Log in" vs "Sign in"). *Fix:* standardize on `<PrimaryLink>Join free</PrimaryLink>` + `<SecondaryLink>Sign in</SecondaryLink>`.

### Microinteractions

- **[P1]** No optimistic UI for like / repost / report — *Issue:* Some buttons wait for server confirmation before updating. Users on shaky mobile data see latency on every interaction. Twitter/X and LinkedIn flip the icon optimistically. *Fix:* optimistic update with rollback on error; toast on rollback. (Some surfaces already do this — like community feed likes; sweep for consistency.)
- **[P1]** `app/components/CommentsSection.tsx:343-349` — *Issue:* Sort toggle "↓ Newest first" uses unicode arrows. Colour-blind / screen-reader users can't distinguish. *Fix:* use `aria-pressed` and word labels: "Sort: Newest first" toggling to "Sort: Oldest first".

---

## P2 — Post-launch polish

- **[P2]** Type/category color maps duplicated — `app/community/community-client.tsx:32-38` and similar across community/marketplace/prices/research/opportunities. *Fix:* `lib/badge-colors.ts`.
- **[P2]** `app/components/CommentsSection.tsx:282-334` — Comment renderer doesn't show the user's role badge (Farmer / Researcher / Student) even though feed cards above do. *Fix:* add role to Comment type, render the existing role pill.
- **[P2]** `app/grants/[id]/grant-detail.tsx:244-253` — Tutorial box "How to use this tracker" is large, green-50 background, persists forever. *Fix:* add localStorage-backed dismiss with an X corner.
- **[P2]** `app/components/AppNav.tsx:174` — Global search rendered in two places but no Cmd-K / `/` keyboard shortcut. *Fix:* `useKeyboardShortcut('/', openSearch)`.
- **[P2]** `app/grants/grants-client.tsx:185-264` — Grants list uses single column on desktop, wasting two-thirds of the page. *Fix:* match Marketplace's grid or constrain to `max-w-3xl mx-auto`.
- **[P2]** `app/community/community-client.tsx:357-371` — Filter pills row scrolls on mobile but no overflow indicators (no fade edges, no scroll-snap). *Fix:* `overflow-x-auto` + right-edge gradient + scroll-snap.
- **[P2]** `app/marketplace/[id]/page.tsx:188` — "Message Seller" outline-green diverges from `MessageButton` default and from `/u`'s version. Three Message-button styles. *Fix:* default `MessageButton` className canonical; remove overrides.
- **[P2]** `app/dashboard/page.tsx:113` H1 — Includes inline emoji (`👋`, `🏛`). Renders in monochrome on Windows < 11; confuses screen readers. *Fix:* wrap emoji in `<span aria-hidden="true">`, add `aria-label` on the H1.
- **[P2]** `app/components/design/PageShell.tsx:48` — Vertical padding `py-10` everywhere; no `sm:py-6`. On 360px iPhone every page wastes 80px at top. *Fix:* `py-6 sm:py-10`.
- **[P2]** `app/grants/grants-client.tsx:218-232` — Grant cards stack 4-5 small pills above the title; on mobile this wraps to two lines and pushes title below the fold. *Fix:* show only the most important pill above the title; move the rest to a metadata row below.
- **[P2]** Three deadline date formats — `app/community/community-client.tsx:529-535` (poll closing), `app/opportunities/...` (deadline), `app/grants/...` (deadline). All "deadline" semantically. *Fix:* single `formatDeadline()` helper.
- **[P2]** `app/components/AppNav.tsx:222-262` — User dropdown's tier badge duplicated almost verbatim in the mobile hamburger. *Fix:* extract `<TierBadge tier=… />`.
- **[P2]** `app/dashboard/page.tsx` — No `metadata = { title: 'Dashboard — AgroYield' }` so the browser tab title doesn't update. *Fix:* add metadata to the route.
- **[P2]** `app/community/loading.tsx:1-31` — Doesn't render `<AppNav />`, so on cold navigation to /community the nav disappears for ~200ms. Every other module's loading file does. *Fix:* add AppNav.
- **[P2]** `app/loading.tsx:1-3` — Returns null. For routes without a co-located loading file, blank page during navigation. *Fix:* minimal centred spinner or top-bar progress.
- **[P2]** `app/profile/profile-form.tsx:418-430` — Avatar upload "Change" overlay shows on hover only. No hover on touch. *Fix:* always-visible camera icon overlay on mobile.
- **[P2]** `app/business/setup/page.tsx` — All 25+ fields in one giant scroll. No progress indicator, no section navigation, no save-as-draft. Stripe Connect onboarding splits this into 5 steps. *Fix:* multi-step wizard with localStorage draft.
- **[P2]** `app/components/CommentsSection.tsx:259` — Delete is hard-on-tap with no undo. Twitter/X and LinkedIn show a 5s "Comment deleted — Undo" toast. *Fix:* undo toast with grace period.
- **[P2]** `app/messages/[id]/message-thread.tsx:411` — `bottomRef.scrollIntoView` always smooth; iOS keyboard repositions after, message ends up under the keyboard. *Fix:* `behavior: 'auto'` while keyboard opening, listen to `visualViewport.resize`.
- **[P2]** `app/business/setup/page.tsx:443-453` — About-business textarea has no character counter. LinkedIn shows "200 / 2000". *Fix:* live counter.
- **[P2]** `app/profile/profile-form.tsx:382-387` — Missing-fields chips render as `<span>` not `<button>`. Can't tap to jump to that field. *Fix:* `<button onClick={() => document.getElementById(field).focus()}>`.
- **[P2]** `app/research/new/page.tsx:202-208` — Lock toggle is custom switch with no `role="switch"`, no `aria-checked`. *Fix:* add ARIA attributes.

---

## What's working — keep these patterns

- **`app/components/design/BusinessLogo.tsx`** — Genuine design-system gold. Strong header comment explaining the three failure modes it prevents (rounded corners on `<Image>`, missing `shrink-0`, divergent fallback styles), two fallback tones, four sizes, custom slot for placeholder content. **Use this exact structure when building `<UserAvatar>`.**
- **`app/components/design/PageShell.tsx` + `PageHeader.tsx` + `Button.tsx` (PrimaryLink/SecondaryLink)** — Index pages compose these and visibly benefit. Don't dilute with size variants; do extend with `<PrimaryButton>` / `<SecondaryButton>` companions.
- **`app/marketplace/marketplace-client.tsx:237-260` featured-listing visual treatment** — Amber ring + amber border + corner badge. Stands out without screaming. Use as the template when unifying featured/pinned across modules.
- **`app/components/CommentsSection.tsx:352-363` loading skeleton + `:425-442` inline error banner** — One of the few places that does both. Promote the inline error pattern out into a shared component.
- **`app/admin/tabs/FeatureFlagsTab.tsx:58-72` toast pattern** — Simple `useState<{ text; color } | null>` + 3s timeout. Extract verbatim into `app/components/Toast.tsx` and wire to `<ToastProvider>` in `app/layout.tsx`.
- **The moderation pipeline shipped this week** — `/api/report` POST + auto-hide + auto-suspend, server-side ownership-checked endpoints replacing direct browser writes, dual-path comment writes for safe rollout. The architecture is more mature than most beta-stage products. Don't regress these.

---

## What "world's best" actually does — concrete patterns

References that map onto specific gaps in this codebase. Each is a pattern to copy, not a vague aspiration.

**LinkedIn — public profile dark mode + share preview.** LinkedIn profile pages render correctly in any system theme and have rich Open Graph metadata for shares. Your `/u/[slug]` and `/b/[slug]` need the same treatment to look credible when shared on WhatsApp Status / LinkedIn / Twitter. (P0 above.)

**Twitter/X — composer is a textarea, optimistic UI on every interaction, bottom sheet on mobile modals.** Like flips instantly; on rollback a toast surfaces the error. Compose modal anchors to bottom on phone. Apply both patterns in `community-client.tsx` and `CommentsSection.tsx`. (P0 + P1 above.)

**Stripe Checkout — `inputmode` attribute on every numeric input, autocomplete on every form field, real-time validation.** Stripe forms feel fast because they validate as the user types and surface the right keyboard immediately. Their card-number / expiry / CVC all use `inputmode="numeric"`. Same fix applies to your price / amount / phone / account-number inputs. (P1 above.)

**Notion — empty states are the most important screens.** Every empty state in Notion has a clear primary CTA and a tip. "No tasks yet — Click 'Add task' or import from CSV" not "No items". Your 5 module empty states should all have a primary action affordance inside the empty block. (P1 above.)

**Apple HIG / Material — touch targets are 44×44 / 48×48 minimum.** Apple says 44×44 points; Material says 48×48 dp. Several elements in your nav fail this (avatar dropdown 32×32, hamburger 36×36 effective, message-thread back link ~16). Bumping these is a 5-minute fix per element. (P0 + P1 above.)

**Stripe Connect / Notion onboarding — multi-step wizards with draft persistence.** Your business setup is a 25-field single scroll. Stripe Connect splits exactly this into 5 steps with progress indicator and per-step localStorage draft so flaky 3G doesn't kill data entry. (P2 above; not urgent but high-leverage when you get to it.)

**Slack — toast UX is the moderation muscle.** Slack uses inline toasts for almost every transient feedback (message sent, message failed, edited, deleted with undo). Slack does not use `alert()` anywhere user-facing. The single biggest perceived-quality jump for AgroYield Network is killing every `alert()` and replacing with toasts. (Theme 1 above.)

**Discord / WhatsApp — bottom-tab nav as the primary mobile chrome.** Both put their primary navigation in the thumb zone. Your mobile users currently take 2 taps minimum to reach any major destination. (P1 above.)

**LinkedIn — `Cmd+Enter` to submit comment, `Esc` to cancel reply.** Cheap keyboard affordances that power users notice. Currently the comment input is a single-line `<input>` so neither works. (P0 + P2 above.)

**Stripe Dashboard — verified badge + status pills are systematic.** Every card has the same structure: name, primary status pill, secondary metadata row, action row. Your modules have 4 different "featured/verified/pinned" badge treatments. Pick one. (P1 above.)

**Vercel + Linear — focus rings are visible and consistent.** Tailwind's default `focus:ring` is fine but only if applied; many of your buttons use only `outline-none` without a replacement focus ring. Run a sweep. (P1 a11y cluster.)

---

## The weekend punch list — if I had Saturday + Sunday before launch

You have ~36 hours before the no-fly window. Sunday's QA walk shouldn't be spent on cosmetic fixes; it should be the validation pass. So Saturday is where everything ships. In strict ROI order:

### Saturday morning (3-4 hours, bulk-leverage fixes)

1. **Add the 5-line `font-size: 16px` rule to `app/globals.css`.** Kills iOS auto-zoom across every form sitewide. **Highest impact-to-effort ratio in this entire audit.** ~5 minutes.
2. **Add `autoComplete` attributes to `app/login/page.tsx` and `app/signup/page.tsx`.** ~6 attributes total. Enables saved-credential autofill for every returning user. ~5 minutes.
3. **Wrap every error banner in `role="alert"`.** `login`, `signup`, `prices/submit`, `ReportButton`, plus any other red banner you find. ~15 minutes for the sweep.
4. **Add `aria-label`, `aria-expanded`, `aria-controls` and bump padding to `p-3` on the AppNav hamburger.** Most-tapped element on mobile. ~10 minutes.
5. **Swap the AppNav user-dropdown emoji for Heroicons.** ~30 minutes.
6. **Sitewide find-and-replace `text-gray-400` → `text-gray-500` in JSX class strings.** Some will still need manual review (the ones that are decorative on dark backgrounds), but most are body text on white and currently fail WCAG AA. ~45 minutes including spot-check.

### Saturday afternoon (4-5 hours, single-component leverage)

7. **Build `<Toast>` + `<ToastProvider>` from the FeatureFlagsTab pattern.** ~30 minutes.
8. **Migrate the 7 community-client `alert()` calls and the 3 grant-detail ones to toast.** ~45 minutes.
9. **Build `<ConfirmModal>` and migrate the 12 `confirm()` calls.** ~90 minutes.
10. **Comment composer `<input>` → `<textarea>` (CommentsSection.tsx).** ~30 minutes including making Cmd-Enter submit and Enter insert newline.
11. **DM composer `<input>` → `<textarea>` with auto-grow.** ~45 minutes.

### Saturday evening (2-3 hours, public-face dark mode)

12. **Add `dark:` Tailwind variants throughout `app/u/[slug]/page.tsx` and `app/b/[slug]/page.tsx`.** Mechanical mirror of the variants used on `/directory/[id]`. ~90 minutes for both.
13. **Update marketing page hero copy from "Launching 5 July 2026" to "Now in beta — sign up".** ~10 minutes.
14. **Quick visual smoke pass of the changed surfaces in light + dark mode on a phone.**

### Sunday — QA walk only

Don't ship anything substantive on Sunday. The QA walk (#33) is the validation pass; touching code Sunday risks landing a regression you don't have time to chase.

**If anything from items 1-14 doesn't make Saturday, ship items 1-6 only.** Those alone make the platform feel meaningfully more polished without architectural change. The rest can wait until the 72-day public-launch window — and the world's-best comparison patterns above tell you the order.

---

## What I'd intentionally defer

These are real issues but **wrong to fix now**:

- **Multi-step business-setup wizard.** High value but multi-day scope. P2.
- **Bottom-tab mobile nav.** High value, but adding it well requires per-screen layout review. P1 for the 72-day window.
- **Skip-to-content + full a11y sweep.** Beyond the quick wins above, a proper sweep is at least a day of work. P1.
- **Multi-language support.** Hausa / Yoruba / Igbo would help adoption among non-English-first users. P2 — beta is in English.
- **Analytics / event taxonomy.** You have Sentry; user analytics (PostHog / Amplitude) is a separate stream of work. Post-beta.
- **Component design tokens / style dictionary.** Premature abstraction at this size. The primitives extracted in P1 are enough until you have 3-4 designers.

---

## Footnotes

This audit is code-grounded but doesn't replace visual / device testing. Specific spot-checks worth doing on a real phone before Monday:

- iOS Safari: open every form, focus an input, confirm no auto-zoom (after the globals.css fix).
- Mobile Safari + Chrome on iOS: test the repost modal — does it scroll, does Escape close, does focus restore?
- Android Chrome: test the AppNav hamburger — does the screen reader announce the state?
- Dark-mode viewer on WhatsApp / Twitter / LinkedIn: paste a `/b/[slug]` link and check the share preview + the destination page after dark-mode fixes.
- VoiceOver (iOS) or TalkBack (Android): tab through the login form. Does it announce errors, fields, and submit feedback correctly?

Total findings: ~95 (13 P0, 49 P1, 33 P2). Surfaces audited: ~25 pages, 8 shared components, the marketing landing, and the admin shell.

— Claude

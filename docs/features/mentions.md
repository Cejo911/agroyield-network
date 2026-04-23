# @mentions in Comments — Scoping Document

**Status:** APPROVED — §4.1 CLOSED 23 Apr 2026; parser + search endpoint merged; migration rewrite in flight (task #40)
**Author:** Okoli + Claude (pair design)
**Created:** 22 April 2026
**Updated:** 23 April 2026 (§4.1 closure + schema simplification + §11 gate ticked)
**Target:** Week 2 post-launch rollout (5–9 May), behind `comment_mentions_enabled` feature flag
**Launch day posture:** Dormant — flag off, zero user-visible behavior change

---

## 1. Problem statement

Users participating in threaded discussions on community posts (and, if wired, marketplace listings) have no way to directly address another participant. This is a table-stakes interaction pattern on every social platform — LinkedIn, Twitter, Slack, Discord, Facebook — and its absence makes AgroYield Network feel incomplete as a community product. Beta users will notice.

## 2. In scope — locked

- **Surfaces:** comments on `community_posts` (via the active comment table — see §4) and marketplace listings **only if** listings already have user-facing comments today.
- **Target eligibility:** only users the mentioner has an `accepted` connection with (enforced server-side via RLS).
- **Trigger character:** single `@` at word boundary.
- **Autocomplete:** max 8 results, filtered by typed query against `profiles.username`, `first_name + ' ' + last_name`, and `institution` (fuzzy match via `pg_trgm`, which is already indexed on those columns).
- **Notification fan-out:**
  - **In-app:** instant via existing `smart_notify` pipeline, new `notification_type` enum value `comment_mention`.
  - **Email:** batched — grouped into a single digest email per mentioned user per 30-minute window. Prevents mention-spam flooding the inbox.
- **Rollout:** feature-flagged behind `comment_mentions_enabled` in `feature_flags` table, seeded disabled at launch. Ramp 20% → 50% → 100% over Week 1 post-launch.

## 3. Out of scope — explicitly not building

- @mentions in **DMs** (separate messaging infra, different UX expectations)
- @mentions in **price report notes** or **business bios** (static surfaces, not conversational)
- @mentions of **businesses, institutions, or roles** (e.g. `@Preeminent`, `@admins`) — v1 is person-to-person only
- **Group mentions** (`@here`, `@channel` equivalents) — explicitly not building; these are notification-abuse vectors
- **Rich text compose** (bold, italic, links) — mention is the only inline primitive for v1
- **Editing mentions after post** — if a user edits a comment, mentions in the edited body are re-parsed; no notification re-fire
- **Un-mentioning / removing a mention notification** — not v1

## 4. Data model

### 4.1 Canonical comment table — CLOSED 23 Apr 2026

**Decision: `public.comments` is canonical. `public.post_comments` is dead.**

The baseline schema defined **two comment tables**:

| Table | Body column | Author column | Scope | Status |
|---|---|---|---|---|
| `comments` | `content` | `user_id` | Polymorphic (`post_type` discriminator) | **CANONICAL** |
| `post_comments` | `body` | `author_id` | Dedicated to `community_posts` | Dead — zero code refs, zero writes |

**Evidence gathered 23 Apr 2026:**

| Check | Result |
|---|---|
| `SELECT count(*) FROM public.comments WHERE created_at > now() - interval '7 days'` | **4** |
| `SELECT count(*) FROM public.post_comments WHERE created_at > now() - interval '7 days'` | **0** |
| `grep -r ".from('comments')"` across `app/` | 7+ hits (community page, CommentsSection, notifications, admin) |
| `grep -r ".from('post_comments')"` across `app/` | **0 hits** |

`post_comments` was created in baseline (`supabase/migrations/00000000000000_baseline.sql` line 981) and never wired up. All comment writes, reads, and moderation flow through `public.comments` filtered by `post_type = 'community'` (or other post types as the polymorphic model grows).

**Implications for this feature:**
- The `comment_mentions.comment_source` discriminator is no longer needed — there's only one source. See §4.2 for the simplified schema.
- Hook site for §5.2 integration is `app/components/CommentsSection.tsx`'s POST/PATCH target — the route handler writing to `public.comments`.
- `public.post_comments` will be dropped in a **separate post-launch migration** (task #42). It is deliberately not bundled with the mentions work so a focused PR review catches any hidden write path this grep missed.

My earlier best-guess ("probably `post_comments`") was wrong. Keeping that correction visible here so future readers don't re-derive the assumption.

### 4.2 New table — `public.comment_mentions`

Post-§4.1 closure, the `comment_source` column is dropped (only one source exists) and a `comment_post_type` column is added so mentions inherit the polymorphic parent's discriminator. This keeps "find all mentions in community-post comments" queries efficient without a join to `comments`.

```sql
CREATE TABLE public.comment_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL
    REFERENCES public.comments(id) ON DELETE CASCADE,
  comment_post_type text NOT NULL,  -- mirrors public.comments.post_type
  mentioned_user_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentioner_user_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  position_start int,   -- character offset in rendered body, for UX highlighting
  position_end int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, mentioned_user_id),
  CHECK (mentioner_user_id <> mentioned_user_id)
);
```

Rationale:
- Junction table rather than JSONB array on the comment row — allows fast "find all comments that mention user X" queries (profile page feature later) without a full-table scan.
- `comment_id` FK now directly references `public.comments(id)` — no more discriminator needed post-§4.1. Cascade-on-delete means comment deletion cleans up mention rows automatically.
- `comment_post_type` is copied in (denormalized) rather than joined — lets the "@mentions on community posts this week" query hit one table. Validated by a trigger on insert against `public.comments.post_type` (see §4.2.1 of the migration).
- `UNIQUE (comment_id, mentioned_user_id)` prevents duplicate notifications if a user is mentioned twice in the same comment. Simpler than the pre-§4.1 three-column version.
- `CHECK (mentioner_user_id <> mentioned_user_id)` blocks self-mentions at the DB level.
- `position_start/end` is nullable — lets us optimize render later without requiring it in v1.

### 4.3 Body token format

Comment body stored with inline tokens: `<@uuid>`
- Example stored body: `"Check this out <@a1b2c3d4-5e6f-7890-abcd-ef1234567890>, what do you think?"`
- Render pipeline parses `<@uuid>` → replaces with `<a href="/u/{username}" class="mention">@{display_name}</a>`
- Typed body (`"Check this out @okoli, what do you think?"`) is transformed to token format at API-layer insert time
- Rationale: survives username changes (uuid is stable); Slack uses this exact pattern; grep-able for debugging.

### 4.4 Notification type

Add `comment_mention` to the `notification_type` enum:

```sql
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'comment_mention';
```

`notification_preferences` row auto-populates with defaults (`in_app=true`, `email=true`, `push=false`, `sms=false`) via whatever seed logic currently handles new notification types. **Verify:** does a trigger exist to seed new prefs rows for new notification types? If not, users default to all channels off for this type, which is a silent fail.

## 5. API contract

### 5.1 New endpoint — `GET /api/users/mention-search`

```
GET /api/users/mention-search?q=oko
Auth: required (authenticated session)
Response: 200
{
  "results": [
    { "id": "uuid", "username": "okoli", "display_name": "Chijioke Okoli", "avatar_url": "..." }
  ]
}
```

Server behaviour:
- Returns up to 8 users matching `q` across `username`, `first_name + ' ' + last_name`, `institution`
- **Filter:** only users with `status='accepted'` in `connections` where the current user is either `requester_id` or `recipient_id`
- Uses existing `pg_trgm` indexes from migration `20260420_global_search_trgm.sql` — sub-50ms even at scale
- Rate-limited: reuse `lib/rate-limit.ts` with `limit=30, windowMs=60_000` (autocomplete fires frequently)

### 5.2 Modified endpoints — comment POST/PATCH

Existing comment-creation endpoints (wherever `public.comments` is written — the route handler behind `app/components/CommentsSection.tsx`) gain a parser step:

1. Extract `@username` tokens from incoming body
2. Look up UUIDs for each — drop any that aren't a valid connection
3. Replace `@username` text with `<@uuid>` in stored body
4. Write mention rows to `comment_mentions`
5. Fan out notifications via `smart_notify` (new `comment_mention` type)

**Abuse guards:**
- Max 5 mentions per comment (reject with 400 if exceeded)
- Max 50 mention notifications per user per hour (tracked via a rolling counter — Redis would be ideal here, but since we don't have Upstash yet, use a simple `recent_mentions_count` view over `comment_mentions` for last 60 min)

## 6. UX

### 6.1 Composer autocomplete

**Trigger:** user types `@` at word boundary → dropdown appears anchored to cursor
**Dropdown:** max 8 results, each showing avatar + display name + `@username` secondary line
**Keyboard:** `↑/↓` navigate, `Enter`/`Tab` select, `Esc` dismisses
**Mobile:** dropdown positions above or below cursor depending on viewport; honors the on-screen keyboard
**Selection:** replaces the `@query` span with a styled "pill" — the raw text is still `@username` for round-tripping, the pill is CSS styling on the rendered DOM
**No match:** if `@query` has no autocomplete hit, stays as plain text; does NOT become a mention on submit

### 6.2 Render

Rendered mention pill:
- Styled with brand-green background tint (`#16a34a/10`)
- Clickable → routes to `/u/{username}` profile page
- Hover (desktop): tooltip showing display name + institution
- Tap (mobile): routes immediately

### 6.3 Notification copy

**In-app:** `{Mentioner display name} mentioned you in a comment`
**Email (batched, single digest per 30 min):**
```
Subject: You were mentioned in 3 comments

Hi {recipient},

You were mentioned in:
  • {mentioner_1} in "{post snippet}" — {relative time}
  • {mentioner_2} in "{post snippet}" — {relative time}
  • {mentioner_3} in "{post snippet}" — {relative time}

View all: https://agroyield.africa/notifications
```

## 7. Rollout plan

### 7.1 Feature flag

Seed in the migration:

```sql
INSERT INTO public.feature_flags (key, description, is_enabled)
VALUES (
  'comment_mentions_enabled',
  '@mentions in post comments. Ramp via rollout_percentage post-launch.',
  false
)
ON CONFLICT (key) DO NOTHING;
```

**Check site in code:**
- Frontend composer checks flag → if off, typing `@` behaves as plain text (no autocomplete)
- API layer checks flag → if off, `@username` parsing is skipped (stored as plain text)
- Render layer checks flag → if off, `<@uuid>` tokens render as plain `@username` fallback text

This means: if we disable the flag mid-rollout, existing mentions gracefully degrade to plain `@username` text, not to broken `<@uuid>` garbage. Important for rollback safety.

### 7.2 Phased ramp post-launch

| Day | Rollout | Watch |
|---|---|---|
| **Tue 28 Apr** | Flag enabled for internal users only (via `enabled_for_users` array) | Smoke test in prod with real accounts |
| **Wed 29 Apr** | `rollout_percentage = 20` | PostHog events, Sentry errors, `#all-agroyield-alerts` |
| **Fri 1 May** | `rollout_percentage = 50` if Wed clean | Mention volume, notification email open rate |
| **Mon 4 May** | `rollout_percentage = 100` if Fri clean | Full feature live |

Any error spike at any stage → set `is_enabled = false`, mentions gracefully degrade.

## 8. Risks + mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Typo in parser replaces legitimate text with broken tokens | Medium | Medium | Extensive unit tests on parser; regex anchored with `\b` boundaries; only `<@uuid>` where UUID validates as proper UUID |
| Connection-check RLS has a hole, allowing mentions of strangers | Low | High | RLS policy tested explicitly in `supabase/tests/` with 4 cases: connected, pending, blocked, non-existent |
| Notification spam overwhelms email deliverability | Low | High | 30-min batching, max 50 mentions/user/hour cap, Resend has 10k/day free tier — monitor |
| Autocomplete is slow → users type `@` and see nothing for 500ms → feels broken | Medium | Medium | Pre-warm search endpoint; debounce at 150ms; `pg_trgm` indexes already in place from `20260420_global_search_trgm.sql` |
| Mobile keyboard pushes dropdown off-screen | High on small devices | Low | Dropdown flips to above-cursor when bottom viewport < 200px; visual QA on iPhone SE + Pixel 6a |
| ~~Existing `comments` vs `post_comments` ambiguity (§4.1) leads to mentions being built on dead path~~ | ~~Medium~~ | ~~High~~ | **RESOLVED 23 Apr 2026** — `comments` is canonical (4 rows last 7 days + 7+ code refs); `post_comments` is dead (0 rows, 0 refs). See §4.1 for evidence. |

## 9. Timeline (if approved)

Assumes the feature-flag posture and a Week 2 ramp:

| Day | Work | Ships to prod? |
|---|---|---|
| **Wed 23 Apr** | ✅ §4.1 resolved (see above); migration rewritten (task #40); parser + mention-search endpoint already merged; RLS tests pending migration re-apply | No — branch only |
| **Thu 24 Apr** | Parser + user-search API + API-layer integration; unit tests | No — PR open |
| **Fri 25 Apr** | Autocomplete component; render pipeline; visual QA pass | Merged to main; **flag off** |
| **Sat 26 Apr** | Buffer day for bugs; flag-on staging test | Stays off in prod |
| **Sun 26 Apr** | QA walk with flag OFF (unchanged behavior) | Dormant |
| **Mon 27 Apr** | **Launch.** Zero mention-related code path active. | Dormant |
| **Tue 28 Apr** | Flip flag for internal users; real-prod smoke | 5 internal users |
| **Wed–Fri wk 1** | 20% → 50% ramp | Controlled rollout |
| **Mon 4 May** | 100% rollout | Full feature |

## 10. QA additions

Rows to add to `docs/qa/beta-launch-qa-26-apr.md` §2 **only after §4.1 is resolved and the migration has been applied**:

Under a new §2.6 **@mentions (flag-gated)**:

| # | Flow | Expected | Verdict |
|---|---|---|---|
| F1 | Type `@oko` in comment composer (flag OFF) | No dropdown, `@oko` stays plain text | |
| F2 | Type `@oko` (flag ON, with connection) | Dropdown shows "Okoli" within 150ms; Enter inserts pill | |
| F3 | Type `@stranger` (flag ON, no connection) | Dropdown empty; typing submits as plain text | |
| F4 | Mention 6 users in one comment (flag ON) | API returns 400 with `too_many_mentions` | |
| F5 | Mentioned user's notification prefs = email OFF | In-app notif fires, email does not | |
| F6 | Mention user, then that user deletes account | No crash on render; pill gracefully degrades to `@deleted-user` |  |

## 11. Decision gate (BEFORE any code is written)

Okoli reviews this doc + the migration draft (`20260422_comment_mentions.sql`), and explicitly confirms:

- [x] §4.1 ambiguity is resolved — `public.comments` is canonical (closed 23 Apr 2026)
- [ ] The feature-flag-off-at-launch posture is acceptable
- [ ] The scope in §3 ("out of scope") is correct — nothing was dropped that should be in
- [ ] The Week 2 ramp timeline is acceptable
- [ ] The RLS-based connections-only enforcement is acceptable (server-side, no client can bypass)

If all 5 are ticked, build commences Wed 23 Apr. If any are open, doc goes back to revision.

---

## Appendix A — What this doc deliberately doesn't cover

- **Performance at 10k comments/day.** @mentions adds 1 row per mention per comment; at 10k comments with avg 0.5 mentions = 5k new rows/day. Negligible.
- **Fulltext search over mentions.** Not a v1 ask; can be added with a `tsvector` column if needed later.
- **Analytics events.** PostHog should autocapture `mention_inserted`, `mention_notification_opened`, `mention_click_to_profile` — to be added by frontend eng; documented in §5.
- **Accessibility audit.** Keyboard nav is speced in §6.1; a full WCAG pass is Week 3 post-launch.

## Appendix B — Files touched if approved

Migration:
- `supabase/migrations/20260422_comment_mentions.sql` — new

New code:
- `lib/mentions/parser.ts` — tokenize/detokenize
- `lib/mentions/notifications.ts` — batching + smart_notify integration
- `app/api/users/mention-search/route.ts` — new endpoint
- `app/components/MentionAutocomplete.tsx` — new composer UI primitive
- `app/components/MentionRenderer.tsx` — render pipeline
- `app/components/PostCommentComposer.tsx` — integrate autocomplete (existing file; minor edit)

Modified code (feature-flag gated):
- `app/components/CommentsSection.tsx` — render path wraps each comment body in `<MentionRenderer>`; composer gains `<MentionAutocomplete>`
- The route handler behind `CommentsSection.tsx`'s POST/PATCH (writes to `public.comments`) — add parser step per §5.2

Tests:
- `supabase/tests/comment_mentions_rls.sql` — RLS matrix
- `__tests__/mentions/parser.test.ts` — tokenize/detokenize unit tests
- `__tests__/mentions/notifications.test.ts` — batching window logic

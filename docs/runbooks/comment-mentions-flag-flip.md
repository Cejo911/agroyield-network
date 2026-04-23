# Comment Mentions — Staging & Prod Flag Flip Runbook

**Owner:** @okoli **Target date:** Fri 24 Apr 2026 (staging) / Mon 27 Apr 2026 post-launch (prod) **Est. time:** 45 min staging, 15 min prod

This runbook walks the flip of `comment_mentions_enabled` from OFF to ON —
first in staging for a ~48h soak + structured QA validation (#33 on Sun
26 Apr), then in prod after the Monday 27 Apr beta launch window closes.

Everything upstream has already landed:
- [x] `20260422_comment_mentions.sql` applied (staging + prod)
- [x] `20260423_drop_dead_post_comments.sql` applied (staging + prod)
- [x] Client dual-path live in prod (deploy `cfcff40`)
- [ ] Flag ON — the only lever left.

The client refactor is forward-compatible — flipping the flag changes
server behaviour only. No deploy required to flip in either direction.

---

## 0. Prerequisites (verify in staging)

Run in the staging Supabase SQL editor:

```sql
-- Schema landed in staging
SELECT to_regclass('public.comment_mentions');                                 -- non-NULL
SELECT to_regprocedure('public.tg_comment_mentions_validate_post_type()');     -- non-NULL
SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.comment_mentions'::regclass;
SELECT relrowsecurity FROM pg_class WHERE relname = 'comment_mentions';        -- true

-- Flag row present, currently false
SELECT key, enabled FROM public.feature_flags
 WHERE key = 'comment_mentions_enabled';                                       -- enabled=false
```

You also need two staging accounts (call them `tester_a` and `tester_b`)
with usernames set and an **accepted** connection between them. Send +
accept through the UI — don't seed the connection directly:

```sql
SELECT p.id, p.username
  FROM public.profiles p
 WHERE p.username IN ('<tester_a>', '<tester_b>');

SELECT status FROM public.connections
 WHERE status = 'accepted'
   AND requester_id IN (SELECT id FROM profiles WHERE username IN ('<tester_a>', '<tester_b>'))
   AND recipient_id IN (SELECT id FROM profiles WHERE username IN ('<tester_a>', '<tester_b>'));
```

If either account is missing a username or the connection isn't accepted,
fix that through the UI first — the mention resolver filters by accepted
connections and silently drops anything it can't resolve.

---

## 1. Baseline capture (immediately before the flip)

```sql
SELECT count(*) FROM public.comment_mentions;                                  -- expect 0
SELECT count(*) FROM public.notifications
 WHERE type = 'comment_mention';                                               -- expect 0
```

Note the timestamp and current Sentry error rate for the staging project.
Anything that accrues after the flip is net-new and attributable.

---

## 2. The flip (staging)

Single UPDATE, one line:

```sql
UPDATE public.feature_flags
   SET enabled = true, updated_at = now()
 WHERE key = 'comment_mentions_enabled'
RETURNING key, enabled, updated_at;
```

Record the returned `updated_at`. Everything after this is flag-on data.

---

## 3. Smoke tests (run as tester_a, against a community post)

Each scenario below produces a specific expected database outcome. If any
scenario diverges, jump to §6 Rollback.

### S1 — Happy path
Post: `Hey @tester_b can you check this?`

Expect:
- HTTP 200
- `SELECT count(*) FROM public.comment_mentions WHERE comment_id = <new_id>` → 1
- `SELECT * FROM public.notifications WHERE type = 'comment_mention' AND user_id = <tester_b.id>` → 1 row
- `SELECT content FROM public.comments WHERE id = <new_id>` → stored as `Hey <@uuid-of-b> can you check this?` (tokenized, not raw)
- tester_b sees a new bell badge after a refresh

### S2 — Unknown username
Post: `Hey @nonexistent_user`

Expect:
- HTTP 200
- Zero `comment_mentions` rows for this comment
- `comments.content` stored as typed (plain `@nonexistent_user`)
- No notifications fired

### S3 — Typed but not connected
Pick a real user profile you are NOT connected to. Post: `Hey @that_user`

Expect:
- HTTP 200
- Zero `comment_mentions` rows (accepted-connection filter at work)
- `comments.content` stored as typed
- No notifications fired

### S4 — Per-comment cap (5)
Ensure you have at least 6 accepted-connection profiles. Post:
`@a @b @c @d @e @f` using 6 distinct connected usernames.

Expect:
- HTTP 400 with body `{ error: 'too_many_mentions', count: 6 }`
- No new row in `public.comments` (route rolled the insert back)
- Inline error banner in the UI: "You can only @mention up to 5 people per comment."

### S5 — Edit adds a mention (no re-notify per §3)
Take the comment from S1 and edit it via the UI to:
`Hey @tester_b and @tester_d can you check this?`

Expect:
- `SELECT count(*) FROM public.comment_mentions WHERE comment_id = <S1_id>` → 2
- `SELECT count(*) FROM public.notifications WHERE type = 'comment_mention'` has grown by 0 since the edit (tester_b's original notification is preserved, tester_d gets nothing)
- `comments.content` now contains both `<@uuid-of-b>` and `<@uuid-of-d>` tokens

This confirms scoping doc §3: edits do not re-ping.

### S6 — Edit removes a mention
Edit the same comment again to: `Hey @tester_d can you check this?`

Expect:
- `SELECT count(*) FROM public.comment_mentions WHERE comment_id = <S1_id>` → 1 (tester_d only)
- No new notifications
- `comments.content` now contains only `<@uuid-of-d>`

### S7 (optional) — Hourly cap (50)
Only if you want explicit coverage of the 50/hour guard. Pre-seed the
counter close to the cap:

```sql
-- As tester_a: insert 48 dummy mention rows dated within the last hour.
-- Replace the UUIDs with real tester_a / tester_b ids.
INSERT INTO public.comment_mentions
  (comment_id, comment_post_type, mentioned_user_id, mentioner_user_id, created_at)
SELECT
  '<any_existing_comment_id_owned_by_tester_a>'::uuid,
  'community',
  '<tester_b.id>'::uuid,
  '<tester_a.id>'::uuid,
  now() - (interval '1 minute' * g)
FROM generate_series(1, 48) g;
```

Now post a comment with 3 mentions. Expect:
- HTTP 429 with `{ error: 'hourly_cap_exceeded', count: 51 }`
- No new row in `public.comments` (route rolled back)

Clean up after:
```sql
DELETE FROM public.comment_mentions
 WHERE comment_id = '<any_existing_comment_id_owned_by_tester_a>'
   AND mentioner_user_id = '<tester_a.id>'
   AND created_at < now() - interval '5 seconds';
```

---

## 4. Observation window (30 minutes)

Tail in parallel:
- **Sentry** staging project → filter `api/comments`
- **Supabase Logs Explorer** → error level, and any `check_violation` errcodes from the trigger
- **Slack #beta-alerts** → should stay quiet

Red flags:
- 500s on `/api/comments` → trigger or service-role client misconfigured
- `check_violation` errcodes → `comment_post_type` denorm mismatch between a `comment_mentions` row and its parent `comments` row
- `tokenize update failed` log lines from `fanOutMentions` → comment written but body not updated to token form (mention rows still persisted, so bell icon fires, but the UI shows raw `@username`)

---

## 5. Decision gate

**Green** — all six core scenarios (S7 optional) pass and the 30-minute
observation window stays quiet. Leave the flag ON in staging. Soak
through Saturday. Sunday 26 Apr QA walk (#33) re-runs the structured
scenarios as a second pass. Monday 27 Apr post-launch (after the
06:30–09:00 WAT no-fly window closes), flip prod (see §7).

**Red** — any unexpected error or scenario divergence. Go to §6.

---

## 6. Rollback

Single UPDATE, <5 seconds, no deploy needed:

```sql
UPDATE public.feature_flags
   SET enabled = false, updated_at = now()
 WHERE key = 'comment_mentions_enabled';
```

`/api/comments` returns 404 on the next request. The client's dual-path
write (`app/components/CommentsSection.tsx`) transparently falls back to
the pre-mentions direct Supabase insert path. Users see zero behaviour
change beyond losing mention rendering and @-resolution.

Existing `comment_mentions` rows stay — they're inert data in a table
nothing reads from when the flag is off. Don't bother deleting them;
they'll light up again when the flag next turns on.

Capture Sentry traces and Supabase logs from the failure window, file
the bug, and plan a fix before attempting the next flip.

---

## 7. Prod flip (Monday 27 Apr post-launch)

Only after the staging soak is green and the Sunday QA walk signs off.

Timing: wait until the beta launch window (06:30–09:00 WAT) is closed
and Better Stack + Slack #beta-alerts show a stable picture. Don't
stack two risk events in the same morning.

Repeat §0–§4 against the production Supabase project, using two real
beta user accounts with an accepted connection. Keep the scenario set
small — S1, S2, S4 are enough for prod smoke; S5/S6 edit semantics are
already covered by staging.

Observation window in prod: 24 hours. If clean, file the follow-up task
to remove the 404-fallback branch in `CommentsSection.tsx` so the server
endpoint becomes the single write path (cleanup, not urgent — keep the
fallback until you're confident the flag won't need to go back OFF).

---

## Context paths

- Scoping doc: `docs/features/mentions.md`
- Migrations: `supabase/migrations/20260422_comment_mentions.sql`, `supabase/migrations/20260423_drop_dead_post_comments.sql`
- Server: `app/api/comments/route.ts`, `lib/mentions/fanout.ts`, `lib/mentions/parser.ts`
- Client: `app/components/CommentsSection.tsx`
- Session notes: `HANDOFF_23APR.md`

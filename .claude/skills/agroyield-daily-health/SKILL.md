---
name: agroyield-daily-health
description: Five-minute morning health check for AgroYield Network — Sentry triage, key DB counts, feature-flag state, suspended-user count, pending mentor applications, recent moderation activity. Use when the user says "morning check", "daily check", "how's the platform", "what happened overnight", "morning health", or similar. Project-scoped — config baked in for AgroYield's Supabase + Sentry projects specifically.
---

# AgroYield — Daily health check

A standing 5-minute ritual for post-launch beta operations. One trigger ("morning check"), one report, covers the dimensions that matter: errors, abuse, growth, system state. Replaces ad-hoc "how's the platform doing" questions with a consistent dashboard so trends become visible.

**Default behaviour: read-only.** Reports the state, recommends actions if anything is off, never mutates without explicit confirmation.

---

## When to invoke

Trigger language to watch for:
- "morning check", "morning health", "daily check"
- "how's the platform", "what happened overnight"
- "platform health", "platform pulse"
- "give me the morning briefing"
- "are we up?"

Typical cadence: once at the start of each work day. Also useful before a stakeholder update or after returning from time off.

---

## The 5-minute workflow

Run sections A → E in order. Don't drill in unless something looks off. The point is a snapshot, not an investigation.

### Section A — Sentry error feed (1 min)

Invoke the **`agroyield-sentry-triage`** skill. It returns the bucketed report (real bugs / zombies / noise / perf). Note the count of "real bugs needing attention." If zero, mark Sentry green and move on. If one or more, capture the issue IDs into the daily-health output for follow-up.

### Section B — Key counts (1 min)

Call `mcp__bf92e1a9-3cf8-4a5f-8f2d-a078a6aef496__execute_sql` with `project_id: 'vmwhfcabmmgosdicatzs'` and the SQL block below. (Pre-MCP fallback: paste into Supabase Studio.) It returns one row with all the headline metrics.

```sql
WITH window_24h AS (SELECT now() - interval '24 hours' AS since)
SELECT
  -- Growth signals
  (SELECT count(*) FROM public.profiles, window_24h
    WHERE created_at > since) AS new_signups_24h,
  (SELECT count(*) FROM public.waitlist_signups, window_24h
    WHERE created_at > since) AS new_waitlist_24h,

  -- Engagement signals
  (SELECT count(*) FROM public.community_posts, window_24h
    WHERE created_at > since AND is_active = true) AS new_community_posts_24h,
  (SELECT count(*) FROM public.comments, window_24h
    WHERE created_at > since AND is_active = true) AS new_comments_24h,
  (SELECT count(*) FROM public.likes, window_24h
    WHERE created_at > since) AS new_likes_24h,
  (SELECT count(*) FROM public.price_reports, window_24h
    WHERE reported_at > since AND is_active = true) AS new_prices_24h,
  (SELECT count(*) FROM public.marketplace_listings, window_24h
    WHERE created_at > since AND is_active = true) AS new_listings_24h,
  (SELECT count(*) FROM public.opportunities, window_24h
    WHERE created_at > since AND is_active = true) AS new_opportunities_24h,
  (SELECT count(*) FROM public.research_posts, window_24h
    WHERE created_at > since AND is_active = true) AS new_research_24h,

  -- Trust & safety signals
  (SELECT count(*) FROM public.reports, window_24h
    WHERE created_at > since) AS new_reports_24h,
  (SELECT count(*) FROM public.admin_audit_log, window_24h
    WHERE created_at > since
      AND action = 'auto_suspend') AS auto_suspends_24h,
  (SELECT count(*) FROM public.profiles
    WHERE is_suspended = true) AS total_suspended_users,
  (SELECT count(*) FROM public.mentor_profiles
    WHERE approval_status = 'pending') AS pending_mentor_apps;
```

Read the row. Apply the rules in [Section F — Red flags](#section-f--red-flags-to-call-out) below.

### Section C — Feature-flag state (30 sec)

Call `mcp__bf92e1a9-3cf8-4a5f-8f2d-a078a6aef496__execute_sql` with `project_id: 'vmwhfcabmmgosdicatzs'` and:

```sql
SELECT key, is_enabled, rollout_percentage, updated_at
  FROM public.feature_flags
 ORDER BY key;
```

Cross-check against expected state. As of beta launch +1 day (27 Apr 2026):

| Flag | Expected state | Notes |
|---|---|---|
| `expense_ocr` | `true` | Flipped 06:30 launch per Checkpoint 31 runbook |
| `recurring_invoices` | `true` | Pre-launch (Unicorn #4) |
| `weekly_digest` | `true` | Pre-launch (Unicorn #1) |
| `whatsapp_delivery` | `true` | Pre-launch (Termii at launch, Meta post-launch) |
| `comment_mentions_enabled` | `false` | Flip per `comment-mentions-flag-flip.md` runbook in Week 5, post +48h stabilisation |
| `agri_credit_score` | `false` | Unicorn #6 — flips when partner integration lands |
| `ai_assistant` | `false` | Unicorn #7 — future |
| `cooperatives` | `false` | Unicorn #8 — future |
| `public_business_pages` | `false` | **Verify behaviour** — `/b/[slug]` is live; flag may be stale/unwired or controlling something specific. Log discrepancy if observed. |

If a flag's state has changed since the previous day's check, capture it. Unexpected flag flips are worth surfacing — drill into `admin_audit_log` for who/when.

### Section D — Pending moderation queue (30 sec)

Call `mcp__bf92e1a9-3cf8-4a5f-8f2d-a078a6aef496__execute_sql` with `project_id: 'vmwhfcabmmgosdicatzs'` and:

```sql
-- Active reports that haven't auto-hidden, awaiting human moderator action
SELECT post_type, count(*) AS pending_reports
  FROM public.reports r
 WHERE NOT EXISTS (
   -- Skip reports whose post is already hidden
   SELECT 1 FROM public.community_posts WHERE id = r.post_id AND is_active = false
   UNION ALL
   SELECT 1 FROM public.opportunities WHERE id = r.post_id AND is_active = false
   UNION ALL
   SELECT 1 FROM public.marketplace_listings WHERE id = r.post_id AND is_active = false
   UNION ALL
   SELECT 1 FROM public.price_reports WHERE id = r.post_id AND is_active = false
   UNION ALL
   SELECT 1 FROM public.research_posts WHERE id = r.post_id AND is_active = false
   UNION ALL
   SELECT 1 FROM public.business_reviews WHERE id = r.post_id AND published = false
 )
 GROUP BY post_type
 ORDER BY pending_reports DESC;
```

Empty result = clean queue. Anything ≥10 pending in a single bucket is yellow; ≥30 is red and worth a focused moderator session.

### Section E — Watch list: users approaching auto-suspend threshold (30 sec)

Call `mcp__bf92e1a9-3cf8-4a5f-8f2d-a078a6aef496__execute_sql` with `project_id: 'vmwhfcabmmgosdicatzs'` and:

```sql
-- Users with 2 distinct reporters since their last clear (1 more = auto-suspend)
SELECT
  p.id,
  COALESCE(NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''), p.username, p.email) AS display,
  count(DISTINCT r.user_id) AS distinct_reporters_since_clear
  FROM public.reports r
  JOIN public.profiles p ON p.id = r.post_author_id
 WHERE r.created_at > COALESCE(p.last_suspension_cleared_at, '1970-01-01'::timestamptz)
   AND p.is_suspended = false
   AND p.admin_role IS DISTINCT FROM 'super'
 GROUP BY p.id, p.first_name, p.last_name, p.username, p.email
HAVING count(DISTINCT r.user_id) >= 2
 ORDER BY distinct_reporters_since_clear DESC;
```

Empty result = no one near the line. If users appear, capture them in the report — one more report and they auto-suspend. Useful for a heads-up before things escalate.

### Operational signals — MCP-driven (60 sec)

**Slack `#all-agroyield-alerts` channel read (covers Better Stack + Termii + cron + Sentry-routed alerts).** Call `mcp__f5620e6a-6442-4bbb-a89c-336f1d842e90__slack_read_channel` against `#all-agroyield-alerts` for the last 24 hours. Per H1.2 wiring (Checkpoint 39), this single channel receives:

- Better Stack uptime alerts (down monitor → alert; recovery → auto-clear)
- Termii SMS delivery failures
- Cron harness failures (any of the 6 wrapped jobs in `lib/cron/index.ts`)
- `/api/report-issue` end-to-end alerts
- Sentry-routed issues that cross the alert threshold

**Quiet channel = green** across all five surfaces. Any alert = capture timestamp + summary + linked surface; flag for follow-up. This collapses what was previously 4 manual dashboard checks into one MCP call. (Better Stack does not have a first-party MCP yet — the Slack channel read is the authoritative proxy.)

**Vercel deploy check.** Call `mcp__d1f8ccac-20fd-4f94-97c8-fa12dbcbf5ae__list_deployments` and confirm the latest production deploy is the expected SHA, no failed builds in the last 24h. If the latest deploy SHA doesn't match what the team expects, drill into `mcp__d1f8ccac-*__get_deployment_build_logs` for the offending build.

---

## Section F — Red flags to call out

Apply these thresholds when reading the Section B / D / E output. The user expects you to flag rather than narrate.

| Signal | Green | Yellow | Red |
|---|---|---|---|
| `new_signups_24h` | ≥ baseline-50% | -50% to -75% vs 7-day average | < -75% (something broke the funnel) |
| `new_community_posts_24h` | ≥ 5 | 1-4 | 0 (the platform feels dead) |
| `new_reports_24h` | 0-5 | 6-15 | >15 (likely brigading or content issue) |
| `auto_suspends_24h` | 0 | 1-2 | ≥3 (escalate; check for false positives) |
| `total_suspended_users` | flat or -1/day | +1/day | +5/day or any sudden jump |
| `pending_reports` (Section D) | 0-5 per bucket | 5-15 | >15 (moderator backlog) |
| `users_near_threshold` (Section E) | 0 | 1-2 | ≥3 (review proactively before auto-suspend hits) |

**Don't interpret growth metrics in isolation.** A "0 signups overnight" reading on a Sunday at 3am WAT is not red. Use 7-day rolling averages once you have at least a week of beta data.

---

## Output template

Render the daily-health report in this shape. Don't over-decorate.

```markdown
## Morning health — <date> <time WAT>

**Latest deploy:** <SHA> (auto-filled via Vercel MCP `list_deployments`)

### Sentry — <green | yellow | red>
- Real bugs needing attention: <N>
- Issues to bulk-resolve: <N>
- (link to last sentry-triage report if one was generated this session)

### Activity (last 24h)
| Metric | Today | Note |
|---|---|---|
| Signups | <N> | <green | yellow | red> |
| Community posts | <N> | … |
| Comments | <N> | … |
| Price reports | <N> | … |
| Marketplace listings | <N> | … |
| Opportunities | <N> | … |
| Research posts | <N> | … |

### Trust & safety
- Reports filed: <N>
- Auto-suspends triggered: <N>
- Total suspended users: <N>
- Pending mentor applications: <N>

### Pending moderation queue
| Surface | Pending |
|---|---|
… or "Clean — 0 pending" if empty.

### Users near auto-suspend threshold
- "<display>" (id <uuid>): <N> distinct reporters
… or "None within 1 reporter of the line" if empty.

### Feature flags
- comment_mentions_enabled: <true | false> <↑ flipped today | unchanged>
- (any other flags that have changed)

### Operational signals
- Slack #all-agroyield-alerts overnight: <quiet | summary of alerts with timestamps + linked surface>
- Vercel deploys: <on latest SHA `<sha>` | failed builds: …>

## Summary
<Two-sentence narrative: green/yellow/red with the one most-important thing to do today.>
```

If a section returns zero or empty results, render "Clean — nothing to report" rather than omitting it. Consistency between days matters more than brevity.

---

## What to do when something's red

The skill is read-only. When a red signal surfaces, recommend a follow-up action and stop:

| Red signal | Recommended next step |
|---|---|
| Real Sentry bug ≥10 users | "Run `sentry-triage`, drill into issue, file a P0 task." |
| `new_community_posts_24h = 0` for 3 days running | "Check the community feed manually — is the feature still working? Is the daily-post limit too restrictive?" |
| `new_reports_24h > 15` | "Pull the last 50 reports — is one user being brigaded? Is one post getting mass-flagged?" |
| `auto_suspends_24h ≥ 3` | "Check Slack #beta-alerts for the auto-suspend messages, review each user, look for false positives." |
| `users_near_threshold ≥ 3` | "Manually review each one before they trip — could be brigading targets." |
| Feature flag flipped unexpectedly | "Check `admin_audit_log` for who flipped it and when. Could be an unauthorised change." |
| Slack `#all-agroyield-alerts` alert overnight | "Capture the timestamp + linked surface + alert source (Better Stack / Termii / cron / Sentry), file a task to investigate." |

Don't auto-execute remediation. The skill is the dashboard, not the action layer.

---

## MCP coverage — current state (27 Apr 2026)

| Surface | Status | How |
|---|---|---|
| Sentry triage (Section A) | ✅ MCP-driven | Delegates to `agroyield-sentry-triage` which uses `mcp__469b009f-*__search_issues` + friends |
| Supabase SQL (Sections B/C/D/E) | ✅ MCP-driven | `mcp__bf92e1a9-3cf8-4a5f-8f2d-a078a6aef496__execute_sql` against `project_id: vmwhfcabmmgosdicatzs` |
| Vercel deploy verification | ✅ MCP-driven | `mcp__d1f8ccac-20fd-4f94-97c8-fa12dbcbf5ae__list_deployments` + `get_deployment_build_logs` |
| Slack `#all-agroyield-alerts` read (covers Better Stack + Termii + cron + Sentry-routed alerts) | ✅ MCP-driven | `mcp__f5620e6a-6442-4bbb-a89c-336f1d842e90__slack_read_channel` |
| Better Stack uptime (direct) | ⏸ No first-party MCP | Covered indirectly by the Slack channel read above — Better Stack alerts route into `#all-agroyield-alerts` per H1.2 wiring. A direct MCP would only matter if we wanted programmatic access to monitor history beyond what Slack carries. |

**The skill is now fully MCP-driven end-to-end** — every section has a programmatic path. No manual paste, no browser dashboard switching. Total runtime: ~3 min for a clean morning, longer if Sentry surfaces something needing drill-in.

If a future Better Stack MCP ships, fold it in to replace the indirect Slack-channel proxy. Until then, the proxy is correct and complete.

---

## Related skills

- **`agroyield-sentry-triage`** — Section A delegates to this skill. Don't duplicate the Sentry workflow here; just call it.
- *(future)* `agroyield-migration-apply` — for the migration-application loop.
- *(future)* `agroyield-feature-flag-flip` — for templated flag flips, generalising the `comment-mentions-flag-flip.md` runbook.

---

## Update log

- 2026-04-26 — Initial skill. Built around the post-launch beta operations need. Manual sections (Slack / Better Stack / Vercel) flagged for MCP automation when those connectors land. Thresholds in Section F are placeholder until 7-day rolling averages of beta traffic accumulate; revisit once we have 14 days of real data.
- 2026-04-27 (Beta launch +0h) — First end-to-end run captured the launch-day baseline (signups 2, posts 2, comments 4, reports 4, auto-suspends 0, suspended-users 1). Sentry surfaced one HIGH severity real bug on `/login` (`JAVASCRIPT-NEXTJS-A` — "Error: Rejected", 12 users, 28 events) plus one likely-zombie N+1 issue. Skill maintenance pass folded the newly-connected Supabase + Vercel + Slack MCPs into the workflow: Sections B/C/D/E now use `mcp__bf92e1a9-*__execute_sql` directly with `project_id: vmwhfcabmmgosdicatzs` (was: paste into Supabase Studio); Vercel deploy verification uses `mcp__d1f8ccac-*__list_deployments` (was: open dashboard); Slack `#all-agroyield-alerts` read via `mcp__f5620e6a-*__slack_read_channel` now covers Better Stack + Termii + cron + Sentry-routed alerts in one MCP call (was: 4 separate manual dashboard checks). Better Stack does not have a first-party MCP — the Slack channel proxy is the authoritative path until one ships. Section C feature-flag expected-state table expanded from 1 row to all 9 flags. **Net effect:** skill is now fully MCP-driven end-to-end; no manual paste, no browser dashboard switching, runtime ~3 min for a clean morning.

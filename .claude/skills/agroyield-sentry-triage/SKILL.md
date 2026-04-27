---
name: agroyield-sentry-triage
description: Pull, triage, and recommend actions on Sentry issues for AgroYield Network specifically. Use when the user asks "what's firing in sentry", "run sentry triage", "check sentry", "sentry health check", "sentry baseline", "are there any new errors", or after a deploy to verify the error feed. Project-scoped — config (org slug, region URL, project slug) is baked in for the AgroYield Network javascript-nextjs Sentry project; it won't apply to other projects' Sentry instances.
---

# AgroYield — Sentry triage

Single-command Sentry triage for the AgroYield Network beta. Loads on natural-language triggers like "run sentry triage" or "what's firing in sentry?". Pulls issues from the JS/Next.js project, categorises them (noise vs zombie vs real bug), and recommends actions per issue.

**Default behaviour: read + report.** Treatment actions (resolve, ignore, mark) are surfaced as recommendations and require explicit user confirmation before execution.

---

## Project config (don't change without checking)

- **Sentry org slug:** `agroyield-network-i0`
- **Region URL:** `https://de.sentry.io` (always pass this in Sentry MCP calls)
- **Project slug:** `javascript-nextjs`
- **Sentry org URL:** `https://agroyield-network-i0.sentry.io`

---

## Quick workflow (5-min smoke — daily standing check)

1. Call `mcp__469b009f-*__search_issues` with:
   - `organizationSlug: 'agroyield-network-i0'`
   - `regionUrl: 'https://de.sentry.io'`
   - `projectSlugOrId: 'javascript-nextjs'`
   - `naturalLanguageQuery: 'unresolved issues from the last 24 hours, sorted by most recent'`
   - `limit: 30`
2. Bucket results into the four categories below (Noise / Zombie / N+1-or-perf / Real bug).
3. Render the triage table (template at the bottom of this file).
4. Surface the "needs your call" subset (real bugs only) with a one-line recommendation each. Don't waste user time on the others.

If the list is empty or only contains noise/zombies → say "Sentry is quiet" and stop. Don't invent work.

---

## Full workflow (15-min — post-deploy verification, weekly health check)

1. Run the quick workflow above first.
2. For each unresolved issue that doesn't match a known noise/zombie pattern:
   - Call `get_sentry_resource` with the issue ID to pull the full stack trace + breadcrumbs.
   - If a `replayId` is captured and the issue affects ≥3 users, call `get_replay_details` to see what the user was doing.
   - If the issue's category is `performance` and `culprit` is unfamiliar, call `analyze_issue_with_seer` for an AI-assisted root-cause guess.
3. Pull the latest 3 releases via `find_releases` to cross-check whether issues are firing on the latest deploy or only on older releases. An issue last-seen ≥48h ago on an older release is a zombie even if it isn't marked resolved.
4. Render the full report (template below). Include a "release crossover" line per issue when relevant.

---

## Categorising rules

When categorising, apply these tests in order. First match wins.

### 1. Known noise (recommend: ignore + verify SDK filter is in place)

Match against the patterns in `instrumentation-client.ts` `ignoreErrors`:

```regex
/Lock .* was released because another request stole it/   → Supabase auth lock contention (within-tab)
/Lock was stolen by another request/                       → cross-tab Web Locks
/Lock broken by another request/                           → cross-tab Web Locks (steal-option variant)
/Failed to read the 'sessionStorage' property/             → Supabase RealtimeClient + locked-down browsers
/Failed to read the 'localStorage' property/               → same, fallback path
/The user denied permission to use Service Worker/         → next-pwa registration on user-blocked SW
```

Any issue matching one of these is **noise**. Action: confirm it's already on the latest release's filter (the SDK filter only takes effect on releases built after the filter was added). If the issue is firing on a release ≥ the deploy that added the filter, **flag it** — the filter regression-tested wrong. Otherwise recommend manual "Resolve in next release" and move on.

### 2. Known zombie (recommend: bulk resolve in UI)

Specific known-fixed issues that linger as unresolved in the dashboard:

| Pattern | Fixed in | Notes |
|---|---|---|
| `TypeError: undefined is not an object (evaluating 'r["@context"].toLowerCase')` | `app/layout.tsx` JSON-LD split (Sentry ref `f2499c29…`) | Was a single JSON-LD array; naive parsers crashed. Now two separate `<script>` blocks. |

For each zombie: confirm `lastSeen >= the-fix-deploy-date`. If yes, recommend "bulk resolve in Sentry UI". If it has fired since the fix, escalate — the fix didn't fully take.

### 3. Performance / N+1 issues

Sentry's `category: 'http_client'` or `category: 'performance'` flagged auto-detection. Common culprits:

- `/community` N+1 → traced to `ReportButton` mount-time GET per post (commit #61 fixed this by batching server-side).
- Other surfaces unknown — drill in via `get_sentry_resource` and trace the data flow.

These are **real but lower priority**. Recommendation: file as a post-launch performance task unless user volume is large (≥50 affected users in 24h).

### 4. Real bug (recommend: investigate, fix or escalate)

Anything that isn't noise, zombie, or perf is a real bug. Heuristics for prioritisation:

| Severity | Definition | Recommended action |
|---|---|---|
| **BLOCKER** | Affects auth, payments, posting, or content visibility. ≥10 users in 24h. | Investigate immediately, surface stack trace + replay, file a P0 task. |
| **HIGH** | Affects a single feature for ≥10 users OR any feature for ≥50 users. | Investigate this week. Stack trace summary + suspected root cause. |
| **MEDIUM** | <10 users, single occurrence, non-critical surface. | Note in report, no immediate action. |
| **LOW** | Single-user fluke. | Note in report, suggest auto-resolve. |

When recommending investigation, always include the issue's URL (e.g. `https://agroyield-network-i0.sentry.io/issues/JAVASCRIPT-NEXTJS-A`) so the user can click through.

---

## Output template

After running the workflow, render the triage report in this format. Don't deviate — the user is used to this shape now.

```markdown
## Sentry triage — <date> <time WAT>

**Window:** <last 24h | last 7d>
**Project:** javascript-nextjs
**Latest release:** <SHA>

### Real bugs that need your attention
| Issue | Title | Severity | Users | Events | Last seen | Recommended action |
|---|---|---|---|---|---|---|
…

### Performance / N+1
| Issue | Title | Users | Events | Last seen | Status | Notes |
|---|---|---|---|---|---|---|
…

### Zombies (recommend bulk resolve in UI)
| Issue | Title | Last seen | Notes |
|---|---|---|---|
…

### Filtered noise (no action — confirm filter present in latest release)
| Issue | Pattern matched | Last seen | Filter status |
|---|---|---|---|
…

## Summary
- N real bugs needing investigation: <X>
- N zombies safe to bulk-resolve: <Y>
- N noise items confirmed-filtered: <Z>
- Latest release health: <green | yellow | red>
```

If a section has zero rows, omit it — don't render empty headers.

---

## Treatment actions (when user asks to "treat" the issues)

Sentry MCP currently exposes read-only tools for our project. There's no `update_issue` / `resolve_issue` tool available, so all status changes happen in the Sentry UI manually.

Workflow when the user asks to treat:

1. For zombies and noise: surface a copy-paste list of issue URLs grouped by recommended action ("Resolve in next release" / "Ignore"). User clicks through and bulk-actions in the Sentry UI.
2. For real bugs: offer to file each one as a `TaskCreate` task in the workspace task system, with the suspected severity, root-cause hypothesis, and the issue URL. Default to a separate task per real bug; ask before bulk-creating.
3. For perf issues: same as #2 but tagged "post-launch perf pass" by default.

If a future MCP version adds `update_issue`, this skill should be updated to call it directly with explicit user confirmation per action. Don't auto-resolve without confirmation, ever.

---

## Tools available (Sentry MCP)

All under prefix `mcp__469b009f-0d18-41d2-9fab-551a32955aa4__`:

| Tool | Purpose |
|---|---|
| `whoami` | Verify connector identity. Run once at session start if unsure. |
| `find_organizations` | Get org slugs + region URLs. Already known: `agroyield-network-i0`. |
| `find_projects` | List projects in the org. We use `javascript-nextjs`. |
| `find_releases` | Latest deploy SHAs. Useful for "is this issue on the latest release?" |
| `find_teams` | Org team list (rarely needed for triage). |
| `search_issues` | The workhorse. Natural-language query → list of grouped issues. |
| `search_events` | Use for counts/aggregations ("how many errors today"). NOT for issue lists. |
| `search_issue_events` | Drill into events of a specific issue. |
| `get_sentry_resource` | Pull full details for a specific issue / event / release / replay by ID or URL. |
| `get_issue_tag_values` | Distribution of tag values (release, browser, OS, user) for a single issue. |
| `get_replay_details` | Pull a replay session by ID. |
| `get_profile_details` | Pull a performance profile. |
| `get_event_attachment` | Pull attached files (rare). |
| `analyze_issue_with_seer` | Sentry's AI takes a swing at root cause. Use for unfamiliar performance issues. |

**Quirks to remember:**

- `search_issues` translates natural language to Sentry query syntax. **It does NOT support boolean OR/AND** — split into multiple calls if needed.
- All MCP calls must include `regionUrl: 'https://de.sentry.io'` for this org.
- Empty results don't always mean "nothing's wrong" — try a broader window before declaring all clear.
- Sentry issue IDs come in two forms: short slug (`JAVASCRIPT-NEXTJS-A`) and numeric ID (`112707340`). Both work in `get_sentry_resource`.

---

## Update log

- 2026-04-26 — Initial skill. Config baked from session live diagnostics. Known noise patterns mirror `instrumentation-client.ts` ignoreErrors. JSON-LD zombie pattern documented from observed Sentry data. Treatment actions limited to "surface URLs + file tasks" pending an `update_issue` MCP tool.

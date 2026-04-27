# AgroYield — Agents & Connectors

> **Last updated:** 27 April 2026 (Beta launch day, +0h)
> **Owner:** Okoli (okolichijiokei@gmail.com)
> **Companion docs:** `ROADMAP.md`, `PROJECT_STATUS.md`, `UNICORN_SPRINT.md`, `.claude/skills/`

Working list of every skill ("agent") and MCP connector relevant to AgroYield's workflow. ✅ = shipped/connected and in active use. 🔄 = next on the build queue. ⬜ = recommended but not yet started. ⏸ = deferred with rationale.

---

## Skills (agents)

### Project-scoped (already built) ✅

- ✅ **`agroyield-sentry-triage`** — single-trigger Sentry triage; bucketed report (real bugs / zombies / noise / perf) with severity heuristics. Read+report only; treatment actions surface as URL lists for click-through. Config baked: org `agroyield-network-i0`, region `de.sentry.io`, project `javascript-nextjs`.
- ✅ **`agroyield-daily-health`** — 5-min morning ritual covering Sentry triage (delegates to skill above) + 11-metric SQL counts + feature-flag state + pending moderation queue + auto-suspend watch list. Read-only by default. Manual sections (Slack scan, Better Stack uptime, Vercel deploys) marked for MCP automation when those connectors land.

### Project-scoped (next to build, in priority order)

- 🔄 **`agroyield-migration-apply`** — closes the "paste this SQL into Supabase Studio" loop (root cause of the Checkpoint 40 12-min outage). Pairs with the H2.6 GitHub Action backlog item. Highest priority because it removes a class of deploy-time outages.
- 🔄 **`agroyield-feature-flag-flip`** — generalises `comment-mentions-flag-flip.md` into a templated ritual. Next flip is Week 5 mentions, then future kill-switches. Bakes in the audit-log row + Slack announcement so every flip leaves a trail.
- ⬜ **`agroyield-rollout-runbook`** — generates a launch-morning runbook for any feature flip (next: Unicorn #6 Credit Score, then #3 WhatsApp Templates when Termii unblocks). Encodes scratchpad #76 (the runbook-as-emotional-surface pattern).
- ⬜ **`agroyield-incident-postmortem`** — when a real incident fires, captures the event, the timeline, the root cause, and the next-launch hardening item. Pairs with scratchpad #70 (drill > checklist).
- ⬜ **`agroyield-beta-cohort-pulse`** — weekly digest summarising new signups, drop-off points, top reported posts, top community threads. Companion to H2.2 Monday-morning metrics dashboard.

### Useful generics already installed ✅

- ✅ **`skill-creator`** — for building the project-scoped skills above.
- ✅ **`internal-comms`** — incident reports, weekly leadership updates, Beta-cohort weekly notes.
- ✅ **`marketing:campaign-plan`** + **`marketing:draft-content`** + **`marketing:email-sequence`** — Beta onboarding drip (H2.3), Week-10 lender-outreach sequence.
- ✅ **`marketing:brand-review`** — pre-flight check on lender outreach letters and the +30-day Beta retention email.
- ✅ **`legal:review-contract`** + **`legal:vendor-check`** — Carbon/FairMoney/Renmoney MSAs when Unicorn #6 BD lands Week 10. Pairs with H4.3 (legal retainer).
- ✅ **`finance:financial-statements`** + **`finance:variance-analysis`** — H4.2 36-month rolling model + monthly board pack (H4.5).
- ✅ **`xlsx`**, **`docx`**, **`pptx`**, **`pdf`** — collateral generation (one-pagers, board packs, lender proposals).
- ✅ **`canvas-design`** — investor-facing visuals (AgroScore conceptual diagram, network-effects map).

---

## Connectors (MCPs)

### Currently connected — actively used ✅

- ✅ **Sentry** (`agroyield-network-i0` org, `de.sentry.io` region) — drives `agroyield-sentry-triage`; replaces dashboard copy-paste workflow.
- ✅ **Supabase** (project `vmwhfcabmmgosdicatzs`) — direct `execute_sql` powers Sections B/C/D/E of `agroyield-daily-health`; collapses 4 SQL-paste steps to direct calls. Connected 27 Apr 2026.
- ✅ **Vercel** — `list_deployments` + `get_deployment_build_logs` powers the daily deploy SHA check. Connected 27 Apr 2026.
- ✅ **Slack** — `#all-agroyield-alerts` reads (covers Better Stack uptime + Termii + cron + Sentry-routed alerts in one MCP call), future `slack_send_message` for incident comms.
- ✅ **Google Calendar** — H1.4 launch-hour no-fly block, monthly board-pack reminders, advisor-call scheduling (H5.1).
- ✅ **Gamma** — investor-facing decks, Beta-cohort recap presentations.
- ✅ **Claude in Chrome** — H1.3 QA walks, real-phone-style validation against production (scratchpad #55).
- ✅ **PDF Tools** — invoice extraction, contract review prep.

### Recommended next — high ROI, no blocker

- 🟡 **GitHub** — no first-party MCP in the registry (confirmed 27 Apr 2026). **Bridge in place via PAT + curl** for local-machine use: `scripts/gh-api.sh` wraps the common queries (open PRs, CI status, branch protection, stale PRs); auth via `GITHUB_TOKEN` env var or `.env.local`. Setup runbook at `docs/runbooks/github-pat-setup.md` (~5 min one-time). PAT verified end-to-end against `api.github.com` from local terminal 27 Apr 2026. **⚠️ Cowork sandbox limitation:** the sandbox firewall blocks outbound HTTPS to non-allowlisted hosts (including `api.github.com`), so the helper can only run from your local machine — it can't power an in-Cowork morning-ritual skill the way Sentry/Supabase/Slack/Vercel do. Future `agroyield-pr-pulse` skill is parked until an official GitHub MCP ships. Discipline scaffolding (CODEOWNERS, PR template, issue templates, dependabot, CI workflow) shipped to `.github/` — those don't need API access at all. When an official GitHub MCP ships, swap the curl helper for direct MCP calls; the runbook documents the migration.
- ⬜ **PostHog MCP** — H2.1 funnel events, the `?ref=wa` conversion read, funnel-drop-off identification. Currently dashboard-only.
- ⏸ **Better Stack MCP** — no first-party MCP exists in the registry. **Folded out of the daily-health skill** via the Slack `#all-agroyield-alerts` proxy — Better Stack alerts already route into the Slack channel per H1.2 wiring, so a single `slack_read_channel` call covers the uptime signal we need. Revisit if a first-party Better Stack MCP ships.

### Recommended next — quarterly window

- ⬜ **Linear or Asana MCP** — H3.1 project management; mirrors `Checkpoint / Session / Scratchpad / Hotfix` vocabulary into a tracker before hire #2.
- ⬜ **Resend MCP** — Beta-cohort email send-and-track (currently via API), template management, bounce-rate visibility.
- ⬜ **Termii MCP** — SMS sender-ID status, delivery reports, balance monitoring. Especially useful when Unicorn #3 WhatsApp Templates unblocks.
- ⬜ **Box or Google Drive MCP** — H4.1 investor data room, doc shareable links, version control on the financial model + lender outreach pack.

### Lower priority — opportunistic

- ⬜ **Stripe / Paystack MCP** — invoice payment status, refund handling, dispute monitoring. Useful when transaction volume crosses 100/week.
- ⬜ **Anthropic Console MCP** — workspace spend monitoring, key rotation. Useful once monthly spend approaches the ₦100k/month cap.
- ⏸ **CAC / NIBSS lookup MCP** (if/when it exists) — automated business verification; would close the scratchpad #61 duplicate-prevention gap at the source. Deferred — no public MCP today, would require building from scratch.

---

## Operational pattern

Every "Manual checks" line in `agroyield-daily-health/SKILL.md` is a vote for a connector. When one lands, the skill's workflow folds it in and the manual section shrinks (scratchpad #75). Same logic for the future `agroyield-migration-apply` skill — it can ship today as a "paste this SQL" generator, then collapse to a single `mcp__supabase__sql` call the day Supabase MCP arrives.

**Top three to install next, in priority order:** ~~Supabase~~ ✅ → ~~Vercel~~ ✅ → ~~Better Stack~~ ⏸ (no MCP; folded out via Slack proxy 27 Apr). With those three closed, the next priorities shift to **GitHub** (H3 PR discipline) and **PostHog** (H2.1 funnel measurement).

---

## Update log

- **27 Apr 2026** — Initial document. Captures the post-Beta-launch state: 2 project-scoped skills shipped, 6 connectors active, 9 connectors recommended next. Built around the H1–H4 backlog horizons in `UNICORN_SPRINT.md`.
- **27 Apr 2026 (later)** — Supabase + Vercel MCPs connected and active. Better Stack confirmed unavailable in the registry; folded out of the daily-health skill via the Slack `#all-agroyield-alerts` proxy (Better Stack already routes alerts there per H1.2). `agroyield-daily-health/SKILL.md` updated end-to-end: Sections B/C/D/E now use `mcp__bf92e1a9-*__execute_sql` directly, deploy verification uses `mcp__d1f8ccac-*__list_deployments`, operational signals use `mcp__f5620e6a-*__slack_read_channel`. Skill is now fully MCP-driven; no manual paste, no dashboard switching, ~3 min runtime for a clean morning. 8 connectors active total. Next install priority: GitHub → PostHog.
- **27 Apr 2026 (evening)** — GitHub: no first-party MCP in the registry (confirmed via two registry searches with different keyword sets). Bridged via two paths instead. **Phase 1 — discipline scaffolding shipped to `.github/`:** `CODEOWNERS`, `pull_request_template.md` (PR template includes Supabase migration paste reminder per scratchpad #30 + real-phone QA check per scratchpad #55), `ISSUE_TEMPLATE/{bug_report,feature_request,config}`, `dependabot.yml` (weekly Monday 06:00 WAT, grouped minor/patch updates per ecosystem family), `workflows/ci.yml` (type-check + lint, runs on PRs to main + pushes to main). **Phase 2 — API access via PAT + curl:** `scripts/gh-api.sh` wraps the common queries (`list-prs`, `pr-checks`, `ci-status`, `branch-protection`, `stale-prs`, `rate-limit`); token resolved from `$GITHUB_TOKEN` env var or `.env.local`; setup runbook at `docs/runbooks/github-pat-setup.md` (5-min one-time). PAT requirements: fine-grained, repo-scoped to `agroyield-network`, read permissions on Contents/Pulls/Issues/Actions/Checks, 90-day rotation. **Why curl instead of `gh` CLI:** sandbox state likely doesn't persist between sessions, so a CLI install would re-run every time; a script + token survives. The Bash tool already has `git`+`curl`+`apt-get` in the sandbox today. **Migration path:** when an official GitHub MCP ships, swap the curl wrapper for direct MCP calls; the runbook documents the cutover. Status: 🟡 partial (discipline scaffolded, API bridge ready pending PAT). Next install priority: PostHog.

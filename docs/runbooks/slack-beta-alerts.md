# Slack `#beta-alerts` Routing Runbook

**Channel**: `#beta-alerts`
**Workspace**: agroyieldalerts.slack.com
**Owner**: Chijioke Okoli
**Created**: 21 April 2026
**Target Beta**: Monday 27 April 2026, 06:30 WAT

This runbook documents how high-priority operational signals — uptime,
Sentry, Termii webhook failures, and cron errors — fan out to Slack
`#beta-alerts` during the Beta launch window.

Keep this channel **high-signal**. The existing `#all-agroyield-alerts`
channel absorbs marketplace-order, payment, and support updates (via the
legacy `SLACK_WEBHOOK_URL`). `#beta-alerts` is the one the on-call
person (Okoli) watches live during the launch window and has agreed to
treat as paging-priority. If it rings for anything non-urgent, we move
the source back to `#all-agroyield-alerts` the same day.

---

## 1. One-time setup

### 1.1 Invite the bot to the channel

The Claude/Cowork Slack bot can't see `#beta-alerts` until invited. The
Better Stack and Sentry integrations install their own bots, so each
has to be invited separately.

1. Open `#beta-alerts` in Slack.
2. Type `/invite @Cowork` — the bot needs this to post the cron-error
   digests. Confirm it says "Cowork has joined the channel".
3. `/invite @Better Stack` after the Better Stack app is installed
   (see §2.1).
4. `/invite @Sentry` after the Sentry app is installed (see §2.2).

Verification: run `slack_search_channels` from Cowork with query
`beta-alerts`. Before the invite, the channel returns no results.
After, it appears with the channel ID visible.

### 1.2 Create the incoming webhook

For signals originating inside our app (cron watchers, Termii webhook
handler, manual slackAlert() calls), we post via an incoming webhook.

1. Slack admin → Apps → Incoming WebHooks → Add new configuration.
2. Post to channel: `#beta-alerts`.
3. Copy the webhook URL (starts with `https://hooks.slack.com/services/...`).
4. Add to Vercel env vars as `SLACK_BETA_ALERTS_WEBHOOK_URL` in
   **Production** and **Preview**. Leave Development unset so local
   dev doesn't spam the channel.
5. Redeploy production to pick up the env.

Verification: call `slackAlert({ title: 'Webhook smoke test', channel: 'beta-alerts', level: 'info' })`
from a one-off Node REPL (or a throwaway API route). The message
should land within 5 seconds.

## 2. External integrations

These don't use our webhook — they install their own Slack app and
route directly from the source's dashboard to `#beta-alerts`.

### 2.1 Better Stack (uptime)

See [`uptime-monitoring.md`](./uptime-monitoring.md) §2 — the Better
Stack notifier routes every downtime + recovery to `#beta-alerts` via
the native Slack integration. Nothing to wire inside our code.

Verification: in the Better Stack dashboard, click "Trigger test
incident" on any monitor. The alert + resolution pair should land in
`#beta-alerts` within a minute each.

### 2.2 Sentry

Route Sentry issues of level `error` or higher to `#beta-alerts`. Lower
levels (info, warning) stay out — they're noise.

1. Sentry → Settings → Integrations → Slack → Install (if not already).
2. Authorise the agroyieldalerts workspace.
3. Create an **Alert Rule**:
   - Name: `Beta launch — errors to #beta-alerts`
   - Environment: `production`
   - Condition: `An issue is first seen` OR `An issue reappears`
   - Filter: `level equals error` (drops warning/info)
   - Action: Send notification to Slack workspace
     agroyieldalerts, channel `#beta-alerts`, tags: `environment, release, transaction`
4. Save and enable.

Verification: in a Vercel Preview, hit an endpoint that calls
`Sentry.captureException(new Error('beta-alerts wiring test'))`. The
issue should surface in Sentry within ~30s and the Slack message in
`#beta-alerts` shortly after. Resolve the test issue so it doesn't
linger on the dashboard.

**Known pitfall:** Sentry rate-limits alert-rule Slack posts per issue
(default 1/hour) to avoid spam. For a beta launch, that's the right
default — we don't want one broken route to wallpaper the channel.
If a real launch-morning incident needs more frequent pings, escalate
by @-mentioning @Okoli in a thread rather than tuning the rate limit.

### 2.3 Termii webhook failures (planned, not yet wired)

Termii posts delivery-status updates to `/api/webhooks/termii` (handler
not yet implemented — see Unicorn Sprint backlog). When built, the
handler's error path should call:

```ts
slackAlert({
  title: 'Termii webhook — delivery failed',
  level: 'error',
  channel: 'beta-alerts',
  fields: {
    message_id: body.message_id,
    status:     body.status,     // e.g. 'Rejected', 'DND Active'
    to:         body.receiver,
    reason:     body.reason ?? 'n/a',
  },
})
```

Scope for H1.2 is to have the runbook + `channel: 'beta-alerts'`
plumbing in place. The handler itself lands in a later Unicorn ticket.

### 2.4 cron_runs errors

Every cron handler under `/app/api/cron/*` records a row in
`cron_runs(job_name, started_at, finished_at, status, error)`. Rather
than wire slackAlert into each handler individually, we run a single
digest job that reads the table and fires one Slack message per unique
error since the previous run.

Proposed implementation (NOT yet built — H1.2 ships the plumbing, not
the watcher):

1. New cron target `/api/cron/alert-failed-crons`, scheduled hourly.
2. Query `SELECT job_name, error, count(*) FROM cron_runs
   WHERE status='error' AND finished_at > NOW() - INTERVAL '1 hour'
   GROUP BY job_name, error`.
3. For each group, post one `slackAlert({ channel: 'beta-alerts',
   level: 'error', title: \`cron ${job_name} failed × ${count}\`, ... })`.
4. Skip sending if zero rows — no news is good news.

Until this lands, eyeballing `cron_runs` manually is the workaround;
the launch checklist (H1.3 §2.5 row E3) covers that.

## 3. Alert severity contract

Not every caller of `slackAlert({ channel: 'beta-alerts' })` should be
using that channel. The contract:

| Level | `channel: 'beta-alerts'`? | Examples |
|-------|---------------------------|----------|
| `error` | Yes, always | Uptime down, Sentry exception, cron failure, Termii delivery failure |
| `warning` | Only if it's a leading indicator of a P0 | Cron taking >30s (warning), single-region uptime flap (warning) |
| `info` | No — use default channel | Successful deploy, payment confirmation |

If you're about to post an `info`-level message to `#beta-alerts`,
stop. Use the default channel or omit `channel:` entirely.

## 4. What to do when `#beta-alerts` fires

1. Acknowledge in thread within 5 min (even if just "seen, investigating")
   so anyone else glancing at the channel knows it's being handled.
2. Read the alert's fields. Each integration stuffs the relevant
   diagnostic data into fields:
   - Better Stack → monitor name, region, status code, duration down
   - Sentry → error message, release, affected transaction
   - Termii (when built) → message_id, status, reason
   - cron_runs (when built) → job_name, error, count
3. If the root cause takes >15 min to identify or the outage is
   customer-visible, start an incident log at
   `docs/runbooks/incidents/YYYY-MM-DD-<slug>.md`.
4. Post resolution in the same thread so the signal stays together.

## 5. Verification checklist (BEFORE launch)

Run this sequence Sunday 26 Apr to confirm the whole fan-out is live:

- [ ] §1.1 all four bots present in `#beta-alerts` member list
- [ ] §1.2 `SLACK_BETA_ALERTS_WEBHOOK_URL` set in Vercel Prod + Preview
- [ ] §1.2 smoke test: manual slackAlert posts land in channel
- [ ] §2.1 Better Stack test incident lands in channel (also in uptime runbook §4)
- [ ] §2.2 Sentry test exception lands in channel

If any of these fails, Slack routing is not trustworthy for launch —
fix or accept an explicit known gap before the go/no-go call.

## 6. Rollback

To revert beta-alerts routing to the legacy single-channel setup:

1. Remove `SLACK_BETA_ALERTS_WEBHOOK_URL` from Vercel envs.
2. Redeploy. `slackAlert({ channel: 'beta-alerts' })` calls will log
   `[slack] SLACK_BETA_ALERTS_WEBHOOK_URL not set — alert dropped: …`
   in production logs rather than silently absorbing — that's by
   design, see the comment in `lib/slack.ts`.
3. Disable the Sentry and Better Stack Slack integrations in their
   dashboards.

No code change required for rollback — the channel parameter falls
through to a logged no-op. Flip env, redeploy, done.

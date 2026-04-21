# Uptime Monitoring Runbook — Better Stack

**Service**: AgroYield Network
**Provider**: Better Stack (<https://betterstack.com/uptime>)
**Owner**: Chijioke Okoli
**Created**: 21 April 2026
**Target Beta**: Monday 27 April 2026, 06:30 WAT

This runbook covers the Better Stack uptime setup we stood up for H1.1 of
the Unicorn Sprint — what's monitored, how alerts fan out, and how to
verify the whole loop end-to-end before launch.

---

## 1. What we monitor

Five HTTP(S) monitors, 5-minute cadence, 30-second timeout, 3-region
check (Frankfurt, Virginia, Mumbai). We deliberately don't check from
Lagos — Better Stack doesn't offer a Nigerian check point, and the
nearest options (Cape Town, Mumbai) are a reasonable proxy for what our
users actually see.

| # | Target | Expected | Why it matters |
|---|--------|----------|----------------|
| 1 | `https://agroyield.network/` | 200 + body contains `AgroYield` | Landing page. If this is down nothing else matters. |
| 2 | `https://agroyield.network/login` | 200 + body contains `Sign in` | Auth entry. Signup and returning-user flows both go through here. |
| 3 | `https://agroyield.network/api/cron/weekly-digest` | 200 (or 401 on GET — see note) | Cron target. Regression here means the digest silently skips. |
| 4 | `https://agroyield.network/b/preeminent-solutions` | 200 + body contains `Preeminent` | Institution public page. Our lighthouse account — we've committed to them being reachable. |
| 5 | `https://agroyield.network/prices` | 200 | Price Tracker. The feature Beta users are most likely to open daily. |

**Note on #3:** the cron endpoint accepts POST from Vercel Cron with a
shared secret. Unauthed GETs return 401 by design. Configure the
monitor to treat **200 OR 401** as healthy — we're checking the route
exists and responds fast, not that the cron succeeded (that's what
`cron_runs` is for).

## 2. Alert routing

All monitor alerts fan out two places:

1. **Email** → <okolichijiokei@gmail.com> (already verified)
2. **Slack webhook** → `#beta-alerts` (wired under H1.2; incoming-webhook
   URL stored in Vercel env `BETTERSTACK_SLACK_WEBHOOK` for reference but
   the webhook is configured directly inside Better Stack's Integrations
   panel — not called from app code)

Alert policy:
- **Trigger after**: 2 consecutive failed checks (so one flaky region
  doesn't page us; ~10 min time-to-alert)
- **Re-alert every**: 30 minutes while still down
- **Auto-resolve**: after 2 consecutive passes
- **Escalation**: none for beta — Okoli is sole on-call. Add Better
  Stack "on-call schedule" feature when the team grows.

## 3. One-time setup (done Tue 21 Apr)

These steps only need to run once. Documenting them so the next person
who onboards doesn't have to reverse-engineer the dashboard.

1. Sign up at <https://betterstack.com/uptime> with okolichijiokei@gmail.com.
2. Create a new Monitor Group called **AgroYield Beta**.
3. For each row in §1, click "Create monitor" with these defaults:
   - Type: HTTPS
   - Check frequency: every 5 minutes
   - Request timeout: 30 seconds
   - Regions: Frankfurt, Virginia, Mumbai (uncheck the rest)
   - Keyword check: paste the "body contains" string from the table
   - Expected status codes: 200 (except #3 — use `200, 401`)
4. Under Settings → Notifications:
   - Email: add okolichijiokei@gmail.com (verify the confirmation link)
   - Slack: Integrations → Slack → install app → select workspace →
     route to `#beta-alerts`. Use Better Stack's native integration,
     don't build a custom webhook.
5. Under Settings → Alerting policy: set 2-consecutive-failure trigger,
   30-minute re-alert cadence, auto-resolve on 2 passes.
6. Create a status page at <https://agroyield.betteruptime.com>
   (public, read-only). We'll link to this from our maintenance
   comms when needed; not routed from `agroyield.network` yet.

## 4. Verify the loop (DO BEFORE LAUNCH)

The monitors are useless if the alert path is broken. Run this before
the launch window Mon 06:30 WAT:

1. In Better Stack, open monitor #5 (Prices). Click "Trigger test
   incident". Confirm within 2 minutes:
   - Email lands at okolichijiokei@gmail.com.
   - `#beta-alerts` receives a Slack message with a link back to the
     incident page.
2. Resolve the test incident; confirm both channels receive a
   resolution notice.
3. If either notification fails, do NOT proceed to launch — fix the
   alert path first. A silent uptime monitor is worse than no monitor
   because it lets you assume everything's fine.

File the test results in the QA walk log §2.5 row E2.

## 5. What to do when a monitor fires

The alert tells you which target, which region, and the HTTP error or
keyword miss. Work from there.

**Common patterns + first move:**

| Symptom | First check | Likely cause |
|---------|-------------|--------------|
| All five monitors red | Vercel status page, DNS | Vercel outage, DNS propagation, cert expiry |
| Only /api/cron/* red (other four green) | `cron_runs` table, Vercel cron log | Cron secret rotation, Supabase connection cap |
| Keyword miss but 200 | Actual page render | Supabase query timeout → shell rendered without content, or a new feature flag hid the keyword |
| Only Mumbai region red | Better Stack own status | Provider-side regional issue, usually self-resolves |

Log the incident in `docs/runbooks/incidents/YYYY-MM-DD-<slug>.md` if
it lasted >15 min or was customer-visible. (Directory doesn't exist
yet — create on first use.)

## 6. Cost

Better Stack free tier covers 10 monitors at 3-min cadence; we're using
5 at 5-min. No billing setup needed for Beta. Revisit at Checkpoint 40
once we have real traffic and might want sub-minute checks for the
critical paths.

## 7. Known gaps (revisit post-Beta)

- **No Nigerian check point.** Better Stack doesn't offer one;
  UptimeRobot does. If Lagos latency becomes a real metric we care
  about, add a Checkly or Pingdom probe pointed from .ng.
- **No TLS-expiry monitor.** Vercel auto-renews Let's Encrypt certs,
  but belt-and-braces: add a Better Stack SSL monitor for
  agroyield.network in the first post-launch week.
- **No signup-flow synthetic.** We only check public pages. A synthetic
  that creates a throwaway account every 6h would catch auth
  regressions we'd otherwise only find from user complaints. Out of
  scope for H1.1; flagged for Unicorn Sprint H2.

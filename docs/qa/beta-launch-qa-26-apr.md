# Beta-launch QA walkthrough — Sun 26 Apr 2026

**Owner:** Okoli
**Driver:** Claude in Chrome
**Window:** 14:00 – 16:00 WAT (2h, flex)
**Target env:** <https://agroyield.network> (production)
**Entry criteria:** H1.1 uptime monitors green; H1.2 #beta-alerts wired; H1.5 commit-hygiene hook live
**Exit criteria:** every row in §2 has a verdict (✅ / 🟡 / ❌) and every ❌ has an owner + Unicorn Sprint ticket

Launch is **Mon 27 Apr 06:30 WAT** — if anything in §2 lands ❌ without a
credible fix-by time before launch, that finding rolls into the go/no-go
call tracked on the calendar block (see H1.4).

---

## 1. Pre-walk setup

1. Confirm Claude in Chrome is enabled in the Cowork sidebar
   (Settings → Desktop app → Computer use). If not, enable and reload.
2. Open a **fresh Chrome profile** — don't reuse the one with dev cookies.
   We want the walk to exercise first-time-visitor state.
3. Seed two throwaway accounts in production beforehand:
   - `qa-farmer+26apr@agroyield.network` — role: farmer
   - `qa-inst+26apr@agroyield.network` — role: institution (Preeminent Solutions)
   Both created via the real signup form; do not bypass with service-role.
4. Open #beta-alerts in a side window — it should light up on any Sentry
   or cron_runs error the walk triggers. That's a feature, not a bug.
5. Start the session transcript to `/docs/qa/beta-launch-qa-26-apr.log`
   (Chrome MCP → `read_console_messages` + `read_network_requests` both
   tee there).

## 2. Walkthrough checklist

Each row: record verdict + one-line evidence (screenshot path, console
error summary, or "clean"). Keep the evidence pointer in the `Notes` cell,
not inline prose — we want this doc to stay a checklist, not a report.

### 2.1 Marketing + auth surface

| # | Flow | Expected | Verdict | Notes |
|---|------|----------|---------|-------|
| A1 | Landing → hero → primary CTA | Routes to `/signup` | | |
| A2 | Nav: Marketplace (logged-out) | Renders public listings, no 401 flash | | |
| A3 | Nav: Prices (logged-out) | Renders reports grid, "Report a price" CTA goes to login | | |
| A4 | `/login` — wrong password | Shows inline error, no 500 | | |
| A5 | `/signup` as farmer | OTP lands in inbox within 60s | | |
| A6 | `/signup` as institution (Preeminent) | Institution fields required, onboarding-wizard skip kicks in post-verify | | |
| A7 | Welcome email render (Gmail, Outlook, mobile Gmail) | AgroYield logo loads, no 🌾 fallback, all links have correct host | | |

### 2.2 Farmer core loop

| # | Flow | Expected | Verdict | Notes |
|---|------|----------|---------|-------|
| B1 | First-login profile gate | Blocks content-creation APIs until profile complete | | |
| B2 | Submit price report — Oil category | Dropdown shows "Oil" (not "Oils"), commodity list has Palm Oil etc. | | |
| B3 | Edit own price report | Prefills category correctly; legacy 'oils' rows (if any) still render | | |
| B4 | Delete own price report | Confirmation flow, soft-fails if unauthenticated | | |
| B5 | Filter pill — Oil | Filter matches both 'oil' and pre-migration 'oils' rows | | |
| B6 | DM composer — attach PDF + image | Upload succeeds, thumbnail renders, recipient sees attachment | | |
| B7 | Report a post (abuse) | Creates row, no stack trace in Sentry | | |

### 2.3 Institution + mentor flows

| # | Flow | Expected | Verdict | Notes |
|---|------|----------|---------|-------|
| C1 | Institution signup → dashboard | Skips onboarding wizard, lands on institution dashboard | | |
| C2 | Admin: verify_institution | Target user flips to verified, welcome email fires | | |
| C3 | Mentor application → admin approval | Gate enforced server-side; un-approved mentor cannot post advice | | |

### 2.4 Admin + ops

| # | Flow | Expected | Verdict | Notes |
|---|------|----------|---------|-------|
| D1 | /admin → SMS test | Channel dropdown visible (generic/dnd/whatsapp), sender-id field visible | | |
| D2 | SMS test: 3 numbers (1 DND, 1 non-DND, 1 bad) | Partial-success shape: 200 if any succeeded, per-number detail | | |
| D3 | SMS test: Check delivery | Per message_id pill (delivered/sent/failed/queued) renders | | |
| D4 | Weekly digest cron | /api/cron/weekly-digest returns 200; row lands in cron_runs | | |
| D5 | Expense OCR flag off path | Upload button disabled for flag=off users | | |

### 2.5 Monitoring + alerts (sanity check)

| # | Flow | Expected | Verdict | Notes |
|---|------|----------|---------|-------|
| E1 | Trigger a known 500 (force a malformed /api/prices POST) | Sentry issue lands; #beta-alerts gets a message | | |
| E2 | Kill uptime target (point a monitor at a nonexistent route for 10m, then revert) | Better Stack alert → email + #beta-alerts | | |
| E3 | Read cron_runs table for last 7 days | No error rows; if any, justified + ticketed | | |

## 3. Post-walk

1. Open one Unicorn Sprint ticket per ❌ row; title format
   `qa(beta-26apr): <surface> — <one-liner>`. Link evidence.
2. If any ❌ is a P0 (blocks signup, auth, submit, or admin test panel),
   page the go/no-go call scheduled at 21:00 WAT.
3. Paste the filled-in §2 table into the launch Slack thread.
4. Archive the walk log (chrome console + network tees) to
   `/docs/qa/beta-launch-qa-26-apr.log` in the repo and commit with
   `docs(qa): beta-launch QA walk results (26 Apr)`.

## 4. Rollback triggers

If any of these surface during the walk, we delay launch:
- A5 fails (OTP doesn't land) — new users can't onboard.
- C2 fails — institution verify breaks welcome-email fan-out.
- D2 crashes (not partial-success — actual 500) — admin can't diagnose SMS.
- E1 or E2 don't reach #beta-alerts — we're flying blind at launch.

Everything else becomes a P1 shipped with a known-issues note, not a
delay.

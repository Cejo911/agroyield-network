<!--
AgroYield Network PR template. Keep it lean — fill the sections that apply,
delete the ones that don't. The headers exist to prompt the operational checks
that have bitten us before (scratchpads #30, #51, #55, #66 in ROADMAP.md).
-->

## Summary

<!-- 1–3 sentences. What does this PR do, in plain language? -->

## Why this matters

<!-- One sentence on the user-visible or operational outcome. -->

## Test plan

- [ ] `npm run type-check` clean
- [ ] `npm run lint` on touched files
- [ ] Manual QA on the affected surface

## Migrations / settings / env vars

<!--
⚠️ Vercel deploys do NOT auto-apply Supabase migrations (scratchpad #30).
   If this PR adds a migration, paste it into the Supabase SQL editor BEFORE merge,
   or the corresponding feature will 404/500 in production.
-->

- [ ] No Supabase migrations
- [ ] Migration files: `supabase/migrations/<file>` — applied to prod via SQL editor on `<date>`
- [ ] No new env vars
- [ ] New env vars added to Vercel: `<list>`
- [ ] No feature-flag changes
- [ ] Feature flag `<name>` flipped: `<false → true>` per `docs/runbooks/<runbook>.md`

## Mobile-interactive feature?

<!--
Required for any PR that touches camera capture, file upload, touch-heavy UI,
SMS/WhatsApp delivery, or auth flows on mobile (scratchpad #55 — real-user-real-device
beats headless smoke scripts).
-->

- [ ] N/A
- [ ] One human tested on a real phone against Vercel preview

## Sentry / Better Stack signals

<!-- Quick post-deploy sanity check — drives the next morning's `agroyield-daily-health` run. -->

- [ ] No expected impact on alert thresholds
- [ ] Will run `agroyield-sentry-triage` after deploy and surface findings

## Linked context

<!-- Reference Checkpoint #N or scratchpad #N if applicable. -->

Closes: #
Refs: Checkpoint #, scratchpad #

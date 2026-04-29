# Database migration deployment

**Owner:** Okoli
**Last updated:** 2026-04-29
**Closes task:** H2.6

## Summary

Adding a new Supabase migration is now a normal commit. On merge to `main`, the `db-migrate-prod` GitHub Action queues the apply. You approve it in the GitHub UI; the Action runs `scripts/apply-migrations.sh` against production via `psql`. No more "paste the SQL into the Supabase SQL editor" step, and no more class of "the migration file landed in `main` but the DDL never ran in prod" bugs (which caused the 28 Apr marketplace-escrow + likes-constraint outages).

## Architecture

Three pieces hold the system together:

1. **`public._applied_migrations`** — a tracking table keyed by the migration's filename. Created by `supabase/migrations/20260429000000_create_applied_migrations_tracking.sql`. The Action reads from and writes to this table; nothing else does.
2. **`scripts/apply-migrations.sh`** — bash runner that diffs `supabase/migrations/*.sql` against the tracking table, applies pending files via `psql`, and records each successful apply with its sha256.
3. **`.github/workflows/db-migrate-prod.yml`** — workflow that runs the script. Two-job design: a `preview` job that always runs in dry-run mode and shows what would be applied, then an `apply` job that runs in the protected `production-db` environment requiring your manual approval.

We deliberately do NOT use `supabase db push` or `supabase_migrations.schema_migrations`. The legacy 8-digit-prefix files in this repo (`20260416_*.sql` × 4, etc.) collide on the version key the Supabase CLI derives from the prefix. Renaming all 46 files would break `git log --follow` history with no incremental safety benefit. Our table tracks by full filename, which sidesteps the collision entirely.

## Adding a new migration (the new flow)

1. Create the file at `supabase/migrations/<14-digit-utc-timestamp>_<descriptive_snake_case>.sql`. Example: `20260430120000_add_orders_summary_index.sql`. The 14-digit prefix is the convention going forward; legacy files keep their 8-digit prefix and stay tracked via the `_applied_migrations` filename PK.
2. Open a PR. Get the usual code review.
3. Merge to `main`.
4. The Action triggers automatically. The `preview` job runs first and prints what it would apply.
5. GitHub will email you (or surface a banner on the repo home) saying the `apply` job is awaiting your approval.
6. Open the workflow run, scroll to the gated job, click **Review deployments → production-db → Approve and deploy**.
7. The `apply` job runs `psql` against production. Each file applies in a single transaction (`ON_ERROR_STOP=1 --single-transaction`); a failure rolls back that file and stops the run. Successful applies are recorded in `_applied_migrations`.
8. The `Post-apply verification` step re-runs the script in dry-run mode and confirms zero pending.

## Setup checklist (one-time)

These steps are required before the Action can succeed. None has been done yet.

- [ ] **Generate the production `DATABASE_URL`.** In Supabase dashboard → Project Settings → Database → Connection pooling. Copy the **Transaction pooler** URL (port 6543), substitute the password, and verify it starts with `postgres://postgres.vmwhfcabmmgosdicatzs:...@aws-0-<region>.pooler.supabase.com:6543/postgres`. Do NOT use the Direct connection (port 5432) — it has a connection cap that the Action can blow through if it ever retries.
- [ ] **Create the `production-db` GitHub environment.** Repo → Settings → Environments → New environment → `production-db`. In the new environment's settings:
  - Required reviewers: add yourself (Okoli).
  - Wait timer: 0 minutes.
  - Deployment branches: select **Selected branches** and allow `main` only.
- [ ] **Add the secret.** Inside the `production-db` environment → Environment secrets → New secret → `DATABASE_URL` → paste the pooler URL from step 1.
- [ ] **Test with a no-op invocation.** Actions tab → "Apply Supabase migrations to production" → Run workflow → set "Dry run only" to true → run. Approve when prompted. Confirm the logs show "All N repo migrations are already applied. Nothing to do." (where N is currently 47).

## Daily ops

### Normal case — new migration committed

Nothing to do until you get the GitHub email. Approve in the UI. Watch the apply step's logs for any `ERROR`. Done.

### Failure case — apply step fails

The script prints the failing filename and the psql output. Common causes and remedies:

- **Syntax error in the SQL.** Fix in a new commit; the failed file remains pending and will be retried on the next workflow run.
- **Object already exists** (e.g. `relation "..." already exists`). Means the migration was applied out-of-band (manual SQL editor, MCP `apply_migration`) but never recorded in `_applied_migrations`. Fix by inserting the tracking row manually, then re-running the workflow:
  ```sql
  INSERT INTO public._applied_migrations (filename, applied_by, content_sha256)
  VALUES ('<filename>.sql', 'manual_sql_editor', '<sha256-of-current-file-content>');
  ```
- **Connection failure / timeout.** Re-run the workflow; the `concurrency` group prevents overlap.

### Drift case — a file's content was modified after apply

The script's exit code 2 path catches this: it computes sha256 of every repo file and compares against `_applied_migrations.content_sha256`. A mismatch fails the preview job before approval is even possible. Editing applied migrations in place is unsafe — production never sees the new content. The remedy is always to add a NEW migration that makes the desired change, not edit the old file.

If the modification was unintentional (e.g. you ran a formatter that touched comments), the safest path is to revert the file content. If the modification was intentional but you want production to skip it, update the stored sha256:

```sql
UPDATE public._applied_migrations
   SET content_sha256 = '<sha256-of-current-file-content>'
 WHERE filename = '<filename>.sql';
```

Both moves should be rare. If you find yourself reaching for the UPDATE more than ~once a year, the workflow is wrong somewhere.

### Out-of-band apply (MCP, SQL editor, manual psql)

Sometimes you'll apply a migration without going through the Action — e.g. during incident response. Always record it manually so the next Action run doesn't try to re-apply:

```sql
INSERT INTO public._applied_migrations (filename, applied_by, content_sha256)
VALUES (
  '<filename>.sql',
  '<one of: manual_sql_editor | mcp_apply_migration>',
  '<sha256-of-current-file-content>'
);
```

The `applied_by` CHECK constraint enforces the 4 valid values.

## Running the script locally

Useful when staging a migration against a Supabase preview branch before merge:

```bash
# Pooler URL for your branch from Supabase dashboard
export DATABASE_URL='postgres://postgres.<branch-ref>:...@aws-0-<region>.pooler.supabase.com:6543/postgres'

# Dry run — see what would be applied without executing
DRY_RUN=1 scripts/apply-migrations.sh

# Apply
scripts/apply-migrations.sh
```

## Security notes

- The `DATABASE_URL` secret is scoped to the `production-db` environment, not the repo or organization. Workflows that don't reference that environment can't read it. Pull requests from forks can't read it.
- The Action only ever runs after a `main`-branch push or a `workflow_dispatch` from someone with write access. Forks cannot trigger it.
- The `concurrency` group prevents two simultaneous runs from racing on the tracking table.
- Each file applies in a single Postgres transaction. A failure rolls the file back; partial-apply states are not possible.

## Related

- 28 Apr 2026 — task #77, marketplace-escrow tables missing in prod (the file existed in the repo but had never been applied). Fix that motivated this work.
- 28 Apr 2026 — task #78, likes constraint missing the new post types. Same root cause.
- `docs/runbooks/supabase-advisor-known-issues.md` — accepted-known advisor warnings, includes the migration-tracking-gap section that this runbook supersedes for forward-going work.

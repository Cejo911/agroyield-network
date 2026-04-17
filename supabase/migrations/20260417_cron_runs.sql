-- Cron runs table: audit trail + idempotency guard for scheduled jobs.
-- Every cron execution logs here: when it started, when it finished, status,
-- counts of what was processed, and any error details.
--
-- The idempotency_key column + unique index prevent double-execution when
-- Vercel retries a cron invocation. For a weekly job, the key is the ISO
-- week (e.g. "2026-W16"); for daily, the date; etc.

create table if not exists public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  idempotency_key text,
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed', 'skipped')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  processed_count integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Unique idempotency per job+key combination
create unique index if not exists cron_runs_job_idempotency_idx
  on public.cron_runs (job_name, idempotency_key)
  where idempotency_key is not null;

-- Index for dashboard queries (recent runs by job)
create index if not exists cron_runs_job_started_idx
  on public.cron_runs (job_name, started_at desc);

comment on table public.cron_runs is
  'Audit trail and idempotency guard for scheduled cron jobs.';
comment on column public.cron_runs.idempotency_key is
  'Unique key within a run window (e.g., 2026-W16 for weekly, 2026-04-17 for daily).';
comment on column public.cron_runs.status is
  'running=in progress, succeeded=ok, failed=errored, skipped=duplicate detected.';

-- RLS: only service role can read/write. No user-facing access.
alter table public.cron_runs enable row level security;

-- No user-level policies = only service role bypasses RLS.
-- Admins view via Supabase dashboard → Table Editor.

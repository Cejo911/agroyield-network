/**
 * Cron run logger — writes execution metadata to the cron_runs table.
 *
 * startRun() registers a new run and returns the run ID (or null if a
 * duplicate was detected via idempotency_key unique index).
 *
 * finishRun() closes out a run with final status, duration, and counts.
 *
 * Most cron routes should use runCron() from ./runner instead of calling
 * these directly — those wrap startRun/finishRun around your handler.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'

export interface StartRunParams {
  jobName: string
  idempotencyKey?: string
  metadata?: Record<string, unknown>
}

export interface FinishRunParams {
  runId: string
  status: 'succeeded' | 'failed' | 'skipped'
  processedCount?: number
  successCount?: number
  failureCount?: number
  errorMessage?: string
  metadata?: Record<string, unknown>
}

/**
 * Register a new cron run.
 * Returns { runId } on success, or null if a run with this
 * (jobName, idempotencyKey) pair already exists (duplicate detected).
 *
 * Returns null on other DB errors too (fail-open for logging so the
 * cron itself can still run — missing logs are better than missed crons).
 */
export async function startRun(
  params: StartRunParams
): Promise<{ runId: string } | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('cron_runs')
    .insert({
      job_name: params.jobName,
      idempotency_key: params.idempotencyKey ?? null,
      status: 'running',
      metadata: params.metadata ?? {},
    })
    .select('id')
    .single()

  if (error) {
    // Postgres unique_violation = duplicate idempotency key
    if (error.code === '23505') {
      return null
    }
    console.error('[cron] startRun failed:', error)
    return null
  }

  return { runId: data.id as string }
}

/**
 * Close out a cron run with final status and metrics.
 * Calculates duration_ms by reading back started_at.
 */
export async function finishRun(params: FinishRunParams): Promise<void> {
  const supabase = getSupabaseAdmin()

  const { data: existing } = await supabase
    .from('cron_runs')
    .select('started_at')
    .eq('id', params.runId)
    .single()

  const durationMs = existing?.started_at
    ? Date.now() - new Date(existing.started_at as string).getTime()
    : null

  const { error } = await supabase
    .from('cron_runs')
    .update({
      status: params.status,
      finished_at: new Date().toISOString(),
      duration_ms: durationMs,
      processed_count: params.processedCount ?? 0,
      success_count: params.successCount ?? 0,
      failure_count: params.failureCount ?? 0,
      error_message: params.errorMessage ?? null,
      metadata: params.metadata ?? {},
    })
    .eq('id', params.runId)

  if (error) {
    console.error('[cron] finishRun failed:', error)
  }
}

/**
 * High-level cron runner — wraps auth + idempotency + logging into one call.
 *
 * Example usage in a route:
 *
 *   import { runCron, weeklyKey } from '@/lib/cron'
 *
 *   export async function GET(request: Request) {
 *     return runCron(request, {
 *       jobName: 'business_weekly_digest',
 *       idempotencyKey: weeklyKey(),
 *       handler: async () => {
 *         // ... do the work ...
 *         return { processedCount: 42, successCount: 40, failureCount: 2 }
 *       },
 *     })
 *   }
 *
 * The runner handles:
 *   - CRON_SECRET auth (401 if missing/wrong)
 *   - Registering the run in cron_runs (skipped 200 if duplicate)
 *   - Calling the handler
 *   - Logging final status + duration + counts
 *   - Returning a consistent JSON response shape
 *
 * Existing crons (celebrations, expire-*, weekly-digest, expiry-reminder)
 * are untouched — they keep their own inline auth checks.
 */

import { NextResponse } from 'next/server'
import { verifyCronAuth } from './auth'
import { startRun, finishRun } from './logger'

export interface CronResult {
  processedCount?: number
  successCount?: number
  failureCount?: number
  metadata?: Record<string, unknown>
}

export interface RunCronOptions {
  jobName: string
  idempotencyKey?: string
  handler: () => Promise<CronResult>
}

export async function runCron(
  request: Request,
  options: RunCronOptions
): Promise<NextResponse> {
  // 1. Auth gate
  const authError = verifyCronAuth(request)
  if (authError) return authError

  // 2. Register run (also acts as idempotency guard)
  const run = await startRun({
    jobName: options.jobName,
    idempotencyKey: options.idempotencyKey,
  })

  if (!run) {
    return NextResponse.json(
      {
        skipped: true,
        reason: 'Duplicate run detected or log write failed',
        jobName: options.jobName,
        idempotencyKey: options.idempotencyKey,
      },
      { status: 200 }
    )
  }

  // 3. Execute handler with full try/catch
  try {
    const result = await options.handler()

    await finishRun({
      runId: run.runId,
      status: 'succeeded',
      processedCount: result.processedCount ?? 0,
      successCount: result.successCount ?? 0,
      failureCount: result.failureCount ?? 0,
      metadata: result.metadata,
    })

    return NextResponse.json({
      success: true,
      jobName: options.jobName,
      runId: run.runId,
      ...result,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown cron error'

    await finishRun({
      runId: run.runId,
      status: 'failed',
      errorMessage: message,
    })

    console.error(`[cron:${options.jobName}] failed:`, err)

    return NextResponse.json(
      {
        success: false,
        jobName: options.jobName,
        error: message,
      },
      { status: 500 }
    )
  }
}

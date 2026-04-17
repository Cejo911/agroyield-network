/**
 * Cron harness barrel — one import point for all cron helpers.
 *
 * Usage in a route:
 *
 *   import { runCron, weeklyKey } from '@/lib/cron'
 *
 *   export async function GET(request: Request) {
 *     return runCron(request, {
 *       jobName: 'business_weekly_digest',
 *       idempotencyKey: weeklyKey(),
 *       handler: async () => {
 *         // ... work ...
 *         return { processedCount: 10, successCount: 9, failureCount: 1 }
 *       },
 *     })
 *   }
 *
 * Lower-level pieces (verifyCronAuth, startRun, finishRun) are exported too
 * for routes that need custom flow control — but prefer runCron() by default.
 */

export { runCron } from './runner'
export type { CronResult, RunCronOptions } from './runner'

export { verifyCronAuth } from './auth'

export { startRun, finishRun } from './logger'
export type { StartRunParams, FinishRunParams } from './logger'

export { dailyKey, weeklyKey, hourlyKey, monthlyKey } from './idempotency'

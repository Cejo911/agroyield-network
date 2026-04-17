/**
 * Idempotency key helpers for cron jobs.
 *
 * Use these to build unique keys that prevent double-execution
 * when Vercel retries a cron invocation.
 */

/**
 * Daily key — e.g., "2026-04-17".
 * Use for daily cron jobs.
 */
export function dailyKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

/**
 * ISO week key — e.g., "2026-W16".
 * Use for weekly cron jobs. ISO week starts Monday.
 */
export function weeklyKey(date: Date = new Date()): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  )
  // Thursday in current week decides the year (ISO 8601 rule)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  )
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

/**
 * Hourly key — e.g., "2026-04-17T14".
 * Use for hourly cron jobs.
 */
export function hourlyKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 13)
}

/**
 * Monthly key — e.g., "2026-04".
 * Use for monthly cron jobs.
 */
export function monthlyKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 7)
}

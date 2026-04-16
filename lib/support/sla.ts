/**
 * SLA configuration for support ticket management.
 * Defines response and resolution time targets by priority level.
 */

/**
 * SLA deadlines by priority level.
 * Returns the number of hours allowed for resolution.
 */
export const SLA_HOURS: Record<string, number> = {
  low: 72,
  medium: 48,
  high: 24,
  urgent: 4,
}

/**
 * Calculate SLA deadline from now based on priority.
 * Returns an ISO 8601 timestamp representing when the ticket
 * must be resolved by to meet SLA.
 */
export function getSlaDeadline(priority: string): string {
  const hours = SLA_HOURS[priority] ?? SLA_HOURS.medium
  return new Date(Date.now() + hours * 3600000).toISOString()
}

/**
 * Check if a ticket is past its SLA deadline.
 * Returns true if the deadline has passed, false otherwise.
 */
export function isSlaBreached(slaDeadline: string | null): boolean {
  if (!slaDeadline) return false
  return new Date(slaDeadline) < new Date()
}

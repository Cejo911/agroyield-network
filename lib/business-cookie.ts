/**
 * Active Business Cookie Helpers
 *
 * Stores the currently selected business ID in a cookie so it persists
 * across page navigations and works in both server and client components.
 *
 * Cookie name: active_biz_id
 * Max age: 1 year (refreshed on every switch)
 */

const COOKIE_NAME = 'active_biz_id'
const MAX_AGE = 60 * 60 * 24 * 365 // 1 year in seconds

/**
 * Read the active business ID from document.cookie (client-side only).
 * Returns null if not set or if running on the server.
 */
export function getActiveBusinessId(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Set the active business ID cookie (client-side only).
 * Uses path=/ so it's readable by all routes, including server components.
 */
export function setActiveBusinessId(id: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(id)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`
}

/**
 * Clear the active business cookie (client-side only).
 */
export function clearActiveBusinessId(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`
}

// Client-safe URL validation for <a href> attributes.
// Prevents javascript: protocol XSS when rendering user-provided URLs.

/**
 * Returns a safe href for user-provided URLs.
 * Blocks javascript:, data:, vbscript: and other dangerous protocols.
 * Auto-prepends https:// for bare domains (e.g. "linkedin.com/in/john").
 * Returns empty string for invalid/dangerous URLs.
 */
export function safeHref(url: string | null | undefined): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed
    }
    return ''
  } catch {
    // Bare domains like "linkedin.com/in/john" — prepend https://
    if (/^[a-z0-9]/i.test(trimmed) && !trimmed.includes(':')) {
      return `https://${trimmed}`
    }
    return ''
  }
}

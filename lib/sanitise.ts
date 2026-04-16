// Security utilities for input sanitisation.
// Used across API routes and UI components to prevent XSS and injection.

/**
 * Strip all HTML tags from a string. Useful for free-text fields
 * (titles, descriptions, bios, messages) before writing to the DB.
 *
 * Preserves the text content — only removes the tags themselves.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '')
}

/**
 * Sanitise a text field: trim whitespace + strip HTML tags.
 * Returns null if the result is empty or input is nullish.
 */
export function sanitiseText(input: string | null | undefined): string | null {
  if (!input) return null
  const cleaned = stripHtml(input).trim()
  return cleaned || null
}

/**
 * Escape HTML entities so user input can be safely embedded
 * in HTML templates (e.g. email bodies). Prevents tag injection
 * while preserving the visible text.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Validate a URL and ensure it uses a safe protocol (http/https only).
 * Returns the original URL if safe, or an empty string if not.
 *
 * Use this before rendering user-provided URLs in <a href="...">.
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
    // If the URL doesn't parse (e.g. "linkedin.com/in/john"), prepend https://
    if (/^[a-z0-9]/i.test(trimmed) && !trimmed.includes(':')) {
      return `https://${trimmed}`
    }
    return ''
  }
}

/**
 * Sanitise a URL field for DB storage: trim, validate protocol,
 * strip any embedded HTML. Returns null if invalid.
 */
export function sanitiseUrl(input: string | null | undefined): string | null {
  if (!input) return null
  const cleaned = stripHtml(input).trim()
  if (!cleaned) return null
  const safe = safeHref(cleaned)
  return safe || null
}

/**
 * Shared phone number normalization utilities for Nigerian messaging providers.
 *
 * Handles the four input formats we see in production:
 *   - "+2348012345678"  (E.164)
 *   - "2348012345678"   (digits only, with country code)
 *   - "08012345678"     (local Nigerian format — most common user input)
 *   - "8012345678"      (bare digits, no leading zero, no country code)
 *
 * Also strips spaces, dashes, parens before parsing.
 *
 * Providers pick their preferred output:
 *   - E.164 format (+234...) — 360Dialog, WhatsApp Cloud API
 *   - Digits only (234...)   — Termii SMS + WhatsApp APIs
 */

const NIGERIA_COUNTRY_CODE = '234'

/**
 * Normalise any Nigerian phone input to E.164 format.
 *   "08012345678"      → "+2348012345678"
 *   "2348012345678"    → "+2348012345678"
 *   "+234 801 234..."  → "+2348012345678"
 * Throws if input is empty or can't be reasonably interpreted as Nigerian.
 */
export function normalizeToE164Nigerian(raw: string): string {
  const trimmed = (raw || '').trim()
  if (!trimmed) throw new Error('Phone number is empty')

  // Strip everything that isn't a digit or a leading +
  const cleaned = trimmed.replace(/[^\d+]/g, '')
  if (!cleaned) throw new Error(`Phone contains no digits: "${raw}"`)

  // Already E.164 — trust it, but sanity-check length
  if (cleaned.startsWith('+')) {
    if (cleaned.length < 12) {
      throw new Error(`Phone too short for Nigerian E.164: "${raw}"`)
    }
    return cleaned
  }

  // Digits only with Nigerian country code
  if (cleaned.startsWith(NIGERIA_COUNTRY_CODE)) {
    return `+${cleaned}`
  }

  // Local Nigerian format with leading zero
  if (cleaned.startsWith('0')) {
    return `+${NIGERIA_COUNTRY_CODE}${cleaned.slice(1)}`
  }

  // Bare 10-digit (no leading 0, no country code) — assume Nigerian
  if (cleaned.length === 10) {
    return `+${NIGERIA_COUNTRY_CODE}${cleaned}`
  }

  throw new Error(`Cannot interpret "${raw}" as a Nigerian phone number`)
}

/**
 * Convenience wrapper: normalise to E.164 then strip the leading +
 * for providers (Termii) that want digits only.
 *   "08012345678" → "2348012345678"
 */
export function toTermiiDigits(raw: string): string {
  return normalizeToE164Nigerian(raw).slice(1)
}

/**
 * Split a user-supplied string of phone numbers into trimmed candidates.
 *
 * Admins pasting numbers don't follow one format — we see commas, semicolons,
 * newlines (when copying from a spreadsheet column), and sometimes stray
 * spaces between a country code and the rest of the number. We split on the
 * separators that clearly delimit *distinct* numbers, but we DO NOT split on
 * whitespace alone because a single number often has internal spaces
 * ("+234 801 234 5678"). normalizeToE164Nigerian strips intra-number spaces,
 * so leaving them in is safe.
 *
 * Duplicates and empty entries are removed. Preserves input order.
 */
export function splitPhoneCandidates(raw: string): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  const out: string[] = []
  // Split on commas, semicolons, or newlines (including \r\n). Tabs too —
  // Excel pastes use \t between columns.
  for (const chunk of raw.split(/[,;\n\r\t]+/)) {
    const trimmed = chunk.trim()
    if (!trimmed) continue
    if (seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

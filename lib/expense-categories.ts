/**
 * Admin-controllable expense category labels.
 *
 * Used in two places:
 *   (1) The Vision prompt in /api/expense-ocr — the model is told to return
 *       `suggested_category` as one of these strings.
 *   (2) The expenses page UI — filter dropdown, picker, category breakdown.
 *
 * Before 19 Apr 2026 the list was hardcoded in both places and a comment
 * warned to "keep in sync" — classic drift trap. Moved to
 * `settings.expense_categories` (seeded in 20260419_admin_controllable_settings.sql)
 * so the founder can curate labels from the Admin Dashboard.
 *
 * Pattern mirrors lib/feature-flags.ts + lib/usage-tracking.ts:
 *   - 60s in-process cache keyed by the settings row
 *   - fail-open to SAFE_DEFAULTS if the read fails
 *   - server-only (service-role client)
 *
 * For CLIENT components that need this list (e.g. app/business/expenses/page.tsx
 * which is `'use client'`) go via GET /api/content-types — exposing the
 * server-only helper directly would pull the supabase admin client into the
 * browser bundle.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * Fallback labels used when the settings read fails. Keep in sync with the
 * INSERT in 20260419_admin_controllable_settings.sql so the first deploy is
 * byte-identical to pre-migration behaviour.
 *
 * Order matters — the first entry is the default selection in the expenses
 * picker. "Input Costs" leads because it's the most-frequent category for
 * Nigerian smallholder farmers (verified in Week 2 user interviews; see
 * ROADMAP scratchpad #38).
 */
export const SAFE_DEFAULT_EXPENSE_CATEGORIES: readonly string[] = [
  'Input Costs',
  'Transport & Logistics',
  'Labour & Wages',
  'Market Fees & Commissions',
  'Equipment & Maintenance',
  'Rent & Storage',
  'Utilities',
  'Marketing & Advertising',
  'Professional Services',
  'Other',
] as const

const SETTINGS_KEY = 'expense_categories'
const CACHE_TTL_MS = 60 * 1000

let cached: { list: string[]; fetchedAt: number } | null = null

/**
 * Read the admin-configured expense category list. Returns a fresh copy so
 * callers can mutate safely. Never throws — falls back to
 * SAFE_DEFAULT_EXPENSE_CATEGORIES on any error.
 */
export async function getExpenseCategories(): Promise<string[]> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return [...cached.list]
  }

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()

    if (error || !data) {
      const fallback = [...SAFE_DEFAULT_EXPENSE_CATEGORIES]
      cached = { list: fallback, fetchedAt: Date.now() }
      return [...fallback]
    }

    const raw = (data as { value: unknown }).value
    const parsed = parseList(raw)
    cached = { list: parsed, fetchedAt: Date.now() }
    return [...parsed]
  } catch {
    const fallback = [...SAFE_DEFAULT_EXPENSE_CATEGORIES]
    cached = { list: fallback, fetchedAt: Date.now() }
    return [...fallback]
  }
}

/**
 * Accepts either a JSON-stringified array (how saveSettings stores lists),
 * a native array already parsed by PostgREST, or a comma-separated fallback
 * string. Returns non-empty trimmed strings only; if the list ends up empty
 * falls back to SAFE_DEFAULT_EXPENSE_CATEGORIES.
 */
function parseList(raw: unknown): string[] {
  // Native array (PostgREST returned JSON → JS array)
  if (Array.isArray(raw)) {
    const cleaned = raw.map((x) => String(x).trim()).filter(Boolean)
    return cleaned.length ? cleaned : [...SAFE_DEFAULT_EXPENSE_CATEGORIES]
  }

  if (typeof raw === 'string' && raw.length > 0) {
    // Try JSON first (this is the admin-save path)
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const cleaned = parsed.map((x) => String(x).trim()).filter(Boolean)
        return cleaned.length ? cleaned : [...SAFE_DEFAULT_EXPENSE_CATEGORIES]
      }
    } catch {
      /* not JSON — fall through */
    }
    // Fallback: comma-separated (legacy manual seeds)
    const cleaned = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (cleaned.length) return cleaned
  }

  return [...SAFE_DEFAULT_EXPENSE_CATEGORIES]
}

/**
 * Test-only: clear the category cache. Do not call in production code.
 */
export function __clearExpenseCategoriesCache(): void {
  cached = null
}

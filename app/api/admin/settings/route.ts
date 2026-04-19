import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logAdminAction } from '@/lib/admin/audit-log'

/**
 * Per-key validators for settings values that have a strict shape.
 *
 * Rationale (scratchpad #18 — "Dynamic Settings Are a Schema Debt Trap"):
 * the settings table is `(key text, value text)` so Postgres can't enforce
 * shape on the JSON blobs we store here. If we save a malformed value the
 * reader falls back to SAFE_DEFAULTS silently — the admin thinks the edit
 * worked, but enforcement is actually unchanged. Validating at write time
 * is the cheapest way to close that loop.
 *
 * A validator returns a string with the reason if the value is invalid,
 * or null if the value is OK. Unknown keys skip validation.
 */
function validateValue(key: string, rawValue: string): string | null {
  if (key === 'usage_limits') {
    let parsed: unknown
    try { parsed = JSON.parse(rawValue) } catch { return 'usage_limits must be valid JSON' }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return 'usage_limits must be an object keyed by feature'
    }
    const features = ['expense_ocr', 'ai_assistant'] as const
    const tiers = ['free', 'pro', 'growth'] as const
    const src = parsed as Record<string, unknown>
    for (const feature of features) {
      const inner = src[feature]
      if (!inner || typeof inner !== 'object' || Array.isArray(inner)) {
        return `usage_limits.${feature} must be an object with free/pro/growth keys`
      }
      const innerObj = inner as Record<string, unknown>
      for (const tier of tiers) {
        const v = innerObj[tier]
        if (v === null) continue
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1_000_000) {
          return `usage_limits.${feature}.${tier} must be null (unlimited) or a non-negative integer`
        }
        if (!Number.isInteger(v)) {
          return `usage_limits.${feature}.${tier} must be an integer`
        }
      }
    }
    return null
  }

  if (key === 'expense_categories') {
    let parsed: unknown
    try { parsed = JSON.parse(rawValue) } catch { return 'expense_categories must be valid JSON' }
    if (!Array.isArray(parsed)) return 'expense_categories must be a JSON array'
    if (parsed.length === 0) return 'expense_categories must contain at least one category'
    if (parsed.length > 30) return 'expense_categories must contain at most 30 entries'
    const seen = new Set<string>()
    for (const entry of parsed) {
      if (typeof entry !== 'string') return 'expense_categories entries must be strings'
      const trimmed = entry.trim()
      if (trimmed.length < 1 || trimmed.length > 32) {
        return `expense_categories entries must be 1–32 characters (got "${entry}")`
      }
      const lower = trimmed.toLowerCase()
      if (seen.has(lower)) return `expense_categories has a duplicate entry: "${entry}"`
      seen.add(lower)
    }
    return null
  }

  // expense_ocr_vision_model — string allowlist. Mirrors ALLOWED_VISION_MODELS
  // in lib/usage-tracking.ts (defence-in-depth: client UI is also restricted
  // to the same dropdown). Accepts either a JSON-quoted string ("haiku...")
  // or a bare string (haiku...) so the admin form can submit either shape
  // without fragility — the read path normalises both.
  if (key === 'expense_ocr_vision_model') {
    const allowed = new Set([
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-6',
      'claude-opus-4-6',
    ])
    let candidate = rawValue.trim()
    if (candidate.startsWith('"') && candidate.endsWith('"')) {
      try { candidate = JSON.parse(candidate) as string } catch { /* keep raw */ }
    }
    if (typeof candidate !== 'string' || !allowed.has(candidate)) {
      return `expense_ocr_vision_model must be one of: ${[...allowed].join(', ')}`
    }
    return null
  }

  // recurring_template_cap — integer in [1, 1000]. Mirrors RECURRING_CAP_MIN
  // / RECURRING_CAP_MAX in lib/recurring-limits.ts. The lower bound (1) lets
  // an admin tighten the cap to effectively disable recurring for a tenant
  // without a code path; the upper bound (1000) is a hard ceiling so a typo
  // can't remove the wallet-drain guardrail.
  if (key === 'recurring_template_cap') {
    const n = Number(rawValue.trim())
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      return 'recurring_template_cap must be an integer'
    }
    if (n < 1 || n > 1000) {
      return 'recurring_template_cap must be between 1 and 1000'
    }
    return null
  }

  return null
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAny
      .from('profiles').select('is_admin, admin_role').eq('id', user.id).single()
    const adminProfile = profile as Record<string, unknown> | null
    if (!adminProfile?.is_admin || adminProfile?.admin_role !== 'super') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updates = await request.json() as Record<string, string>

    // Shape-validate before any write so admin sees a clear 400 rather than
    // a partial save + silent fallback-to-defaults at read time.
    const validationErrors: string[] = []
    for (const [key, value] of Object.entries(updates)) {
      const err = validateValue(key, value)
      if (err) validationErrors.push(err)
    }
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join('; ') },
        { status: 400 },
      )
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = adminClient as any

    const errors: string[] = []

    for (const [key, value] of Object.entries(updates)) {
      const { error } = await adminAny
        .from('settings')
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        )
      if (error) errors.push(`${key}: ${error.message}`)
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 500 })
    }

    await logAdminAction({
      adminId: user.id,
      action: 'settings.update',
      targetType: 'settings',
      details: { keys: Object.keys(updates) },
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

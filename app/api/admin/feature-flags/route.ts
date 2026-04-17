import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logAdminAction } from '@/lib/admin/audit-log'

/**
 * Feature flags admin API.
 *
 * GET    — list all flags (super admin only)
 * PATCH  — update a single flag by key (super admin only)
 *
 * Runtime reads go through lib/feature-flags.ts, which caches for 60s.
 * That means writes here will propagate within one minute to all servers.
 */

interface FlagUpdate {
  key: string
  is_enabled?: boolean
  rollout_percentage?: number
  enabled_for_users?: string[]
  enabled_for_businesses?: string[]
  description?: string | null
}

async function requireSuperAdmin() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const, user: null }

  const { data: profile } = await supabaseAny
    .from('profiles').select('is_admin, admin_role').eq('id', user.id).single()
  const p = profile as Record<string, unknown> | null
  if (!p?.is_admin || p.admin_role !== 'super') {
    return { error: 'Forbidden — super admin only', status: 403 as const, user: null }
  }
  return { error: null, status: 200 as const, user }
}

function getAdminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const auth = await requireSuperAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const adminDb = getAdminDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = adminDb as any

  const { data, error } = await adminAny
    .from('feature_flags')
    .select('key, description, is_enabled, enabled_for_users, enabled_for_businesses, rollout_percentage, updated_at')
    .order('key', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ flags: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin()
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json() as FlagUpdate
    if (!body.key || typeof body.key !== 'string') {
      return NextResponse.json({ error: 'Missing flag key' }, { status: 400 })
    }

    // Build update payload with only the fields provided
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (typeof body.is_enabled === 'boolean')         update.is_enabled = body.is_enabled
    if (typeof body.description === 'string' || body.description === null) {
      update.description = body.description
    }
    if (typeof body.rollout_percentage === 'number') {
      const p = Math.max(0, Math.min(100, Math.round(body.rollout_percentage)))
      update.rollout_percentage = p
    }
    if (Array.isArray(body.enabled_for_users)) {
      update.enabled_for_users = body.enabled_for_users.filter(
        (x) => typeof x === 'string' && x.length > 0
      )
    }
    if (Array.isArray(body.enabled_for_businesses)) {
      update.enabled_for_businesses = body.enabled_for_businesses.filter(
        (x) => typeof x === 'string' && x.length > 0
      )
    }

    const adminDb = getAdminDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = adminDb as any

    const { data, error } = await adminAny
      .from('feature_flags')
      .update(update)
      .eq('key', body.key)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Flag not found' }, { status: 404 })

    await logAdminAction({
      adminId: auth.user!.id,
      action: 'feature_flag.update',
      targetType: 'feature_flag',
      targetId: body.key,
      details: {
        key: body.key,
        changed_fields: Object.keys(update).filter(k => k !== 'updated_at'),
        is_enabled: update.is_enabled,
        rollout_percentage: update.rollout_percentage,
      },
    })

    return NextResponse.json({ ok: true, flag: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

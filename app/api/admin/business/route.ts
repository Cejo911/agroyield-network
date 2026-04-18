import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logAdminAction } from '@/lib/admin/audit-log'

/**
 * PATCH /api/admin/business
 *
 * Admin-only toggle for the `is_verified` flag on a business, which controls
 * the "Verified ✓" chip rendered next to the business name on /b/{slug}.
 *
 * Mirrors the `verify_institution` action in /api/admin/member/route.ts:
 *   - Gated on base `is_admin` (any admin — super or moderator — can verify).
 *   - Uses the service-role admin client to bypass RLS.
 *   - Writes an entry to admin_audit_log on success.
 *
 * Body: { businessId: string, action: 'verify' | 'unverify' }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAny
      .from('profiles').select('is_admin').eq('id', user.id).single()
    const adminProfile = profile as Record<string, unknown> | null
    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { businessId, action } = await request.json() as {
      businessId: string
      action: 'verify' | 'unverify'
    }

    if (!businessId || typeof businessId !== 'string') {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 })
    }
    if (action !== 'verify' && action !== 'unverify') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = adminClient as any

    if (action === 'verify') {
      const { error } = await adminAny.from('businesses').update({
        is_verified: true,
        verified_at: new Date().toISOString(),
      }).eq('id', businessId)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      const { error } = await adminAny.from('businesses').update({
        is_verified: false,
        verified_at: null,
      }).eq('id', businessId)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    await logAdminAction({
      adminId: user.id,
      action: `business.${action}`,
      targetType: 'business',
      targetId: businessId,
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

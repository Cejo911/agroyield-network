import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logAdminAction } from '@/lib/admin/audit-log'

/**
 * PATCH /api/admin/business-review
 *
 * Admin moderation of a business review: hide (publish=false) or restore
 * (publish=true). Mirrors the pattern of /api/admin/member and
 * /api/admin/business: base is_admin gate, service-role write, audit log.
 *
 * Moderators need the `reports` permission (reviews are moderated via the
 * Reports tab); super admins bypass. This route is NOT the one that auto-hides
 * a review on threshold — that still happens inside /api/report's POST.
 *
 * Body: { reviewId: string, action: 'hide' | 'restore' }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAny
      .from('profiles').select('is_admin, admin_role, admin_permissions').eq('id', user.id).single()
    const adminProfile = profile as Record<string, unknown> | null
    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Moderators need `reports` permission; super admin bypasses.
    if (adminProfile.admin_role !== 'super') {
      const perms = adminProfile.admin_permissions as Record<string, boolean> | null
      if (!perms?.reports) {
        return NextResponse.json({ error: 'No permission for review moderation' }, { status: 403 })
      }
    }

    const { reviewId, action } = await request.json() as {
      reviewId: string
      action:   'hide' | 'restore'
    }
    if (!reviewId || typeof reviewId !== 'string') {
      return NextResponse.json({ error: 'reviewId required' }, { status: 400 })
    }
    if (action !== 'hide' && action !== 'restore') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = adminClient as any

    const { error } = await adminAny.from('business_reviews').update({
      published: action === 'restore',
    }).eq('id', reviewId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAdminAction({
      adminId: user.id,
      action: `business_review.${action}`,
      targetType: 'business_review',
      targetId: reviewId,
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

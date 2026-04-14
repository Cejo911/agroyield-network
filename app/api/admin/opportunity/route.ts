import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/admin/audit-log'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAny
      .from('profiles').select('is_admin, admin_role, admin_permissions').eq('id', user.id).single()
    const p = profile as Record<string, unknown> | null
    if (!p?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Permission check for moderators
    if (p.admin_role !== 'super') {
      const perms = p.admin_permissions as Record<string, boolean> | null
      if (!perms?.opportunities) return NextResponse.json({ error: 'No permission' }, { status: 403 })
    }

    const { id, is_active, is_pending_review } = await request.json()

    const updateData: Record<string, unknown> = { is_active }
    if (typeof is_pending_review === 'boolean') updateData.is_pending_review = is_pending_review

    const { error } = await supabaseAny
      .from('opportunities')
      .update(updateData)
      .eq('id', id)

    if (error) throw error

    const action = is_pending_review === false && is_active ? 'approve' : is_pending_review === false ? 'decline' : is_active ? 'show' : 'hide'
    await logAdminAction({ adminId: user.id, action: `opportunity.${action}`, targetType: 'opportunity', targetId: id })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

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

    if (p.admin_role !== 'super') {
      const perms = p.admin_permissions as Record<string, boolean> | null
      if (!perms?.grants) return NextResponse.json({ error: 'No permission' }, { status: 403 })
    }

    const { id, featured, status } = await request.json()

    const updateData: Record<string, unknown> = {}
    if (typeof featured === 'boolean') updateData.featured = featured
    if (typeof status === 'string') updateData.status = status

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { error } = await supabaseAny
      .from('grants')
      .update(updateData)
      .eq('id', id)

    if (error) throw error

    const action = typeof featured === 'boolean' ? (featured ? 'feature' : 'unfeature') : `status_${status}`
    await logAdminAction({ adminId: user.id, action: `grant.${action}`, targetType: 'grant', targetId: id })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

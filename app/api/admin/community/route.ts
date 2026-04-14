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
      if (!perms?.community) return NextResponse.json({ error: 'No permission' }, { status: 403 })
    }

    const { id, action: postAction } = await request.json() as {
      id: string
      action: 'hide' | 'show' | 'pin' | 'unpin' | 'delete'
    }

    if (postAction === 'hide') {
      await supabaseAny.from('community_posts').update({ is_active: false }).eq('id', id)
    } else if (postAction === 'show') {
      await supabaseAny.from('community_posts').update({ is_active: true }).eq('id', id)
    } else if (postAction === 'pin') {
      await supabaseAny.from('community_posts').update({ is_pinned: true }).eq('id', id)
    } else if (postAction === 'unpin') {
      await supabaseAny.from('community_posts').update({ is_pinned: false }).eq('id', id)
    } else if (postAction === 'delete') {
      // Soft delete — mark inactive and clear content
      await supabaseAny.from('community_posts').update({
        is_active: false,
        content: '[Removed by admin]',
      }).eq('id', id)
    }

    await logAdminAction({ adminId: user.id, action: `community.${postAction}`, targetType: 'community_post', targetId: id })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
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
      if (!perms?.comments) return NextResponse.json({ error: 'No permission' }, { status: 403 })
    }

    const { id, action: commentAction } = await request.json() as {
      id: string
      action: 'hide' | 'show' | 'delete'
    }

    // Use service role to bypass RLS on comments
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = adminClient as any

    if (commentAction === 'hide') {
      await adminAny.from('comments').update({ is_hidden: true }).eq('id', id)
    } else if (commentAction === 'show') {
      await adminAny.from('comments').update({ is_hidden: false }).eq('id', id)
    } else if (commentAction === 'delete') {
      await adminAny.from('comments').update({
        is_hidden: true,
        content: '[Removed by admin]',
      }).eq('id', id)
    }

    await logAdminAction({ adminId: user.id, action: `comment.${commentAction}`, targetType: 'comment', targetId: id })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

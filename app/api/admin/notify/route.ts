import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logAdminAction } from '@/lib/admin/audit-log'

export async function POST(request: NextRequest) {
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
      if (!perms?.notifications) return NextResponse.json({ error: 'No permission' }, { status: 403 })
    }

    const { message, link, targetUserId } = await request.json() as {
      message: string
      link?: string
      targetUserId?: string // If set, send to specific user. Otherwise broadcast to all.
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = adminClient as any

    if (targetUserId) {
      // Send to specific user
      await adminAny.from('notifications').insert({
        user_id: targetUserId,
        type: 'system',
        message: message.trim(),
        link: link?.trim() || null,
      })
    } else {
      // Broadcast to all active, non-suspended users
      const { data: users } = await adminAny
        .from('profiles')
        .select('id')
        .eq('is_suspended', false)

      if (users?.length) {
        const notifications = (users as { id: string }[]).map(u => ({
          user_id: u.id,
          type: 'system',
          message: message.trim(),
          link: link?.trim() || null,
        }))

        // Batch insert in chunks of 500
        for (let i = 0; i < notifications.length; i += 500) {
          await adminAny.from('notifications').insert(notifications.slice(i, i + 500))
        }
      }
    }

    await logAdminAction({
      adminId: user.id,
      action: targetUserId ? 'notify.user' : 'notify.broadcast',
      targetType: 'notification',
      targetId: targetUserId || 'all',
      details: { message: message.trim().substring(0, 100) },
    })

    return NextResponse.json({ success: true, count: targetUserId ? 1 : 'all' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

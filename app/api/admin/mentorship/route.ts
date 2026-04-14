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
      if (!perms?.mentorship) return NextResponse.json({ error: 'No permission' }, { status: 403 })
    }

    const { id, targetType, action: mentorAction } = await request.json() as {
      id: string
      targetType: 'mentor' | 'request' | 'session'
      action: 'deactivate' | 'reactivate' | 'cancel'
    }

    // Use service role to bypass RLS
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = adminClient as any

    if (targetType === 'mentor') {
      if (mentorAction === 'deactivate') {
        await adminAny.from('mentor_profiles').update({ availability: 'Closed' }).eq('id', id)
      } else if (mentorAction === 'reactivate') {
        await adminAny.from('mentor_profiles').update({ availability: 'Open' }).eq('id', id)
      }
    } else if (targetType === 'request') {
      if (mentorAction === 'cancel') {
        await adminAny.from('mentorship_requests').update({ status: 'declined' }).eq('id', id)
      }
    } else if (targetType === 'session') {
      if (mentorAction === 'cancel') {
        await adminAny.from('mentorship_sessions').update({ status: 'cancelled' }).eq('id', id)
      }
    }

    await logAdminAction({
      adminId: user.id,
      action: `mentorship.${targetType}.${mentorAction}`,
      targetType: `mentorship_${targetType}`,
      targetId: id,
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logAdminAction } from '@/lib/admin/audit-log'
import { DEFAULT_MODERATOR_PERMISSIONS } from '@/lib/admin/permissions'

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
    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, action, permissions } = await request.json() as {
      userId: string
      action:
        | 'suspend' | 'unsuspend'
        | 'verify'  | 'unverify'
        | 'elite'   | 'unelite'
        | 'makesuper' | 'makemoderator' | 'removeadmin'
        | 'update_permissions'
      permissions?: Record<string, boolean>
    }

    // These actions require super admin
    const superOnly = ['verify', 'unverify', 'elite', 'unelite', 'makesuper', 'makemoderator', 'removeadmin', 'update_permissions']
    if (superOnly.includes(action) && adminProfile.admin_role !== 'super') {
      return NextResponse.json({ error: 'Forbidden — super admin only' }, { status: 403 })
    }

    // Moderators need 'members' permission for suspend/unsuspend
    if (['suspend', 'unsuspend'].includes(action) && adminProfile.admin_role !== 'super') {
      const { data: modProfile } = await supabaseAny
        .from('profiles').select('admin_permissions').eq('id', user.id).single()
      const perms = (modProfile as Record<string, unknown>)?.admin_permissions as Record<string, boolean> | null
      if (!perms?.members) {
        return NextResponse.json({ error: 'No permission for member management' }, { status: 403 })
      }
    }

    // Prevent super admin from removing their own admin status
    if (action === 'removeadmin' && userId === user.id) {
      return NextResponse.json({ error: 'Cannot remove your own admin status' }, { status: 400 })
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = adminClient as any

    if (action === 'suspend') {
      await adminAny.from('profiles').update({ is_suspended: true }).eq('id', userId)
      await adminClient.auth.admin.updateUserById(userId, { ban_duration: '87600h' })
    } else if (action === 'unsuspend') {
      await adminAny.from('profiles').update({ is_suspended: false }).eq('id', userId)
      await adminClient.auth.admin.updateUserById(userId, { ban_duration: 'none' })
    } else if (action === 'verify') {
      await adminAny.from('profiles').update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        subscription_plan: 'admin',
        subscription_expires_at: null,
      }).eq('id', userId)
    } else if (action === 'unverify') {
      await adminAny.from('profiles').update({
        is_verified: false,
        verified_at: null,
        subscription_plan: null,
        subscription_expires_at: null,
      }).eq('id', userId)
    } else if (action === 'elite') {
      await adminAny.from('profiles').update({
        is_elite: true,
        elite_granted_at: new Date().toISOString(),
      }).eq('id', userId)
    } else if (action === 'unelite') {
      await adminAny.from('profiles').update({
        is_elite: false,
        elite_granted_at: null,
      }).eq('id', userId)
    } else if (action === 'makesuper') {
      await adminAny.from('profiles').update({
        is_admin: true,
        admin_role: 'super',
        admin_permissions: null, // Super admins don't need permissions
      }).eq('id', userId)
    } else if (action === 'makemoderator') {
      await adminAny.from('profiles').update({
        is_admin: true,
        admin_role: 'moderator',
        admin_permissions: DEFAULT_MODERATOR_PERMISSIONS,
      }).eq('id', userId)
    } else if (action === 'removeadmin') {
      await adminAny.from('profiles').update({
        is_admin: false,
        admin_role: null,
        admin_permissions: null,
      }).eq('id', userId)
    } else if (action === 'update_permissions') {
      if (!permissions) {
        return NextResponse.json({ error: 'Permissions object required' }, { status: 400 })
      }
      await adminAny.from('profiles').update({
        admin_permissions: permissions,
      }).eq('id', userId)
    }

    // Audit log
    await logAdminAction({
      adminId: user.id,
      action: `member.${action}`,
      targetType: 'member',
      targetId: userId,
      details: action === 'update_permissions' ? { permissions } : {},
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAny
      .from('profiles').select('is_admin').eq('id', user.id).single()
    if (!(profile as Record<string, unknown>)?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, action } = await request.json() as {
      userId: string
      action: 'suspend' | 'unsuspend' | 'verify' | 'unverify' | 'elite' | 'unelite'
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
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

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
      .from('profiles').select('is_admin, admin_role').eq('id', user.id).single()
    const adminProfile = profile as Record<string, unknown> | null
    if (!adminProfile?.is_admin || adminProfile?.admin_role !== 'super') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updates = await request.json() as Record<string, string>

    // Use admin client to bypass RLS on the settings table
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = adminClient as any

    for (const [key, value] of Object.entries(updates)) {
      await adminAny
        .from('settings')
        .upsert({ key, value, updated_at: new Date().toISOString() })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

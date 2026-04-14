import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any
    const { data: profile } = await supabaseAny
      .from('profiles').select('is_admin').eq('id', user.id).single()
    if (!(profile as Record<string, unknown>)?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = adminClient as any

    const { data, error } = await adminAny
      .from('profiles')
      .select('id, first_name, last_name, email, username')
      .limit(3)

    return NextResponse.json({
      error: error?.message ?? null,
      count: data?.length ?? 0,
      sample: data?.slice(0, 3) ?? [],
      keys: data?.[0] ? Object.keys(data[0]) : [],
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

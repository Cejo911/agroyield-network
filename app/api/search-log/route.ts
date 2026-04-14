import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { query, module, results_count } = await req.json()

    // Basic validation
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return NextResponse.json({ ok: true }) // silently ignore very short queries
    }
    if (!module || typeof module !== 'string') {
      return NextResponse.json({ error: 'module required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any
    await supabaseAny.from('search_logs').insert({
      user_id: user?.id ?? null,
      query: query.trim().slice(0, 200), // cap at 200 chars
      module,
      results_count: typeof results_count === 'number' ? results_count : 0,
    })

    return NextResponse.json({ ok: true })
  } catch {
    // Search logging should never break the user experience
    return NextResponse.json({ ok: true })
  }
}

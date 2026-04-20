import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * /api/saves — polymorphic bookmark store
 *
 * POST   { content_type, content_id } → insert (idempotent; dup returns 200)
 * DELETE { content_type, content_id } → remove the user's save
 * GET    ?type=<type>                  → list the user's saves of that type
 *                                        (used by /saved aggregation page)
 *
 * RLS guarantees user_id = auth.uid() on every row, so we never have to
 * pass user_id in the body.
 */

const ALLOWED_TYPES = [
  'opportunity',
  'grant',
  'marketplace_listing',
  'research',
  'business',
] as const
type ContentType = typeof ALLOWED_TYPES[number]

function isValidType(t: unknown): t is ContentType {
  return typeof t === 'string' && (ALLOWED_TYPES as readonly string[]).includes(t)
}

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const content_type = body?.content_type
    const content_id   = body?.content_id
    if (!isValidType(content_type)) return NextResponse.json({ error: 'Invalid content_type' }, { status: 400 })
    if (!isUuid(content_id))        return NextResponse.json({ error: 'Invalid content_id' },   { status: 400 })

    // Upsert on the partial-unique (user_id, content_type, content_id) so
    // rapid double-taps are idempotent and we never error on existing saves.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('saves')
      .upsert(
        { user_id: user.id, content_type, content_id },
        { onConflict: 'user_id,content_type,content_id', ignoreDuplicates: true }
      )
    if (error) throw error

    return NextResponse.json({ saved: true })
  } catch (err: unknown) {
    console.error('Saves POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const content_type = body?.content_type
    const content_id   = body?.content_id
    if (!isValidType(content_type)) return NextResponse.json({ error: 'Invalid content_type' }, { status: 400 })
    if (!isUuid(content_id))        return NextResponse.json({ error: 'Invalid content_id' },   { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('saves')
      .delete()
      .eq('user_id', user.id)
      .eq('content_type', content_type)
      .eq('content_id', content_id)
    if (error) throw error

    return NextResponse.json({ saved: false })
  } catch (err: unknown) {
    console.error('Saves DELETE error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to unsave' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const typeParam = url.searchParams.get('type')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any).from('saves').select('content_type, content_id, created_at').eq('user_id', user.id).order('created_at', { ascending: false })
    if (isValidType(typeParam)) query = query.eq('content_type', typeParam)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ saves: data ?? [] })
  } catch (err: unknown) {
    console.error('Saves GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list saves' },
      { status: 500 }
    )
  }
}

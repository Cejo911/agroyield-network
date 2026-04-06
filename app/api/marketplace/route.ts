import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.title || !body.type || !body.category) {
      return NextResponse.json(
        { error: 'Title, type and category are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('marketplace_listings')
      .insert({
        user_id: user.id,
        title: body.title,
        category: body.category,
        type: body.type,
        price: body.price ?? null,
        price_negotiable: body.price_negotiable ?? false,
        description: body.description || null,
        state: body.state || null,
        contact: body.contact || null,
        is_active: true,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

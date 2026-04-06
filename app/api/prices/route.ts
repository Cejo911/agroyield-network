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

    if (!body.commodity || !body.price || !body.unit) {
      return NextResponse.json(
        { error: 'Commodity, price and unit are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('price_reports')
      .insert({
        user_id: user.id,
        commodity: body.commodity,
        category: body.category || null,
        price: body.price,
        unit: body.unit,
        market_name: body.market_name || null,
        state: body.state || null,
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

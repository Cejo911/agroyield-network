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

    if (!body.title || !body.type || !body.content) {
      return NextResponse.json(
        { error: 'Title, type and content are required' },
        { status: 400 }
      )
    }

      const { data, error } = await supabase
        .from('research_posts')
        .insert({
          user_id:   user.id,
          title:     body.title,
          type:      body.type,
          content:   body.content,
          tags:            body.tags?.length ? body.tags : null,
          is_locked:       body.is_locked ?? false,
          cover_image_url: body.cover_image_url || null,
          attachment_url:  body.attachment_url  || null,
          attachment_name: body.attachment_name || null,
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

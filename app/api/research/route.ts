import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSetting } from '@/lib/settings'
import { notifyFollowers } from '@/lib/notify-followers'
import { sanitiseText } from '@/lib/sanitise'
import { requireVerifiedInstitution } from '@/lib/auth/require-verified-institution'

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

    // Institutions must be admin-verified before posting
    const gate = await requireVerifiedInstitution(supabase, user.id)
    if (gate.block) return gate.block

    const body = await request.json()

    if (!body.title || !body.type || !body.content) {
      return NextResponse.json(
        { error: 'Title, type and content are required' },
        { status: 400 }
      )
    }

    // Daily rate limit check
    const limitStr = await getSetting('research_daily_limit')
    const rateLimit = parseInt(limitStr ?? '5', 10) || 5
    const since = new Date()
    since.setHours(0, 0, 0, 0)
    const { count } = await (supabase as any)
      .from('research_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', since.toISOString())
    if ((count ?? 0) >= rateLimit) {
      return NextResponse.json(
        { error: `You can post a maximum of ${rateLimit} research posts per 24 hours. Please try again later.` },
        { status: 429 }
      )
    }

      const { data, error } = await supabase
        .from('research_posts')
        .insert({
          user_id:   user.id,
          title:     sanitiseText(body.title),
          type:      body.type,
          content:   sanitiseText(body.content),
          tags:            body.tags?.length ? body.tags.map((t: string) => sanitiseText(t)).filter(Boolean) : null,
          is_locked:       body.is_locked ?? false,
          cover_image_url: body.cover_image_url || null,
          attachment_url:  body.attachment_url  || null,
          attachment_name: sanitiseText(body.attachment_name),
          is_active: true,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Notify followers (fire-and-forget)
    if (data?.id) {
      const { data: profile } = await (supabase as any)
        .from('profiles').select('first_name, last_name').eq('id', user.id).single()
      const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Someone'
      notifyFollowers({
        actorId: user.id,
        actorName: name,
        contentType: 'research',
        contentTitle: body.title,
        contentId: data.id,
      })
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

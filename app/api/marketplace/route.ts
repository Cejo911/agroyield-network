import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyFollowers } from '@/lib/notify-followers'

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { error: 'Please verify your email address before posting listings. Check your inbox for a confirmation email.' },
        { status: 403 }
      )
    }

    // Read rate limit from settings (fallback: 5)
    const { data: rateSetting } = await supabaseAny
      .from('settings').select('value').eq('key', 'listing_daily_limit').single()
    const rateLimit = parseInt(
      (rateSetting as Record<string, unknown>)?.value as string ?? '5', 10
    )

    // Rate limiting
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('marketplace_listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', since)
    if ((count ?? 0) >= rateLimit) {
      return NextResponse.json(
        { error: `You can post a maximum of ${rateLimit} listings per 24 hours. Please try again later.` },
        { status: 429 }
      )
    }

    // Read moderation mode (fallback: immediate)
    const { data: modSetting } = await supabaseAny
      .from('settings').select('value').eq('key', 'moderation_mode').single()
    const moderationMode = (modSetting as Record<string, unknown>)?.value as string ?? 'immediate'
    const isPending = moderationMode === 'approval'

    const body = await request.json()
    if (!body.title || !body.type || !body.category) {
      return NextResponse.json({ error: 'Title, type and category are required' }, { status: 400 })
    }

    const { data, error } = await supabaseAny
      .from('marketplace_listings')
      .insert({
        user_id:           user.id,
        title:             body.title,
        category:          body.category,
        type:              body.type,
        price:             body.price            ?? null,
        price_negotiable:  body.price_negotiable ?? false,
        description:       body.description      || null,
        state:             body.state            || null,
        contact:           body.contact          || null,
        image_urls:        body.image_urls?.length ? body.image_urls : null,
        condition:         body.condition || null,
        is_active:         !isPending,
        is_pending_review: isPending,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Notify followers (fire-and-forget, only for immediately-visible posts)
    if (!isPending && data?.id) {
      const { data: profile } = await supabaseAny
        .from('profiles').select('first_name, last_name').eq('id', user.id).single()
      const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Someone'
      notifyFollowers({
        actorId: user.id,
        actorName: name,
        contentType: 'listing',
        contentTitle: body.title,
        contentId: data.id,
      })
    }

    return NextResponse.json({ success: true, id: data.id, pending: isPending })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyFollowers } from '@/lib/notify-followers'
import { notifyOpenToOpportunities } from '@/lib/notify-open-to-opportunities'
import { sanitiseText, sanitiseUrl } from '@/lib/sanitise'

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
        { error: 'Please verify your email address before posting opportunities. Check your inbox for a confirmation email.' },
        { status: 403 }
      )
    }

    // Read rate limit from settings (fallback: 3)
    const { data: rateSetting } = await supabaseAny
      .from('settings').select('value').eq('key', 'opportunity_daily_limit').single()
    const rateLimit = parseInt(
      (rateSetting as Record<string, unknown>)?.value as string ?? '3', 10
    )

    // Rate limiting
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('opportunities')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', since)
    if ((count ?? 0) >= rateLimit) {
      return NextResponse.json(
        { error: `You can post a maximum of ${rateLimit} opportunities per 24 hours. Please try again later.` },
        { status: 429 }
      )
    }

    // Read moderation mode (fallback: immediate)
    const { data: modSetting } = await supabaseAny
      .from('settings').select('value').eq('key', 'moderation_mode').single()
    const moderationMode = (modSetting as Record<string, unknown>)?.value as string ?? 'immediate'
    const isPending = moderationMode === 'approval'

    const body = await request.json()
    if (!body.title || !body.type) {
      return NextResponse.json({ error: 'Title and type are required' }, { status: 400 })
    }

    const { data, error } = await supabaseAny
      .from('opportunities')
      .insert({
        user_id:           user.id,
        title:             sanitiseText(body.title),
        type:              body.type,
        organisation:      sanitiseText(body.organisation),
        location:          sanitiseText(body.location),
        description:       sanitiseText(body.description),
        requirements:      sanitiseText(body.requirements),
        deadline:          body.deadline      || null,
        url:               sanitiseUrl(body.url),
        thumbnail_url:     body.thumbnail_url || null,
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
        contentType: 'opportunity',
        contentTitle: body.title,
        contentId: data.id,
      })

      // Also notify users who flipped their "open to opportunities" flag.
      // The helper excludes followers + the actor themselves, so there's no
      // duplicate-notification risk with the notifyFollowers call above.
      notifyOpenToOpportunities({
        actorId:          user.id,
        actorName:        name,
        opportunityId:    data.id,
        opportunityTitle: body.title,
        opportunityType:  body.type ?? null,
      })
    }

    return NextResponse.json({ success: true, id: data.id, pending: isPending })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

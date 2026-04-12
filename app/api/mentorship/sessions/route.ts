import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createNotification } from '@/lib/notifications'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const { success } = rateLimit(ip, { limit: 10, windowMs: 60_000 })
    if (!success) return rateLimitResponse()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { action, mentorId, topic } = await request.json()

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (action === 'notify') {
      // Notify mentor of new session request
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single()

      const menteeName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Someone'

      await createNotification(admin, {
        userId: mentorId,
        type: 'system',
        title: `${menteeName} requested a mentorship session`,
        body: `Topic: ${topic}`,
        link: '/mentorship/sessions',
        actorId: user.id,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Mentorship sessions API error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

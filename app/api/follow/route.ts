import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createNotification } from '@/lib/notifications'

// GET /api/follow?userId=xxx
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
  ])

  let isFollowing = false
  if (user && user.id !== userId) {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .maybeSingle()
    isFollowing = !!data
  }

  return NextResponse.json({
    followers: followers ?? 0,
    following: following ?? 0,
    isFollowing,
  })
}

// POST /api/follow — toggle follow/unfollow
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { userId } = body as { userId: string }
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  if (userId === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

  const { data: existing } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', userId)
    .maybeSingle()

  if (existing) {
    await supabase.from('follows').delete()
      .eq('follower_id', user.id)
      .eq('following_id', userId)
    return NextResponse.json({ following: false })
  } else {
    await supabase.from('follows').insert({ follower_id: user.id, following_id: userId })

    // Notify the person being followed
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()
    const followerName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Someone'
    await createNotification(admin, {
      userId:   userId,
      type:     'follow',
      title:    `${followerName} started following you`,
      link:     `/directory/${user.id}`,
      actorId:  user.id,
    })

    return NextResponse.json({ following: true })
  }
}

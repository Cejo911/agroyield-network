import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId   = searchParams.get('postId')
    const postType = searchParams.get('postType')
    if (!postId || !postType) return NextResponse.json({ liked: false, count: 0 })

    const supabase  = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny  = getAdminClient() as any

    const [countResult, userLike] = await Promise.all([
      adminAny.from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_type', postType)
        .eq('post_id', postId),
      user
        ? adminAny.from('likes').select('id')
            .eq('user_id', user.id)
            .eq('post_type', postType)
            .eq('post_id', postId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    return NextResponse.json({
      liked: !!userLike.data,
      count: countResult.count ?? 0,
    })
  } catch {
    return NextResponse.json({ liked: false, count: 0 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { postId, postType } = await request.json() as {
      postId: string
      postType: 'opportunity' | 'listing'
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = getAdminClient() as any

    const { data: existing } = await adminAny
      .from('likes').select('id')
      .eq('user_id', user.id)
      .eq('post_type', postType)
      .eq('post_id', postId)
      .maybeSingle()

    if (existing) {
      await adminAny.from('likes').delete().eq('id', existing.id)
    } else {
      await adminAny.from('likes').insert({ user_id: user.id, post_type: postType, post_id: postId })
    }

    const { count } = await adminAny
      .from('likes').select('*', { count: 'exact', head: true })
      .eq('post_type', postType).eq('post_id', postId)

    return NextResponse.json({ liked: !existing, count: count ?? 0 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const REASONS = ['Spam', 'Misleading', 'Inappropriate', 'Duplicate', 'Other']

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
    if (!postId || !postType) return NextResponse.json({ reported: false })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ reported: false })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = getAdminClient() as any
    const { data } = await adminAny.from('reports').select('id')
      .eq('user_id', user.id)
      .eq('post_type', postType)
      .eq('post_id', postId)
      .maybeSingle()

    return NextResponse.json({ reported: !!data })
  } catch {
    return NextResponse.json({ reported: false })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { postId, postType, reason } = await request.json() as {
      postId:   string
      postType: 'opportunity' | 'listing'
      reason:   string
    }

    if (!REASONS.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = getAdminClient() as any

    // Check already reported
    const { data: existing } = await adminAny.from('reports').select('id')
      .eq('user_id', user.id).eq('post_type', postType).eq('post_id', postId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'You have already reported this post' }, { status: 409 })
    }

    // Insert report
    await adminAny.from('reports').insert({
      user_id: user.id, post_type: postType, post_id: postId, reason,
    })

    // Read report threshold
    const { data: thresholdRow } = await adminAny.from('settings')
      .select('value').eq('key', 'report_threshold').single()
    const threshold = parseInt(
      (thresholdRow as Record<string, unknown>)?.value as string ?? '3', 10
    )

    // Count total reports on this post
    const { count } = await adminAny.from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('post_type', postType).eq('post_id', postId)

    // Auto-hide if threshold reached
    if ((count ?? 0) >= threshold) {
      const table = postType === 'opportunity' ? 'opportunities' : 'marketplace_listings'
      await adminAny.from(table).update({ is_active: false }).eq('id', postId)
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

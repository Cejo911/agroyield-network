import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { postId, optionIndex } = await request.json()
  if (!postId || optionIndex === undefined) {
    return NextResponse.json({ error: 'Missing postId or optionIndex' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  // Fetch current post
  const { data: post, error: fetchErr } = await supabaseAny
    .from('community_posts')
    .select('poll_votes, poll_options, poll_closes_at')
    .eq('id', postId)
    .single()

  if (fetchErr || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  // Check if poll has closed
  if (post.poll_closes_at && new Date(post.poll_closes_at) <= new Date()) {
    return NextResponse.json({ error: 'This poll has closed', poll_votes: post.poll_votes || {} }, { status: 400 })
  }

  const votes: Record<string, string[]> = post.poll_votes || {}

  // Check if user already voted on any option
  const alreadyVoted = Object.values(votes).some(
    (arr: unknown) => Array.isArray(arr) && arr.includes(user.id)
  )
  if (alreadyVoted) {
    return NextResponse.json({ error: 'Already voted', poll_votes: votes }, { status: 400 })
  }

  // Add vote to selected option
  const key = String(optionIndex)
  if (!Array.isArray(votes[key])) votes[key] = []
  votes[key].push(user.id)

  const { error: updateErr } = await supabaseAny
    .from('community_posts')
    .update({ poll_votes: votes })
    .eq('id', postId)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ poll_votes: votes })
}

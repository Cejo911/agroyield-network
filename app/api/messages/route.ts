import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST: Start or find a conversation, optionally send first message
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipientId, body } = await request.json()
  if (!recipientId) {
    return NextResponse.json({ error: 'Missing recipientId' }, { status: 400 })
  }
  if (recipientId === user.id) {
    return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  // Always store smaller UUID as participant_a for consistent lookups
  const [p1, p2] = [user.id, recipientId].sort()

  // Check if conversation already exists
  const { data: existing } = await supabaseAny
    .from('conversations')
    .select('id')
    .eq('participant_a', p1)
    .eq('participant_b', p2)
    .maybeSingle()

  let conversationId: string

  if (existing) {
    conversationId = existing.id
  } else {
    // Create new conversation
    const { data: newConvo, error: convoErr } = await supabaseAny
      .from('conversations')
      .insert({ participant_a: p1, participant_b: p2 })
      .select('id')
      .single()

    if (convoErr) {
      return NextResponse.json({ error: convoErr.message }, { status: 500 })
    }
    conversationId = newConvo.id
  }

  // Optionally send first message
  if (body?.trim()) {
    const { error: msgErr } = await supabaseAny
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        body: body.trim(),
        status: 'sent',
      })

    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 })
    }

    // Update conversation last_message_at and preview
    await supabaseAny
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: body.trim().slice(0, 100),
      })
      .eq('id', conversationId)

    // Fire notification (fire and forget)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'message', postId: conversationId, postType: 'message' }),
    }).catch(() => {})
  }

  return NextResponse.json({ conversationId })
}

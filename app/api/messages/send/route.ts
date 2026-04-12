import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST: Send a message to an existing conversation
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId, body } = await request.json()
  if (!conversationId || !body?.trim()) {
    return NextResponse.json({ error: 'Missing conversationId or body' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  // Verify user is a participant
  const { data: convo } = await supabaseAny
    .from('conversations')
    .select('id, participant_1, participant_2')
    .eq('id', conversationId)
    .single()

  if (!convo || (convo.participant_1 !== user.id && convo.participant_2 !== user.id)) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
  }

  // Insert message
  const { data: message, error: msgErr } = await supabaseAny
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: body.trim(),
      status: 'sent',
    })
    .select('id, sender_id, body, status, created_at')
    .single()

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 })
  }

  // Update conversation last_message_at
  await supabaseAny
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  return NextResponse.json({ message })
}

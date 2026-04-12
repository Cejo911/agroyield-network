import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
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

  // Service role client to bypass RLS for cross-user operations
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify user is a participant
  const { data: convo } = await admin
    .from('conversations')
    .select('id, participant_a, participant_b')
    .eq('id', conversationId)
    .single()

  if (!convo || (convo.participant_a !== user.id && convo.participant_b !== user.id)) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
  }

  // Insert message
  const { data: message, error: msgErr } = await admin
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

  // Update conversation last_message_at and preview
  await admin
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: body.trim().slice(0, 100),
    })
    .eq('id', conversationId)

  return NextResponse.json({ message })
}

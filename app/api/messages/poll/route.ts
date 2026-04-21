import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET: Poll for new messages after a given timestamp
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversationId')
  const after = searchParams.get('after')

  if (!conversationId) {
    return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  // Verify user is participant
  const { data: convo } = await supabaseAny
    .from('conversations')
    .select('participant_a, participant_b')
    .eq('id', conversationId)
    .single()

  if (!convo || (convo.participant_a !== user.id && convo.participant_b !== user.id)) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
  }

  // Fetch messages newer than 'after'
  let query = supabaseAny
    .from('messages')
    .select('id, sender_id, body, media_url, media_type, media_filename, status, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (after) {
    query = query.gt('created_at', after)
  }

  const { data: messages } = await query

  return NextResponse.json({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: (messages ?? []).map((m: any) => ({
      id: m.id,
      senderId: m.sender_id,
      body: m.body,
      mediaUrl: m.media_url,
      mediaType: m.media_type,
      mediaFilename: m.media_filename,
      status: m.status,
      createdAt: m.created_at,
    })),
  })
}

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { stripHtml } from '@/lib/sanitise'

const ALLOWED_MEDIA_TYPES = new Set(['image', 'file'])

// POST: Send a message to an existing conversation
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId, body, mediaUrl, mediaType, mediaFilename } = await request.json()

  if (!conversationId) {
    return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 })
  }

  // Sanitise message body — strip any HTML tags. Body is optional when an
  // attachment is present (e.g. "here's the invoice PDF" with no caption).
  const cleanBody = typeof body === 'string' ? stripHtml(body).trim() : ''

  // Validate media payload
  const hasMedia = typeof mediaUrl === 'string' && mediaUrl.length > 0
  if (hasMedia) {
    if (!mediaType || !ALLOWED_MEDIA_TYPES.has(mediaType)) {
      return NextResponse.json({ error: 'Invalid media type' }, { status: 400 })
    }
    // URL must point at our own storage to prevent arbitrary-URL embeds
    if (!mediaUrl.includes('/storage/v1/object/public/message-attachments/')) {
      return NextResponse.json({ error: 'Media URL must be in message-attachments bucket' }, { status: 400 })
    }
  }

  if (!cleanBody && !hasMedia) {
    return NextResponse.json({ error: 'Message must have a body or attachment' }, { status: 400 })
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
      body: cleanBody || null,
      media_url: hasMedia ? mediaUrl : null,
      media_type: hasMedia ? mediaType : null,
      media_filename: hasMedia && typeof mediaFilename === 'string' ? mediaFilename.slice(0, 200) : null,
      status: 'sent',
    })
    .select('id, sender_id, body, media_url, media_type, media_filename, status, created_at')
    .single()

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 })
  }

  // Update conversation last_message_at and preview. When the message is
  // media-only, synthesise a preview tag like "📎 Attachment".
  const preview = cleanBody
    ? cleanBody.slice(0, 100)
    : hasMedia && mediaType === 'image'
      ? '📷 Photo'
      : '📎 Attachment'

  await admin
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: preview,
    })
    .eq('id', conversationId)

  return NextResponse.json({ message })
}

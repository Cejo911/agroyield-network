import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import MessageThread from './message-thread'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = (await createClient()) as SupabaseClient<Database>
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch conversation
  const { data: convo } = await supabase
    .from('conversations')
    .select('id, participant_a, participant_b')
    .eq('id', id)
    .single()

  if (!convo) notFound()

  // Verify user is participant
  if (convo.participant_a !== user.id && convo.participant_b !== user.id) notFound()

  const otherId = convo.participant_a === user.id ? convo.participant_b : convo.participant_a

  // Fetch other user's profile and messages in parallel
  const [{ data: profile }, { data: messages }] = await Promise.all([
    supabase.from('profiles').select('id, first_name, last_name, avatar_url, role, username, last_seen_at').eq('id', otherId).single(),
    supabase
      .from('messages')
      .select('id, sender_id, body, media_url, media_type, media_filename, status, created_at, read_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(200),
  ])

  // Mark unread messages from other person as read (server-side)
  await supabase
    .from('messages')
    .update({ status: 'read', read_at: new Date().toISOString() })
    .eq('conversation_id', id)
    .neq('sender_id', user.id)
    .neq('status', 'read')

  const name = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : 'User'
  const profileHref = profile?.username ? `/u/${profile.username}` : `/directory/${otherId}`

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <AppNav />
      <MessageThread
        conversationId={id}
        currentUserId={user.id}
        otherUser={{
          id: otherId,
          name,
          avatarUrl: profile?.avatar_url || null,
          lastSeenAt: profile?.last_seen_at || null,
          role: profile?.role || null,
          profileHref,
        }}
        initialMessages={(messages ?? []).map((m) => ({
          id: m.id,
          senderId: m.sender_id,
          body: m.body,
          mediaUrl: m.media_url,
          mediaType: m.media_type,
          mediaFilename: m.media_filename,
          status: m.status,
          createdAt: m.created_at,
        }))}
      />
    </div>
  )
}

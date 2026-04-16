import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import MessageThread from './message-thread'

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  // Fetch conversation
  const { data: convo } = await supabaseAny
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
    supabaseAny
      .from('messages')
      .select('id, sender_id, body, status, created_at, read_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(200),
  ])

  // Mark unread messages from other person as read (server-side)
  await supabaseAny
    .from('messages')
    .update({ status: 'read', read_at: new Date().toISOString() })
    .eq('conversation_id', id)
    .neq('sender_id', user.id)
    .neq('status', 'read')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prof = profile as any
  const name = prof ? `${prof.first_name ?? ''} ${prof.last_name ?? ''}`.trim() : 'User'
  const profileHref = prof?.username ? `/u/${prof.username}` : `/directory/${otherId}`

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <AppNav />
      <MessageThread
        conversationId={id}
        currentUserId={user.id}
        otherUser={{
          id: otherId,
          name,
          avatarUrl: prof?.avatar_url || null,
          lastSeenAt: prof?.last_seen_at || null,
          role: prof?.role || null,
          profileHref,
        }}
        initialMessages={(messages ?? []).map((m: any) => ({
          id: m.id,
          senderId: m.sender_id,
          body: m.body,
          status: m.status,
          createdAt: m.created_at,
        }))}
      />
    </div>
  )
}

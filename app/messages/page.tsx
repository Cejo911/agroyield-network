import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import MessagesInbox from './messages-inbox'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type ConvoRow = Pick<
  Database['public']['Tables']['conversations']['Row'],
  'id' | 'participant_a' | 'participant_b' | 'last_message_at' | 'last_message_preview'
>
type MessageRow = Pick<
  Database['public']['Tables']['messages']['Row'],
  'conversation_id' | 'body' | 'sender_id' | 'created_at'
>
type ProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'first_name' | 'last_name' | 'avatar_url' | 'role' | 'last_seen_at'
>

export default async function MessagesPage() {
  const supabase = (await createClient()) as SupabaseClient<Database>
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all conversations for this user
  const [{ data: convosAsP1 }, { data: convosAsP2 }] = await Promise.all([
    supabase
      .from('conversations')
      .select('id, participant_a, participant_b, last_message_at, last_message_preview')
      .eq('participant_a', user.id)
      .order('last_message_at', { ascending: false }),
    supabase
      .from('conversations')
      .select('id, participant_a, participant_b, last_message_at, last_message_preview')
      .eq('participant_b', user.id)
      .order('last_message_at', { ascending: false }),
  ])

  // Merge and sort
  const allConvos: ConvoRow[] = [...(convosAsP1 ?? []), ...(convosAsP2 ?? [])]
    .sort((a, b) => new Date(b.last_message_at ?? 0).getTime() - new Date(a.last_message_at ?? 0).getTime())

  // Get other participant IDs
  const otherIds = allConvos.map(c =>
    c.participant_a === user.id ? c.participant_b : c.participant_a
  )

  // Fetch profiles and last messages + unread counts in parallel
  const convoIds = allConvos.map(c => c.id)

  const [{ data: profiles }, { data: lastMessages }, { data: unreadMessages }] = await Promise.all([
    otherIds.length > 0
      ? supabase.from('profiles').select('id, first_name, last_name, avatar_url, role, last_seen_at').in('id', otherIds)
      : Promise.resolve({ data: [] as ProfileRow[] }),
    convoIds.length > 0
      ? supabase
          .from('messages')
          .select('conversation_id, body, sender_id, created_at')
          .in('conversation_id', convoIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as MessageRow[] }),
    convoIds.length > 0
      ? supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', convoIds)
          .neq('sender_id', user.id)
          .neq('status', 'read')
      : Promise.resolve({ data: [] as Array<Pick<MessageRow, 'conversation_id'>> }),
  ])

  // Build profile map
  const profileMap: Record<string, ProfileRow> = {}
  for (const p of (profiles ?? []) as ProfileRow[]) profileMap[p.id] = p

  // Build last message map (first message per conversation since ordered desc)
  const lastMsgMap: Record<string, MessageRow> = {}
  for (const m of (lastMessages ?? []) as MessageRow[]) {
    if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m
  }

  // Build unread count map
  const unreadMap: Record<string, number> = {}
  for (const m of (unreadMessages ?? []) as Array<Pick<MessageRow, 'conversation_id'>>) {
    unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1
  }

  const timeAgo = (dateStr: string) => {
    // Date.now() in this server-side relative-time helper is fine — runs once
    // per request render, not part of a React render path. The lint rule
    // flags it anyway because it can't tell server from client; suppress.
    // eslint-disable-next-line react-hooks/purity
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  // Prepare conversations for client component
  const conversations = allConvos.map(convo => {
    const otherId = convo.participant_a === user.id ? convo.participant_b : convo.participant_a
    const profile = profileMap[otherId]
    const name = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : 'User'
    const lastMsg = lastMsgMap[convo.id]
    const unread = unreadMap[convo.id] || 0
    const body = lastMsg?.body ?? ''
    const preview = lastMsg
      ? (lastMsg.sender_id === user.id ? 'You: ' : '') + body.slice(0, 60) + (body.length > 60 ? '…' : '')
      : 'No messages yet'
    const time = lastMsg ? timeAgo(lastMsg.created_at) : ''

    return {
      id: convo.id,
      name,
      initial: (name[0] || '?').toUpperCase(),
      avatarUrl: profile?.avatar_url || null,
      lastSeenAt: profile?.last_seen_at || null,
      preview,
      time,
      unread,
    }
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Messages</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Your private conversations</p>
        </div>

        <MessagesInbox conversations={conversations} />
      </main>
    </div>
  )
}

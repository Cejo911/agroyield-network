import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppNav from '@/app/components/AppNav'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  // Fetch all conversations for this user
  const [{ data: convosAsP1 }, { data: convosAsP2 }] = await Promise.all([
    supabaseAny
      .from('conversations')
      .select('id, participant_1, participant_2, last_message_at')
      .eq('participant_1', user.id)
      .order('last_message_at', { ascending: false }),
    supabaseAny
      .from('conversations')
      .select('id, participant_1, participant_2, last_message_at')
      .eq('participant_2', user.id)
      .order('last_message_at', { ascending: false }),
  ])

  // Merge and sort
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allConvos: any[] = [...(convosAsP1 ?? []), ...(convosAsP2 ?? [])]
    .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())

  // Get other participant IDs
  const otherIds = allConvos.map(c =>
    c.participant_1 === user.id ? c.participant_2 : c.participant_1
  )

  // Fetch profiles and last messages + unread counts in parallel
  const convoIds = allConvos.map(c => c.id)

  const [{ data: profiles }, { data: lastMessages }, { data: unreadMessages }] = await Promise.all([
    otherIds.length > 0
      ? supabase.from('profiles').select('id, first_name, last_name, avatar_url, role').in('id', otherIds)
      : Promise.resolve({ data: [] }),
    convoIds.length > 0
      ? supabaseAny
          .from('messages')
          .select('conversation_id, body, sender_id, created_at')
          .in('conversation_id', convoIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    convoIds.length > 0
      ? supabaseAny
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', convoIds)
          .neq('sender_id', user.id)
          .neq('status', 'read')
      : Promise.resolve({ data: [] }),
  ])

  // Build profile map
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileMap: Record<string, any> = {}
  for (const p of (profiles ?? []) as any[]) profileMap[p.id] = p

  // Build last message map (first message per conversation since ordered desc)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastMsgMap: Record<string, any> = {}
  for (const m of (lastMessages ?? []) as any[]) {
    if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m
  }

  // Build unread count map
  const unreadMap: Record<string, number> = {}
  for (const m of (unreadMessages ?? []) as any[]) {
    unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1
  }

  const timeAgo = (dateStr: string) => {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Messages</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Your private conversations</p>
        </div>

        {allConvos.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-4xl mb-3">✉️</p>
            <p className="font-medium">No messages yet</p>
            <p className="text-sm mt-1">Start a conversation from someone&apos;s profile in the Directory.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
            {allConvos.map(convo => {
              const otherId = convo.participant_1 === user.id ? convo.participant_2 : convo.participant_1
              const profile = profileMap[otherId]
              const name = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : 'User'
              const initial = (name[0] || '?').toUpperCase()
              const lastMsg = lastMsgMap[convo.id]
              const unread = unreadMap[convo.id] || 0
              const preview = lastMsg
                ? (lastMsg.sender_id === user.id ? 'You: ' : '') + (lastMsg.body?.slice(0, 60) || '') + (lastMsg.body?.length > 60 ? '…' : '')
                : 'No messages yet'
              const time = lastMsg ? timeAgo(lastMsg.created_at) : ''

              return (
                <Link
                  key={convo.id}
                  href={`/messages/${convo.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {/* Avatar */}
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={name} className="w-11 h-11 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-sm shrink-0">
                      {initial}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${unread > 0 ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-800 dark:text-gray-200'}`}>
                        {name}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{time}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={`text-xs truncate ${unread > 0 ? 'font-medium text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                        {preview}
                      </p>
                      {unread > 0 && (
                        <span className="shrink-0 w-5 h-5 flex items-center justify-center bg-green-600 text-white text-[10px] font-bold rounded-full">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

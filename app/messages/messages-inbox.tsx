'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import OnlineIndicator from '@/app/components/OnlineIndicator'

interface Conversation {
  id: string
  name: string
  initial: string
  avatarUrl: string | null
  lastSeenAt: string | null
  preview: string
  time: string
  unread: number
}

export default function MessagesInbox({ conversations }: { conversations: Conversation[] }) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? conversations.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.preview.toLowerCase().includes(search.toLowerCase())
      )
    : conversations

  return (
    <>
      {/* Search bar */}
      {conversations.length > 0 && (
        <div className="mb-4">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {conversations.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">✉️</p>
          <p className="font-medium">No messages yet</p>
          <p className="text-sm mt-1">Start a conversation from someone&apos;s profile in the Directory.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <p className="text-sm">No conversations matching &ldquo;{search}&rdquo;</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
          {filtered.map(convo => (
            <Link
              key={convo.id}
              href={`/messages/${convo.id}`}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              {/* Avatar with presence */}
              <div className="relative shrink-0">
                {convo.avatarUrl ? (
                  <Image src={convo.avatarUrl} alt={convo.name} width={44} height={44} className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-sm">
                    {convo.initial}
                  </div>
                )}
                <OnlineIndicator lastSeenAt={convo.lastSeenAt} size="sm" className="absolute bottom-0 right-0" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm truncate ${convo.unread > 0 ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-800 dark:text-gray-200'}`}>
                    {convo.name}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{convo.time}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className={`text-xs truncate ${convo.unread > 0 ? 'font-medium text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                    {convo.preview}
                  </p>
                  {convo.unread > 0 && (
                    <span className="shrink-0 w-5 h-5 flex items-center justify-center bg-green-600 text-white text-[10px] font-bold rounded-full">
                      {convo.unread > 9 ? '9+' : convo.unread}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

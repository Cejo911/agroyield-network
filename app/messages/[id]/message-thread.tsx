'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import OnlineIndicator from '@/app/components/OnlineIndicator'

interface Message {
  id: string
  senderId: string
  body: string
  status: string
  createdAt: string
}

interface OtherUser {
  id: string
  name: string
  avatarUrl: string | null
  lastSeenAt: string | null
  role: string | null
  profileHref: string
}

interface Props {
  conversationId: string
  currentUserId: string
  otherUser: OtherUser
  initialMessages: Message[]
}

export default function MessageThread({ conversationId, currentUserId, otherUser, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom on load and new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Focus input and mark messages as read on mount
  useEffect(() => {
    inputRef.current?.focus()
    fetch('/api/messages/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId }),
    }).catch(() => {})
  }, [conversationId])

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const lastCreatedAt = messages.length > 0 ? messages[messages.length - 1].createdAt : ''
        const res = await fetch(`/api/messages/poll?conversationId=${conversationId}&after=${encodeURIComponent(lastCreatedAt)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.messages?.length > 0) {
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id))
              const newMsgs = data.messages.filter((m: Message) => !existingIds.has(m.id))
              return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev
            })
            // Mark as read
            fetch('/api/messages/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversationId }),
            }).catch(() => {})
          }
        }
      } catch { /* ignore polling errors */ }
    }, 5000)

    return () => clearInterval(interval)
  }, [conversationId, messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending) return
    setSending(true)

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      senderId: currentUserId,
      body: input.trim(),
      status: 'sent',
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticMsg])
    setInput('')

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, body: optimisticMsg.body }),
      })
      const data = await res.json()
      if (data.message) {
        // Replace optimistic message with real one
        setMessages(prev => prev.map(m =>
          m.id === optimisticMsg.id
            ? { id: data.message.id, senderId: data.message.sender_id, body: data.message.body, status: data.message.status, createdAt: data.message.created_at }
            : m
        ))
      }
    } catch {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
    }
    setSending(false)
    inputRef.current?.focus()
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)

    const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 0) return time
    if (diffDays === 1) return `Yesterday ${time}`
    if (diffDays < 7) return `${date.toLocaleDateString('en-GB', { weekday: 'short' })} ${time}`
    return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${time}`
  }

  // Group messages by date for date separators
  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const initial = (otherUser.name[0] || '?').toUpperCase()

  let lastDateLabel = ''

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
        <Link href="/messages" className="text-gray-400 hover:text-green-600 transition-colors mr-1">
          ←
        </Link>
        <Link href={otherUser.profileHref} className="relative shrink-0">
          {otherUser.avatarUrl ? (
            <Image src={otherUser.avatarUrl} alt={otherUser.name} width={36} height={36} className="rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-sm">
              {initial}
            </div>
          )}
          <OnlineIndicator lastSeenAt={otherUser.lastSeenAt} size="sm" className="absolute bottom-0 right-0" />
        </Link>
        <div className="min-w-0">
          <Link href={otherUser.profileHref} className="font-semibold text-gray-900 dark:text-white text-sm hover:underline block truncate">
            {otherUser.name}
          </Link>
          {otherUser.role && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 capitalize">{otherUser.role}</span>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-sm">Send a message to start the conversation.</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.senderId === currentUserId
          const dateLabel = getDateLabel(msg.createdAt)
          let showDate = false
          if (dateLabel !== lastDateLabel) {
            lastDateLabel = dateLabel
            showDate = true
          }

          // Show time gap between messages (>10 min)
          const prevMsg = i > 0 ? messages[i - 1] : null
          const timeDiff = prevMsg ? (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) / 60000 : Infinity

          return (
            <div key={msg.id}>
              {/* Date separator */}
              {showDate && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{dateLabel}</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                </div>
              )}

              {/* Time gap */}
              {!showDate && timeDiff > 10 && <div className="h-3" />}

              {/* Message bubble */}
              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${timeDiff > 2 || showDate ? 'mt-2' : 'mt-0.5'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    isMe
                      ? 'bg-green-600 text-white rounded-br-md'
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-md'
                  }`}
                >
                  <p className="whitespace-pre-line break-words">{msg.body}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-green-200' : 'text-gray-400 dark:text-gray-500'}`}>
                    {formatTime(msg.createdAt)}
                    {isMe && msg.status === 'read' && ' ✓✓'}
                    {isMe && msg.status === 'delivered' && ' ✓'}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 py-3">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="bg-green-600 hover:bg-green-700 text-white rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50 transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}

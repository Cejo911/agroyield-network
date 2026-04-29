'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import OnlineIndicator from '@/app/components/OnlineIndicator'
import UserAvatar from '@/app/components/design/UserAvatar'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  senderId: string
  body: string | null
  mediaUrl: string | null
  mediaType: string | null        // 'image' | 'file' | null
  mediaFilename: string | null
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

// ---------------------------------------------------------------------------
// File constraints — kept in step with FileUploader.tsx / ImageUploader.tsx
// ---------------------------------------------------------------------------
const IMAGE_MIME = /^image\/(jpeg|jpg|png|webp|gif)$/
const DOC_MIME: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'text/csv': 'CSV',
}
const ACCEPT_ATTR =
  'image/*,application/pdf,.pdf,' +
  'application/msword,.doc,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,' +
  'application/vnd.ms-excel,.xls,' +
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,' +
  'text/csv,.csv'

const MAX_IMAGE_MB = 5
const MAX_FILE_MB = 10

type StagedAttachment = {
  url: string
  type: 'image' | 'file'
  filename: string
}

function fileIcon(name: string | null) {
  if (!name) return '📎'
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return '📕'
  if (ext === 'doc' || ext === 'docx') return '📘'
  if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return '📗'
  return '📎'
}

export default function MessageThread({ conversationId, currentUserId, otherUser, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [attachment, setAttachment] = useState<StagedAttachment | null>(null)
  const [attachError, setAttachError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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

  // ------------------------------------------------------------------------
  // Attachment upload — direct-to-Supabase, under the sender's uid folder so
  // the RLS policy on the message-attachments bucket accepts it.
  // ------------------------------------------------------------------------
  async function handleAttachPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return

    setAttachError('')

    // Classify
    const isImage = IMAGE_MIME.test(file.type)
    const isDoc = !!DOC_MIME[file.type]
    if (!isImage && !isDoc) {
      setAttachError('Only images, PDFs, Word and Excel docs are allowed.')
      return
    }

    const capMB = isImage ? MAX_IMAGE_MB : MAX_FILE_MB
    if (file.size > capMB * 1024 * 1024) {
      setAttachError(`File must be under ${capMB}MB.`)
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? (isImage ? 'jpg' : 'bin')
      const path = `${currentUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(path, file, { contentType: file.type })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('message-attachments').getPublicUrl(path)
      setAttachment({
        url: data.publicUrl,
        type: isImage ? 'image' : 'file',
        filename: file.name,
      })
    } catch {
      setAttachError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  function clearAttachment() {
    setAttachment(null)
    setAttachError('')
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if ((!trimmed && !attachment) || sending) return
    setSending(true)

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      senderId: currentUserId,
      body: trimmed || null,
      mediaUrl: attachment?.url ?? null,
      mediaType: attachment?.type ?? null,
      mediaFilename: attachment?.filename ?? null,
      status: 'sent',
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticMsg])
    const stagedAttachment = attachment
    setInput('')
    setAttachment(null)

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          body: trimmed,
          mediaUrl: stagedAttachment?.url ?? null,
          mediaType: stagedAttachment?.type ?? null,
          mediaFilename: stagedAttachment?.filename ?? null,
        }),
      })
      const data = await res.json()
      if (data.message) {
        // Replace optimistic message with real one
        setMessages(prev => prev.map(m =>
          m.id === optimisticMsg.id
            ? {
                id: data.message.id,
                senderId: data.message.sender_id,
                body: data.message.body,
                mediaUrl: data.message.media_url,
                mediaType: data.message.media_type,
                mediaFilename: data.message.media_filename,
                status: data.message.status,
                createdAt: data.message.created_at,
              }
            : m
        ))
      } else {
        // Non-OK response — roll back the optimistic bubble
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
        setInput(trimmed)
        setAttachment(stagedAttachment)
      }
    } catch {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      setInput(trimmed)
      setAttachment(stagedAttachment)
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

  let lastDateLabel = ''
  const canSend = !sending && !uploading && (input.trim().length > 0 || !!attachment)

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
        {/* Back link — wrapped in a 44 × 44 hit area to clear WCAG
            2.5.5 minimum tap-target. Inner SVG arrow gives a clearer
            interactive affordance than the bare `←` glyph (which on
            small screens read as decorative text); aria-label pulls
            the destination forward for screen-reader users. */}
        <Link
          href="/messages"
          aria-label="Back to messages"
          className="-ml-2 w-11 h-11 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:text-green-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <Link href={otherUser.profileHref} className="shrink-0">
          <UserAvatar src={otherUser.avatarUrl} name={otherUser.name} size="sm" alt={otherUser.name} />
        </Link>
        <div className="min-w-0">
          <Link href={otherUser.profileHref} className="font-semibold text-gray-900 dark:text-white text-sm hover:underline truncate flex items-center gap-1.5">
            <OnlineIndicator lastSeenAt={otherUser.lastSeenAt} size="sm" />
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

          const hasImage = msg.mediaType === 'image' && msg.mediaUrl
          const hasFile = msg.mediaType === 'file' && msg.mediaUrl

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
                  className={`max-w-[75%] rounded-2xl text-sm leading-relaxed overflow-hidden ${
                    isMe
                      ? 'bg-green-600 text-white rounded-br-md'
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-md'
                  }`}
                >
                  {/* Image attachment — rendered flush to bubble edges */}
                  {hasImage && (
                    <a
                      href={msg.mediaUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Image
                        src={msg.mediaUrl!}
                        alt={msg.mediaFilename || 'Attachment'}
                        width={320}
                        height={320}
                        unoptimized
                        className="w-full max-w-[280px] h-auto object-cover"
                      />
                    </a>
                  )}

                  {/* File attachment — download chip */}
                  {hasFile && (
                    <a
                      href={msg.mediaUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={msg.mediaFilename || undefined}
                      className={`flex items-center gap-2.5 px-3 py-2.5 ${
                        isMe
                          ? 'bg-green-700/60 hover:bg-green-700/80'
                          : 'bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 border-b border-gray-200 dark:border-gray-700'
                      } transition-colors`}
                    >
                      <span className="text-2xl leading-none shrink-0">{fileIcon(msg.mediaFilename)}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-medium truncate ${isMe ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                          {msg.mediaFilename || 'Attachment'}
                        </p>
                        <p className={`text-[10px] ${isMe ? 'text-green-100' : 'text-gray-500 dark:text-gray-400'}`}>
                          Tap to download
                        </p>
                      </div>
                    </a>
                  )}

                  {/* Body + timestamp */}
                  <div className="px-3.5 py-2">
                    {msg.body && (
                      <p className="whitespace-pre-line break-words">{msg.body}</p>
                    )}
                    <p className={`text-[10px] ${msg.body ? 'mt-1' : ''} ${isMe ? 'text-green-200' : 'text-gray-400 dark:text-gray-500'}`}>
                      {formatTime(msg.createdAt)}
                      {isMe && msg.status === 'read' && ' ✓✓'}
                      {isMe && msg.status === 'delivered' && ' ✓'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 py-3">
        {/* Staged-attachment preview (sits above the composer) */}
        {attachment && (
          <div className="mb-2 flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            {attachment.type === 'image' ? (
              <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-700">
                <Image src={attachment.url} alt="" fill sizes="48px" unoptimized className="object-cover" />
              </div>
            ) : (
              <span className="text-2xl leading-none shrink-0">{fileIcon(attachment.filename)}</span>
            )}
            <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">{attachment.filename}</span>
            <button
              type="button"
              onClick={clearAttachment}
              className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium shrink-0"
            >
              Remove
            </button>
          </div>
        )}

        {/* Inline upload error */}
        {attachError && (
          <p className="mb-2 text-xs text-red-600 dark:text-red-400">{attachError}</p>
        )}

        {/* Uploading indicator */}
        {uploading && (
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Uploading attachment…</p>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* Attach button */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || sending || !!attachment}
            title={attachment ? 'One attachment per message' : 'Attach photo or file'}
            aria-label="Attach photo or file"
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT_ATTR}
            onChange={handleAttachPick}
            className="hidden"
          />

          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              // Auto-grow up to ~5 lines (matches WhatsApp / Telegram pattern).
              const el = e.target as HTMLTextAreaElement
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
            onKeyDown={e => {
              // Cmd/Ctrl+Enter and plain Enter both submit (matches DM
              // convention everywhere — Slack, WhatsApp, Telegram). Shift+Enter
              // inserts a newline.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (canSend) {
                  // Submit by dispatching the parent form's submit event.
                  const form = (e.target as HTMLTextAreaElement).closest('form')
                  form?.requestSubmit()
                }
              }
            }}
            placeholder={attachment ? 'Add a caption (optional)…' : 'Type a message…'}
            className="flex-1 resize-none overflow-y-auto max-h-[120px] px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className="bg-green-600 hover:bg-green-700 text-white rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50 transition-colors shrink-0"
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
            </svg>
          </button>
        </form>

        <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
          Images up to {MAX_IMAGE_MB}MB · PDF, DOC, DOCX, XLS, XLSX, CSV up to {MAX_FILE_MB}MB
        </p>
      </div>
    </div>
  )
}

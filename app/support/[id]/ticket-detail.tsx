'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface Ticket {
  id: string
  subject: string
  description: string
  category: string
  priority: string
  status: string
  assigned_to: string | null
  assignedName?: string
  sla_deadline: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

interface Message {
  id: string
  ticket_id: string
  user_id: string
  sender_name: string
  sender_type: 'user' | 'admin'
  message: string
  created_at: string
}

interface Event {
  id: string
  ticket_id: string
  event_type: string
  old_value: string | null
  new_value: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  in_progress: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  resolved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  closed: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400',
}

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400',
  Medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  High: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  Urgent: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  const intervals: Record<string, number> = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  }

  for (const [key, value] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / value)
    if (interval >= 1) {
      return `${interval} ${key}${interval > 1 ? 's' : ''} ago`
    }
  }
  return 'just now'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function isSLABreached(deadline: string | null): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

function getEventDescription(event: Event): string {
  const statusMap: Record<string, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
  }
  const priorityMap: Record<string, string> = {
    Low: 'Low',
    Medium: 'Medium',
    High: 'High',
    Urgent: 'Urgent',
  }

  if (event.event_type === 'status_changed') {
    const oldStatus = statusMap[event.old_value || 'unknown'] || event.old_value
    const newStatus = statusMap[event.new_value || 'unknown'] || event.new_value
    return `Status changed from ${oldStatus} to ${newStatus}`
  }

  if (event.event_type === 'priority_changed') {
    const oldPri = priorityMap[event.old_value || 'Unknown'] || event.old_value
    const newPri = priorityMap[event.new_value || 'Unknown'] || event.new_value
    return `Priority changed from ${oldPri} to ${newPri}`
  }

  if (event.event_type === 'assigned') {
    return `Assigned to ${event.new_value}`
  }

  if (event.event_type === 'unassigned') {
    return `Unassigned from ${event.old_value}`
  }

  return `${event.event_type}`
}

export default function TicketDetail({
  ticketId,
  currentUserId,
}: {
  ticketId: string
  currentUserId: string
}) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTicketDetail()
  }, [ticketId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function fetchTicketDetail() {
    setLoading(true)
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`)
      if (res.ok) {
        const data = await res.json()
        setTicket(data.ticket)
        setMessages(data.messages || [])
        setEvents(data.events || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!replyText.trim()) return

    setReplying(true)
    setReplyError(null)
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to send reply')
      }
      const data = await res.json()
      setMessages([...messages, data.message])
      setReplyText('')
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : 'Failed to send reply')
    } finally {
      setReplying(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Loading ticket...</p>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Ticket not found</p>
        <Link href="/support" className="text-green-600 dark:text-green-400 font-medium hover:underline">
          Back to Support
        </Link>
      </div>
    )
  }

  // Combine and sort messages + events by timestamp
  const combined = [
    ...messages.map(m => ({ type: 'message' as const, data: m, timestamp: new Date(m.created_at).getTime() })),
    ...events.map(e => ({ type: 'event' as const, data: e, timestamp: new Date(e.created_at).getTime() })),
  ].sort((a, b) => a.timestamp - b.timestamp)

  return (
    <div className="space-y-6">
      <Link
        href="/support"
        className="text-green-600 dark:text-green-400 font-medium hover:underline inline-flex items-center gap-1"
      >
        ← Back to Support
      </Link>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{ticket.subject}</h1>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[ticket.status]}`}>
                {ticket.status.replace('_', ' ')}
              </span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${PRIORITY_COLORS[ticket.priority]}`}>
                {ticket.priority}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Category</p>
            <p className="text-gray-900 dark:text-white font-medium">{ticket.category}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created</p>
            <p className="text-gray-900 dark:text-white font-medium">{formatDate(ticket.created_at)}</p>
          </div>
          {ticket.assigned_to && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Assigned to</p>
              <p className="text-gray-900 dark:text-white font-medium">{ticket.assignedName || 'Support Team'}</p>
            </div>
          )}
          {ticket.sla_deadline && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">SLA Deadline</p>
              <p className={`font-medium ${isSLABreached(ticket.sla_deadline) ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {formatDate(ticket.sla_deadline)}
                {isSLABreached(ticket.sla_deadline) && ' (Breached)'}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Description</h2>
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ticket.description}</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Conversation</h2>

        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
          {combined.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No messages yet</p>
          ) : (
            combined.map((item, idx) => {
              if (item.type === 'message') {
                const msg = item.data as Message
                const isUser = msg.sender_type === 'user'
                return (
                  <div
                    key={`msg-${msg.id}`}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-3 rounded-lg ${
                        isUser
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                          : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <p className={`text-xs font-medium mb-1 ${isUser ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {msg.sender_name}
                      </p>
                      <p className="text-gray-900 dark:text-white">{msg.message}</p>
                      <p className={`text-xs mt-2 ${isUser ? 'text-green-600 dark:text-green-500' : 'text-gray-500 dark:text-gray-500'}`}>
                        {timeAgo(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              } else {
                const evt = item.data as Event
                return (
                  <div key={`evt-${evt.id}`} className="flex justify-center my-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                      {getEventDescription(evt)}
                    </div>
                  </div>
                )
              }
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendReply} className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply..."
            rows={4}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
          {replyError && (
            <p className="text-red-600 dark:text-red-400 text-sm">{replyError}</p>
          )}
          <button
            type="submit"
            disabled={replying || !replyText.trim()}
            className="bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition"
          >
            {replying ? 'Sending...' : 'Send Reply'}
          </button>
        </form>
      </div>
    </div>
  )
}

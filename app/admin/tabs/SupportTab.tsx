'use client'
import { useState } from 'react'
import { formatRelativeTime } from '@/lib/format-time'

interface SupportTicket {
  id: string
  user_id: string
  subject: string
  description: string
  category: string
  priority: string
  status: string
  assigned_to: string | null
  sla_deadline: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

interface SupportTabProps {
  tickets: SupportTicket[]
  profilesMap: Record<string, { first_name: string | null; last_name: string | null; email: string | null; username: string | null }>
  getDisplayName: (userId: string) => string
  currentUserId: string
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  in_progress: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  resolved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  closed: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  urgent: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
}

export default function SupportTab({ tickets, getDisplayName, currentUserId }: SupportTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  const filtered = tickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const name = getDisplayName(t.user_id).toLowerCase()
      if (!t.subject.toLowerCase().includes(q) && !name.includes(q)) return false
    }
    return true
  })

  const openCount = tickets.filter(t => t.status === 'open').length
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length
  const slaBreachedCount = tickets.filter(t =>
    (t.status === 'open' || t.status === 'in_progress') &&
    t.sla_deadline && new Date(t.sla_deadline) < new Date()
  ).length

  const isSlaBreached = (t: SupportTicket) =>
    (t.status === 'open' || t.status === 'in_progress') &&
    t.sla_deadline && new Date(t.sla_deadline) < new Date()

  const updateTicket = async (ticketId: string, updates: Record<string, string>) => {
    setUpdating(ticketId)
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        // Reload to get fresh data — simple approach
        window.location.reload()
      }
    } catch (err) {
      console.error('Failed to update ticket:', err)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{openCount}</p>
          <p className="text-xs text-blue-600 dark:text-blue-500">Open</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-yellow-700 dark:text-yellow-400">{inProgressCount}</p>
          <p className="text-xs text-yellow-600 dark:text-yellow-500">In Progress</p>
        </div>
        <div className={`${slaBreachedCount > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'} border rounded-lg p-3 text-center`}>
          <p className={`text-xl font-bold ${slaBreachedCount > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>{slaBreachedCount}</p>
          <p className={`text-xs ${slaBreachedCount > 0 ? 'text-red-600 dark:text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>SLA Breached</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search tickets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white">
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white">
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Ticket list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No tickets match your filters.</p>
        )}
        {filtered.map(t => (
          <div key={t.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{t.subject}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] ?? STATUS_COLORS.open}`}>
                    {t.status.replace('_', ' ')}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.medium}`}>
                    {t.priority}
                  </span>
                  <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                    {t.category}
                  </span>
                  {isSlaBreached(t) && (
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400">⚠ SLA breached</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  By {getDisplayName(t.user_id)} · {formatRelativeTime(t.created_at)}
                  {t.assigned_to && ` · Assigned to ${getDisplayName(t.assigned_to)}`}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{t.description}</p>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                {t.status === 'open' && (
                  <button
                    onClick={() => updateTicket(t.id, { status: 'in_progress', assigned_to: currentUserId })}
                    disabled={updating === t.id}
                    className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {updating === t.id ? '...' : 'Claim'}
                  </button>
                )}
                {(t.status === 'open' || t.status === 'in_progress') && (
                  <button
                    onClick={() => updateTicket(t.id, { status: 'resolved' })}
                    disabled={updating === t.id}
                    className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    Resolve
                  </button>
                )}
                {t.status === 'resolved' && (
                  <button
                    onClick={() => updateTicket(t.id, { status: 'closed' })}
                    disabled={updating === t.id}
                    className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    Close
                  </button>
                )}
                {t.priority !== 'urgent' && (t.status === 'open' || t.status === 'in_progress') && (
                  <button
                    onClick={() => updateTicket(t.id, { priority: 'urgent' })}
                    disabled={updating === t.id}
                    className="text-xs text-red-600 dark:text-red-400 px-3 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  >
                    Escalate
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

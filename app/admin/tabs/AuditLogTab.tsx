'use client'
import { useState } from 'react'
import { SearchBar } from './AdminSearchBar'

interface AuditEntry {
  id: string
  admin_id: string
  action: string
  target_type: string
  target_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

// Format details JSONB into a readable summary
function summarizeDetails(details: Record<string, unknown> | null): string | null {
  if (!details || Object.keys(details).length === 0) return null

  const parts: string[] = []

  // Settings changes — show which keys changed
  if (details.changed_keys && Array.isArray(details.changed_keys)) {
    parts.push(`Changed: ${(details.changed_keys as string[]).join(', ')}`)
  }

  // Permission updates
  if (details.permissions && typeof details.permissions === 'object') {
    const perms = details.permissions as Record<string, boolean>
    const enabled = Object.entries(perms).filter(([, v]) => v).map(([k]) => k)
    const disabled = Object.entries(perms).filter(([, v]) => !v).map(([k]) => k)
    if (enabled.length) parts.push(`Enabled: ${enabled.join(', ')}`)
    if (disabled.length) parts.push(`Disabled: ${disabled.join(', ')}`)
  }

  // Notification broadcasts
  if (details.title) parts.push(`"${details.title}"`)
  if (details.count) parts.push(`Sent to ${details.count} user(s)`)

  // Generic fallback — show all key-value pairs
  if (parts.length === 0) {
    for (const [key, val] of Object.entries(details)) {
      if (val !== null && val !== undefined && val !== '') {
        const display = typeof val === 'object' ? JSON.stringify(val) : String(val)
        parts.push(`${key}: ${display.length > 60 ? display.slice(0, 60) + '...' : display}`)
      }
    }
  }

  return parts.length > 0 ? parts.join(' · ') : null
}

// Full timestamp with date + time
function fmtTimestamp(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function AuditLogTab({
  entries,
  getDisplayName,
}: {
  entries: AuditEntry[]
  getDisplayName: (id: string) => string
  fmt: (d: string) => string
}) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = entries.filter(e => {
    const q = search.toLowerCase()
    const detailStr = summarizeDetails(e.details)?.toLowerCase() ?? ''
    return !q
      || e.action.toLowerCase().includes(q)
      || e.target_type.toLowerCase().includes(q)
      || getDisplayName(e.admin_id).toLowerCase().includes(q)
      || (e.target_id?.toLowerCase().includes(q))
      || detailStr.includes(q)
  })

  // Color-code action types
  const actionColor = (action: string) => {
    if (action.includes('delete') || action.includes('suspend') || action.includes('remove') || action.includes('cancel'))
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    if (action.includes('approve') || action.includes('show') || action.includes('reactivate') || action.includes('verify') || action.includes('make'))
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    if (action.includes('hide') || action.includes('lock') || action.includes('deactivate'))
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
    return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
  }

  return (
    <div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search audit log by action, target, admin, or details..." />
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No audit log entries found.</p>}
        {filtered.map(e => {
          const details = summarizeDetails(e.details)
          const isExpanded = expandedId === e.id
          return (
            <div key={e.id}
              onClick={() => setExpandedId(isExpanded ? null : e.id)}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3 cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${actionColor(e.action)}`}>
                    {e.action}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      <span className="font-medium">{getDisplayName(e.admin_id)}</span>
                      {' → '}
                      <span className="text-gray-500 dark:text-gray-400">{e.target_type}</span>
                      {e.target_id && <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">({e.target_id.slice(0, 8)}...)</span>}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{fmtTimestamp(e.created_at)}</span>
              </div>

              {/* Summary line — always visible if details exist */}
              {details && !isExpanded && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 truncate pl-0.5">{details}</p>
              )}

              {/* Expanded details */}
              {isExpanded && e.details && Object.keys(e.details).length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Details</p>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                    {Object.entries(e.details).map(([key, val]) => (
                      <p key={key}>
                        <span className="font-medium text-gray-500 dark:text-gray-400">{key}:</span>{' '}
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {entries.length >= 100 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">Showing the most recent 100 entries.</p>
      )}
    </div>
  )
}

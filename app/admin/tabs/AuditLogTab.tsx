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

export default function AuditLogTab({
  entries,
  getDisplayName,
  fmt,
}: {
  entries: AuditEntry[]
  getDisplayName: (id: string) => string
  fmt: (d: string) => string
}) {
  const [search, setSearch] = useState('')

  const filtered = entries.filter(e => {
    const q = search.toLowerCase()
    return !q
      || e.action.toLowerCase().includes(q)
      || e.target_type.toLowerCase().includes(q)
      || getDisplayName(e.admin_id).toLowerCase().includes(q)
      || (e.target_id?.toLowerCase().includes(q))
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
      <SearchBar value={search} onChange={setSearch} placeholder="Search audit log by action, target type, or admin name..." />
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No audit log entries found.</p>}
        {filtered.map(e => (
          <div key={e.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
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
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{fmt(e.created_at)}</span>
          </div>
        ))}
      </div>
      {entries.length >= 100 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">Showing the most recent 100 entries.</p>
      )}
    </div>
  )
}

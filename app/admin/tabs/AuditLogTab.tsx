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

// Human-friendly setting labels
const SETTING_LABELS: Record<string, string> = {
  registration_enabled: 'Member Registration',
  moderation_mode: 'Post Moderation Mode',
  verification_grace_days: 'Verification Grace Period',
  announcement_enabled: 'Announcement Banner',
  announcement_text: 'Announcement Message',
  announcement_color: 'Announcement Color',
  opportunity_types: 'Opportunity Types',
  marketplace_categories: 'Marketplace Categories',
  monthly_price: 'Monthly Subscription Price',
  annual_price: 'Annual Subscription Price',
  opportunity_daily_limit: 'Opportunity Daily Limit',
  listing_daily_limit: 'Listing Daily Limit',
  report_threshold: 'Report Threshold',
  admin_notification_email: 'Admin Notification Email',
  allow_multi_business: 'Multi-Business Support',
}

// Human-friendly permission labels
const PERM_LABELS: Record<string, string> = {
  opportunities: 'Opportunities',
  marketplace: 'Marketplace',
  community: 'Community Posts',
  research: 'Research Posts',
  grants: 'Grants',
  prices: 'Price Reports',
  mentorship: 'Mentorship',
  comments: 'Comments',
  members: 'Members',
  reports: 'Reports',
  notifications: 'Notifications',
}

// Generate a plain-English description from action + details
function describeAction(action: string, targetType: string, targetId: string | null, details: Record<string, unknown> | null, getDisplayName: (id: string) => string): string {
  const d = details ?? {}

  // Settings changes
  if (action === 'settings.update') {
    const keys = d.changed_keys as string[] | undefined
    if (keys?.length) {
      const labels = keys.map(k => SETTING_LABELS[k] || k)
      return `Updated platform settings: ${labels.join(', ')}`
    }
    return 'Updated platform settings'
  }

  // Member actions
  if (targetType === 'member' || targetType === 'user') {
    const targetName = targetId ? getDisplayName(targetId) : 'a member'

    if (action === 'member.suspend') return `Suspended ${targetName}`
    if (action === 'member.unsuspend') return `Reinstated ${targetName}`
    if (action === 'member.verify') return `Verified ${targetName}`
    if (action === 'member.unverify') return `Removed verification from ${targetName}`
    if (action === 'member.elite') return `Granted Elite status to ${targetName}`
    if (action === 'member.unelite') return `Removed Elite status from ${targetName}`
    if (action === 'member.makemoderator') return `Promoted ${targetName} to Moderator`
    if (action === 'member.makesuper') return `Promoted ${targetName} to Super Admin`
    if (action === 'member.removeadmin') return `Removed admin access from ${targetName}`
    if (action === 'member.update_permissions') {
      const perms = d.permissions as Record<string, boolean> | undefined
      if (perms) {
        const enabled = Object.entries(perms).filter(([, v]) => v).map(([k]) => PERM_LABELS[k] || k)
        return `Updated permissions for ${targetName} — access to: ${enabled.length ? enabled.join(', ') : 'none'}`
      }
      return `Updated permissions for ${targetName}`
    }
  }

  // Content moderation actions
  const moduleLabels: Record<string, string> = {
    opportunity: 'an opportunity',
    listing: 'a marketplace listing',
    community_post: 'a community post',
    research_post: 'a research post',
    comment: 'a comment',
    price_report: 'a price report',
    grant: 'a grant',
    mentor: 'a mentor profile',
    request: 'a mentorship request',
  }
  const target = moduleLabels[targetType] || targetType

  // Parse action verb (e.g. "opportunity.hide" → "hide", or just "hide")
  const verb = action.includes('.') ? action.split('.').pop()! : action

  const verbLabels: Record<string, string> = {
    hide: `Hid ${target}`,
    show: `Restored ${target}`,
    delete: `Deleted ${target}`,
    approve: `Approved ${target}`,
    decline: `Declined ${target}`,
    lock: `Locked ${target}`,
    unlock: `Unlocked ${target}`,
    pin: `Pinned ${target}`,
    unpin: `Unpinned ${target}`,
    deactivate: `Deactivated ${target}`,
    reactivate: `Reactivated ${target}`,
    cancel: `Cancelled ${target}`,
    feature: `Featured ${target}`,
    unfeature: `Unfeatured ${target}`,
    close: `Closed ${target}`,
    reopen: `Reopened ${target}`,
  }

  if (verbLabels[verb]) return verbLabels[verb]

  // Notification broadcasts
  if (action === 'notification.broadcast' || action === 'notification.send') {
    const title = d.title as string | undefined
    const count = d.count as number | undefined
    if (title && count) return `Sent notification "${title}" to ${count} user(s)`
    if (title) return `Sent notification "${title}"`
    return 'Sent a platform notification'
  }

  // Report actions
  if (action === 'reports.dismiss') return `Dismissed reports on ${target}`
  if (action === 'reports.remove') return `Removed a reported post`

  // Fallback
  return `${action} on ${targetType}`
}

// Full timestamp with date + time
function fmtTimestamp(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
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
    const description = describeAction(e.action, e.target_type, e.target_id, e.details, getDisplayName).toLowerCase()
    return !q
      || e.action.toLowerCase().includes(q)
      || e.target_type.toLowerCase().includes(q)
      || getDisplayName(e.admin_id).toLowerCase().includes(q)
      || description.includes(q)
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
      {/* TEMPORARY DEBUG */}
      {entries[0] && (
        <pre className="mb-4 p-2 bg-orange-100 text-xs text-black rounded overflow-x-auto">
          AUDIT DEBUG: admin_id={JSON.stringify(entries[0].admin_id)} | target_id={JSON.stringify(entries[0].target_id)} | getDisplayName(admin_id)={getDisplayName(entries[0].admin_id)} | getDisplayName(target_id)={entries[0].target_id ? getDisplayName(entries[0].target_id) : 'N/A'} | action={entries[0].action}
        </pre>
      )}
      <SearchBar value={search} onChange={setSearch} placeholder="Search audit log by action, admin, or description..." />
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No audit log entries found.</p>}
        {filtered.map(e => {
          const description = describeAction(e.action, e.target_type, e.target_id, e.details, getDisplayName)
          const isExpanded = expandedId === e.id
          const hasDetails = e.details && Object.keys(e.details).length > 0
          return (
            <div key={e.id}
              onClick={() => hasDetails ? setExpandedId(isExpanded ? null : e.id) : null}
              className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3 overflow-hidden ${hasDetails ? 'cursor-pointer hover:border-gray-300 dark:hover:border-gray-700' : ''} transition-colors`}>
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${actionColor(e.action)}`}>
                      {e.action}
                    </span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                      {getDisplayName(e.admin_id)}
                    </span>
                  </div>
                  {/* Human-readable description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 break-words">{description}</p>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0 pt-0.5">
                  {fmtTimestamp(e.created_at)}
                </span>
              </div>

              {/* Expanded raw details — only if clicked and details exist */}
              {isExpanded && hasDetails && (
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">Raw details</p>
                  <pre className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap break-all">
                    {JSON.stringify(e.details, null, 2)}
                  </pre>
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

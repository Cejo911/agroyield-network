'use client'

import { formatRelativeTime } from '@/lib/format-time'

/**
 * Online presence indicator — green pulsing dot if active within 5 mins,
 * gray dot otherwise. Hover shows "Active now" or "Last seen X ago".
 *
 * Usage: <OnlineIndicator lastSeenAt={profile.last_seen_at} />
 *
 * Sizing variants:
 *   sm  — 8px dot  (for inline text / message lists)
 *   md  — 10px dot (default, for cards)
 *   lg  — 12px dot (for profile headers)
 */

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

type Size = 'sm' | 'md' | 'lg'

const SIZE_CLASSES: Record<Size, { dot: string; ping: string }> = {
  sm: { dot: 'w-2 h-2', ping: 'w-2 h-2' },
  md: { dot: 'w-2.5 h-2.5', ping: 'w-2.5 h-2.5' },
  lg: { dot: 'w-3 h-3', ping: 'w-3 h-3' },
}

export default function OnlineIndicator({
  lastSeenAt,
  size = 'md',
  className = '',
}: {
  lastSeenAt: string | null | undefined
  size?: Size
  className?: string
}) {
  if (!lastSeenAt) return null

  const lastSeen = new Date(lastSeenAt)
  // Date.now() during render is intentional here — the indicator is a relative
  // "online now" badge, recomputed on every parent re-render. Refactor planned
  // (H3 backlog) to feed in a memoised "now" snapshot.
  // eslint-disable-next-line react-hooks/purity
  const isOnline = Date.now() - lastSeen.getTime() < ONLINE_THRESHOLD_MS
  const tooltip = isOnline ? 'Active now' : `Last seen ${formatRelativeTime(lastSeen)}`
  const sizeClass = SIZE_CLASSES[size]

  return (
    <span className={`relative inline-flex ${className}`} title={tooltip}>
      {isOnline && (
        <span
          className={`absolute inline-flex ${sizeClass.ping} rounded-full bg-green-400 opacity-75 animate-ping`}
        />
      )}
      <span
        className={`relative inline-flex ${sizeClass.dot} rounded-full ${
          isOnline
            ? 'bg-green-500'
            : 'bg-gray-300 dark:bg-gray-600'
        }`}
      />
    </span>
  )
}

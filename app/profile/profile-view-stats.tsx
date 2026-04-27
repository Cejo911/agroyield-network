import Link from 'next/link'
import Image from 'next/image'
import type { ProfileViewStats, ProfileViewer } from '@/lib/profile-views'

// Server component — purely presentational. The parent /profile page does the
// data fetch and tier check, then hands us the result. Keeping this
// presentation-only means future surfaces (e.g. a homepage widget) can reuse
// the same panel without re-fetching.

const timeAgo = (dateStr: string): string => {
  const diff  = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (hours < 1)  return 'Just now'
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function ProfileViewStatsPanel({
  stats,
  viewers,
  isPro,
}: {
  stats: ProfileViewStats
  viewers: ProfileViewer[] | null   // null when free-tier (we never fetched)
  isPro: boolean
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Profile views</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isPro ? 'See who viewed you in the last 30 days' : 'Aggregate counts across the last 30 days'}
          </p>
        </div>
        {!isPro && (
          <Link
            href="/pricing"
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-green-600 to-emerald-500 text-white hover:from-green-700 hover:to-emerald-600 transition-colors shrink-0"
          >
            Upgrade
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.last7}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Past 7 days</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.last30}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Past 30 days</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">All time</p>
        </div>
      </div>

      {stats.last30 === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
          No views yet. Share your profile or post in the community to get noticed.
        </p>
      ) : isPro && viewers && viewers.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
            Recent viewers ({stats.uniqueViewers30} unique)
          </p>
          <ul className="space-y-2">
            {viewers.map(v => {
              const name = [v.first_name, v.last_name].filter(Boolean).join(' ') || 'Anonymous'
              const href = v.username ? `/u/${v.username}` : `/directory/${v.viewer_id}`
              return (
                <li key={v.viewer_id}>
                  <Link href={href} className="flex items-center gap-3 px-2 py-1.5 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    {v.avatar_url ? (
                      <Image src={v.avatar_url} alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-100 dark:border-gray-800" />
                    ) : (
                      <span className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-sm font-bold flex items-center justify-center shrink-0">
                        {(v.first_name?.[0] || '?').toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {[v.role, v.institution].filter(Boolean).join(' · ') || 'Member'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{timeAgo(v.created_at)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-100 dark:border-green-900/40 rounded-xl px-4 py-5 text-center">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            🔒 See who viewed your profile
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 max-w-sm mx-auto">
            Pro members can see the names, roles, and institutions of everyone who&apos;s checked them out.
          </p>
          <Link
            href="/pricing"
            className="inline-block text-sm font-semibold px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            Upgrade to Pro
          </Link>
        </div>
      )}
    </div>
  )
}

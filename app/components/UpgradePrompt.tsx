'use client'

import Link from 'next/link'
import type { TierName } from '@/lib/tiers'
import { TIERS } from '@/lib/tiers'

interface Props {
  reason: string
  upgradeToTier?: TierName
  usage?: number
  limit?: number | null
  className?: string
}

/**
 * Contextual upgrade banner shown when a user hits a tier limit.
 * Renders inline (not a modal) so it feels like helpful guidance, not a paywall.
 */
export default function UpgradePrompt({ reason, upgradeToTier = 'pro', usage, limit, className = '' }: Props) {
  const tierConfig = TIERS[upgradeToTier]

  return (
    <div className={`bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-lg">🚀</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            {reason}
          </p>
          {usage !== undefined && limit !== null && limit !== undefined && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>{usage} of {limit} used</span>
                <span>{Math.round((usage / limit) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (usage / limit) * 100)}%` }}
                />
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Upgrade to <strong>{tierConfig.label}</strong> for{' '}
            {upgradeToTier === 'growth' ? 'unlimited businesses and ' : ''}
            unlimited invoices, team members, verified badge, and full reports.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Upgrade to {tierConfig.label}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}

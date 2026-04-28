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

/** Key benefits per tier — shown as quick-scan pills */
const TIER_BENEFITS: Record<string, string[]> = {
  pro:    ['Unlimited invoices', 'Unlimited team', 'Verified badge', 'Full reports'],
  growth: ['Unlimited businesses', 'Unlimited invoices', 'Verified badge', 'Priority search'],
}

/**
 * Contextual upgrade banner shown when a user hits a tier limit.
 * Redesigned: gradient background, benefit pills, animated progress bar.
 */
export default function UpgradePrompt({ reason, upgradeToTier = 'pro', usage, limit, className = '' }: Props) {
  const tierConfig = TIERS[upgradeToTier]
  const benefits = TIER_BENEFITS[upgradeToTier] ?? TIER_BENEFITS.pro
  const usagePercent = usage !== undefined && limit ? Math.min(100, Math.round((usage / limit) * 100)) : null

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-green-200 dark:border-green-800/50 ${className}`}>
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-amber-50 dark:from-green-950/40 dark:via-emerald-950/30 dark:to-amber-950/20" />
      {/* Subtle shimmer overlay */}
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage: 'repeating-linear-gradient(110deg, transparent, transparent 8px, rgba(255,255,255,0.8) 8px, rgba(255,255,255,0.8) 10px)',
        }}
      />

      <div className="relative p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg aria-hidden="true" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            {/* Reason / headline */}
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
              {reason}
            </p>

            {/* Progress bar */}
            {usagePercent !== null && limit !== null && limit !== undefined && usage !== undefined && (
              <div className="mt-3 mb-1">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">{usage} of {limit} used</span>
                  <span className={`font-bold ${usagePercent >= 100 ? 'text-red-600 dark:text-red-400' : usagePercent >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                    {usagePercent}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usagePercent >= 100
                        ? 'bg-gradient-to-r from-red-500 to-red-400'
                        : usagePercent >= 80
                        ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                        : 'bg-gradient-to-r from-green-500 to-emerald-400'
                    }`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Benefit pills */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {benefits.map(b => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/70 dark:bg-white/10 text-green-700 dark:text-green-300 border border-green-200/60 dark:border-green-700/40"
                >
                  <svg aria-hidden="true" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {b}
                </span>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-4 flex items-center gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-all shadow-sm hover:shadow"
              >
                Upgrade to {tierConfig.label}
                <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/pricing"
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                Compare plans
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

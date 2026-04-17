'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface BenchmarkData {
  you: { profitMargin: number; expenseRatio: number; collectionRate: number; revenue: number }
  peers: { profitMargin: number; expenseRatio: number; collectionRate: number; revenue: number } | null
  peerCount: number
  peerGroup: string
}

interface BenchmarkResponse {
  benchmarks: BenchmarkData | null
  reason: string | null
  message: string | null
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n).replace('NGN', '₦')
}

/**
 * Peer Comparison card — fetches benchmarks from /api/business/benchmarks
 * and shows your KPIs vs peer medians with directional arrows.
 */
export default function BenchmarkCard({ businessId, period }: { businessId: string; period: string }) {
  const [data, setData] = useState<BenchmarkResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/business/benchmarks?business_id=${businessId}&period=${period}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [businessId, period])

  // Loading state
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  // No sector set — nudge to settings
  if (data?.reason === 'no_sector') {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300">Unlock Peer Benchmarks</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
              Set your sector, state, and business size to see how you compare to similar businesses on the platform.
            </p>
            <Link
              href="/business/setup"
              className="inline-block mt-3 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Complete Business Profile →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // API error or no data
  if (!data?.benchmarks) return null

  const { you, peers, peerCount, peerGroup } = data.benchmarks

  // Not enough peers
  if (!peers) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <p className="text-sm font-bold text-gray-800 dark:text-white">Peer Benchmarks</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{data.message}</p>
            <p className="text-xs text-gray-400 mt-2">Your sector: {peerGroup} · {peerCount} peer{peerCount !== 1 ? 's' : ''} so far</p>
          </div>
        </div>
      </div>
    )
  }

  // Full benchmark comparison
  const metrics = [
    {
      label: 'Profit Margin',
      you: you.profitMargin,
      peer: peers.profitMargin,
      unit: '%',
      higherIsBetter: true,
    },
    {
      label: 'Expense Ratio',
      you: you.expenseRatio,
      peer: peers.expenseRatio,
      unit: '%',
      higherIsBetter: false, // lower is better
    },
    {
      label: 'Collection Rate',
      you: you.collectionRate,
      peer: peers.collectionRate,
      unit: '%',
      higherIsBetter: true,
    },
  ]

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Peer Comparison</p>
          <p className="text-xs text-gray-400 mt-0.5">{peerGroup} · {peerCount} peers</p>
        </div>
        <span className="text-lg">📊</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {metrics.map(m => {
          const diff = m.you - m.peer
          const isGood = m.higherIsBetter ? diff >= 0 : diff <= 0
          const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→'
          const diffAbs = Math.abs(Math.round(diff * 10) / 10)

          return (
            <div key={m.label} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{m.label}</p>
              <div className="flex items-end gap-1.5">
                <span className="text-lg font-bold text-gray-900 dark:text-white">{m.you}{m.unit}</span>
                <span className={`text-xs font-bold mb-0.5 ${isGood ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                  {arrow} {diffAbs}{m.unit}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Peer median: {m.peer}{m.unit}</p>
            </div>
          )
        })}
      </div>

      {/* Revenue comparison — separate row */}
      <div className="mt-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Revenue</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{fmt(you.revenue)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400">Peer median</p>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-0.5">{fmt(peers.revenue)}</p>
        </div>
      </div>

      {/* Actionable insight */}
      {(() => {
        const insights: string[] = []
        if (you.profitMargin < peers.profitMargin - 5) {
          insights.push(`Your margin is ${Math.round(peers.profitMargin - you.profitMargin)}% below peers — review pricing or cut costs`)
        }
        if (you.expenseRatio > peers.expenseRatio + 10) {
          insights.push(`Expenses are ${Math.round(you.expenseRatio - peers.expenseRatio)}% higher than peers — check your top cost categories`)
        }
        if (you.collectionRate < peers.collectionRate - 10) {
          insights.push(`Collection rate is ${Math.round(peers.collectionRate - you.collectionRate)}% behind peers — follow up on unpaid invoices`)
        }
        if (insights.length === 0 && you.profitMargin >= peers.profitMargin) {
          insights.push('You\'re outperforming your peer group — keep it up!')
        }
        if (insights.length === 0) return null
        return (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            {insights.map((insight, i) => (
              <p key={i} className="text-xs text-gray-600 dark:text-gray-400">→ {insight}</p>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

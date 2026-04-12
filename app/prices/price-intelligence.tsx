'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

type PriceReport = {
  id: string
  commodity: string
  category: string | null
  price: number
  unit: string
  market_name: string | null
  state: string | null
  reported_at: string
}

interface Alert {
  id: string
  commodity: string
  state: string | null
  condition: string
  target_price: number
  unit: string
  is_active: boolean
  created_at: string
}

const STATE_COLOURS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#6366f1',
]

export default function PriceIntelligence({
  reports,
  alerts: initialAlerts,
  userId,
}: {
  reports: PriceReport[]
  alerts: Alert[]
  userId: string
}) {
  const supabase = createClient()
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts)

  // Extract unique commodities and states from reports
  const commodities = useMemo(() => [...new Set(reports.map(r => r.commodity))].sort(), [reports])
  const states = useMemo(() => [...new Set(reports.filter(r => r.state).map(r => r.state!))].sort(), [reports])
  const units = useMemo(() => [...new Set(reports.map(r => r.unit))], [reports])

  // Chart selections
  const [trendCommodity, setTrendCommodity] = useState(commodities[0] || '')
  const [trendState, setTrendState] = useState('All')
  const [compareCommodity, setCompareCommodity] = useState(commodities[0] || '')

  // Alert form
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [alertForm, setAlertForm] = useState({ commodity: commodities[0] || '', state: '', condition: 'below', target_price: '', unit: units[0] || 'kg' })
  const [savingAlert, setSavingAlert] = useState(false)
  const [deletingAlert, setDeletingAlert] = useState<string | null>(null)

  // ── TREND DATA ──
  const trendData = useMemo(() => {
    const filtered = reports.filter(r =>
      r.commodity === trendCommodity &&
      (trendState === 'All' || r.state === trendState)
    )

    // Group by date (day)
    const byDate: Record<string, { prices: number[]; date: string }> = {}
    for (const r of filtered) {
      const day = r.reported_at.slice(0, 10)
      if (!byDate[day]) byDate[day] = { prices: [], date: day }
      byDate[day].prices.push(r.price)
    }

    return Object.values(byDate)
      .map(d => ({
        date: new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        rawDate: d.date,
        avg: Math.round(d.prices.reduce((s, p) => s + p, 0) / d.prices.length),
        min: Math.min(...d.prices),
        max: Math.max(...d.prices),
      }))
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
  }, [reports, trendCommodity, trendState])

  // ── CROSS-STATE DATA ──
  const compareData = useMemo(() => {
    const filtered = reports.filter(r => r.commodity === compareCommodity && r.state)

    const byState: Record<string, number[]> = {}
    for (const r of filtered) {
      if (!byState[r.state!]) byState[r.state!] = []
      byState[r.state!].push(r.price)
    }

    return Object.entries(byState)
      .map(([state, prices]) => ({
        state,
        avg: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
        reports: prices.length,
      }))
      .sort((a, b) => a.avg - b.avg)
  }, [reports, compareCommodity])

  // ── FORMAT ──
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n)

  // ── ALERT HANDLERS ──
  async function saveAlert(e: React.FormEvent) {
    e.preventDefault()
    setSavingAlert(true)
    const { data, error } = await supabase.from('price_alerts').insert({
      user_id: userId,
      commodity: alertForm.commodity,
      state: alertForm.state || null,
      condition: alertForm.condition,
      target_price: parseFloat(alertForm.target_price),
      unit: alertForm.unit,
    }).select().single()

    if (error) {
      console.error('Alert insert error:', error)
      alert(`Failed to create alert: ${error.message}`)
      setSavingAlert(false)
      return
    }
    if (data) {
      setAlerts(prev => [data, ...prev])
      setShowAlertForm(false)
      setAlertForm({ ...alertForm, target_price: '' })
    }
    setSavingAlert(false)
  }
  async function deleteAlert(id: string) {
    setDeletingAlert(id)
    await supabase.from('price_alerts').delete().eq('id', id)
    setAlerts(prev => prev.filter(a => a.id !== id))
    setDeletingAlert(null)
  }

  if (commodities.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg mb-2">No price data yet</p>
        <p className="text-sm">Report some prices first to see trends and comparisons.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ── PRICE TREND CHART ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Price Trends</h2>
          <div className="flex gap-2">
            <select
              value={trendCommodity}
              onChange={e => setTrendCommodity(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              {commodities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={trendState}
              onChange={e => setTrendState(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <option value="All">All States</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {trendData.length < 2 ? (
          <p className="text-sm text-gray-400 py-8 text-center">Need at least 2 data points to show a trend. More reports = better charts.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value) => [fmt(Number(value)), '']}
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '13px' }}
                labelStyle={{ color: '#9ca3af' }}
                itemStyle={{ color: '#22c55e' }}
              />
              <Legend />
              <Line type="monotone" dataKey="avg" stroke="#22c55e" strokeWidth={2.5} name="Average" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="min" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 4" name="Lowest" dot={false} />
              <Line type="monotone" dataKey="max" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" name="Highest" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── CROSS-STATE COMPARISON ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Cross-State Comparison</h2>
          <select
            value={compareCommodity}
            onChange={e => setCompareCommodity(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            {commodities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {compareData.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">No state-level data for {compareCommodity}.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(200, compareData.length * 45)}>
              <BarChart data={compareData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="state" tick={{ fontSize: 12 }} stroke="#9ca3af" width={80} />
                <Tooltip
                  formatter={(value) => [fmt(Number(value)), 'Avg Price']}
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '13px' }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Bar dataKey="avg" fill="#22c55e" radius={[0, 6, 6, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>

            {/* Summary insight */}
            {compareData.length >= 2 && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-300">
                  <strong>{compareCommodity}</strong> is cheapest in{' '}
                  <strong>{compareData[0].state}</strong> ({fmt(compareData[0].avg)}) and most expensive in{' '}
                  <strong>{compareData[compareData.length - 1].state}</strong> ({fmt(compareData[compareData.length - 1].avg)}).
                  {' '}Price difference: <strong>{fmt(compareData[compareData.length - 1].avg - compareData[0].avg)}</strong>.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── PRICE ALERTS ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Price Alerts</h2>
          {!showAlertForm && (
            <button
              onClick={() => setShowAlertForm(true)}
              className="text-sm font-semibold bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg transition-colors"
            >
              + New Alert
            </button>
          )}
        </div>

        {/* Alert form */}
        {showAlertForm && (
          <form onSubmit={saveAlert} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-5 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Commodity</label>
                <select
                  value={alertForm.commodity}
                  onChange={e => setAlertForm({ ...alertForm, commodity: e.target.value })}
                  className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {commodities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">State (optional)</label>
                <select
                  value={alertForm.state}
                  onChange={e => setAlertForm({ ...alertForm, state: e.target.value })}
                  className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Any State</option>
                  {states.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Condition</label>
                <select
                  value={alertForm.condition}
                  onChange={e => setAlertForm({ ...alertForm, condition: e.target.value })}
                  className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="below">Drops below</option>
                  <option value="above">Rises above</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Target Price (₦)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="0"
                  value={alertForm.target_price}
                  onChange={e => setAlertForm({ ...alertForm, target_price: e.target.value })}
                  className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowAlertForm(false)}
                className="text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-4 py-1.5 rounded-lg">
                Cancel
              </button>
              <button type="submit" disabled={savingAlert || !alertForm.target_price}
                className="text-sm bg-green-700 hover:bg-green-800 text-white font-semibold px-4 py-1.5 rounded-lg disabled:opacity-50">
                {savingAlert ? 'Saving...' : 'Create Alert'}
              </button>
            </div>
          </form>
        )}

        {/* Active alerts */}
        {alerts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No alerts set. Create one to get notified when prices hit your target.
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3 border border-gray-100 dark:border-gray-800 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg">{a.condition === 'below' ? '📉' : '📈'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {a.commodity} {a.condition === 'below' ? 'drops below' : 'rises above'} {fmt(a.target_price)}/{a.unit}
                    </p>
                    <p className="text-xs text-gray-400">
                      {a.state || 'Any state'} · Created {new Date(a.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteAlert(a.id)}
                  disabled={deletingAlert === a.id}
                  className="text-gray-300 hover:text-red-500 transition-colors text-lg shrink-0"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

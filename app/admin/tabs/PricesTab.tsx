'use client'
import { useState } from 'react'
import { SearchBar, FilterPills } from './AdminSearchBar'

interface PriceReport {
  id: string
  user_id: string
  commodity: string
  state: string
  market_name: string
  price: number
  unit: string
  reported_at: string
  is_active?: boolean
}

export default function PricesTab({
  reports: initialReports,
  getDisplayName,
  fmt,
}: {
  reports: PriceReport[]
  getDisplayName: (id: string) => string
  fmt: (d: string) => string
}) {
  const [reports, setReports] = useState(initialReports)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const action = async (id: string, priceAction: string) => {
    setReports(prev => prev.map(r => {
      if (r.id !== id) return r
      if (priceAction === 'hide' || priceAction === 'delete') return { ...r, is_active: false }
      if (priceAction === 'show') return { ...r, is_active: true }
      return r
    }))
    await fetch('/api/admin/prices', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: priceAction }),
    })
  }

  const filtered = reports.filter(r => {
    const q = search.toLowerCase()
    const matchesSearch = !q || r.commodity?.toLowerCase().includes(q) || r.state?.toLowerCase().includes(q) || r.market_name?.toLowerCase().includes(q) || getDisplayName(r.user_id).toLowerCase().includes(q)
    const isActive = r.is_active !== false // treat undefined/null as active
    const matchesFilter = filter === 'all'
      || (filter === 'active' && isActive)
      || (filter === 'hidden' && !isActive)
    return matchesSearch && matchesFilter
  })

  const activeCount = reports.filter(r => r.is_active !== false).length
  const hiddenCount = reports.filter(r => r.is_active === false).length

  return (
    <div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search price reports by commodity, state, market, or reporter..." />
      <FilterPills value={filter} onChange={setFilter} options={[
        { id: 'all', label: `All (${reports.length})` },
        { id: 'active', label: `Active (${activeCount})` },
        { id: 'hidden', label: `Hidden (${hiddenCount})` },
      ]} />
      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No price reports found.</p>}
        {filtered.map(r => (
          <div key={r.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900 dark:text-gray-100">{r.commodity}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400">₦{r.price?.toLocaleString()}/{r.unit}</span>
                {r.is_active === false && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Hidden</span>}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{r.market_name}, {r.state}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">by {getDisplayName(r.user_id)} · {fmt(r.reported_at)}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
              {r.is_active === false ? (
                <button onClick={() => action(r.id, 'show')} className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-md hover:bg-green-200">Show</button>
              ) : (
                <button onClick={() => action(r.id, 'hide')} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">Hide</button>
              )}
              <button onClick={() => action(r.id, 'delete')} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

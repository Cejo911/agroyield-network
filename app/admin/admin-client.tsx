'use client'

import { useState } from 'react'

type Row = Record<string, unknown>

type Props = {
  opportunities: Row[]
  listings: Row[]
  members: Row[]
  profilesMap: Record<string, { first_name: string | null; last_name: string | null }>
}

type Tab = 'opportunities' | 'listings' | 'members'

function formatDate(val: unknown): string {
  if (typeof val !== 'string') return '—'
  return new Date(val).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminClient({ opportunities: init_o, listings: init_l, members: init_m, profilesMap }: Props) {
  const [tab, setTab]               = useState<Tab>('opportunities')
  const [opportunities, setOpps]    = useState(init_o)
  const [listings, setListings]     = useState(init_l)
  const [members, setMembers]       = useState(init_m)
  const [loadingId, setLoadingId]   = useState<string | null>(null)

  const posterName = (userId: unknown) => {
    if (typeof userId !== 'string') return 'Unknown'
    const p = profilesMap[userId]
    if (!p) return 'Unknown'
    return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unknown'
  }

  const toggleOpportunity = async (id: string, current: boolean) => {
    setLoadingId(id)
    await fetch('/api/admin/opportunity', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !current }),
    })
    setOpps(prev => prev.map(o => o.id === id ? { ...o, is_active: !current } : o))
    setLoadingId(null)
  }

  const toggleListing = async (id: string, current: boolean) => {
    setLoadingId(id)
    await fetch('/api/admin/listing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !current }),
    })
    setListings(prev => prev.map(l => l.id === id ? { ...l, is_active: !current } : l))
    setLoadingId(null)
  }

  const toggleMember = async (id: string, current: boolean) => {
    setLoadingId(id)
    await fetch('/api/admin/member', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, is_suspended: !current }),
    })
    setMembers(prev => prev.map(m => m.id === id ? { ...m, is_suspended: !current } : m))
    setLoadingId(null)
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'opportunities', label: 'Opportunities', count: opportunities.length },
    { key: 'listings',      label: 'Marketplace',   count: listings.length },
    { key: 'members',       label: 'Members',        count: members.length },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label} <span className="ml-1 text-xs text-gray-400">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Opportunities */}
      {tab === 'opportunities' && (
        <div className="space-y-3">
          {opportunities.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No opportunities yet.</p>}
          {opportunities.map(o => {
            const id = o.id as string
            const isActive = o.is_active as boolean
            return (
              <div key={id} className={`flex items-start justify-between gap-4 bg-white rounded-xl border border-gray-100 p-4 ${!isActive ? 'opacity-60' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {isActive ? 'Active' : 'Removed'}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">{o.type as string}</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm truncate">{o.title as string}</p>
                  <p className="text-xs text-gray-500 mt-0.5">By {posterName(o.user_id)} · {formatDate(o.created_at)}</p>
                </div>
                <button onClick={() => toggleOpportunity(id, isActive)} disabled={loadingId === id}
                  className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                    isActive ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'
                  }`}>
                  {loadingId === id ? '…' : isActive ? 'Remove' : 'Restore'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Marketplace */}
      {tab === 'listings' && (
        <div className="space-y-3">
          {listings.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No listings yet.</p>}
          {listings.map(l => {
            const id = l.id as string
            const isActive = l.is_active as boolean
            return (
              <div key={id} className={`flex items-start justify-between gap-4 bg-white rounded-xl border border-gray-100 p-4 ${!isActive ? 'opacity-60' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {isActive ? 'Active' : 'Removed'}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">{l.category as string}</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm truncate">{l.title as string}</p>
                  <p className="text-xs text-gray-500 mt-0.5">By {posterName(l.user_id)} · {formatDate(l.created_at)}</p>
                </div>
                <button onClick={() => toggleListing(id, isActive)} disabled={loadingId === id}
                  className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                    isActive ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'
                  }`}>
                  {loadingId === id ? '…' : isActive ? 'Remove' : 'Restore'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Members */}
      {tab === 'members' && (
        <div className="space-y-3">
          {members.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No members yet.</p>}
          {members.map(m => {
            const id = m.id as string
            const isSuspended = m.is_suspended as boolean
            const isAdmin = m.is_admin as boolean
            const name = `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || 'Unnamed member'
            return (
              <div key={id} className={`flex items-start justify-between gap-4 bg-white rounded-xl border border-gray-100 p-4 ${isSuspended ? 'opacity-60' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isSuspended ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                      {isSuspended ? 'Suspended' : 'Active'}
                    </span>
                    {isAdmin && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Admin</span>}
                    {m.role && <span className="text-xs text-gray-400 capitalize">{m.role as string}</span>}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{name}</p>
                  {m.institution && <p className="text-xs text-gray-500 mt-0.5 truncate">{m.institution as string}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">Joined {formatDate(m.created_at)}</p>
                </div>
                {!isAdmin && (
                  <button onClick={() => toggleMember(id, isSuspended)} disabled={loadingId === id}
                    className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                      isSuspended ? 'border-green-200 text-green-600 hover:bg-green-50' : 'border-red-200 text-red-600 hover:bg-red-50'
                    }`}>
                    {loadingId === id ? '…' : isSuspended ? 'Unsuspend' : 'Suspend'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

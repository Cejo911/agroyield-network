'use client'

import { useState } from 'react'

type Row = Record<string, unknown>

type Props = {
  opportunities: Row[]
  listings: Row[]
  members: Row[]
  profilesMap: Record<string, { first_name: string | null; last_name: string | null }>
  settingsMap: Record<string, string>
}

type Tab = 'opportunities' | 'listings' | 'members' | 'settings'

function formatDate(val: unknown): string {
  if (typeof val !== 'string') return '—'
  return new Date(val).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminClient({ opportunities: init_o, listings: init_l, members: init_m, profilesMap, settingsMap }: Props) {
  const [tab, setTab]             = useState<Tab>('opportunities')
  const [opportunities, setOpps]  = useState(init_o)
  const [listings, setListings]   = useState(init_l)
  const [members, setMembers]     = useState(init_m)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  // Settings state — pre-filled from DB
  const [monthlyNaira,  setMonthlyNaira]  = useState(settingsMap['subscription_monthly_naira']  ?? '2500')
  const [yearlyNaira,   setYearlyNaira]   = useState(settingsMap['subscription_yearly_naira']   ?? '25000')
  const [monthlyLabel,  setMonthlyLabel]  = useState(settingsMap['subscription_monthly_label']  ?? 'Monthly Verification')
  const [yearlyLabel,   setYearlyLabel]   = useState(settingsMap['subscription_yearly_label']   ?? 'Yearly Verification')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved,  setSettingsSaved]  = useState(false)
  const [settingsError,  setSettingsError]  = useState<string | null>(null)

  const saveSettings = async () => {
    setSavingSettings(true)
    setSettingsSaved(false)
    setSettingsError(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_monthly_naira: monthlyNaira,
          subscription_yearly_naira:  yearlyNaira,
          subscription_monthly_label: monthlyLabel,
          subscription_yearly_label:  yearlyLabel,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    } catch {
      setSettingsError('Failed to save settings. Please try again.')
    } finally {
      setSavingSettings(false)
    }
  }

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

  const memberAction = async (id: string, action: string, updateKey: string, updateVal: boolean) => {
    setLoadingId(`${id}-${action}`)
    await fetch('/api/admin/member', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, action }),
    })
    setMembers(prev => prev.map(m => m.id === id ? { ...m, [updateKey]: updateVal } : m))
    setLoadingId(null)
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'opportunities', label: 'Opportunities', count: opportunities.length },
    { key: 'listings',      label: 'Marketplace',   count: listings.length },
    { key: 'members',       label: 'Members',        count: members.length },
    { key: 'settings',      label: '⚙ Settings' },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1 text-xs text-gray-400">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Opportunities */}
      {tab === 'opportunities' && (
        <div className="space-y-3">
          {opportunities.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">No opportunities yet.</p>
          )}
          {opportunities.map(o => {
            const id = o.id as string
            const isActive = o.is_active as boolean
            const type = typeof o.type === 'string' ? o.type : ''
            const title = typeof o.title === 'string' ? o.title : ''
            return (
              <div key={id} className={`flex items-start justify-between gap-4 bg-white rounded-xl border border-gray-100 p-4 ${!isActive ? 'opacity-60' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {isActive ? 'Active' : 'Removed'}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">{type}</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm truncate">{title}</p>
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
          {listings.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">No listings yet.</p>
          )}
          {listings.map(l => {
            const id = l.id as string
            const isActive = l.is_active as boolean
            const category = typeof l.category === 'string' ? l.category : ''
            const title = typeof l.title === 'string' ? l.title : ''
            return (
              <div key={id} className={`flex items-start justify-between gap-4 bg-white rounded-xl border border-gray-100 p-4 ${!isActive ? 'opacity-60' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {isActive ? 'Active' : 'Removed'}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">{category}</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm truncate">{title}</p>
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
          {members.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">No members yet.</p>
          )}
          {members.map(m => {
            const id          = m.id as string
            const isSuspended = m.is_suspended as boolean
            const isAdmin     = m.is_admin as boolean
            const isVerified  = m.is_verified as boolean
            const isElite     = m.is_elite as boolean
            const role        = typeof m.role === 'string' ? m.role : ''
            const institution = typeof m.institution === 'string' ? m.institution : ''
            const name        = `${typeof m.first_name === 'string' ? m.first_name : ''} ${typeof m.last_name === 'string' ? m.last_name : ''}`.trim() || 'Unnamed member'
            return (
              <div key={id} className={`flex items-start justify-between gap-4 bg-white rounded-xl border border-gray-100 p-4 ${isSuspended ? 'opacity-60' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isSuspended ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                      {isSuspended ? 'Suspended' : 'Active'}
                    </span>
                    {isAdmin && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Admin</span>
                    )}
                    {isVerified && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600">✓ Verified</span>
                    )}
                    {isElite && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">★ Elite</span>
                    )}
                    {role && <span className="text-xs text-gray-400 capitalize">{role}</span>}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{name}</p>
                  {institution && <p className="text-xs text-gray-500 mt-0.5 truncate">{institution}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">Joined {formatDate(m.created_at)}</p>
                </div>

                {!isAdmin && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => memberAction(id, isSuspended ? 'unsuspend' : 'suspend', 'is_suspended', !isSuspended)}
                      disabled={loadingId === `${id}-suspend` || loadingId === `${id}-unsuspend`}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                        isSuspended ? 'border-green-200 text-green-600 hover:bg-green-50' : 'border-red-200 text-red-600 hover:bg-red-50'
                      }`}>
                      {isSuspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                    <button
                      onClick={() => memberAction(id, isVerified ? 'unverify' : 'verify', 'is_verified', !isVerified)}
                      disabled={loadingId === `${id}-verify` || loadingId === `${id}-unverify`}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                        isVerified ? 'border-gray-200 text-gray-600 hover:bg-gray-50' : 'border-green-200 text-green-600 hover:bg-green-50'
                      }`}>
                      {isVerified ? 'Unverify' : 'Verify ✓'}
                    </button>
                    <button
                      onClick={() => memberAction(id, isElite ? 'unelite' : 'elite', 'is_elite', !isElite)}
                      disabled={loadingId === `${id}-elite` || loadingId === `${id}-unelite`}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                        isElite ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                      }`}>
                      {isElite ? 'Revoke Crown' : 'Grant Crown ★'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Settings */}
      {tab === 'settings' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Subscription Pricing</h2>
            <p className="text-sm text-gray-500">Changes take effect immediately for all new payments.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Monthly */}
            <div className="space-y-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
              <p className="text-sm font-semibold text-gray-700">Monthly Plan</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Price (₦)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₦</span>
                  <input
                    type="number"
                    min="0"
                    value={monthlyNaira}
                    onChange={e => setMonthlyNaira(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Label (shown on Paystack)</label>
                <input
                  type="text"
                  value={monthlyLabel}
                  onChange={e => setMonthlyLabel(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                />
              </div>
            </div>

            {/* Yearly */}
            <div className="space-y-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
              <p className="text-sm font-semibold text-gray-700">Yearly Plan</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Price (₦)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₦</span>
                  <input
                    type="number"
                    min="0"
                    value={yearlyNaira}
                    onChange={e => setYearlyNaira(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Label (shown on Paystack)</label>
                <input
                  type="text"
                  value={yearlyLabel}
                  onChange={e => setYearlyLabel(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-800">
            <p className="font-semibold mb-1">Live preview</p>
            <p>Monthly: <strong>₦{parseInt(monthlyNaira || '0').toLocaleString()}</strong> — {monthlyLabel}</p>
            <p>Yearly: <strong>₦{parseInt(yearlyNaira || '0').toLocaleString()}</strong> — {yearlyLabel}</p>
            <p className="text-xs text-green-600 mt-1">
              Yearly saves ₦{Math.max(0, (parseInt(monthlyNaira || '0') * 12) - parseInt(yearlyNaira || '0')).toLocaleString()} vs paying monthly
            </p>
          </div>

          {settingsError && (
            <p className="text-sm text-red-600">{settingsError}</p>
          )}

          <button
            onClick={saveSettings}
            disabled={savingSettings}
            className="w-full sm:w-auto bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50">
            {savingSettings ? 'Saving…' : settingsSaved ? '✓ Saved!' : 'Save Pricing'}
          </button>
        </div>
      )}
    </div>
  )
}

'use client'
import { useState } from 'react'

type Row = Record<string, unknown>

type ReportGroup = {
  postId:    string
  postType:  'opportunity' | 'listing'
  postTitle: string
  isActive:  boolean
  count:     number
  reasons:   Record<string, number>
  latestAt:  string
}

type Props = {
  opportunities:    Row[]
  listings:         Row[]
  members:          Row[]
  reportGroups:     ReportGroup[]
  profilesMap:      Record<string, { first_name: string | null; last_name: string | null }>
  settingsMap:      Record<string, string>
  currentAdminRole: string
  currentUserId:    string
}

type Tab = 'opportunities' | 'listings' | 'members' | 'reports' | 'settings'

function formatDate(val: unknown): string {
  if (typeof val !== 'string') return '—'
  return new Date(val).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

const ANNOUNCEMENT_COLORS = [
  { value: 'green',  label: 'Green',  preview: 'bg-green-600'  },
  { value: 'yellow', label: 'Yellow', preview: 'bg-yellow-400' },
  { value: 'red',    label: 'Red',    preview: 'bg-red-600'    },
  { value: 'blue',   label: 'Blue',   preview: 'bg-blue-600'   },
]

const ANNOUNCEMENT_COLOR_CLASSES: Record<string, string> = {
  green:  'bg-green-600 text-white',
  yellow: 'bg-yellow-400 text-yellow-900',
  red:    'bg-red-600 text-white',
  blue:   'bg-blue-600 text-white',
}

export default function AdminClient({
  opportunities: init_o,
  listings: init_l,
  members: init_m,
  reportGroups: init_r,
  profilesMap,
  settingsMap,
  currentAdminRole,
  currentUserId,
}: Props) {
  const isSuperAdmin = currentAdminRole === 'super'

  const [tab, setTab]              = useState<Tab>('opportunities')
  const [opportunities, setOpps]   = useState(init_o)
  const [listings, setListings]    = useState(init_l)
  const [members, setMembers]      = useState(init_m)
  const [reportGroups, setReports] = useState(init_r)
  const [loadingId, setLoadingId]  = useState<string | null>(null)

  // Announcement banner settings
  const [announcementEnabled, setAnnouncementEnabled] = useState(settingsMap['announcement_enabled'] === 'true')
  const [announcementText,    setAnnouncementText]    = useState(settingsMap['announcement_text']    ?? '')
  const [announcementColor,   setAnnouncementColor]   = useState(settingsMap['announcement_color']   ?? 'green')

  // Pricing settings
  const [monthlyNaira,  setMonthlyNaira]  = useState(settingsMap['subscription_monthly_naira']  ?? '2500')
  const [yearlyNaira,   setYearlyNaira]   = useState(settingsMap['subscription_yearly_naira']   ?? '25000')
  const [monthlyLabel,  setMonthlyLabel]  = useState(settingsMap['subscription_monthly_label']  ?? 'Monthly Verification')
  const [yearlyLabel,   setYearlyLabel]   = useState(settingsMap['subscription_yearly_label']   ?? 'Yearly Verification')

  // Rate limit settings
  const [rateLimitOpps,   setRateLimitOpps]   = useState(settingsMap['rate_limit_opportunities'] ?? '3')
  const [rateLimitMarket, setRateLimitMarket] = useState(settingsMap['rate_limit_marketplace']   ?? '5')

  // Report threshold
  const [reportThreshold, setReportThreshold] = useState(settingsMap['report_threshold'] ?? '3')

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
          announcement_enabled:       announcementEnabled ? 'true' : 'false',
          announcement_text:          announcementText,
          announcement_color:         announcementColor,
          subscription_monthly_naira: monthlyNaira,
          subscription_yearly_naira:  yearlyNaira,
          subscription_monthly_label: monthlyLabel,
          subscription_yearly_label:  yearlyLabel,
          rate_limit_opportunities:   rateLimitOpps,
          rate_limit_marketplace:     rateLimitMarket,
          report_threshold:           reportThreshold,
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

  const memberAction = async (id: string, action: string, stateUpdate: Partial<Row>) => {
    setLoadingId(`${id}-${action}`)
    await fetch('/api/admin/member', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, action }),
    })
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...stateUpdate } : m))
    setLoadingId(null)
  }

  const restorePost = async (postId: string, postType: 'opportunity' | 'listing') => {
    setLoadingId(`restore-${postId}`)
    const endpoint = postType === 'opportunity' ? '/api/admin/opportunity' : '/api/admin/listing'
    await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postId, is_active: true }),
    })
    setReports(prev => prev.map(g =>
      g.postId === postId && g.postType === postType ? { ...g, isActive: true } : g
    ))
    setLoadingId(null)
  }

  const dismissReports = async (postId: string, postType: 'opportunity' | 'listing') => {
    setLoadingId(`dismiss-${postId}`)
    const res = await fetch('/api/admin/reports', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, postType }),
    })
    if (!res.ok) {
      alert('Failed to dismiss reports. Please try again.')
      setLoadingId(null)
      return
    }
    setReports(prev => prev.filter(g => !(g.postId === postId && g.postType === postType)))
    setLoadingId(null)
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'opportunities', label: 'Opportunities', count: opportunities.length },
    { key: 'listings',      label: 'Marketplace',   count: listings.length },
    { key: 'members',       label: 'Members',        count: members.length },
    { key: 'reports',       label: '🚩 Reports',     count: reportGroups.length },
    ...(isSuperAdmin ? [{ key: 'settings' as Tab, label: '⚙ Settings' }] : []),
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
            {t.count !== undefined && (
              <span className={`ml-1 text-xs ${t.key === 'reports' && t.count > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                ({t.count})
              </span>
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
            const id       = o.id as string
            const isActive = o.is_active as boolean
            const type     = typeof o.type  === 'string' ? o.type  : ''
            const title    = typeof o.title === 'string' ? o.title : ''
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
            const id       = l.id as string
            const isActive = l.is_active as boolean
            const category = typeof l.category === 'string' ? l.category : ''
            const title    = typeof l.title    === 'string' ? l.title    : ''
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
            const id              = m.id as string
            const isSuspended     = m.is_suspended as boolean
            const isAdmin         = m.is_admin as boolean
            const isVerified      = m.is_verified as boolean
            const isElite         = m.is_elite as boolean
            const memberAdminRole = typeof m.admin_role  === 'string' ? m.admin_role  : null
            const role            = typeof m.role        === 'string' ? m.role        : ''
            const institution     = typeof m.institution === 'string' ? m.institution : ''
            const name            = `${typeof m.first_name === 'string' ? m.first_name : ''} ${typeof m.last_name === 'string' ? m.last_name : ''}`.trim() || 'Unnamed member'
            const isCurrentUser   = id === currentUserId
            return (
              <div key={id} className={`flex items-start justify-between gap-4 bg-white rounded-xl border border-gray-100 p-4 ${isSuspended ? 'opacity-60' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isSuspended ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                      {isSuspended ? 'Suspended' : 'Active'}
                    </span>
                    {isAdmin && memberAdminRole === 'super' && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Super Admin</span>
                    )}
                    {isAdmin && memberAdminRole === 'moderator' && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Moderator</span>
                    )}
                    {isVerified && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600">✓ Verified</span>
                    )}
                    {isElite && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">★ Elite</span>
                    )}
                    {role && <span className="text-xs text-gray-400 capitalize">{role}</span>}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {name} {isCurrentUser && <span className="text-xs text-gray-400 font-normal">(you)</span>}
                  </p>
                  {institution && <p className="text-xs text-gray-500 mt-0.5 truncate">{institution}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">Joined {formatDate(m.created_at)}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {!isCurrentUser && (
                    <button
                      onClick={() => memberAction(id, isSuspended ? 'unsuspend' : 'suspend', { is_suspended: !isSuspended })}
                      disabled={loadingId === `${id}-suspend` || loadingId === `${id}-unsuspend`}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                        isSuspended ? 'border-green-200 text-green-600 hover:bg-green-50' : 'border-red-200 text-red-600 hover:bg-red-50'
                      }`}>
                      {isSuspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                  )}
                  {isSuperAdmin && (
                    <>
                      <button
                        onClick={() => memberAction(id, isVerified ? 'unverify' : 'verify', { is_verified: !isVerified })}
                        disabled={loadingId === `${id}-verify` || loadingId === `${id}-unverify`}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                          isVerified ? 'border-gray-200 text-gray-600 hover:bg-gray-50' : 'border-green-200 text-green-600 hover:bg-green-50'
                        }`}>
                        {isVerified ? 'Unverify' : 'Verify ✓'}
                      </button>
                      <button
                        onClick={() => memberAction(id, isElite ? 'unelite' : 'elite', { is_elite: !isElite })}
                        disabled={loadingId === `${id}-elite` || loadingId === `${id}-unelite`}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                          isElite ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                        }`}>
                        {isElite ? 'Revoke Crown' : 'Grant Crown ★'}
                      </button>
                    </>
                  )}
                  {isSuperAdmin && !isCurrentUser && (
                    <div className="flex flex-col gap-1.5 pt-1.5 mt-0.5 border-t border-gray-100">
                      {!isAdmin && (
                        <>
                          <button
                            onClick={() => memberAction(id, 'makemoderator', { is_admin: true, admin_role: 'moderator' })}
                            disabled={loadingId === `${id}-makemoderator`}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50">
                            Make Moderator
                          </button>
                          <button
                            onClick={() => memberAction(id, 'makesuper', { is_admin: true, admin_role: 'super' })}
                            disabled={loadingId === `${id}-makesuper`}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-50">
                            Make Super Admin
                          </button>
                        </>
                      )}
                      {isAdmin && memberAdminRole === 'moderator' && (
                        <>
                          <button
                            onClick={() => memberAction(id, 'makesuper', { is_admin: true, admin_role: 'super' })}
                            disabled={loadingId === `${id}-makesuper`}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-50">
                            Upgrade to Super Admin
                          </button>
                          <button
                            onClick={() => memberAction(id, 'removeadmin', { is_admin: false, admin_role: null })}
                            disabled={loadingId === `${id}-removeadmin`}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50">
                            Remove Admin
                          </button>
                        </>
                      )}
                      {isAdmin && memberAdminRole === 'super' && (
                        <>
                          <button
                            onClick={() => memberAction(id, 'makemoderator', { is_admin: true, admin_role: 'moderator' })}
                            disabled={loadingId === `${id}-makemoderator`}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50">
                            Downgrade to Moderator
                          </button>
                          <button
                            onClick={() => memberAction(id, 'removeadmin', { is_admin: false, admin_role: null })}
                            disabled={loadingId === `${id}-removeadmin`}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50">
                            Remove Admin
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Reports */}
      {tab === 'reports' && (
        <div className="space-y-3">
          {reportGroups.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">No reports yet.</p>
          )}
          {reportGroups.map(g => (
            <div key={`${g.postType}:${g.postId}`}
              className={`bg-white rounded-xl border p-4 ${!g.isActive ? 'border-red-100' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      !g.isActive ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                    }`}>
                      {!g.isActive ? 'Auto-hidden' : 'Active'}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">
                      {g.postType === 'listing' ? 'Marketplace' : 'Opportunity'}
                    </span>
                    <span className="text-xs font-semibold text-orange-600">
                      {g.count} report{g.count === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm truncate">{g.postTitle}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Object.entries(g.reasons).map(([reason, cnt]) => (
                      <span key={reason} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {reason}: {cnt}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Latest report: {formatDate(g.latestAt)}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => dismissReports(g.postId, g.postType)}
                    disabled={loadingId === `dismiss-${g.postId}`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50">
                    {loadingId === `dismiss-${g.postId}` ? '…' : '✓ Dismiss'}
                  </button>
                  {g.isActive ? (
                    <button
                      onClick={() => {
                        if (g.postType === 'opportunity') toggleOpportunity(g.postId, true)
                        else toggleListing(g.postId, true)
                      }}
                      disabled={loadingId === g.postId}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                      {loadingId === g.postId ? '…' : 'Remove'}
                    </button>
                  ) : (
                    <button
                      onClick={() => restorePost(g.postId, g.postType)}
                      disabled={loadingId === `restore-${g.postId}`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50">
                      {loadingId === `restore-${g.postId}` ? '…' : 'Restore only'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settings — super admin only */}
      {tab === 'settings' && isSuperAdmin && (
        <div className="space-y-8">

          {/* Announcement Banner */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-1">Announcement Banner</h2>
              <p className="text-sm text-gray-500">Show a site-wide message at the top of every page.</p>
            </div>

            {/* Enable toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50">
              <div>
                <p className="text-sm font-semibold text-gray-700">Show banner</p>
                <p className="text-xs text-gray-400 mt-0.5">Visible to all visitors when enabled</p>
              </div>
              <button
                type="button"
                onClick={() => setAnnouncementEnabled(prev => !prev)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  announcementEnabled ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  announcementEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Message */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Message</label>
              <input
                type="text"
                value={announcementText}
                onChange={e => setAnnouncementText(e.target.value)}
                placeholder="e.g. Scheduled maintenance Friday 10pm — 11pm WAT"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Color picker */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Banner colour</label>
              <div className="flex gap-2">
                {ANNOUNCEMENT_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setAnnouncementColor(c.value)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      announcementColor === c.value
                        ? 'border-gray-400 ring-2 ring-offset-1 ring-gray-400'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${c.preview}`} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live preview */}
            {announcementText.trim() && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Preview</p>
                <div className={`rounded-lg py-2.5 px-4 text-sm font-medium text-center ${
                  ANNOUNCEMENT_COLOR_CLASSES[announcementColor] ?? ANNOUNCEMENT_COLOR_CLASSES.green
                } ${!announcementEnabled ? 'opacity-40' : ''}`}>
                  {announcementText}
                  {!announcementEnabled && <span className="ml-2 text-xs opacity-70">(disabled)</span>}
                </div>
              </div>
            )}
          </div>

          {/* Subscription Pricing */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-1">Subscription Pricing</h2>
              <p className="text-sm text-gray-500">Changes take effect immediately for all new payments.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">Monthly Plan</p>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Price (₦)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₦</span>
                    <input type="number" min="0" value={monthlyNaira}
                      onChange={e => setMonthlyNaira(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Label (shown on Paystack)</label>
                  <input type="text" value={monthlyLabel} onChange={e => setMonthlyLabel(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" />
                </div>
              </div>
              <div className="space-y-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">Yearly Plan</p>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Price (₦)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₦</span>
                    <input type="number" min="0" value={yearlyNaira}
                      onChange={e => setYearlyNaira(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Label (shown on Paystack)</label>
                  <input type="text" value={yearlyLabel} onChange={e => setYearlyLabel(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" />
                </div>
              </div>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-800">
              <p className="font-semibold mb-1">Live preview</p>
              <p>Monthly: <strong>₦{parseInt(monthlyNaira || '0').toLocaleString()}</strong> — {monthlyLabel}</p>
              <p>Yearly: <strong>₦{parseInt(yearlyNaira || '0').toLocaleString()}</strong> — {yearlyLabel}</p>
              <p className="text-xs text-green-600 mt-1">
                Yearly saves ₦{Math.max(0, (parseInt(monthlyNaira || '0') * 12) - parseInt(yearlyNaira || '0')).toLocaleString()} vs paying monthly
              </p>
            </div>
          </div>

          {/* Rate Limits */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-1">Rate Limits</h2>
              <p className="text-sm text-gray-500">Maximum posts a member can submit per 24 hours.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">Opportunities</p>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Max posts per 24 hours</label>
                  <input type="number" min="1" value={rateLimitOpps}
                    onChange={e => setRateLimitOpps(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" />
                </div>
                <p className="text-xs text-gray-400">
                  Up to <strong>{rateLimitOpps}</strong> opportunit{parseInt(rateLimitOpps) === 1 ? 'y' : 'ies'} per 24 hours
                </p>
              </div>
              <div className="space-y-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">Marketplace</p>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Max listings per 24 hours</label>
                  <input type="number" min="1" value={rateLimitMarket}
                    onChange={e => setRateLimitMarket(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" />
                </div>
                <p className="text-xs text-gray-400">
                  Up to <strong>{rateLimitMarket}</strong> listing{parseInt(rateLimitMarket) === 1 ? '' : 's'} per 24 hours
                </p>
              </div>
            </div>
          </div>

          {/* Report Threshold */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-1">Report Threshold</h2>
              <p className="text-sm text-gray-500">Number of reports before a post is automatically hidden.</p>
            </div>
            <div className="max-w-xs space-y-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
              <p className="text-sm font-semibold text-gray-700">Auto-hide after</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Number of reports</label>
                <input type="number" min="1" value={reportThreshold}
                  onChange={e => setReportThreshold(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" />
              </div>
              <p className="text-xs text-gray-400">
                Posts are hidden after <strong>{reportThreshold}</strong> report{parseInt(reportThreshold) === 1 ? '' : 's'} and flagged in the Reports tab
              </p>
            </div>
          </div>

          {settingsError && <p className="text-sm text-red-600">{settingsError}</p>}
          <button onClick={saveSettings} disabled={savingSettings}
            className="w-full sm:w-auto bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50">
            {savingSettings ? 'Saving…' : settingsSaved ? '✓ All settings saved!' : 'Save All Settings'}
          </button>
        </div>
      )}
    </div>
  )
}

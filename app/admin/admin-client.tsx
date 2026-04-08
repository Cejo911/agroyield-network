'use client'

import { useState } from 'react'

interface Opportunity {
  id: string
  title: string
  type: string
  location: string
  is_active: boolean
  is_pending_review: boolean
  created_at: string
  user_id: string
}

interface Listing {
  id: string
  title: string
  category: string
  price: number
  is_active: boolean
  is_pending_review: boolean
  created_at: string
  user_id: string
}

interface Member {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  is_admin: boolean
  is_verified: boolean
  is_active: boolean
  subscription_expires_at: string | null
  created_at: string
}

interface ReportGroup {
  postId: string
  postType: 'opportunity' | 'listing'
  postTitle: string
  isActive: boolean
  count: number
  reasons: Record<string, number>
  latestAt: string
}

interface AdminClientProps {
  opportunities: Opportunity[]
  listings: Listing[]
  members: Member[]
  reportGroups: ReportGroup[]
  profilesMap: Record<string, { first_name: string | null; last_name: string | null }>
  settingsMap: Record<string, string>
  currentAdminRole: string
  currentUserId: string
}

type Tab = 'opportunities' | 'marketplace' | 'members' | 'reports' | 'settings'

export default function AdminClient({
  opportunities: initialOpportunities,
  listings: initialListings,
  members: initialMembers,
  reportGroups: initialReportGroups,
  profilesMap,
  settingsMap,
  currentAdminRole,
  currentUserId,
}: AdminClientProps) {
  const isSuperAdmin = currentAdminRole === 'super'

  const [activeTab, setActiveTab] = useState<Tab>('opportunities')
  const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities)
  const [listings, setListings] = useState<Listing[]>(initialListings)
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [reportGroups, setReportGroups] = useState<ReportGroup[]>(initialReportGroups)

  // Settings state — initialised from server-passed settingsMap
  const [registrationEnabled, setRegistrationEnabled] = useState(
    settingsMap.registration_enabled !== 'false'
  )
  const [moderationMode, setModerationMode] = useState<'immediate' | 'approval'>(
    (settingsMap.moderation_mode as 'immediate' | 'approval') ?? 'immediate'
  )
  const [graceDays, setGraceDays] = useState<number>(
    settingsMap.verification_grace_days ? parseInt(settingsMap.verification_grace_days, 10) : 7
  )
  const [announcementEnabled, setAnnouncementEnabled] = useState(
    settingsMap.announcement_enabled === 'true'
  )
  const [announcementText, setAnnouncementText] = useState(settingsMap.announcement_text ?? '')
  const [announcementColor, setAnnouncementColor] = useState(
    settingsMap.announcement_color ?? 'green'
  )
  const [opportunityTypes, setOpportunityTypes] = useState<string[]>(() => {
    try {
      return settingsMap.opportunity_types
        ? JSON.parse(settingsMap.opportunity_types)
        : ['Job', 'Internship', 'Grant', 'Fellowship', 'Training', 'Conference']
    } catch {
      return ['Job', 'Internship', 'Grant', 'Fellowship', 'Training', 'Conference']
    }
  })
  const [marketplaceCategories, setMarketplaceCategories] = useState<string[]>(() => {
    try {
      return settingsMap.marketplace_categories
        ? JSON.parse(settingsMap.marketplace_categories)
        : ['Equipment', 'Seeds', 'Fertilizer', 'Services', 'Land', 'Other']
    } catch {
      return ['Equipment', 'Seeds', 'Fertilizer', 'Services', 'Land', 'Other']
    }
  })
  const [newOpportunityType, setNewOpportunityType] = useState('')
  const [newMarketplaceCategory, setNewMarketplaceCategory] = useState('')
  const [monthlyPrice, setMonthlyPrice] = useState(settingsMap.monthly_price ?? '2500')
  const [annualPrice, setAnnualPrice] = useState(settingsMap.annual_price ?? '25000')
  const [opportunityLimit, setOpportunityLimit] = useState(
    settingsMap.opportunity_daily_limit ?? '3'
  )
  const [listingLimit, setListingLimit] = useState(settingsMap.listing_daily_limit ?? '3')
  const [reportThreshold, setReportThreshold] = useState(settingsMap.report_threshold ?? '3')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getDisplayName = (userId: string) => {
    const p = profilesMap[userId]
    if (!p) return 'Unknown'
    return [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown'
  }

  const fmt = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  // ── Settings save ─────────────────────────────────────────────────────────

  const saveSettings = async () => {
    setSavingSettings(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_enabled: String(registrationEnabled),
          moderation_mode: moderationMode,
          verification_grace_days: String(graceDays),
          announcement_enabled: String(announcementEnabled),
          announcement_text: announcementText,
          announcement_color: announcementColor,
          opportunity_types: JSON.stringify(opportunityTypes),
          marketplace_categories: JSON.stringify(marketplaceCategories),
          monthly_price: monthlyPrice,
          annual_price: annualPrice,
          opportunity_daily_limit: opportunityLimit,
          listing_daily_limit: listingLimit,
          report_threshold: reportThreshold,
        }),
      })
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save settings', err)
    } finally {
      setSavingSettings(false)
    }
  }

  // ── Opportunity actions ───────────────────────────────────────────────────

  const toggleOpportunity = async (id: string, is_active: boolean) => {
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, is_active } : o))
    await fetch('/api/admin/opportunity', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active }),
    })
  }

  const approveOpportunity = async (id: string) => {
    setOpportunities(prev =>
      prev.map(o => o.id === id ? { ...o, is_active: true, is_pending_review: false } : o)
    )
    await fetch('/api/admin/opportunity', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: true, is_pending_review: false }),
    })
  }

  const declineOpportunity = async (id: string) => {
    setOpportunities(prev =>
      prev.map(o => o.id === id ? { ...o, is_active: false, is_pending_review: false } : o)
    )
    await fetch('/api/admin/opportunity', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: false, is_pending_review: false }),
    })
  }

  // ── Listing actions ───────────────────────────────────────────────────────

  const toggleListing = async (id: string, is_active: boolean) => {
    setListings(prev => prev.map(l => l.id === id ? { ...l, is_active } : l))
    await fetch('/api/admin/listing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active }),
    })
  }

  const approveListing = async (id: string) => {
    setListings(prev =>
      prev.map(l => l.id === id ? { ...l, is_active: true, is_pending_review: false } : l)
    )
    await fetch('/api/admin/listing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: true, is_pending_review: false }),
    })
  }

  const declineListing = async (id: string) => {
    setListings(prev =>
      prev.map(l => l.id === id ? { ...l, is_active: false, is_pending_review: false } : l)
    )
    await fetch('/api/admin/listing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: false, is_pending_review: false }),
    })
  }

  // ── Member actions ────────────────────────────────────────────────────────

  const toggleMember = async (id: string, is_active: boolean) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, is_active } : m))
    await fetch('/api/admin/member', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active }),
    })
  }

  const toggleVerified = async (id: string, is_verified: boolean) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, is_verified } : m))
    await fetch('/api/admin/member', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_verified }),
    })
  }

  // ── Report actions ────────────────────────────────────────────────────────

  const dismissReports = async (postId: string, postType: string) => {
    await fetch('/api/admin/reports', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, postType }),
    })
    setReportGroups(prev =>
      prev.filter(rg => !(rg.postId === postId && rg.postType === postType))
    )
    if (postType === 'opportunity') {
      setOpportunities(prev => prev.map(o => o.id === postId ? { ...o, is_active: true } : o))
    } else {
      setListings(prev => prev.map(l => l.id === postId ? { ...l, is_active: true } : l))
    }
  }

  const removeReportedPost = async (postId: string, postType: string) => {
    if (postType === 'opportunity') {
      await toggleOpportunity(postId, false)
    } else {
      await toggleListing(postId, false)
    }
  }

  // ── Tag editor helpers ────────────────────────────────────────────────────

  const addOpportunityType = () => {
    const trimmed = newOpportunityType.trim()
    if (trimmed && !opportunityTypes.includes(trimmed)) {
      setOpportunityTypes(prev => [...prev, trimmed])
      setNewOpportunityType('')
    }
  }

  const removeOpportunityType = (type: string) => {
    setOpportunityTypes(prev => prev.filter(t => t !== type))
  }

  const addMarketplaceCategory = () => {
    const trimmed = newMarketplaceCategory.trim()
    if (trimmed && !marketplaceCategories.includes(trimmed)) {
      setMarketplaceCategories(prev => [...prev, trimmed])
      setNewMarketplaceCategory('')
    }
  }

  const removeMarketplaceCategory = (cat: string) => {
    setMarketplaceCategories(prev => prev.filter(c => c !== cat))
  }

  // ── Tab config ────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'opportunities', label: 'Opportunities' },
    { id: 'marketplace', label: 'Marketplace' },
    { id: 'members', label: 'Members' },
    { id: 'reports', label: 'Reports', badge: reportGroups.length || undefined },
    ...(isSuperAdmin ? [{ id: 'settings' as Tab, label: 'Settings' }] : []),
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Tab bar */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.badge ? (
                <span className="ml-2 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Opportunities ── */}
      {activeTab === 'opportunities' && (
        <div className="space-y-3">
          {opportunities.length === 0 && (
            <p className="text-gray-500 text-sm">No opportunities found.</p>
          )}
          {opportunities.map((opp) => (
            <div key={opp.id} className="bg-white border rounded-lg p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 truncate">{opp.title}</span>
                  {opp.is_pending_review && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-medium">
                      Pending Review
                    </span>
                  )}
                  {!opp.is_active && !opp.is_pending_review && (
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {opp.type} · {opp.location} · by {getDisplayName(opp.user_id)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{fmt(opp.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                {opp.is_pending_review ? (
                  <>
                    <button
                      onClick={() => approveOpportunity(opp.id)}
                      className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => declineOpportunity(opp.id)}
                      className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700"
                    >
                      Decline
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => toggleOpportunity(opp.id, !opp.is_active)}
                    className={`text-xs px-3 py-1.5 rounded-md ${
                      opp.is_active
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {opp.is_active ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Marketplace ── */}
      {activeTab === 'marketplace' && (
        <div className="space-y-3">
          {listings.length === 0 && (
            <p className="text-gray-500 text-sm">No listings found.</p>
          )}
          {listings.map((listing) => (
            <div key={listing.id} className="bg-white border rounded-lg p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 truncate">{listing.title}</span>
                  {listing.is_pending_review && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-medium">
                      Pending Review
                    </span>
                  )}
                  {!listing.is_active && !listing.is_pending_review && (
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {listing.category} · ₦{listing.price?.toLocaleString()} · by{' '}
                  {getDisplayName(listing.user_id)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{fmt(listing.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                {listing.is_pending_review ? (
                  <>
                    <button
                      onClick={() => approveListing(listing.id)}
                      className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => declineListing(listing.id)}
                      className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700"
                    >
                      Decline
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => toggleListing(listing.id, !listing.is_active)}
                    className={`text-xs px-3 py-1.5 rounded-md ${
                      listing.is_active
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {listing.is_active ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Members ── */}
      {activeTab === 'members' && (
        <div className="space-y-3">
          {members.length === 0 && (
            <p className="text-gray-500 text-sm">No members found.</p>
          )}
          {members.map((member) => {
            const displayName =
              [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email
            return (
              <div key={member.id} className="bg-white border rounded-lg p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{displayName}</span>
                    {member.is_verified && (
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                        Verified
                      </span>
                    )}
                    {member.is_admin && (
                      <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                        Admin
                      </span>
                    )}
                    {!member.is_active && (
                      <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                        Suspended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{member.email}</p>
                  {member.subscription_expires_at && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Subscription expires: {fmt(member.subscription_expires_at)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  {member.id !== currentUserId ? (
                    <>
                      <button
                        onClick={() => toggleVerified(member.id, !member.is_verified)}
                        className={`text-xs px-3 py-1.5 rounded-md ${
                          member.is_verified
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {member.is_verified ? 'Unverify' : 'Verify'}
                      </button>
                      <button
                        onClick={() => toggleMember(member.id, !member.is_active)}
                        className={`text-xs px-3 py-1.5 rounded-md ${
                          member.is_active
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {member.is_active ? 'Suspend' : 'Reinstate'}
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 italic">You</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Reports ── */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reportGroups.length === 0 && (
            <p className="text-gray-500 text-sm">No active reports.</p>
          )}
          {reportGroups.map((rg) => (
            <div key={`${rg.postType}-${rg.postId}`} className="bg-white border rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 truncate">{rg.postTitle}</span>
                    <span className="capitalize text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {rg.postType}
                    </span>
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                      {rg.count} report{rg.count !== 1 ? 's' : ''}
                    </span>
                    {!rg.isActive && (
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                        Hidden
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Last reported: {fmt(rg.latestAt)}
                  </p>
                  <div className="mt-2 space-y-0.5">
                    {Object.entries(rg.reasons).map(([reason, count]) => (
                      <p key={reason} className="text-xs text-gray-500">
                        · {reason} {count > 1 ? `(×${count})` : ''}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                  <button
                    onClick={() => dismissReports(rg.postId, rg.postType)}
                    className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200"
                  >
                    Dismiss Reports
                  </button>
                  <button
                    onClick={() => removeReportedPost(rg.postId, rg.postType)}
                    className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700"
                  >
                    Remove Post
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Settings ── */}
      {activeTab === 'settings' && isSuperAdmin && (
        <div className="space-y-6 max-w-2xl">

          {/* Member Registration */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-1">Member Registration</h3>
            <p className="text-sm text-gray-500 mb-3">
              Allow or block new members from creating accounts.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setRegistrationEnabled(!registrationEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  registrationEnabled ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    registrationEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-700">
                {registrationEnabled ? 'Registration open' : 'Registration closed'}
              </span>
            </div>
          </div>

          {/* Post Moderation */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-1">Post Moderation</h3>
            <p className="text-sm text-gray-500 mb-3">
              Choose whether new posts go live immediately or require admin approval.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setModerationMode('immediate')}
                className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                  moderationMode === 'immediate'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Immediate
              </button>
              <button
                onClick={() => setModerationMode('approval')}
                className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                  moderationMode === 'approval'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Requires Approval
              </button>
            </div>
            {moderationMode === 'approval' && (
              <p className="text-xs text-yellow-700 bg-yellow-50 rounded-md px-3 py-2 mt-3">
                All new posts will be hidden until approved in the Opportunities or Marketplace tabs.
              </p>
            )}
          </div>

          {/* Verification Grace Period */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-1">Verification Grace Period</h3>
            <p className="text-sm text-gray-500 mb-3">
              Days after subscription expiry before the verified badge is removed.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={90}
                value={graceDays}
                onChange={(e) => setGraceDays(parseInt(e.target.value, 10) || 0)}
                className="w-24 border rounded px-3 py-2 text-sm"
              />
              <span className="text-sm text-gray-600">days</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Set to 0 to revoke verification immediately on expiry.
            </p>
          </div>

          {/* Announcement Banner */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-1">Announcement Banner</h3>
            <p className="text-sm text-gray-500 mb-3">
              Show a platform-wide banner at the top of every page.
            </p>
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setAnnouncementEnabled(!announcementEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  announcementEnabled ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    announcementEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-700">
                {announcementEnabled ? 'Banner visible' : 'Banner hidden'}
              </span>
            </div>
            {announcementEnabled && (
              <div className="space-y-3">
                <textarea
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="Enter announcement message..."
                  rows={2}
                  className="w-full border rounded px-3 py-2 text-sm resize-none"
                />
                <div className="flex gap-2">
                  {(['green', 'yellow', 'red', 'blue'] as const).map((color) => (
                    <button
                      key={color}
                      onClick={() => setAnnouncementColor(color)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border-2 transition-all ${
                        announcementColor === color ? 'border-gray-800 scale-105' : 'border-transparent'
                      } ${
                        color === 'green' ? 'bg-green-100 text-green-800'
                        : color === 'yellow' ? 'bg-yellow-100 text-yellow-800'
                        : color === 'red' ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {color.charAt(0).toUpperCase() + color.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Content Types */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-1">Content Types</h3>
            <p className="text-sm text-gray-500 mb-4">
              Manage opportunity types and marketplace categories available to members.
            </p>
            <div className="mb-5">
              <p className="text-sm font-medium text-gray-700 mb-2">Opportunity Types</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {opportunityTypes.map((type) => (
                  <span key={type} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">
                    {type}
                    <button
                      onClick={() => removeOpportunityType(type)}
                      className="text-gray-400 hover:text-red-500 ml-0.5 leading-none text-base"
                    >×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOpportunityType}
                  onChange={(e) => setNewOpportunityType(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addOpportunityType()}
                  placeholder="Add type..."
                  className="flex-1 border rounded px-3 py-1.5 text-sm"
                />
                <button
                  onClick={addOpportunityType}
                  className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
                >Add</button>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Marketplace Categories</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {marketplaceCategories.map((cat) => (
                  <span key={cat} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">
                    {cat}
                    <button
                      onClick={() => removeMarketplaceCategory(cat)}
                      className="text-gray-400 hover:text-red-500 ml-0.5 leading-none text-base"
                    >×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMarketplaceCategory}
                  onChange={(e) => setNewMarketplaceCategory(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addMarketplaceCategory()}
                  placeholder="Add category..."
                  className="flex-1 border rounded px-3 py-1.5 text-sm"
                />
                <button
                  onClick={addMarketplaceCategory}
                  className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
                >Add</button>
              </div>
            </div>
          </div>

          {/* Subscription Pricing */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-1">Subscription Pricing</h3>
            <p className="text-sm text-gray-500 mb-3">
              Set the verified membership prices displayed on the platform.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Monthly Price (₦)</label>
                <input
                  type="number"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Annual Price (₦)</label>
                <input
                  type="number"
                  value={annualPrice}
                  onChange={(e) => setAnnualPrice(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Rate Limits */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-1">Rate Limits</h3>
            <p className="text-sm text-gray-500 mb-3">
              Maximum posts a member can create per day.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Opportunities / day</label>
                <input
                  type="number"
                  min={1}
                  value={opportunityLimit}
                  onChange={(e) => setOpportunityLimit(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Listings / day</label>
                <input
                  type="number"
                  min={1}
                  value={listingLimit}
                  onChange={(e) => setListingLimit(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Report Threshold */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-1">Report Threshold</h3>
            <p className="text-sm text-gray-500 mb-3">
              Number of reports before a post is automatically hidden pending review.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={50}
                value={reportThreshold}
                onChange={(e) => setReportThreshold(e.target.value)}
                className="w-24 border rounded px-3 py-2 text-sm"
              />
              <span className="text-sm text-gray-600">reports</span>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2 pb-8">
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
            {settingsSaved && (
              <span className="text-sm text-green-600 font-medium">Settings saved!</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

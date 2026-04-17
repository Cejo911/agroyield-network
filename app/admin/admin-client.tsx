'use client'
import { useState, Suspense, lazy } from 'react'
import { SearchBar, FilterPills } from './tabs/AdminSearchBar'

// ── Lazy-load admin tabs — only the active tab's code is fetched ──
const CommunityTab = lazy(() => import('./tabs/CommunityTab'))
const ResearchTab = lazy(() => import('./tabs/ResearchTab'))
const CommentsTab = lazy(() => import('./tabs/CommentsTab'))
const PricesTab = lazy(() => import('./tabs/PricesTab'))
const MentorshipTab = lazy(() => import('./tabs/MentorshipTab'))
const AuditLogTab = lazy(() => import('./tabs/AuditLogTab'))
const NotifyPanel = lazy(() => import('./tabs/NotifyPanel'))
const AnalyticsTab = lazy(() => import('./tabs/AnalyticsTab'))
const SupportTab = lazy(() => import('./tabs/SupportTab'))
const OrdersTab = lazy(() => import('./tabs/OrdersTab'))
const FeatureFlagsTab = lazy(() => import('./tabs/FeatureFlagsTab'))

// ── Interfaces ──

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
  email: string | null
  username: string | null
  gender: string | null
  phone: string | null
  whatsapp: string | null
  bio: string | null
  location: string | null
  role: string | null
  institution: string | null
  institution_2: string | null
  institution_3: string | null
  interests: string[] | null
  linkedin: string | null
  twitter: string | null
  facebook: string | null
  tiktok: string | null
  website: string | null
  date_of_birth: string | null
  avatar_url: string | null
  is_admin: boolean
  admin_role: string | null
  admin_permissions: Record<string, boolean> | null
  is_verified: boolean
  is_elite: boolean
  is_suspended: boolean
  subscription_tier: string | null
  subscription_expires_at: string | null
  subscription_plan: string | null
  created_at: string
  account_type: string | null
  institution_type: string | null
  institution_display_name: string | null
  contact_person_name: string | null
  contact_person_role: string | null
  institution_website: string | null
  institution_cac: string | null
  is_institution_verified: boolean
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
interface Grant {
  id: string
  title: string
  funder: string | null
  category: string | null
  status: string | null
  featured: boolean
  deadline: string | null
  posted_by: string | null
  created_at: string
}
interface CommunityPost {
  id: string
  user_id: string
  post_type: string
  content: string
  image_url: string | null
  is_active: boolean
  is_pinned: boolean
  created_at: string
}
interface ResearchPost {
  id: string
  user_id: string
  title: string
  type: string
  is_active: boolean
  is_locked: boolean
  created_at: string
}
interface Comment {
  id: string
  user_id: string
  post_id: string
  post_type: string
  content: string
  user_name: string | null
  is_hidden: boolean
  created_at: string
}
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
interface MentorProfile {
  user_id: string
  headline: string | null
  expertise: string | null
  availability: string | null
  is_active: boolean
  updated_at: string
}
interface MentorshipRequest {
  id: string
  mentor_id: string
  mentee_id: string
  topic: string | null
  status: string
  created_at: string
}
interface AuditEntry {
  id: string
  admin_id: string
  action: string
  target_type: string
  target_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}
interface WaitlistSignup {
  id: string
  email: string
  source: string | null
  created_at: string
}
interface Business {
  id: string
  user_id: string
  name: string
  created_at: string
}
interface Invoice {
  id: string
  business_id: string
  status: string
  total: number | null
  issue_date: string | null
  created_at: string
}
interface BusinessExpense {
  id: string
  business_id: string
  amount: number
  category: string | null
  date: string | null
  created_at: string
}

interface SearchLog {
  id: string
  user_id: string | null
  query: string
  module: string
  results_count: number
  created_at: string
}

interface SupportTicket {
  id: string
  user_id: string
  subject: string
  description: string
  category: string
  priority: string
  status: string
  assigned_to: string | null
  sla_deadline: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

interface AdminClientProps {
  opportunities: Opportunity[]
  listings: Listing[]
  members: Member[]
  grants: Grant[]
  communityPosts: CommunityPost[]
  researchPosts: ResearchPost[]
  comments: Comment[]
  priceReports: PriceReport[]
  mentorProfiles: MentorProfile[]
  mentorshipRequests: MentorshipRequest[]
  auditLog: AuditEntry[]
  reportGroups: ReportGroup[]
  profilesMap: Record<string, { first_name: string | null; last_name: string | null; email: string | null; username: string | null }>
  settingsMap: Record<string, string>
  currentAdminRole: string
  currentAdminPermissions: Record<string, boolean> | null
  currentUserId: string
  waitlistSignups: WaitlistSignup[]
  businesses: Business[]
  invoices: Invoice[]
  businessExpenses: BusinessExpense[]
  searchLogs: SearchLog[]
  supportTickets: SupportTicket[]
  featureFlags: FeatureFlag[]
}

interface FeatureFlag {
  key: string
  description: string | null
  is_enabled: boolean
  enabled_for_users: string[]
  enabled_for_businesses: string[]
  rollout_percentage: number
  updated_at: string
}

type Tab = 'opportunities' | 'marketplace' | 'members' | 'grants' | 'community' | 'research' | 'comments' | 'prices' | 'mentorship' | 'reports' | 'support' | 'orders' | 'analytics' | 'audit_log' | 'notifications' | 'settings' | 'feature_flags'

// Permission keys per tab — determines which tabs a moderator can see
const TAB_PERMISSION: Partial<Record<Tab, string>> = {
  opportunities: 'opportunities',
  marketplace: 'marketplace',
  members: 'members',
  grants: 'grants',
  community: 'community',
  research: 'research',
  comments: 'comments',
  prices: 'prices',
  mentorship: 'mentorship',
  reports: 'reports',
  support: 'support',
  orders: 'marketplace',
  notifications: 'notifications',
}

// All permission keys with labels for the moderator management UI
const PERMISSION_LABELS: { key: string; label: string }[] = [
  { key: 'opportunities', label: 'Opportunities' },
  { key: 'marketplace', label: 'Marketplace' },
  { key: 'community', label: 'Community Posts' },
  { key: 'research', label: 'Research Posts' },
  { key: 'grants', label: 'Grants' },
  { key: 'prices', label: 'Price Reports' },
  { key: 'mentorship', label: 'Mentorship' },
  { key: 'comments', label: 'Comments' },
  { key: 'members', label: 'Members' },
  { key: 'reports', label: 'Reports' },
  { key: 'support', label: 'Support Tickets' },
  { key: 'notifications', label: 'Notifications' },
]

// Shared input class
const sInput = 'border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

export default function AdminClient({
  opportunities: initialOpportunities,
  listings: initialListings,
  members: initialMembers,
  grants: initialGrants,
  communityPosts,
  researchPosts,
  comments,
  priceReports,
  mentorProfiles,
  mentorshipRequests,
  auditLog,
  reportGroups: initialReportGroups,
  profilesMap,
  settingsMap,
  currentAdminRole,
  currentAdminPermissions,
  currentUserId,
  waitlistSignups,
  businesses,
  invoices,
  businessExpenses,
  searchLogs,
  supportTickets,
  featureFlags,
}: AdminClientProps) {
  const isSuperAdmin = currentAdminRole === 'super'

  // Helper: does the current admin have access to a tab?
  const canAccess = (tab: Tab): boolean => {
    if (isSuperAdmin) return true
    // Settings and audit_log are super-admin only
    if (tab === 'settings' || tab === 'audit_log' || tab === 'feature_flags') return false
    const permKey = TAB_PERMISSION[tab]
    if (!permKey) return false
    return currentAdminPermissions?.[permKey] === true
  }

  const [activeTab, setActiveTab] = useState<Tab>('opportunities')
  const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities)
  const [listings, setListings] = useState<Listing[]>(initialListings)
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [grants, setGrants] = useState<Grant[]>(initialGrants)
  const [reportGroups, setReportGroups] = useState<ReportGroup[]>(initialReportGroups)

  // Search / filter state
  const [oppSearch, setOppSearch] = useState('')
  const [listingSearch, setListingSearch] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [grantSearch, setGrantSearch] = useState('')
  const [reportSearch, setReportSearch] = useState('')
  const [oppStatusFilter, setOppStatusFilter] = useState<'all' | 'active' | 'pending' | 'hidden'>('all')
  const [listingStatusFilter, setListingStatusFilter] = useState<'all' | 'active' | 'pending' | 'hidden'>('all')
  const [membersView, setMembersView] = useState<'registered' | 'waitlist' | 'institutions'>('registered')
  const [waitlistSearch, setWaitlistSearch] = useState('')
  const [memberRoleFilter, setMemberRoleFilter] = useState<'all' | 'admin' | 'pro' | 'growth' | 'trial' | 'free' | 'suspended'>('all')
  const [grantStatusFilter, setGrantStatusFilter] = useState<'all' | 'open' | 'closed'>('all')

  // Moderator permissions management (expanded member id)
  const [expandedPermsMember, setExpandedPermsMember] = useState<string | null>(null)
  const [savingPerms, setSavingPerms] = useState(false)

  // Settings state
  const [registrationEnabled, setRegistrationEnabled] = useState(settingsMap.registration_enabled !== 'false')
  const [moderationMode, setModerationMode] = useState<'immediate' | 'approval'>(
    (settingsMap.moderation_mode as 'immediate' | 'approval') ?? 'immediate'
  )
  const [graceDays, setGraceDays] = useState<number>(
    settingsMap.verification_grace_days ? parseInt(settingsMap.verification_grace_days, 10) : 7
  )
  const [announcementEnabled, setAnnouncementEnabled] = useState(settingsMap.announcement_enabled === 'true')
  const [announcementText, setAnnouncementText] = useState(settingsMap.announcement_text ?? '')
  const [announcementColor, setAnnouncementColor] = useState(settingsMap.announcement_color ?? 'green')
  const [opportunityTypes, setOpportunityTypes] = useState<string[]>(() => {
    try { return settingsMap.opportunity_types ? JSON.parse(settingsMap.opportunity_types) : ['Job', 'Internship', 'Partnership', 'Training', 'Conference'] }
    catch { return ['Job', 'Internship', 'Partnership', 'Training', 'Conference'] }
  })
  const [marketplaceCategories, setMarketplaceCategories] = useState<string[]>(() => {
    try { return settingsMap.marketplace_categories ? JSON.parse(settingsMap.marketplace_categories) : ['Equipment', 'Seeds', 'Fertilizer', 'Services', 'Land', 'Other'] }
    catch { return ['Equipment', 'Seeds', 'Fertilizer', 'Services', 'Land', 'Other'] }
  })
  const [commodityCategories, setCommodityCategories] = useState<string[]>(() => {
    try { return settingsMap.commodity_categories ? JSON.parse(settingsMap.commodity_categories) : ['Grains', 'Legumes', 'Tubers', 'Vegetables', 'Fruits', 'Livestock', 'Cash Crops'] }
    catch { return ['Grains', 'Legumes', 'Tubers', 'Vegetables', 'Fruits', 'Livestock', 'Cash Crops'] }
  })
  const [newOpportunityType, setNewOpportunityType] = useState('')
  const [newMarketplaceCategory, setNewMarketplaceCategory] = useState('')
  const [newCommodityCategory, setNewCommodityCategory] = useState('')
  const DEFAULT_COMMODITY_ITEMS: Record<string, string[]> = {
    grains: ['Maize', 'Rice', 'Sorghum', 'Millet', 'Wheat', 'Barley'],
    legumes: ['Soybeans', 'Cowpea', 'Groundnut', 'Sesame', 'Beans'],
    tubers: ['Cassava', 'Yam', 'Sweet Potato', 'Cocoyam', 'Irish Potato'],
    vegetables: ['Tomato', 'Pepper', 'Onion', 'Cabbage', 'Carrot', 'Spinach'],
    fruits: ['Banana', 'Plantain', 'Mango', 'Orange', 'Pineapple', 'Watermelon'],
    livestock: ['Cattle', 'Goat', 'Sheep', 'Pig', 'Poultry', 'Fish'],
    cash_crops: ['Cocoa', 'Coffee', 'Cotton', 'Rubber', 'Palm Oil', 'Sugarcane'],
  }
  const [commodityItems, setCommodityItems] = useState<Record<string, string[]>>(() => {
    try { return settingsMap.commodity_items ? JSON.parse(settingsMap.commodity_items) : DEFAULT_COMMODITY_ITEMS }
    catch { return DEFAULT_COMMODITY_ITEMS }
  })
  const [newCommodityItem, setNewCommodityItem] = useState<Record<string, string>>({})
  const [featuredPlans, setFeaturedPlans] = useState<{ days: number; price: number; label: string }[]>(() => {
    try { return settingsMap.featured_listing_plans ? JSON.parse(settingsMap.featured_listing_plans) : [{ days: 7, price: 500, label: '7 days' }, { days: 14, price: 900, label: '14 days' }, { days: 30, price: 1500, label: '30 days' }] }
    catch { return [{ days: 7, price: 500, label: '7 days' }, { days: 14, price: 900, label: '14 days' }, { days: 30, price: 1500, label: '30 days' }] }
  })
  const [proMonthlyPrice, setProMonthlyPrice] = useState(settingsMap.tier_pro_monthly ?? '2000')
  const [proAnnualPrice, setProAnnualPrice] = useState(settingsMap.tier_pro_annual ?? '20000')
  const [growthMonthlyPrice, setGrowthMonthlyPrice] = useState(settingsMap.tier_growth_monthly ?? '5000')
  const [growthAnnualPrice, setGrowthAnnualPrice] = useState(settingsMap.tier_growth_annual ?? '50000')
  const [freeTrialDays, setFreeTrialDays] = useState(settingsMap.free_trial_days ?? '30')
  const [opportunityLimit, setOpportunityLimit] = useState(settingsMap.opportunity_daily_limit ?? '3')
  const [listingLimit, setListingLimit] = useState(settingsMap.listing_daily_limit ?? '3')
  const [reportThreshold, setReportThreshold] = useState(settingsMap.report_threshold ?? '3')
  const [adminNotificationEmail, setAdminNotificationEmail] = useState(settingsMap.admin_notification_email ?? '')
  const [allowMultiBusiness, setAllowMultiBusiness] = useState(settingsMap.allow_multi_business === 'true')
  // New settings (batch 2)
  const [mentorshipEnabled, setMentorshipEnabled] = useState(settingsMap.mentorship_enabled !== 'false')
  const [digestEnabled, setDigestEnabled] = useState(settingsMap.digest_enabled !== 'false')
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(settingsMap.maintenance_enabled === 'true')
  const [maintenanceMessage, setMaintenanceMessage] = useState(settingsMap.maintenance_message ?? '')
  const [communityDailyLimit, setCommunityDailyLimit] = useState(settingsMap.community_daily_limit ?? '10')
  const [researchDailyLimit, setResearchDailyLimit] = useState(settingsMap.research_daily_limit ?? '5')
  const [mentorshipRequiresVerification, setMentorshipRequiresVerification] = useState(settingsMap.mentorship_requires_verification === 'true')
  // Cron kill switches (default ON except expiry reminders — no paid users yet)
  const [celebrationsEnabled, setCelebrationsEnabled] = useState(settingsMap.celebrations_enabled !== 'false')
  const [expiryReminderEnabled, setExpiryReminderEnabled] = useState(settingsMap.expiry_reminder_enabled === 'true')
  const [expireFeaturedEnabled, setExpireFeaturedEnabled] = useState(settingsMap.expire_featured_enabled !== 'false')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    access: true, moderation: false, mentorship: false, email: false, pricing: false, features: false,
  })
  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  // ── Helpers ──

  const getDisplayName = (userId: string) => {
    const p = profilesMap[userId]
    if (!p) return 'Unknown'
    return [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username || p.email || 'Unknown'
  }
  const fmt = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  // ── Export helper ──
  const [exporting, setExporting] = useState(false)
  const exportToExcel = async (sheetName: string, columns: { header: string; key: string; width: number }[], rows: Record<string, unknown>[]) => {
    setExporting(true)
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet(sheetName)
      ws.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width }))
      // Style header row
      ws.getRow(1).font = { bold: true }
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } }
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      rows.forEach(r => ws.addRow(r))
      // Add summary row
      ws.addRow({})
      ws.addRow({ [columns[0].key]: `Total: ${rows.length} records` })

      const filename = `AgroYield_${sheetName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
    } finally { setExporting(false) }
  }

  const ExportButton = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} disabled={exporting}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-green-400 hover:text-green-700 dark:hover:text-green-400 transition-all disabled:opacity-50">
      {exporting ? 'Exporting...' : 'Export Excel'}
    </button>
  )

  // ── Actions ──

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
          commodity_categories: JSON.stringify(commodityCategories),
          commodity_items: JSON.stringify(commodityItems),
          featured_listing_plans: JSON.stringify(featuredPlans),
          tier_pro_monthly: proMonthlyPrice,
          tier_pro_annual: proAnnualPrice,
          tier_growth_monthly: growthMonthlyPrice,
          tier_growth_annual: growthAnnualPrice,
          free_trial_days: freeTrialDays,
          opportunity_daily_limit: opportunityLimit,
          listing_daily_limit: listingLimit,
          report_threshold: reportThreshold,
          admin_notification_email: adminNotificationEmail,
          allow_multi_business: String(allowMultiBusiness),
          mentorship_enabled: String(mentorshipEnabled),
          digest_enabled: String(digestEnabled),
          maintenance_enabled: String(maintenanceEnabled),
          maintenance_message: maintenanceMessage,
          community_daily_limit: communityDailyLimit,
          research_daily_limit: researchDailyLimit,
          mentorship_requires_verification: String(mentorshipRequiresVerification),
          celebrations_enabled: String(celebrationsEnabled),
          expiry_reminder_enabled: String(expiryReminderEnabled),
          expire_featured_enabled: String(expireFeaturedEnabled),
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

  const toggleOpportunity = async (id: string, is_active: boolean) => {
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, is_active } : o))
    await fetch('/api/admin/opportunity', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active }) })
  }
  const approveOpportunity = async (id: string) => {
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, is_active: true, is_pending_review: false } : o))
    await fetch('/api/admin/opportunity', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: true, is_pending_review: false }) })
  }
  const declineOpportunity = async (id: string) => {
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, is_active: false, is_pending_review: false } : o))
    await fetch('/api/admin/opportunity', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: false, is_pending_review: false }) })
  }
  const toggleListing = async (id: string, is_active: boolean) => {
    setListings(prev => prev.map(l => l.id === id ? { ...l, is_active } : l))
    await fetch('/api/admin/listing', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active }) })
  }
  const approveListing = async (id: string) => {
    setListings(prev => prev.map(l => l.id === id ? { ...l, is_active: true, is_pending_review: false } : l))
    await fetch('/api/admin/listing', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: true, is_pending_review: false }) })
  }
  const declineListing = async (id: string) => {
    setListings(prev => prev.map(l => l.id === id ? { ...l, is_active: false, is_pending_review: false } : l))
    await fetch('/api/admin/listing', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: false, is_pending_review: false }) })
  }
  const memberAction = async (userId: string, action: string, optimistic: (m: Member) => Member) => {
    setMembers(prev => prev.map(m => m.id === userId ? optimistic(m) : m))
    await fetch('/api/admin/member', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, action }) })
  }
  const dismissReports = async (postId: string, postType: string) => {
    await fetch('/api/admin/reports', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId, postType }) })
    setReportGroups(prev => prev.filter(rg => !(rg.postId === postId && rg.postType === postType)))
    if (postType === 'opportunity') setOpportunities(prev => prev.map(o => o.id === postId ? { ...o, is_active: true } : o))
    else setListings(prev => prev.map(l => l.id === postId ? { ...l, is_active: true } : l))
  }
  const removeReportedPost = async (postId: string, postType: string) => {
    if (postType === 'opportunity') await toggleOpportunity(postId, false)
    else await toggleListing(postId, false)
  }

  const addOpportunityType = () => {
    const t = newOpportunityType.trim()
    if (t && !opportunityTypes.includes(t)) { setOpportunityTypes(prev => [...prev, t]); setNewOpportunityType('') }
  }
  const removeOpportunityType = (type: string) => setOpportunityTypes(prev => prev.filter(t => t !== type))
  const addMarketplaceCategory = () => {
    const t = newMarketplaceCategory.trim()
    if (t && !marketplaceCategories.includes(t)) { setMarketplaceCategories(prev => [...prev, t]); setNewMarketplaceCategory('') }
  }
  const removeMarketplaceCategory = (cat: string) => setMarketplaceCategories(prev => prev.filter(c => c !== cat))
  const addCommodityCategory = () => {
    const t = newCommodityCategory.trim()
    if (t && !commodityCategories.includes(t)) { setCommodityCategories(prev => [...prev, t]); setNewCommodityCategory('') }
  }
  const removeCommodityCategory = (cat: string) => setCommodityCategories(prev => prev.filter(c => c !== cat))
  const addCommodityItem = (category: string) => {
    const key = category.toLowerCase().replace(/\s+/g, '_')
    const item = (newCommodityItem[key] ?? '').trim()
    if (!item) return
    const existing = commodityItems[key] ?? []
    if (existing.includes(item)) return
    setCommodityItems(prev => ({ ...prev, [key]: [...existing, item] }))
    setNewCommodityItem(prev => ({ ...prev, [key]: '' }))
  }
  const removeCommodityItem = (category: string, item: string) => {
    const key = category.toLowerCase().replace(/\s+/g, '_')
    setCommodityItems(prev => ({ ...prev, [key]: (prev[key] ?? []).filter(i => i !== item) }))
  }

  // Grant actions
  const toggleGrantFeatured = async (id: string, featured: boolean) => {
    setGrants(prev => prev.map(g => g.id === id ? { ...g, featured } : g))
    await fetch('/api/admin/grant', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, featured }) })
  }
  const toggleGrantStatus = async (id: string, status: string) => {
    setGrants(prev => prev.map(g => g.id === id ? { ...g, status } : g))
    await fetch('/api/admin/grant', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
  }

  // Update moderator permissions
  const updatePermissions = async (userId: string, permissions: Record<string, boolean>) => {
    setSavingPerms(true)
    setMembers(prev => prev.map(m => m.id === userId ? { ...m, admin_permissions: permissions } : m))
    await fetch('/api/admin/member', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'update_permissions', permissions }),
    })
    setSavingPerms(false)
  }

  // ── Filtered data ──

  const filteredOpps = opportunities.filter(o => {
    const q = oppSearch.toLowerCase()
    const matchesSearch = !q || o.title.toLowerCase().includes(q) || o.type?.toLowerCase().includes(q) || o.location?.toLowerCase().includes(q) || getDisplayName(o.user_id).toLowerCase().includes(q)
    const matchesStatus = oppStatusFilter === 'all'
      || (oppStatusFilter === 'active' && o.is_active && !o.is_pending_review)
      || (oppStatusFilter === 'pending' && o.is_pending_review)
      || (oppStatusFilter === 'hidden' && !o.is_active && !o.is_pending_review)
    return matchesSearch && matchesStatus
  })
  const filteredListings = listings.filter(l => {
    const q = listingSearch.toLowerCase()
    const matchesSearch = !q || l.title.toLowerCase().includes(q) || l.category?.toLowerCase().includes(q) || getDisplayName(l.user_id).toLowerCase().includes(q)
    const matchesStatus = listingStatusFilter === 'all'
      || (listingStatusFilter === 'active' && l.is_active && !l.is_pending_review)
      || (listingStatusFilter === 'pending' && l.is_pending_review)
      || (listingStatusFilter === 'hidden' && !l.is_active && !l.is_pending_review)
    return matchesSearch && matchesStatus
  })
  const filteredMembers = members.filter(m => {
    const q = memberSearch.toLowerCase()
    const displayName = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.username || ''
    const matchesSearch = !q || displayName.toLowerCase().includes(q) || (m.email?.toLowerCase().includes(q)) || (m.username?.toLowerCase().includes(q))
    const matchesRole = memberRoleFilter === 'all'
      || (memberRoleFilter === 'admin' && m.is_admin)
      || (memberRoleFilter === 'pro' && m.subscription_tier === 'pro')
      || (memberRoleFilter === 'growth' && m.subscription_tier === 'growth')
      || (memberRoleFilter === 'trial' && m.subscription_plan === 'trial')
      || (memberRoleFilter === 'free' && (!m.subscription_tier || m.subscription_tier === 'free'))
      || (memberRoleFilter === 'suspended' && m.is_suspended)
    return matchesSearch && matchesRole
  })
  const filteredGrants = grants.filter(g => {
    const q = grantSearch.toLowerCase()
    const matchesSearch = !q || g.title.toLowerCase().includes(q) || (g.funder?.toLowerCase().includes(q)) || (g.category?.toLowerCase().includes(q))
    const matchesStatus = grantStatusFilter === 'all'
      || (grantStatusFilter === 'open' && g.status === 'open')
      || (grantStatusFilter === 'closed' && g.status === 'closed')
    return matchesSearch && matchesStatus
  })
  const filteredReports = reportGroups.filter(rg => {
    const q = reportSearch.toLowerCase()
    return !q || rg.postTitle.toLowerCase().includes(q) || rg.postType.toLowerCase().includes(q)
  })

  // ── Tab definitions — filter by permissions ──
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)

  const regularTabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'opportunities', label: 'Opportunities' },
    { id: 'marketplace',   label: 'Marketplace' },
    { id: 'members',       label: 'Members' },
    { id: 'grants',        label: 'Grants' },
    { id: 'community',     label: 'Community' },
    { id: 'research',      label: 'Research' },
    { id: 'comments',      label: 'Comments' },
    { id: 'prices',        label: 'Prices' },
    { id: 'mentorship',    label: 'Mentorship' },
    { id: 'reports',       label: 'Reports', badge: reportGroups.length || undefined },
    { id: 'support',       label: 'Support', badge: supportTickets.filter((t: SupportTicket) => t.status === 'open' || t.status === 'in_progress').length || undefined },
    { id: 'orders',        label: 'Orders' },
  ]

  const superAdminTabs: { id: Tab; label: string }[] = [
    { id: 'analytics', label: 'Analytics' },
    { id: 'audit_log', label: 'Audit Log' },
    { id: 'notifications', label: 'Notify' },
    { id: 'feature_flags', label: 'Feature Flags' },
    { id: 'settings', label: 'Settings' },
  ]

  const tabs = regularTabs.filter(t => canAccess(t.id))
  const isSuperAdminTab = (tab: Tab) => superAdminTabs.some(t => t.id === tab)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Tab bar */}
      <div className="border-b border-gray-200 dark:border-gray-800 mb-6">
        <div className="flex items-end gap-4">
          <nav className="-mb-px flex gap-4 overflow-x-auto flex-1">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setAdminMenuOpen(false) }}
                className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id && !isSuperAdminTab(activeTab)
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}>
                {tab.label}
                {tab.badge ? (
                  <span className="ml-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs px-1.5 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          {/* Super Admin dropdown — outside nav to avoid overflow-x-auto clipping */}
          {isSuperAdmin && (
            <div className="relative shrink-0">
              <button onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1 ${
                  isSuperAdminTab(activeTab)
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}>
                {isSuperAdminTab(activeTab) ? superAdminTabs.find(t => t.id === activeTab)?.label : 'Admin'}
                <svg className={`w-3.5 h-3.5 transition-transform ${adminMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {adminMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAdminMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]">
                    {superAdminTabs.map(t => (
                      <button key={t.id} onClick={() => { setActiveTab(t.id); setAdminMenuOpen(false) }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          activeTab === t.id
                            ? 'text-green-600 bg-green-50 dark:bg-green-900/20 font-medium'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Opportunities ── */}
      {activeTab === 'opportunities' && (
        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex-1"><SearchBar value={oppSearch} onChange={setOppSearch} placeholder="Search opportunities by title, type, location, or poster..." /></div>
            <ExportButton onClick={() => exportToExcel('Opportunities', [
              { header: 'Title', key: 'title', width: 36 },
              { header: 'Type', key: 'type', width: 16 },
              { header: 'Location', key: 'location', width: 20 },
              { header: 'Status', key: 'status', width: 12 },
              { header: 'Posted By', key: 'posted_by', width: 24 },
              { header: 'Created', key: 'created', width: 16 },
            ], opportunities.map(o => ({
              title: o.title,
              type: o.type,
              location: o.location || 'N/A',
              status: o.is_pending_review ? 'Pending' : o.is_active ? 'Active' : 'Hidden',
              posted_by: getDisplayName(o.user_id),
              created: fmt(o.created_at),
            })))} />
          </div>
          <FilterPills value={oppStatusFilter} onChange={(v) => setOppStatusFilter(v as typeof oppStatusFilter)} options={[
            { id: 'all', label: `All (${opportunities.length})` },
            { id: 'active', label: `Active (${opportunities.filter(o => o.is_active && !o.is_pending_review).length})` },
            { id: 'pending', label: `Pending (${opportunities.filter(o => o.is_pending_review).length})` },
            { id: 'hidden', label: `Hidden (${opportunities.filter(o => !o.is_active && !o.is_pending_review).length})` },
          ]} />
          <div className="space-y-3">
          {filteredOpps.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No opportunities found.</p>}
          {filteredOpps.map((opp) => (
            <div key={opp.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{opp.title}</span>
                  {opp.is_pending_review && (
                    <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs px-2 py-0.5 rounded-full font-medium">Pending Review</span>
                  )}
                  {!opp.is_active && !opp.is_pending_review && (
                    <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs px-2 py-0.5 rounded-full">Hidden</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{opp.type} · {opp.location} · by {getDisplayName(opp.user_id)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{fmt(opp.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                {opp.is_pending_review ? (
                  <>
                    <button onClick={() => approveOpportunity(opp.id)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700">Approve</button>
                    <button onClick={() => declineOpportunity(opp.id)} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700">Decline</button>
                  </>
                ) : (
                  <button onClick={() => toggleOpportunity(opp.id, !opp.is_active)}
                    className={`text-xs px-3 py-1.5 rounded-md ${
                      opp.is_active
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                    }`}>
                    {opp.is_active ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* ── Marketplace ── */}
      {activeTab === 'marketplace' && (
        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex-1"><SearchBar value={listingSearch} onChange={setListingSearch} placeholder="Search listings by title, category, or poster..." /></div>
            <ExportButton onClick={() => exportToExcel('Marketplace', [
              { header: 'Title', key: 'title', width: 36 },
              { header: 'Category', key: 'category', width: 18 },
              { header: 'Price (NGN)', key: 'price', width: 14 },
              { header: 'Status', key: 'status', width: 12 },
              { header: 'Posted By', key: 'posted_by', width: 24 },
              { header: 'Created', key: 'created', width: 16 },
            ], listings.map(l => ({
              title: l.title,
              category: l.category || 'N/A',
              price: l.price ?? 'N/A',
              status: l.is_pending_review ? 'Pending' : l.is_active ? 'Active' : 'Hidden',
              posted_by: getDisplayName(l.user_id),
              created: fmt(l.created_at),
            })))} />
          </div>
          <FilterPills value={listingStatusFilter} onChange={(v) => setListingStatusFilter(v as typeof listingStatusFilter)} options={[
            { id: 'all', label: `All (${listings.length})` },
            { id: 'active', label: `Active (${listings.filter(l => l.is_active && !l.is_pending_review).length})` },
            { id: 'pending', label: `Pending (${listings.filter(l => l.is_pending_review).length})` },
            { id: 'hidden', label: `Hidden (${listings.filter(l => !l.is_active && !l.is_pending_review).length})` },
          ]} />
          <div className="space-y-3">
          {filteredListings.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No listings found.</p>}
          {filteredListings.map((listing) => (
            <div key={listing.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{listing.title}</span>
                  {listing.is_pending_review && (
                    <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs px-2 py-0.5 rounded-full font-medium">Pending Review</span>
                  )}
                  {!listing.is_active && !listing.is_pending_review && (
                    <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs px-2 py-0.5 rounded-full">Hidden</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{listing.category} · ₦{listing.price?.toLocaleString()} · by {getDisplayName(listing.user_id)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{fmt(listing.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                {listing.is_pending_review ? (
                  <>
                    <button onClick={() => approveListing(listing.id)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700">Approve</button>
                    <button onClick={() => declineListing(listing.id)} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700">Decline</button>
                  </>
                ) : (
                  <button onClick={() => toggleListing(listing.id, !listing.is_active)}
                    className={`text-xs px-3 py-1.5 rounded-md ${
                      listing.is_active
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                    }`}>
                    {listing.is_active ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* ── Members ── */}
      {activeTab === 'members' && (
        <div>
          {/* Registered / Waitlist toggle */}
          <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
            <button onClick={() => setMembersView('registered')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${membersView === 'registered' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              Registered ({members.length})
            </button>
            <button onClick={() => setMembersView('institutions')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${membersView === 'institutions' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              Institutions ({members.filter(m => (m as any).account_type === 'institution').length})
            </button>
            <button onClick={() => setMembersView('waitlist')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${membersView === 'waitlist' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              Waitlist ({waitlistSignups.length})
            </button>
          </div>

          {/* Waitlist view */}
          {membersView === 'waitlist' && (
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex-1"><SearchBar value={waitlistSearch} onChange={setWaitlistSearch} placeholder="Search waitlist by email..." /></div>
                <ExportButton onClick={() => exportToExcel('Waitlist', [
                  { header: 'Email', key: 'email', width: 36 },
                  { header: 'Source', key: 'source', width: 18 },
                  { header: 'Signed Up', key: 'signed_up', width: 24 },
                ], waitlistSignups.map(w => ({
                  email: w.email,
                  source: w.source || 'N/A',
                  signed_up: new Date(w.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' }),
                })))} />
              </div>
              <div className="space-y-2">
                {waitlistSignups.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No waitlist signups yet.</p>}
                {waitlistSignups
                  .filter(w => !waitlistSearch || w.email.toLowerCase().includes(waitlistSearch.toLowerCase()))
                  .map((w) => (
                  <div key={w.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{w.email}</p>
                      {w.source && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Source: {w.source}</p>}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{new Date(w.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' })}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Institutions view */}
          {membersView === 'institutions' && (
            <div className="space-y-3">
              {(() => {
                const institutions = members.filter(m => (m as any).account_type === 'institution')
                const pending = institutions.filter(m => !(m as any).is_institution_verified)
                const verified = institutions.filter(m => (m as any).is_institution_verified)
                if (institutions.length === 0) return <p className="text-gray-500 dark:text-gray-400 text-sm">No institutional accounts yet.</p>
                return (
                  <>
                    {pending.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">⏳ Pending Verification ({pending.length})</h3>
                        <div className="space-y-2">
                          {pending.map(inst => {
                            const instAny = inst as any
                            const INST_TYPE_LABELS: Record<string, string> = { university: 'University & Research', government: 'Government Agency', ngo: 'NGO & Foundation', agri_company: 'Agri-Company & Cooperative' }
                            return (
                              <div key={inst.id} className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                      {instAny.institution_display_name || [inst.first_name, inst.last_name].filter(Boolean).join(' ') || 'Unnamed Institution'}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                      {INST_TYPE_LABELS[instAny.institution_type] || instAny.institution_type || 'Type not set'}
                                      {instAny.contact_person_name ? ` · Contact: ${instAny.contact_person_name}` : ''}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{inst.email || 'No email'}</p>
                                    {instAny.institution_website && <p className="text-xs text-blue-500 mt-0.5">{instAny.institution_website}</p>}
                                    {instAny.institution_cac && <p className="text-xs text-gray-400 mt-0.5">CAC: {instAny.institution_cac}</p>}
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={async () => {
                                        const res = await fetch('/api/admin/member', {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ userId: inst.id, action: 'verify_institution' }),
                                        })
                                        if (res.ok) {
                                          setMembers(prev => prev.map(m => m.id === inst.id ? { ...m, ...({ is_institution_verified: true } as any) } : m))
                                        }
                                      }}
                                      className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-md hover:bg-green-200 dark:hover:bg-green-900/50 font-medium">
                                      ✓ Verify
                                    </button>
                                    <a href={`/directory/${inst.id}`} target="_blank" rel="noopener noreferrer"
                                      className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                                      View Profile
                                    </a>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {verified.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">✅ Verified ({verified.length})</h3>
                        <div className="space-y-2">
                          {verified.map(inst => {
                            const instAny = inst as any
                            const INST_TYPE_LABELS: Record<string, string> = { university: 'University & Research', government: 'Government Agency', ngo: 'NGO & Foundation', agri_company: 'Agri-Company & Cooperative' }
                            return (
                              <div key={inst.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                      {instAny.institution_display_name || [inst.first_name, inst.last_name].filter(Boolean).join(' ') || 'Unnamed'}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                      {INST_TYPE_LABELS[instAny.institution_type] || instAny.institution_type || ''}
                                      {instAny.contact_person_name ? ` · ${instAny.contact_person_name}` : ''}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{inst.email || ''}</p>
                                  </div>
                                  <a href={`/directory/${inst.id}`} target="_blank" rel="noopener noreferrer"
                                    className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                                    View Profile
                                  </a>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}

          {/* Registered members view */}
          {membersView === 'registered' && (<>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex-1"><SearchBar value={memberSearch} onChange={setMemberSearch} placeholder="Search members by name, email, or username..." /></div>
            <ExportButton onClick={() => exportToExcel('Members', [
              { header: 'Name', key: 'name', width: 28 },
              { header: 'Email', key: 'email', width: 32 },
              { header: 'Username', key: 'username', width: 20 },
              { header: 'Phone', key: 'phone', width: 18 },
              { header: 'WhatsApp', key: 'whatsapp', width: 18 },
              { header: 'Gender', key: 'gender', width: 10 },
              { header: 'Date of Birth', key: 'dob', width: 14 },
              { header: 'Location', key: 'location', width: 20 },
              { header: 'Bio', key: 'bio', width: 40 },
              { header: 'Profile Role', key: 'profileRole', width: 20 },
              { header: 'Institution', key: 'institution', width: 28 },
              { header: 'Institution 2', key: 'institution2', width: 28 },
              { header: 'Institution 3', key: 'institution3', width: 28 },
              { header: 'Interests', key: 'interests', width: 30 },
              { header: 'LinkedIn', key: 'linkedin', width: 30 },
              { header: 'Twitter/X', key: 'twitter', width: 24 },
              { header: 'Facebook', key: 'facebook', width: 24 },
              { header: 'TikTok', key: 'tiktok', width: 24 },
              { header: 'Website', key: 'website', width: 28 },
              { header: 'Account Type', key: 'accountType', width: 16 },
              { header: 'Institution Type', key: 'institutionType', width: 18 },
              { header: 'Institution Name', key: 'institutionDisplayName', width: 28 },
              { header: 'Contact Person', key: 'contactPerson', width: 24 },
              { header: 'Contact Role', key: 'contactRole', width: 20 },
              { header: 'Institution Website', key: 'institutionWebsite', width: 28 },
              { header: 'Institution CAC', key: 'institutionCac', width: 18 },
              { header: 'Admin Role', key: 'adminRole', width: 16 },
              { header: 'Verified', key: 'verified', width: 10 },
              { header: 'Tier', key: 'tier', width: 12 },
              { header: 'Billing', key: 'billing', width: 14 },
              { header: 'Expires', key: 'expires', width: 16 },
              { header: 'Joined', key: 'joined', width: 16 },
            ], members.map(m => ({
              name: [m.first_name, m.last_name].filter(Boolean).join(' ') || 'N/A',
              email: m.email || 'N/A',
              username: m.username || 'N/A',
              phone: m.phone || '',
              whatsapp: m.whatsapp || '',
              gender: m.gender || '',
              dob: m.date_of_birth || '',
              location: m.location || '',
              bio: m.bio || '',
              profileRole: m.role || '',
              institution: m.institution || '',
              institution2: m.institution_2 || '',
              institution3: m.institution_3 || '',
              interests: (m.interests ?? []).join(', '),
              linkedin: m.linkedin || '',
              twitter: m.twitter || '',
              facebook: m.facebook || '',
              tiktok: m.tiktok || '',
              website: m.website || '',
              accountType: m.account_type || 'individual',
              institutionType: m.institution_type || '',
              institutionDisplayName: m.institution_display_name || '',
              contactPerson: m.contact_person_name || '',
              contactRole: m.contact_person_role || '',
              institutionWebsite: m.institution_website || '',
              institutionCac: m.institution_cac || '',
              adminRole: m.is_admin ? (m.admin_role === 'super' ? 'Super Admin' : 'Moderator') : '',
              verified: m.is_verified ? 'Yes' : 'No',
              tier: (m.subscription_tier || 'free').charAt(0).toUpperCase() + (m.subscription_tier || 'free').slice(1),
              billing: m.subscription_plan || 'N/A',
              expires: m.subscription_expires_at ? fmt(m.subscription_expires_at) : 'No expiry',
              joined: fmt(m.created_at),
            })))} />
          </div>
          <FilterPills value={memberRoleFilter} onChange={(v) => setMemberRoleFilter(v as typeof memberRoleFilter)} options={[
            { id: 'all', label: `All (${members.length})` },
            { id: 'admin', label: `Admins (${members.filter(m => m.is_admin).length})` },
            { id: 'pro', label: `Pro (${members.filter(m => m.subscription_tier === 'pro').length})` },
            { id: 'growth', label: `Growth (${members.filter(m => m.subscription_tier === 'growth').length})` },
            { id: 'trial', label: `Trial (${members.filter(m => m.subscription_plan === 'trial').length})` },
            { id: 'free', label: `Free (${members.filter(m => !m.subscription_tier || m.subscription_tier === 'free').length})` },
            { id: 'suspended', label: `Suspended (${members.filter(m => m.is_suspended).length})` },
          ]} />
          <div className="space-y-3">
          {filteredMembers.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No members found.</p>}
          {filteredMembers.map((member) => {
            const displayName = [member.first_name, member.last_name].filter(Boolean).join(' ') || member.username || member.email || 'Unknown'
            const isSelf = member.id === currentUserId
            const isModerator = member.is_admin && member.admin_role === 'moderator'
            const showPermsPanel = expandedPermsMember === member.id
            return (
              <div key={member.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a href={`/directory/${member.id}`} target="_blank" rel="noopener noreferrer" className="font-medium text-green-700 dark:text-green-400 hover:underline">{displayName}</a>
                      {member.subscription_tier === 'growth' && (
                        <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs px-2 py-0.5 rounded-full font-semibold">Growth</span>
                      )}
                      {member.subscription_tier === 'pro' && (
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 rounded-full font-semibold">Pro</span>
                      )}
                      {member.subscription_plan === 'trial' && (
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full">Trial</span>
                      )}
                      {member.is_admin && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          member.admin_role === 'super'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}>
                          {member.admin_role === 'super' ? 'Super Admin' : 'Moderator'}
                        </span>
                      )}
                      {member.is_suspended && (
                        <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs px-2 py-0.5 rounded-full">Suspended</span>
                      )}
                      {isSelf && <span className="text-xs text-gray-400 dark:text-gray-500 italic">You</span>}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{member.email || 'No email'}</p>
                    {member.subscription_tier && member.subscription_tier !== 'free' && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 capitalize">
                        Tier: {member.subscription_tier}
                        {member.subscription_plan ? ` · ${member.subscription_plan}` : ''}
                        {member.subscription_expires_at ? ` · Expires ${fmt(member.subscription_expires_at)}` : ' · No expiry'}
                      </p>
                    )}
                  </div>
                </div>
                {!isSelf && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-2">
                    {member.is_suspended ? (
                      <button onClick={() => memberAction(member.id, 'unsuspend', m => ({ ...m, is_suspended: false }))}
                        className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                        Reinstate
                      </button>
                    ) : (
                      <button onClick={() => memberAction(member.id, 'suspend', m => ({ ...m, is_suspended: true }))}
                        className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1.5 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50">
                        Suspend
                      </button>
                    )}
                    {/* View Business links — shown for each business the member owns */}
                    {businesses.filter(b => b.user_id === member.id).map((biz, idx) => (
                      <a
                        key={biz.id}
                        href={`/admin/business-preview/${biz.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/40 inline-flex items-center gap-1"
                      >
                        👁 {businesses.filter(b2 => b2.user_id === member.id).length > 1 ? `Business ${idx + 1}: ${biz.name}` : 'View Business'}
                      </a>
                    ))}
                    {isSuperAdmin && (
                      <>
                        {/* Tier selector */}
                        <select
                          value={member.subscription_tier || 'free'}
                          onChange={async (e) => {
                            const newTier = e.target.value as 'free' | 'pro' | 'growth'
                            const res = await fetch('/api/admin/member', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ userId: member.id, action: 'set_tier', tier: newTier }),
                            })
                            if (res.ok) {
                              setMembers(prev => prev.map(m => m.id === member.id ? {
                                ...m,
                                subscription_tier: newTier,
                                is_verified: newTier !== 'free',
                                is_elite: false,
                                subscription_plan: newTier === 'free' ? null : 'admin',
                                subscription_expires_at: newTier === 'free' ? null : m.subscription_expires_at,
                              } : m))
                            }
                          }}
                          className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1.5 rounded-md cursor-pointer"
                        >
                          <option value="free">Free</option>
                          <option value="pro">Pro</option>
                          <option value="growth">Growth</option>
                        </select>
                        {!member.is_admin && (
                          <>
                            <button onClick={() => memberAction(member.id, 'makemoderator', m => ({ ...m, is_admin: true, admin_role: 'moderator' }))}
                              className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50">
                              Make Moderator
                            </button>
                            <button onClick={() => memberAction(member.id, 'makesuper', m => ({ ...m, is_admin: true, admin_role: 'super' }))}
                              className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-3 py-1.5 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50">
                              Make Super Admin
                            </button>
                          </>
                        )}
                        {member.is_admin && (
                          <button onClick={() => memberAction(member.id, 'removeadmin', m => ({ ...m, is_admin: false, admin_role: null, admin_permissions: null }))}
                            className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                            Remove Admin
                          </button>
                        )}
                        {/* Manage moderator permissions button */}
                        {isModerator && (
                          <button onClick={() => setExpandedPermsMember(showPermsPanel ? null : member.id)}
                            className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900/50">
                            {showPermsPanel ? 'Hide Permissions' : 'Manage Permissions'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ── Moderator Permissions Panel ── */}
                {showPermsPanel && isSuperAdmin && isModerator && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Module Permissions</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PERMISSION_LABELS.map(({ key, label }) => {
                        const perms = member.admin_permissions ?? {}
                        const enabled = perms[key] === true
                        return (
                          <label key={key} className="flex items-center gap-2 cursor-pointer">
                            <button
                              onClick={() => updatePermissions(member.id, { ...perms, [key]: !enabled })}
                              disabled={savingPerms}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </button>
                            <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
                          </label>
                        )
                      })}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Changes are saved immediately. Toggling a permission controls which admin tabs this moderator can access.</p>
                  </div>
                )}
              </div>
            )
          })}
          </div>
          </>)}
        </div>
      )}

      {/* ── Grants ── */}
      {activeTab === 'grants' && (
        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex-1"><SearchBar value={grantSearch} onChange={setGrantSearch} placeholder="Search grants by title, funder, or category..." /></div>
            <ExportButton onClick={() => exportToExcel('Grants', [
              { header: 'Title', key: 'title', width: 36 },
              { header: 'Funder', key: 'funder', width: 24 },
              { header: 'Category', key: 'category', width: 18 },
              { header: 'Status', key: 'status', width: 12 },
              { header: 'Deadline', key: 'deadline', width: 16 },
              { header: 'Featured', key: 'featured', width: 10 },
              { header: 'Created', key: 'created', width: 16 },
            ], grants.map(g => ({
              title: g.title,
              funder: g.funder || 'N/A',
              category: g.category || 'N/A',
              status: g.status || 'N/A',
              deadline: g.deadline ? fmt(g.deadline) : 'N/A',
              featured: g.featured ? 'Yes' : 'No',
              created: fmt(g.created_at),
            })))} />
          </div>
          <FilterPills value={grantStatusFilter} onChange={(v) => setGrantStatusFilter(v as typeof grantStatusFilter)} options={[
            { id: 'all', label: `All (${grants.length})` },
            { id: 'open', label: `Open (${grants.filter(g => g.status === 'open').length})` },
            { id: 'closed', label: `Closed (${grants.filter(g => g.status === 'closed').length})` },
          ]} />
          <div className="space-y-3">
          {filteredGrants.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No grants found.</p>}
          {filteredGrants.map((grant) => (
            <div key={grant.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{grant.title}</span>
                  {grant.featured && (
                    <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs px-2 py-0.5 rounded-full font-semibold">Featured</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    grant.status === 'open'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}>
                    {grant.status === 'open' ? 'Open' : 'Closed'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {grant.funder || 'No funder'} · {grant.category || 'Uncategorized'}
                  {grant.posted_by ? ` · by ${getDisplayName(grant.posted_by)}` : ''}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {fmt(grant.created_at)}
                  {grant.deadline && ` · Deadline: ${fmt(grant.deadline)}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                <button onClick={() => toggleGrantFeatured(grant.id, !grant.featured)}
                  className={`text-xs px-3 py-1.5 rounded-md ${
                    grant.featured
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}>
                  {grant.featured ? 'Unfeature' : 'Feature'}
                </button>
                <button onClick={() => toggleGrantStatus(grant.id, grant.status === 'open' ? 'closed' : 'open')}
                  className={`text-xs px-3 py-1.5 rounded-md ${
                    grant.status === 'open'
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                  }`}>
                  {grant.status === 'open' ? 'Close' : 'Reopen'}
                </button>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* ── Lazy-loaded tabs — wrapped in Suspense for code-split loading ── */}
      <Suspense fallback={<div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Loading…</div>}>
      {activeTab === 'community' && (
        <CommunityTab posts={communityPosts} getDisplayName={getDisplayName} fmt={fmt} />
      )}

      {activeTab === 'research' && (
        <ResearchTab posts={researchPosts} getDisplayName={getDisplayName} fmt={fmt} />
      )}

      {activeTab === 'comments' && (
        <CommentsTab comments={comments} getDisplayName={getDisplayName} fmt={fmt} />
      )}

      {activeTab === 'prices' && (
        <PricesTab reports={priceReports} getDisplayName={getDisplayName} fmt={fmt} />
      )}

      {activeTab === 'mentorship' && (
        <MentorshipTab mentors={mentorProfiles} requests={mentorshipRequests} getDisplayName={getDisplayName} fmt={fmt} />
      )}

      {/* ── Reports ── */}
      {activeTab === 'reports' && (
        <div>
          <SearchBar value={reportSearch} onChange={setReportSearch} placeholder="Search reports by post title or type..." />
          <div className="space-y-4">
          {filteredReports.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No active reports.</p>}
          {filteredReports.map((rg) => (
            <div key={`${rg.postType}-${rg.postId}`} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{rg.postTitle}</span>
                    <span className="capitalize text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{rg.postType}</span>
                    <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs px-2 py-0.5 rounded-full">{rg.count} report{rg.count !== 1 ? 's' : ''}</span>
                    {!rg.isActive && (
                      <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">Hidden</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Last reported: {fmt(rg.latestAt)}</p>
                  <div className="mt-2 space-y-0.5">
                    {Object.entries(rg.reasons).map(([reason, count]) => (
                      <p key={reason} className="text-xs text-gray-500 dark:text-gray-400">· {reason} {count > 1 ? `(×${count})` : ''}</p>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                  <button onClick={() => dismissReports(rg.postId, rg.postType)}
                    className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                    Dismiss Reports
                  </button>
                  <button onClick={() => removeReportedPost(rg.postId, rg.postType)}
                    className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700">
                    Remove Post
                  </button>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {activeTab === 'support' && (
        <SupportTab tickets={supportTickets} profilesMap={profilesMap} getDisplayName={getDisplayName} currentUserId={currentUserId} />
      )}

      {activeTab === 'orders' && (
        <OrdersTab profilesMap={profilesMap} getDisplayName={getDisplayName} />
      )}

      {activeTab === 'analytics' && isSuperAdmin && (
        <AnalyticsTab
          members={members}
          waitlistSignups={waitlistSignups}
          communityPosts={communityPosts}
          researchPosts={researchPosts}
          opportunities={opportunities}
          listings={listings}
          grants={grants}
          priceReports={priceReports}
          mentorProfiles={mentorProfiles}
          mentorshipRequests={mentorshipRequests}
          businesses={businesses}
          invoices={invoices}
          businessExpenses={businessExpenses}
          profilesMap={profilesMap}
          searchLogs={searchLogs}
        />
      )}

      {activeTab === 'audit_log' && isSuperAdmin && (
        <AuditLogTab entries={auditLog} getDisplayName={getDisplayName} fmt={fmt} />
      )}

      {activeTab === 'notifications' && isSuperAdmin && (
        <NotifyPanel />
      )}

      {activeTab === 'feature_flags' && isSuperAdmin && (
        <FeatureFlagsTab initialFlags={featureFlags} />
      )}
      </Suspense>

      {/* ── Settings ── */}
      {activeTab === 'settings' && isSuperAdmin && (() => {
        // Status badge helper
        const badge = (label: string, color: 'green' | 'red' | 'yellow' | 'gray') => {
          const colors = {
            green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
            red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
            yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
            gray: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
          }
          return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${colors[color]}`}>{label}</span>
        }
        // Section header component
        const SectionHeader = ({ sectionKey, title, badges, borderColor }: { sectionKey: string; title: string; badges: React.ReactNode; borderColor?: string }) => (
          <button onClick={() => toggleSection(sectionKey)}
            className={`w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/60 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors ${borderColor ? `border-l-2 ${borderColor}` : ''}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</span>
              {!openSections[sectionKey] && badges}
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${openSections[sectionKey] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
        )
        // Access section badges
        const accessBadges = (<>
          {maintenanceEnabled && badge('Maintenance ON', 'red')}
          {!registrationEnabled && badge('Registration closed', 'yellow')}
          {announcementEnabled && badge('Banner live', 'green')}
          {!maintenanceEnabled && registrationEnabled && !announcementEnabled && badge('Normal', 'gray')}
        </>)
        // Moderation section badges
        const moderationBadges = (<>
          {badge(moderationMode === 'approval' ? 'Approval required' : 'Immediate', moderationMode === 'approval' ? 'yellow' : 'gray')}
          {badge(`${reportThreshold} reports`, 'gray')}
        </>)
        // Mentorship section badges
        const mentorshipBadges = (<>
          {badge(mentorshipEnabled ? 'Active' : 'Disabled', mentorshipEnabled ? 'green' : 'gray')}
          {mentorshipRequiresVerification && badge('Verified only', 'yellow')}
        </>)
        // Email & cron section badges
        const emailBadges = (<>
          {badge(digestEnabled ? 'Digest on' : 'Digest paused', digestEnabled ? 'green' : 'gray')}
          {badge(celebrationsEnabled ? 'Celebrations on' : 'Celebrations off', celebrationsEnabled ? 'green' : 'gray')}
          {badge(expiryReminderEnabled ? 'Reminders on' : 'Reminders off', expiryReminderEnabled ? 'green' : 'gray')}
          {badge(expireFeaturedEnabled ? 'Expire-featured on' : 'Expire-featured off', expireFeaturedEnabled ? 'green' : 'gray')}
        </>)
        // Pricing section badges
        const pricingBadges = (<>
          {badge(`Pro ₦${Number(proMonthlyPrice).toLocaleString()}/mo`, 'green')}
          {badge(`Growth ₦${Number(growthMonthlyPrice).toLocaleString()}/mo`, 'yellow')}
          {badge(`${graceDays}d grace`, 'gray')}
        </>)
        // Features section badges
        const featuresBadges = (<>
          {badge(allowMultiBusiness ? 'Multi-biz on' : 'Single biz', allowMultiBusiness ? 'green' : 'gray')}
          {badge(`${freeTrialDays}d trial`, 'gray')}
        </>)

        return (
        <div className="space-y-2">

          {/* ═══ Section: Platform Access ═══ */}
          <div className={`border rounded-lg overflow-hidden ${maintenanceEnabled ? 'border-red-300 dark:border-red-800' : 'border-gray-200 dark:border-gray-800'}`}>
            <SectionHeader sectionKey="access" title="Platform Access" badges={accessBadges} borderColor={maintenanceEnabled ? 'border-l-red-500' : undefined} />
            {openSections.access && (
              <div className="px-4 py-3 space-y-4 bg-white dark:bg-gray-900">
                {/* Member Registration */}
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">Member Registration</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Allow or block new members from creating accounts.</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setRegistrationEnabled(!registrationEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${registrationEnabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${registrationEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{registrationEnabled ? 'Registration open' : 'Registration closed'}</span>
                  </div>
                </div>
                <hr className="border-gray-100 dark:border-gray-800" />
                {/* Maintenance Mode */}
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">Maintenance Mode</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Full-page lock for all non-admin users. Use during migrations or major updates.</p>
                  <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => setMaintenanceEnabled(!maintenanceEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${maintenanceEnabled ? 'bg-red-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${maintenanceEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{maintenanceEnabled ? 'Maintenance ON — site locked' : 'Normal operation'}</span>
                  </div>
                  {maintenanceEnabled && (
                    <div className="space-y-2">
                      <textarea value={maintenanceMessage} onChange={(e) => setMaintenanceMessage(e.target.value)}
                        placeholder="We're upgrading the platform. Back shortly!" rows={2}
                        className={`w-full resize-none ${sInput}`} />
                      <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md px-3 py-2">
                        All non-admin users see a maintenance page. Admins still have full access.
                      </p>
                    </div>
                  )}
                </div>
                <hr className="border-gray-100 dark:border-gray-800" />
                {/* Announcement Banner */}
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">Announcement Banner</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Platform-wide banner at the top of every page.</p>
                  <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => setAnnouncementEnabled(!announcementEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${announcementEnabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${announcementEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{announcementEnabled ? 'Banner visible' : 'Banner hidden'}</span>
                  </div>
                  {announcementEnabled && (
                    <div className="space-y-2">
                      <textarea value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)}
                        placeholder="Enter announcement message..." rows={2}
                        className={`w-full resize-none ${sInput}`} />
                      <div className="flex gap-2">
                        {(['green', 'yellow', 'red', 'blue'] as const).map((color) => (
                          <button key={color} onClick={() => setAnnouncementColor(color)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium border-2 transition-all ${
                              announcementColor === color ? 'border-gray-800 dark:border-gray-300 scale-105' : 'border-transparent'
                            } ${
                              color === 'green'  ? 'bg-green-100 text-green-800'
                              : color === 'yellow' ? 'bg-yellow-100 text-yellow-800'
                              : color === 'red'    ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                            }`}>
                            {color.charAt(0).toUpperCase() + color.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ═══ Section: Content & Moderation ═══ */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <SectionHeader sectionKey="moderation" title="Content & Moderation" badges={moderationBadges} />
            {openSections.moderation && (
              <div className="px-4 py-3 space-y-4 bg-white dark:bg-gray-900">
                {/* Post Moderation */}
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">Post Moderation</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">New posts go live immediately or require admin approval.</p>
                  <div className="flex gap-3">
                    {(['immediate', 'approval'] as const).map(mode => (
                      <button key={mode} onClick={() => setModerationMode(mode)}
                        className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                          moderationMode === mode
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}>
                        {mode === 'immediate' ? 'Immediate' : 'Requires Approval'}
                      </button>
                    ))}
                  </div>
                  {moderationMode === 'approval' && (
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-md px-3 py-2 mt-2">
                      All new posts will be hidden until approved in the Opportunities or Marketplace tabs.
                    </p>
                  )}
                </div>
                <hr className="border-gray-100 dark:border-gray-800" />
                {/* Daily Post Limits */}
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">Daily Post Limits</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Maximum posts per member per day.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Opportunities</label>
                      <input type="number" min={1} value={opportunityLimit} onChange={(e) => setOpportunityLimit(e.target.value)} className={`w-full ${sInput}`} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Listings</label>
                      <input type="number" min={1} value={listingLimit} onChange={(e) => setListingLimit(e.target.value)} className={`w-full ${sInput}`} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Community</label>
                      <input type="number" min={1} value={communityDailyLimit} onChange={(e) => setCommunityDailyLimit(e.target.value)} className={`w-full ${sInput}`} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Research</label>
                      <input type="number" min={1} value={researchDailyLimit} onChange={(e) => setResearchDailyLimit(e.target.value)} className={`w-full ${sInput}`} />
                    </div>
                  </div>
                </div>
                <hr className="border-gray-100 dark:border-gray-800" />
                {/* Report Threshold + Notification */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">Report Threshold</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Reports to auto-hide a post.</p>
                    <div className="flex items-center gap-2">
                      <input type="number" min={1} max={50} value={reportThreshold} onChange={(e) => setReportThreshold(e.target.value)} className={`w-20 ${sInput}`} />
                      <span className="text-xs text-gray-500">reports</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">Report Alerts</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Emails to notify on new reports. Separate multiple addresses with commas.</p>
                    <input type="text" value={adminNotificationEmail} onChange={(e) => setAdminNotificationEmail(e.target.value)}
                      placeholder="admin@agroyield.com, support@agroyield.com" className={`w-full ${sInput}`} />
                  </div>
                </div>
                <hr className="border-gray-100 dark:border-gray-800" />
                {/* Content Types */}
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">Content Types</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Opportunity types, marketplace categories, and commodity categories available to members.</p>
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Opportunity Types</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {opportunityTypes.map((type) => (
                        <span key={type} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">
                          {type}
                          <button onClick={() => removeOpportunityType(type)} className="text-gray-400 hover:text-red-500 ml-0.5 leading-none text-base">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={newOpportunityType} onChange={(e) => setNewOpportunityType(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addOpportunityType()}
                        placeholder="Add type..." className={`flex-1 ${sInput}`} />
                      <button onClick={addOpportunityType} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">Add</button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Marketplace Categories</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {marketplaceCategories.map((cat) => (
                        <span key={cat} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">
                          {cat}
                          <button onClick={() => removeMarketplaceCategory(cat)} className="text-gray-400 hover:text-red-500 ml-0.5 leading-none text-base">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={newMarketplaceCategory} onChange={(e) => setNewMarketplaceCategory(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addMarketplaceCategory()}
                        placeholder="Add category..." className={`flex-1 ${sInput}`} />
                      <button onClick={addMarketplaceCategory} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">Add</button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Commodity Categories (Price Tracker)</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {commodityCategories.map((cat) => (
                        <span key={cat} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">
                          {cat}
                          <button onClick={() => removeCommodityCategory(cat)} className="text-gray-400 hover:text-red-500 ml-0.5 leading-none text-base">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={newCommodityCategory} onChange={(e) => setNewCommodityCategory(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCommodityCategory()}
                        placeholder="Add category..." className={`flex-1 ${sInput}`} />
                      <button onClick={addCommodityCategory} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">Add</button>
                    </div>
                  </div>
                  {/* Commodity Items per Category */}
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Commodities per Category (Price Tracker)</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Manage the commodity options available under each category when submitting price reports.</p>
                    <div className="space-y-3">
                      {commodityCategories.map(cat => {
                        const key = cat.toLowerCase().replace(/\s+/g, '_')
                        const items = commodityItems[key] ?? []
                        return (
                          <div key={key} className="border border-gray-100 dark:border-gray-800 rounded-lg p-3">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 capitalize">{cat}</p>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {items.map(item => (
                                <span key={item} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">
                                  {item}
                                  <button onClick={() => removeCommodityItem(cat, item)} className="text-gray-400 hover:text-red-500 ml-0.5 leading-none text-base">&times;</button>
                                </span>
                              ))}
                              {items.length === 0 && <span className="text-xs text-gray-400 italic">No commodities yet</span>}
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newCommodityItem[key] ?? ''}
                                onChange={e => setNewCommodityItem(prev => ({ ...prev, [key]: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && addCommodityItem(cat)}
                                placeholder={`Add commodity to ${cat}...`}
                                className={`flex-1 ${sInput}`}
                              />
                              <button onClick={() => addCommodityItem(cat)} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">Add</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ Section: Mentorship ═══ */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <SectionHeader sectionKey="mentorship" title="Mentorship" badges={mentorshipBadges} />
            {openSections.mentorship && (
              <div className="px-4 py-3 space-y-4 bg-white dark:bg-gray-900">
                {/* Mentorship Module */}
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">Mentorship Module</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">When disabled, mentorship pages show a &ldquo;coming soon&rdquo; message.</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setMentorshipEnabled(!mentorshipEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${mentorshipEnabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${mentorshipEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{mentorshipEnabled ? 'Mentorship active' : 'Mentorship disabled'}</span>
                  </div>
                </div>
                <hr className="border-gray-100 dark:border-gray-800" />
                {/* Mentorship Verification Gate */}
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">Verification Gate</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Require verified subscription to register as mentor or send requests.</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setMentorshipRequiresVerification(!mentorshipRequiresVerification)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${mentorshipRequiresVerification ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${mentorshipRequiresVerification ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{mentorshipRequiresVerification ? 'Verified members only' : 'Open to all members'}</span>
                  </div>
                  {mentorshipRequiresVerification && (
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-md px-3 py-2 mt-2">
                      Creates a subscription incentive — only paying members access mentorship.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ═══ Section: Email & Notifications ═══ */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <SectionHeader sectionKey="email" title="Email & Notifications" badges={emailBadges} />
            {openSections.email && (
              <div className="px-4 py-3 space-y-4 bg-white dark:bg-gray-900">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">Weekly Digest Email</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Weekly summary of new opportunities and members. Disable before launch or when content is sparse.</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setDigestEnabled(!digestEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${digestEnabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${digestEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{digestEnabled ? 'Digest active — emails sent weekly' : 'Digest paused — no emails'}</span>
                  </div>
                </div>
                <hr className="border-gray-100 dark:border-gray-800" />
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">Birthday &amp; Anniversary Emails</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Daily celebration emails to members. Disable during quiet-launch periods.</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setCelebrationsEnabled(!celebrationsEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${celebrationsEnabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${celebrationsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{celebrationsEnabled ? 'Celebrations active — birthday & anniversary emails send daily' : 'Celebrations paused'}</span>
                  </div>
                </div>
                <hr className="border-gray-100 dark:border-gray-800" />
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">Subscription Expiry Reminders</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Email sent 3 days before a paid plan expires. Turn on once real subscriptions are live.</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setExpiryReminderEnabled(!expiryReminderEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${expiryReminderEnabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${expiryReminderEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{expiryReminderEnabled ? 'Reminders active — 3-day warnings send daily' : 'Reminders paused'}</span>
                  </div>
                </div>
                <hr className="border-gray-100 dark:border-gray-800" />
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">Featured Listing Expirations</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Daily sweep that removes the featured badge once a listing&apos;s paid period ends. Keep ON in production.</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setExpireFeaturedEnabled(!expireFeaturedEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${expireFeaturedEnabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${expireFeaturedEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{expireFeaturedEnabled ? 'Active — expired features are auto-removed' : 'Paused — featured status will persist past expiry'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ Section: Pricing & Subscriptions ═══ */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <SectionHeader sectionKey="pricing" title="Pricing & Subscriptions" badges={pricingBadges} />
            {openSections.pricing && (
              <div className="px-4 py-3 space-y-4 bg-white dark:bg-gray-900">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">Pro Tier Pricing</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Prices for the Pro subscription tier.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Monthly (&#8358;)</label>
                      <input type="number" value={proMonthlyPrice} onChange={(e) => setProMonthlyPrice(e.target.value)} className={`w-full ${sInput}`} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Annual (&#8358;)</label>
                      <input type="number" value={proAnnualPrice} onChange={(e) => setProAnnualPrice(e.target.value)} className={`w-full ${sInput}`} />
                    </div>
                  </div>
                </div>
                <hr className="border-gray-100 dark:border-gray-800" />
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">Growth Tier Pricing</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Prices for the Growth subscription tier.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Monthly (&#8358;)</label>
                      <input type="number" value={growthMonthlyPrice} onChange={(e) => setGrowthMonthlyPrice(e.target.value)} className={`w-full ${sInput}`} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Annual (&#8358;)</label>
                      <input type="number" value={growthAnnualPrice} onChange={(e) => setGrowthAnnualPrice(e.target.value)} className={`w-full ${sInput}`} />
                    </div>
                  </div>
                </div>
                <hr className="border-gray-100 dark:border-gray-800" />
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">Free Trial</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Duration of the free trial for new subscribers.</p>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} max={90} value={freeTrialDays}
                      onChange={(e) => setFreeTrialDays(e.target.value)}
                      className={`w-20 ${sInput}`} />
                    <span className="text-xs text-gray-500">days (0 = no trial)</span>
                  </div>
                </div>
                <hr className="border-gray-100 dark:border-gray-800" />
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">Subscription Grace Period</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Days after expiry before tier is downgraded to Free.</p>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} max={90} value={graceDays}
                      onChange={(e) => setGraceDays(parseInt(e.target.value, 10) || 0)}
                      className={`w-20 ${sInput}`} />
                    <span className="text-xs text-gray-500">days (0 = immediate)</span>
                  </div>
                </div>
                <hr className="border-gray-100 dark:border-gray-800" />
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">Featured Listing Pricing</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Set the duration and price for each featured listing plan. Members pay via Paystack.</p>
                  <div className="space-y-2">
                    {featuredPlans.map((plan, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input type="number" min={1} value={plan.days}
                          onChange={e => {
                            const updated = [...featuredPlans]
                            updated[idx] = { ...plan, days: parseInt(e.target.value, 10) || 1, label: `${parseInt(e.target.value, 10) || 1} days` }
                            setFeaturedPlans(updated)
                          }}
                          className={`w-20 ${sInput}`} />
                        <span className="text-xs text-gray-500">days</span>
                        <input type="number" min={0} value={plan.price}
                          onChange={e => {
                            const updated = [...featuredPlans]
                            updated[idx] = { ...plan, price: parseInt(e.target.value, 10) || 0 }
                            setFeaturedPlans(updated)
                          }}
                          className={`w-24 ${sInput}`} />
                        <span className="text-xs text-gray-500">&#8358;</span>
                        {featuredPlans.length > 1 && (
                          <button onClick={() => setFeaturedPlans(featuredPlans.filter((_, i) => i !== idx))}
                            className="text-xs text-red-500 hover:text-red-700">Remove</button>
                        )}
                      </div>
                    ))}
                    {featuredPlans.length < 4 && (
                      <button onClick={() => setFeaturedPlans([...featuredPlans, { days: 7, price: 500, label: '7 days' }])}
                        className="text-xs text-green-600 hover:text-green-700 font-medium">+ Add plan</button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ Section: Feature Flags ═══ */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <SectionHeader sectionKey="features" title="Feature Flags" badges={featuresBadges} />
            {openSections.features && (
              <div className="px-4 py-3 space-y-4 bg-white dark:bg-gray-900">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">Multi-Business Support</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Allow members to create more than one business. Enable after multi-business feature is fully built.</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setAllowMultiBusiness(!allowMultiBusiness)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${allowMultiBusiness ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${allowMultiBusiness ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{allowMultiBusiness ? 'Multi-business enabled' : 'Single business only'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2 pb-8">
            <button onClick={saveSettings} disabled={savingSettings}
              className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
            {settingsSaved && <span className="text-sm text-green-600 dark:text-green-400 font-medium">Settings saved!</span>}
          </div>
        </div>
      )})()}
    </div>
  )
}

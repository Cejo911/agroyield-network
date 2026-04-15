'use client'
import { useMemo, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'
import jsPDF from 'jspdf'

// ── Types ──
interface AnalyticsProps {
  members: { id: string; gender: string | null; created_at: string; is_verified: boolean; is_elite: boolean; is_suspended: boolean; subscription_tier: string | null; subscription_plan: string | null; subscription_expires_at: string | null }[]
  waitlistSignups: { id: string; created_at: string }[]
  communityPosts: { id: string; user_id: string; created_at: string; is_active: boolean }[]
  researchPosts: { id: string; user_id: string; created_at: string }[]
  opportunities: { id: string; user_id: string; created_at: string; is_active: boolean }[]
  listings: { id: string; user_id: string; created_at: string; is_active: boolean }[]
  grants: { id: string; created_at: string }[]
  priceReports: { id: string; user_id: string; reported_at: string }[]
  mentorProfiles: { user_id: string }[]
  mentorshipRequests: { id: string; mentor_id: string; mentee_id: string; status: string; created_at: string }[]
  businesses: { id: string; user_id: string; name: string; created_at: string }[]
  invoices: { id: string; business_id: string; status: string; total: number | null; issue_date: string | null; created_at: string }[]
  businessExpenses: { id: string; business_id: string; amount: number; category: string | null; date: string | null; created_at: string }[]
  profilesMap: Record<string, { first_name: string | null; last_name: string | null; email: string | null; username: string | null }>
  searchLogs: { id: string; user_id: string | null; query: string; module: string; results_count: number; created_at: string }[]
}

const COLORS = ['#16a34a', '#22c55e', '#86efac', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6']

// ── Helpers ──
function getLast12Months(): { key: string; label: string }[] {
  const months = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    months.push({
      key: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
    })
  }
  return months
}

function getLast30Days(): { key: string; label: string }[] {
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    })
  }
  return days
}

function countByPeriod(items: { date: string }[], periods: { key: string }[]): number[] {
  const counts: Record<string, number> = {}
  for (const p of periods) counts[p.key] = 0
  for (const item of items) {
    for (const p of periods) {
      if (item.date.startsWith(p.key)) { counts[p.key]++; break }
    }
  }
  return periods.map(p => counts[p.key])
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

// ── Compact currency formatter — ₦1,234,567 → ₦1.23M ──
function fmtNaira(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}₦${(abs / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `${sign}₦${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}₦${(abs / 1_000).toFixed(1)}K`
  return `${sign}₦${abs.toLocaleString()}`
}

// ── Stat Card ──
function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 min-w-0 overflow-hidden">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">{label}</p>
      <p className={`text-lg sm:text-xl font-bold truncate ${accent || 'text-gray-900 dark:text-white'}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 truncate">{sub}</p>}
    </div>
  )
}

// ── Section wrapper ──
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

// ── Main Component ──
export default function AnalyticsTab(props: AnalyticsProps) {
  const { members, waitlistSignups, communityPosts, researchPosts, opportunities, listings, grants, priceReports, mentorProfiles, mentorshipRequests, businesses, invoices, businessExpenses, profilesMap, searchLogs } = props
  const [exportingPdf, setExportingPdf] = useState(false)

  const months = useMemo(() => getLast12Months(), [])
  const days30 = useMemo(() => getLast30Days(), [])

  // ═══════════════════════════════════════════════════════════
  // 1. GROWTH & SIGNUP TRENDS
  // ═══════════════════════════════════════════════════════════
  const growthData = useMemo(() => {
    const membersByMonth = countByPeriod(members.map(m => ({ date: m.created_at })), months)
    const waitlistByMonth = countByPeriod(waitlistSignups.map(w => ({ date: w.created_at })), months)
    let cumMembers = members.filter(m => m.created_at < months[0].key).length
    let cumWaitlist = waitlistSignups.filter(w => w.created_at < months[0].key).length
    return months.map((m, i) => {
      cumMembers += membersByMonth[i]
      cumWaitlist += waitlistByMonth[i]
      return {
        label: m.label,
        'New Members': membersByMonth[i],
        'Waitlist Signups': waitlistByMonth[i],
        'Total Members': cumMembers,
        'Total Waitlist': cumWaitlist,
      }
    })
  }, [members, waitlistSignups, months])

  // Growth rate (this month vs last month)
  const thisMonthSignups = growthData.length >= 1 ? growthData[growthData.length - 1]['New Members'] : 0
  const lastMonthSignups = growthData.length >= 2 ? growthData[growthData.length - 2]['New Members'] : 0
  const growthRate = lastMonthSignups > 0 ? Math.round(((thisMonthSignups - lastMonthSignups) / lastMonthSignups) * 100) : 0

  // ═══════════════════════════════════════════════════════════
  // 2. ENGAGEMENT FUNNEL
  // ═══════════════════════════════════════════════════════════
  const funnel = useMemo(() => {
    const total = members.length
    const verified = members.filter(m => m.is_verified).length
    const sevenDaysAgo = daysAgo(7).toISOString()

    // Users who created any content
    const contentCreators = new Set<string>()
    communityPosts.forEach(p => contentCreators.add(p.user_id))
    researchPosts.forEach(p => contentCreators.add(p.user_id))
    opportunities.forEach(o => contentCreators.add(o.user_id))
    listings.forEach(l => contentCreators.add(l.user_id))
    priceReports.forEach(r => contentCreators.add(r.user_id))

    // Users active in last 7 days (posted anything)
    const recentActive = new Set<string>()
    communityPosts.filter(p => p.created_at >= sevenDaysAgo).forEach(p => recentActive.add(p.user_id))
    researchPosts.filter(p => p.created_at >= sevenDaysAgo).forEach(p => recentActive.add(p.user_id))
    priceReports.filter(r => r.reported_at >= sevenDaysAgo).forEach(r => recentActive.add(r.user_id))

    // Multi-module users (used 2+ modules)
    const moduleUsage: Record<string, Set<string>> = {}
    communityPosts.forEach(p => { if (!moduleUsage[p.user_id]) moduleUsage[p.user_id] = new Set(); moduleUsage[p.user_id].add('community') })
    researchPosts.forEach(p => { if (!moduleUsage[p.user_id]) moduleUsage[p.user_id] = new Set(); moduleUsage[p.user_id].add('research') })
    opportunities.forEach(o => { if (!moduleUsage[o.user_id]) moduleUsage[o.user_id] = new Set(); moduleUsage[o.user_id].add('opportunities') })
    listings.forEach(l => { if (!moduleUsage[l.user_id]) moduleUsage[l.user_id] = new Set(); moduleUsage[l.user_id].add('marketplace') })
    priceReports.forEach(r => { if (!moduleUsage[r.user_id]) moduleUsage[r.user_id] = new Set(); moduleUsage[r.user_id].add('prices') })
    mentorshipRequests.forEach(r => {
      if (!moduleUsage[r.mentor_id]) moduleUsage[r.mentor_id] = new Set(); moduleUsage[r.mentor_id].add('mentorship')
      if (!moduleUsage[r.mentee_id]) moduleUsage[r.mentee_id] = new Set(); moduleUsage[r.mentee_id].add('mentorship')
    })
    const multiModule = Object.values(moduleUsage).filter(s => s.size >= 2).length

    const steps = [
      { name: 'Registered', value: total },
      { name: 'Verified', value: verified },
      { name: 'Created Content', value: contentCreators.size },
      { name: 'Multi-Module', value: multiModule },
      { name: 'Active (7d)', value: recentActive.size },
    ]
    return steps
  }, [members, communityPosts, researchPosts, opportunities, listings, priceReports, mentorshipRequests])

  // ═══════════════════════════════════════════════════════════
  // 3. MODULE ADOPTION
  // ═══════════════════════════════════════════════════════════
  const moduleData = useMemo(() => {
    const sevenDaysAgo = daysAgo(7).toISOString()
    return [
      { module: 'Community', total: communityPosts.filter(p => p.is_active).length, recent: communityPosts.filter(p => p.created_at >= sevenDaysAgo).length },
      { module: 'Marketplace', total: listings.filter(l => l.is_active).length, recent: listings.filter(l => l.created_at >= sevenDaysAgo).length },
      { module: 'Opportunities', total: opportunities.filter(o => o.is_active).length, recent: opportunities.filter(o => o.created_at >= sevenDaysAgo).length },
      { module: 'Research', total: researchPosts.length, recent: researchPosts.filter(p => p.created_at >= sevenDaysAgo).length },
      { module: 'Prices', total: priceReports.length, recent: priceReports.filter(r => r.reported_at >= sevenDaysAgo).length },
      { module: 'Grants', total: grants.length, recent: grants.filter(g => g.created_at >= sevenDaysAgo).length },
      { module: 'Mentorship', total: mentorshipRequests.length, recent: mentorshipRequests.filter(r => r.created_at >= sevenDaysAgo).length },
      { module: 'Business', total: invoices.length, recent: invoices.filter(i => i.created_at >= sevenDaysAgo).length },
    ].sort((a, b) => b.total - a.total)
  }, [communityPosts, listings, opportunities, researchPosts, priceReports, grants, mentorshipRequests, invoices])

  // ═══════════════════════════════════════════════════════════
  // 4. SUBSCRIPTION & REVENUE
  // ═══════════════════════════════════════════════════════════
  const subscriptionData = useMemo(() => {
    const now = new Date().toISOString()
    const activeSubs = members.filter(m => m.subscription_plan && m.subscription_expires_at && m.subscription_expires_at > now)
    const expiredSubs = members.filter(m => m.subscription_plan && m.subscription_expires_at && m.subscription_expires_at <= now)
    const freeTier = members.filter(m => !m.subscription_tier || m.subscription_tier === 'free')
    const proTier = members.filter(m => m.subscription_tier === 'pro' && m.subscription_expires_at && m.subscription_expires_at > now)
    const growthTier = members.filter(m => m.subscription_tier === 'growth' && m.subscription_expires_at && m.subscription_expires_at > now)
    const trialUsers = members.filter(m => m.subscription_plan === 'trial' && m.subscription_expires_at && m.subscription_expires_at > now)
    const expiringIn30 = members.filter(m => {
      if (!m.subscription_expires_at) return false
      const exp = new Date(m.subscription_expires_at)
      const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30)
      return exp > new Date() && exp <= thirtyDays
    })

    return {
      pie: [
        { name: 'Pro', value: proTier.length },
        { name: 'Growth', value: growthTier.length },
        { name: 'Trial', value: trialUsers.length },
        { name: 'Expired', value: expiredSubs.length },
        { name: 'Free', value: freeTier.length },
      ],
      activeSubs: activeSubs.length,
      proTier: proTier.length,
      growthTier: growthTier.length,
      trialUsers: trialUsers.length,
      expiredSubs: expiredSubs.length,
      freeUsers: freeTier.length,
      expiringIn30: expiringIn30.length,
    }
  }, [members])

  // ═══════════════════════════════════════════════════════════
  // 5. CONTENT VELOCITY (last 30 days)
  // ═══════════════════════════════════════════════════════════
  const velocityData = useMemo(() => {
    const communityByDay = countByPeriod(communityPosts.map(p => ({ date: p.created_at })), days30)
    const researchByDay = countByPeriod(researchPosts.map(p => ({ date: p.created_at })), days30)
    const pricesByDay = countByPeriod(priceReports.map(r => ({ date: r.reported_at })), days30)
    const listingsByDay = countByPeriod(listings.map(l => ({ date: l.created_at })), days30)

    return days30.map((d, i) => ({
      label: d.label,
      Community: communityByDay[i],
      Research: researchByDay[i],
      Prices: pricesByDay[i],
      Marketplace: listingsByDay[i],
    }))
  }, [communityPosts, researchPosts, priceReports, listings, days30])

  // ═══════════════════════════════════════════════════════════
  // 6. BUSINESS SUITE HEALTH
  // ═══════════════════════════════════════════════════════════
  const businessHealth = useMemo(() => {
    const totalBusinesses = businesses.length
    const totalInvoices = invoices.length
    const totalExpenses = businessExpenses.length
    const paidInvoices = invoices.filter(i => i.status === 'paid')
    const totalRevenue = paidInvoices.reduce((s, i) => s + Number(i.total || 0), 0)
    const totalExpenseAmount = businessExpenses.reduce((s, e) => s + Number(e.amount || 0), 0)
    const netProfit = totalRevenue - totalExpenseAmount

    // Invoice status breakdown
    const statusCounts: Record<string, number> = {}
    for (const inv of invoices) {
      const s = inv.status || 'unknown'
      statusCounts[s] = (statusCounts[s] || 0) + 1
    }
    const invoicePie = Object.entries(statusCounts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))

    // Monthly revenue trend (last 12 months)
    const revByMonth = months.map(m => {
      const rev = paidInvoices
        .filter(i => i.issue_date && i.issue_date.startsWith(m.key))
        .reduce((s, i) => s + Number(i.total || 0), 0)
      const exp = businessExpenses
        .filter(e => e.date && e.date.startsWith(m.key))
        .reduce((s, e) => s + Number(e.amount || 0), 0)
      return { label: m.label, Revenue: rev, Expenses: exp, Profit: rev - exp }
    })

    // Top expense categories
    const catMap: Record<string, number> = {}
    for (const e of businessExpenses) {
      const cat = e.category || 'Uncategorised'
      catMap[cat] = (catMap[cat] || 0) + Number(e.amount || 0)
    }
    const topCategories = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }))

    return { totalBusinesses, totalInvoices, totalExpenses, totalRevenue, totalExpenseAmount, netProfit, invoicePie, revByMonth, topCategories }
  }, [businesses, invoices, businessExpenses, months])

  // ═══════════════════════════════════════════════════════════
  // 7. MENTORSHIP HEALTH
  // ═══════════════════════════════════════════════════════════
  const mentorshipHealth = useMemo(() => {
    const statusCounts: Record<string, number> = {}
    for (const r of mentorshipRequests) {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1
    }
    return {
      total: mentorshipRequests.length,
      mentors: mentorProfiles.length,
      pending: statusCounts['pending'] || 0,
      accepted: statusCounts['accepted'] || 0,
      completed: statusCounts['completed'] || 0,
      declined: statusCounts['declined'] || 0,
      pie: Object.entries(statusCounts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })),
    }
  }, [mentorshipRequests, mentorProfiles])

  // ═══════════════════════════════════════════════════════════
  // 8. BUSINESS INTELLIGENCE
  // ═══════════════════════════════════════════════════════════
  const businessIntel = useMemo(() => {
    const getName = (userId: string) => {
      const p = profilesMap[userId]
      if (!p) return 'Unknown'
      return [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username || p.email || 'Unknown'
    }

    // Build a map: businessId → { name, userId, revenue, invoiceCount, expenseTotal }
    const bizMap: Record<string, { name: string; userId: string; revenue: number; invoiceCount: number; paidCount: number; expenseTotal: number }> = {}
    for (const b of businesses) {
      bizMap[b.id] = { name: b.name, userId: b.user_id, revenue: 0, invoiceCount: 0, paidCount: 0, expenseTotal: 0 }
    }
    for (const inv of invoices) {
      if (bizMap[inv.business_id]) {
        bizMap[inv.business_id].invoiceCount++
        if (inv.status === 'paid') {
          bizMap[inv.business_id].paidCount++
          bizMap[inv.business_id].revenue += Number(inv.total || 0)
        }
      }
    }
    for (const exp of businessExpenses) {
      if (bizMap[exp.business_id]) {
        bizMap[exp.business_id].expenseTotal += Number(exp.amount || 0)
      }
    }

    const bizList = Object.entries(bizMap).map(([id, data]) => ({ id, ...data, ownerName: getName(data.userId) }))

    // Top 10 businesses by revenue
    const topByRevenue = [...bizList].sort((a, b) => b.revenue - a.revenue).slice(0, 10)

    // Top 10 by invoice volume
    const topByVolume = [...bizList].sort((a, b) => b.invoiceCount - a.invoiceCount).slice(0, 10)

    // Revenue concentration — what % do top N businesses hold?
    const totalRev = bizList.reduce((s, b) => s + b.revenue, 0)
    const sortedByRev = [...bizList].sort((a, b) => b.revenue - a.revenue)
    let cumRev = 0
    let top80Count = 0
    for (const b of sortedByRev) {
      cumRev += b.revenue
      top80Count++
      if (totalRev > 0 && cumRev / totalRev >= 0.8) break
    }
    const concentrationPct = totalRev > 0 ? Math.round((sortedByRev.slice(0, top80Count).reduce((s, b) => s + b.revenue, 0) / totalRev) * 100) : 0

    // Average invoice value
    const paidInvoices = invoices.filter(i => i.status === 'paid')
    const avgInvoice = paidInvoices.length > 0
      ? paidInvoices.reduce((s, i) => s + Number(i.total || 0), 0) / paidInvoices.length
      : 0

    // Most active users (by number of businesses + invoices created)
    const userActivity: Record<string, { name: string; businesses: number; invoices: number; revenue: number }> = {}
    for (const b of bizList) {
      if (!userActivity[b.userId]) userActivity[b.userId] = { name: b.ownerName, businesses: 0, invoices: 0, revenue: 0 }
      userActivity[b.userId].businesses++
      userActivity[b.userId].invoices += b.invoiceCount
      userActivity[b.userId].revenue += b.revenue
    }
    const topUsers = Object.entries(userActivity)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    return { topByRevenue, topByVolume, concentrationPct, top80Count, avgInvoice, topUsers, totalBizCount: businesses.length }
  }, [businesses, invoices, businessExpenses, profilesMap])

  // ═══════════════════════════════════════════════════════════
  // 9. SEARCH INSIGHTS
  // ═══════════════════════════════════════════════════════════
  const searchInsights = useMemo(() => {
    if (searchLogs.length === 0) return null

    // Top searched terms (normalise to lowercase)
    const termCounts: Record<string, number> = {}
    const zeroCounts: Record<string, number> = {}
    const moduleCounts: Record<string, number> = {}
    const dailyCounts: Record<string, number> = {}

    for (const log of searchLogs) {
      const term = log.query.toLowerCase()
      termCounts[term] = (termCounts[term] || 0) + 1
      if (log.results_count === 0) {
        zeroCounts[term] = (zeroCounts[term] || 0) + 1
      }
      moduleCounts[log.module] = (moduleCounts[log.module] || 0) + 1
      const day = log.created_at.slice(0, 10)
      dailyCounts[day] = (dailyCounts[day] || 0) + 1
    }

    const topTerms = Object.entries(termCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([term, count]) => ({ term, count }))

    const zeroResultTerms = Object.entries(zeroCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term, count]) => ({ term, count }))

    const byModule = Object.entries(moduleCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([module, count]) => ({ module: module.charAt(0).toUpperCase() + module.slice(1), count }))

    // Daily trend (last 30 days)
    const dailyTrend = days30.map(d => ({
      label: d.label,
      searches: dailyCounts[d.key] || 0,
    }))

    // Unique searchers
    const uniqueSearchers = new Set(searchLogs.filter(l => l.user_id).map(l => l.user_id)).size

    return { totalSearches: searchLogs.length, uniqueSearchers, topTerms, zeroResultTerms, byModule, dailyTrend }
  }, [searchLogs, days30])

  // ═══════════════════════════════════════════════════════════
  // 10. GENDER & INCLUSION ANALYTICS
  // ═══════════════════════════════════════════════════════════
  const genderStats = useMemo(() => {
    // Build gender lookup: userId → gender
    const genderMap: Record<string, string> = {}
    for (const m of members) {
      if (m.gender) genderMap[m.id] = m.gender
    }

    // Overall breakdown
    const counts: Record<string, number> = { female: 0, male: 0, other: 0, prefer_not_to_say: 0, unset: 0 }
    for (const m of members) {
      const g = m.gender || 'unset'
      counts[g] = (counts[g] || 0) + 1
    }
    const total = members.length
    const femalePct = total > 0 ? Math.round((counts.female / total) * 100) : 0

    // Pie data (exclude unset for cleaner chart)
    const labelMap: Record<string, string> = { female: 'Female', male: 'Male', other: 'Other', prefer_not_to_say: 'Prefer not to say', unset: 'Not specified' }
    const pie = Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({ name: labelMap[key] || key, value }))

    // Helper: count females in a set of user_ids
    const femaleIn = (userIds: string[]) => userIds.filter(id => genderMap[id] === 'female').length
    const totalIn = (userIds: string[]) => userIds.length
    const pctF = (f: number, t: number) => t > 0 ? Math.round((f / t) * 100) : 0

    // Per-module gender breakdown
    const communityUserIds = [...new Set(communityPosts.map(p => p.user_id))]
    const researchUserIds = [...new Set(researchPosts.map(p => p.user_id))]
    const opportunityUserIds = [...new Set(opportunities.map(o => o.user_id))]
    const listingUserIds = [...new Set(listings.map(l => l.user_id))]
    const businessUserIds = [...new Set(businesses.map(b => b.user_id))]
    const mentorUserIds = [...new Set(mentorProfiles.map(m => m.user_id))]
    const menteeUserIds = [...new Set(mentorshipRequests.map(r => r.mentee_id))]

    const moduleBreakdown = [
      { module: 'Members (overall)', female: counts.female, total, pct: femalePct },
      { module: 'Community Posts', female: femaleIn(communityUserIds), total: totalIn(communityUserIds), pct: pctF(femaleIn(communityUserIds), totalIn(communityUserIds)) },
      { module: 'Research', female: femaleIn(researchUserIds), total: totalIn(researchUserIds), pct: pctF(femaleIn(researchUserIds), totalIn(researchUserIds)) },
      { module: 'Opportunities', female: femaleIn(opportunityUserIds), total: totalIn(opportunityUserIds), pct: pctF(femaleIn(opportunityUserIds), totalIn(opportunityUserIds)) },
      { module: 'Marketplace', female: femaleIn(listingUserIds), total: totalIn(listingUserIds), pct: pctF(femaleIn(listingUserIds), totalIn(listingUserIds)) },
      { module: 'Business Owners', female: femaleIn(businessUserIds), total: totalIn(businessUserIds), pct: pctF(femaleIn(businessUserIds), totalIn(businessUserIds)) },
      { module: 'Mentors', female: femaleIn(mentorUserIds), total: totalIn(mentorUserIds), pct: pctF(femaleIn(mentorUserIds), totalIn(mentorUserIds)) },
      { module: 'Mentees', female: femaleIn(menteeUserIds), total: totalIn(menteeUserIds), pct: pctF(femaleIn(menteeUserIds), totalIn(menteeUserIds)) },
    ]

    // Growth trend: female signups per month
    const femaleGrowth = months.map(m => {
      const monthMembers = members.filter(mb => mb.created_at.startsWith(m.key))
      const f = monthMembers.filter(mb => mb.gender === 'female').length
      return { label: m.label, Female: f, Other: monthMembers.length - f }
    })

    return { counts, total, femalePct, pie, moduleBreakdown, femaleGrowth }
  }, [members, communityPosts, researchPosts, opportunities, listings, businesses, mentorProfiles, mentorshipRequests, months])

  const tooltipStyle = { contentStyle: { background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }, labelStyle: { color: '#9ca3af' }, itemStyle: { color: '#d1d5db' } }

  // ── PDF Export (data-driven, no canvas) ──
  const exportPDF = () => {
    setExportingPdf(true)
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pw = 210
      const ph = 297
      const margin = 16
      const usable = pw - margin * 2
      const contentBottom = ph - 18 // reserve space for footer
      let y = 0

      // ── Brand colours ──
      const green = { r: 22, g: 163, b: 106 }
      const darkGreen = { r: 15, g: 118, b: 76 }
      const dark = { r: 17, g: 24, b: 39 }
      const mid = { r: 107, g: 114, b: 128 }
      const light = { r: 156, g: 163, b: 175 }
      const faint = { r: 243, g: 244, b: 246 }
      const white = { r: 255, g: 255, b: 255 }

      // ── Helpers ──
      const setColor = (c: { r: number; g: number; b: number }) => pdf.setTextColor(c.r, c.g, c.b)
      const setFill = (c: { r: number; g: number; b: number }) => pdf.setFillColor(c.r, c.g, c.b)

      const checkPage = (need: number) => {
        if (y + need > contentBottom) { pdf.addPage(); y = margin }
      }

      // ── Rounded rect ──
      const roundedRect = (x: number, ry: number, w: number, h: number, r: number, style: 'F' | 'S' | 'FD') => {
        pdf.roundedRect(x, ry, w, h, r, r, style)
      }

      // ── Draw metric card ──
      const drawCard = (x: number, cy: number, w: number, label: string, value: string, accent = false) => {
        setFill(accent ? green : { r: 249, g: 250, b: 251 })
        roundedRect(x, cy, w, 18, 2, 'F')
        if (!accent) {
          pdf.setDrawColor(229, 231, 235)
          roundedRect(x, cy, w, 18, 2, 'S')
        }
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(13)
        setColor(accent ? white : dark)
        pdf.text(value, x + w / 2, cy + 8, { align: 'center' })
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(6.5)
        setColor(accent ? { r: 220, g: 255, b: 230 } : mid)
        pdf.text(label.toUpperCase(), x + w / 2, cy + 14, { align: 'center' })
      }

      // ── Section header with green accent bar ──
      const sectionHeader = (title: string, subtitle?: string) => {
        checkPage(16)
        setFill(green)
        pdf.rect(margin, y, 3, 8, 'F')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(11)
        setColor(dark)
        pdf.text(title, margin + 7, y + 5.5)
        if (subtitle) {
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(7.5)
          setColor(mid)
          pdf.text(subtitle, margin + 7, y + 10.5)
          y += 14
        } else {
          y += 10
        }
      }

      // ── Professional table ──
      const drawTable = (headers: string[], rows: string[][], colWidths: number[], opts?: { rightAlignLast?: boolean }) => {
        const rowH = 6.5
        const headerH = 7.5
        checkPage(headerH + rows.length * rowH + 2)

        // Header
        setFill({ r: 240, g: 253, b: 244 }) // very light green
        roundedRect(margin, y, usable, headerH, 1.5, 'F')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(7)
        setColor(darkGreen)
        let cx = margin + 3
        headers.forEach((h, i) => {
          const isLast = i === headers.length - 1
          if (isLast && opts?.rightAlignLast) {
            pdf.text(h, margin + usable - 3, y + 5.2, { align: 'right' })
          } else {
            pdf.text(h, cx, y + 5.2)
          }
          cx += colWidths[i]
        })
        y += headerH

        // Separator line
        pdf.setDrawColor(209, 213, 219)
        pdf.setLineWidth(0.2)
        pdf.line(margin, y, margin + usable, y)

        // Rows
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(7)
        rows.forEach((row, ri) => {
          checkPage(rowH)
          if (ri % 2 === 0) {
            setFill(faint)
            pdf.rect(margin, y, usable, rowH, 'F')
          }
          setColor(dark)
          cx = margin + 3
          row.forEach((cell, i) => {
            const isLast = i === row.length - 1
            if (isLast && opts?.rightAlignLast) {
              pdf.text(String(cell), margin + usable - 3, y + 4.5, { align: 'right' })
            } else {
              // Truncate if too wide
              const maxW = colWidths[i] - 2
              let text = String(cell)
              while (pdf.getTextWidth(text) > maxW && text.length > 3) text = text.slice(0, -4) + '...'
              pdf.text(text, cx, y + 4.5)
            }
            cx += colWidths[i]
          })
          y += rowH
        })
        // Bottom border
        pdf.setDrawColor(229, 231, 235)
        pdf.line(margin, y, margin + usable, y)
        y += 2
      }

      // ── Divider line ──
      const divider = () => {
        y += 3
        pdf.setDrawColor(229, 231, 235)
        pdf.setLineWidth(0.3)
        pdf.line(margin, y, margin + usable, y)
        y += 5
      }

      // ═══════════════════════════════════════════════════════════
      // PAGE 1: COVER HEADER
      // ═══════════════════════════════════════════════════════════

      // Full-width green header band
      setFill(green)
      pdf.rect(0, 0, pw, 38, 'F')
      // Subtle darker stripe at bottom of header
      setFill(darkGreen)
      pdf.rect(0, 35, pw, 3, 'F')

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(20)
      setColor(white)
      pdf.text('AgroYield Network', margin, 16)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      pdf.text('Platform Analytics Report', margin, 24)

      pdf.setFontSize(8)
      const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      pdf.text(dateStr, pw - margin, 16, { align: 'right' })
      pdf.setFontSize(7)
      pdf.text('Confidential', pw - margin, 23, { align: 'right' })

      y = 46

      // ═══════════════════════════════════════════════════════════
      // KEY METRICS — Card grid (2 rows of 4)
      // ═══════════════════════════════════════════════════════════
      const cardW = (usable - 9) / 4 // 3 gaps of 3mm
      const metricsData = [
        { label: 'Total Members', value: String(members.length) },
        { label: 'Waitlist', value: String(waitlistSignups.length) },
        { label: 'Growth (MoM)', value: `${growthRate >= 0 ? '+' : ''}${growthRate}%` },
        { label: 'Active (7d)', value: String(funnel[funnel.length - 1]?.value ?? 0) },
        { label: 'Subscribers', value: String(subscriptionData.activeSubs) },
        { label: 'Mentors', value: String(mentorshipHealth.mentors) },
        { label: 'Businesses', value: String(businessHealth.totalBusinesses) },
        { label: 'Platform GMV', value: fmtNaira(businessHealth.totalRevenue), accent: true },
      ]
      metricsData.forEach((m, i) => {
        const col = i % 4
        const row = Math.floor(i / 4)
        const cx = margin + col * (cardW + 3)
        const cy = y + row * 22
        drawCard(cx, cy, cardW, m.label, m.value, (m as { accent?: boolean }).accent)
      })
      y += 48

      // ═══════════════════════════════════════════════════════════
      // GROWTH TRENDS
      // ═══════════════════════════════════════════════════════════
      sectionHeader('Growth Trends', 'Monthly new members and cumulative totals (last 12 months)')
      drawTable(
        ['Month', 'New Members', 'Cumulative', 'Waitlist Signups'],
        growthData.map(g => [g.label, String(g['New Members']), String(g['Total Members']), String(g['Waitlist Signups'])]),
        [38, 40, 50, 54],
        { rightAlignLast: true },
      )

      divider()

      // ═══════════════════════════════════════════════════════════
      // ENGAGEMENT FUNNEL + MODULE ADOPTION (side by side concept — sequential here)
      // ═══════════════════════════════════════════════════════════
      sectionHeader('Engagement Funnel', 'User journey from registration to active participation')
      drawTable(
        ['Stage', 'Users', 'Drop-off'],
        funnel.map((f, i) => {
          const prev = i > 0 ? funnel[i - 1].value : f.value
          const dropoff = prev > 0 && i > 0 ? `-${Math.round(((prev - f.value) / prev) * 100)}%` : '—'
          return [f.name, String(f.value), dropoff]
        }),
        [80, 50, 52],
        { rightAlignLast: true },
      )

      divider()

      sectionHeader('Module Adoption', 'Content volume per module with 7-day activity')
      drawTable(
        ['Module', 'Total', 'Last 7 Days'],
        moduleData.map(m => [m.module, String(m.total), String(m.recent)]),
        [80, 50, 52],
        { rightAlignLast: true },
      )

      divider()

      // ═══════════════════════════════════════════════════════════
      // SUBSCRIPTION + MENTORSHIP (compact)
      // ═══════════════════════════════════════════════════════════
      sectionHeader('Subscription Health', `${subscriptionData.proTier} Pro · ${subscriptionData.growthTier} Growth · ${subscriptionData.trialUsers} Trial · ${subscriptionData.expiringIn30} expiring 30d`)
      drawTable(
        ['Plan Status', 'Members'],
        subscriptionData.pie.map((p: { name: string; value: number }) => [p.name, String(p.value)]),
        [100, 82],
        { rightAlignLast: true },
      )

      divider()

      sectionHeader('Mentorship Health', `${mentorshipHealth.mentors} mentors · ${mentorshipHealth.total} total requests`)
      drawTable(
        ['Status', 'Count'],
        mentorshipHealth.pie.map((p: { name: string; value: number }) => [p.name, String(p.value)]),
        [100, 82],
        { rightAlignLast: true },
      )

      divider()

      // ═══════════════════════════════════════════════════════════
      // BUSINESS SUITE
      // ═══════════════════════════════════════════════════════════
      sectionHeader('Business Suite', `${businessHealth.totalBusinesses} businesses · ${fmtNaira(businessHealth.totalRevenue)} GMV · ${fmtNaira(businessHealth.netProfit)} net`)

      // Summary cards row
      checkPage(24)
      const bCardW = (usable - 6) / 3
      const bizCards = [
        { label: 'Total Revenue', value: fmtNaira(businessHealth.totalRevenue) },
        { label: 'Total Expenses', value: fmtNaira(businessHealth.totalExpenseAmount) },
        { label: 'Net Profit', value: fmtNaira(businessHealth.netProfit) },
      ]
      bizCards.forEach((c, i) => {
        drawCard(margin + i * (bCardW + 3), y, bCardW, c.label, c.value, i === 2 && businessHealth.netProfit > 0)
      })
      y += 22

      if (businessHealth.revByMonth.length > 0) {
        drawTable(
          ['Month', 'Revenue', 'Expenses', 'Profit'],
          businessHealth.revByMonth.map((m: { label: string; Revenue: number; Expenses: number; Profit: number }) =>
            [m.label, fmtNaira(m.Revenue), fmtNaira(m.Expenses), fmtNaira(m.Profit)]),
          [36, 45, 45, 56],
          { rightAlignLast: true },
        )
      }

      if (businessHealth.invoicePie.length > 0) {
        y += 2
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8)
        setColor(dark)
        pdf.text('Invoice Status Breakdown', margin + 7, y + 4)
        y += 6
        drawTable(
          ['Status', 'Count'],
          businessHealth.invoicePie.map((p: { name: string; value: number }) => [p.name, String(p.value)]),
          [100, 82],
          { rightAlignLast: true },
        )
      }

      if (businessHealth.topCategories.length > 0) {
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8)
        setColor(dark)
        pdf.text('Top Expense Categories', margin + 7, y + 4)
        y += 6
        drawTable(
          ['Category', 'Amount'],
          businessHealth.topCategories.map((c: { name: string; value: number }) => [c.name, fmtNaira(c.value)]),
          [100, 82],
          { rightAlignLast: true },
        )
      }

      divider()

      // ═══════════════════════════════════════════════════════════
      // BUSINESS INTELLIGENCE
      // ═══════════════════════════════════════════════════════════
      sectionHeader('Business Intelligence', `Revenue concentration: ${businessIntel.top80Count} of ${businessIntel.totalBizCount} businesses generate ${businessIntel.concentrationPct}% · Avg invoice: ${fmtNaira(businessIntel.avgInvoice)}`)

      if (businessIntel.topByRevenue.length > 0) {
        drawTable(
          ['#', 'Business', 'Owner', 'Revenue'],
          businessIntel.topByRevenue.map((b, i) => [String(i + 1), b.name, b.ownerName, fmtNaira(b.revenue)]),
          [12, 60, 60, 50],
          { rightAlignLast: true },
        )
      }

      if (businessIntel.topUsers.length > 0) {
        y += 2
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8)
        setColor(dark)
        pdf.text('Top Users of Business Module', margin + 7, y + 4)
        y += 6
        drawTable(
          ['#', 'User', 'Businesses', 'Invoices', 'Revenue'],
          businessIntel.topUsers.map((u, i) => [String(i + 1), u.name, String(u.businesses), String(u.invoices), fmtNaira(u.revenue)]),
          [12, 55, 35, 35, 45],
          { rightAlignLast: true },
        )
      }

      divider()

      // ═══════════════════════════════════════════════════════════
      // GENDER & INCLUSION
      // ═══════════════════════════════════════════════════════════
      sectionHeader('Gender & Inclusion', `${genderStats.femalePct}% female participation across ${genderStats.total} members`)

      // Overall breakdown
      drawTable(
        ['Gender', 'Count', '% of Total'],
        genderStats.pie.map(p => [p.name, String(p.value), `${genderStats.total > 0 ? Math.round((p.value / genderStats.total) * 100) : 0}%`]),
        [70, 50, 62],
        { rightAlignLast: true },
      )

      // Per-module female participation
      y += 2
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(dark.r, dark.g, dark.b)
      pdf.text('Female Participation by Module', margin + 7, y + 4)
      y += 6
      drawTable(
        ['Module', 'Female Users', 'Total Users', 'Female %'],
        genderStats.moduleBreakdown.map(m => [m.module, String(m.female), String(m.total), `${m.pct}%`]),
        [55, 35, 35, 57],
        { rightAlignLast: true },
      )

      divider()

      // ═══════════════════════════════════════════════════════════
      // SEARCH INSIGHTS
      // ═══════════════════════════════════════════════════════════
      if (searchInsights) {
        sectionHeader('Search Insights', `${searchInsights.totalSearches.toLocaleString()} total searches · ${searchInsights.uniqueSearchers} unique users`)

        if (searchInsights.byModule.length > 0) {
          drawTable(
            ['Module', 'Searches'],
            searchInsights.byModule.map(m => [m.module, String(m.count)]),
            [100, 82],
            { rightAlignLast: true },
          )
        }

        if (searchInsights.topTerms.length > 0) {
          y += 2
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(8)
          setColor(dark)
          pdf.text('Most Searched Terms', margin + 7, y + 4)
          y += 6
          drawTable(
            ['#', 'Search Term', 'Frequency'],
            searchInsights.topTerms.map((t, i) => [String(i + 1), t.term, `${t.count}x`]),
            [12, 120, 50],
            { rightAlignLast: true },
          )
        }

        if (searchInsights.zeroResultTerms.length > 0) {
          y += 2
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(8)
          pdf.setTextColor(220, 38, 38) // red accent
          pdf.text('Zero-Result Searches (Unmet Demand)', margin + 7, y + 4)
          y += 6
          drawTable(
            ['#', 'Search Term', 'Frequency'],
            searchInsights.zeroResultTerms.map((t, i) => [String(i + 1), t.term, `${t.count}x`]),
            [12, 120, 50],
            { rightAlignLast: true },
          )
        }
      }

      // ═══════════════════════════════════════════════════════════
      // FOOTER — every page
      // ═══════════════════════════════════════════════════════════
      const pageCount = pdf.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)
        // Footer line
        pdf.setDrawColor(229, 231, 235)
        pdf.setLineWidth(0.3)
        pdf.line(margin, ph - 14, pw - margin, ph - 14)
        // Left: branding
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(6.5)
        setColor(light)
        pdf.text('AgroYield Network  |  Confidential', margin, ph - 9)
        // Right: page number
        pdf.setFont('helvetica', 'bold')
        pdf.text(`${i} / ${pageCount}`, pw - margin, ph - 9, { align: 'right' })
      }

      pdf.save(`AgroYield_Analytics_${new Date().toISOString().slice(0, 10)}.pdf`)
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* ── PDF Export Button ── */}
      <div className="flex justify-end">
        <button onClick={exportPDF} disabled={exportingPdf}
          className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-green-400 hover:text-green-700 dark:hover:text-green-400 transition-all disabled:opacity-50">
          {exportingPdf ? 'Generating PDF...' : '📄 Download PDF Report'}
        </button>
      </div>

      <div className="space-y-6">

      {/* ── Key Metrics Row ── */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
        <StatCard label="Total Members" value={members.length} accent="text-green-600 dark:text-green-400" />
        <StatCard label="Waitlist" value={waitlistSignups.length} />
        <StatCard label="Growth (MoM)" value={`${growthRate >= 0 ? '+' : ''}${growthRate}%`} accent={growthRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} />
        <StatCard label="Active (7d)" value={funnel[funnel.length - 1]?.value ?? 0} sub={`${members.length > 0 ? Math.round((funnel[funnel.length - 1]?.value ?? 0) / members.length * 100) : 0}% of members`} />
        <StatCard label="Pro" value={subscriptionData.proTier} sub={`${subscriptionData.trialUsers} on trial`} accent="text-amber-600 dark:text-amber-400" />
        <StatCard label="Growth" value={subscriptionData.growthTier} sub={`${subscriptionData.expiringIn30} expiring 30d`} accent="text-purple-600 dark:text-purple-400" />
        <StatCard label="Mentors" value={mentorshipHealth.mentors} sub={`${mentorshipHealth.total} requests`} />
        <StatCard label="Businesses" value={businessHealth.totalBusinesses} sub={`${businessHealth.totalInvoices} invoices`} />
        <StatCard label="Platform GMV" value={fmtNaira(businessHealth.totalRevenue)} sub={`${businessHealth.netProfit >= 0 ? '+' : ''}${fmtNaira(businessHealth.netProfit)} net`} accent="text-green-600 dark:text-green-400" />
      </div>

      {/* ── Growth & Signup Trends ── */}
      <Section title="Growth & Signup Trends" subtitle="New members and waitlist signups over the last 12 months">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={growthData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <Tooltip {...tooltipStyle} />
            <Area type="monotone" dataKey="New Members" stackId="1" stroke="#16a34a" fill="#16a34a" fillOpacity={0.3} />
            <Area type="monotone" dataKey="Waitlist Signups" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-600" /> New Members</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400" /> Waitlist Signups</span>
        </div>
      </Section>

      {/* ── Two column: Engagement Funnel + Subscription ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Engagement Funnel */}
        <Section title="Engagement Funnel" subtitle="User journey from registration to active engagement">
          <div className="space-y-2">
            {funnel.map((step, i) => {
              const pct = funnel[0].value > 0 ? Math.round((step.value / funnel[0].value) * 100) : 0
              const dropoff = i > 0 && funnel[i - 1].value > 0 ? Math.round(((funnel[i - 1].value - step.value) / funnel[i - 1].value) * 100) : 0
              return (
                <div key={step.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">{step.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">{step.value}</span>
                      {i > 0 && dropoff > 0 && <span className="text-[10px] text-red-500">-{dropoff}%</span>}
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        {/* Subscription Breakdown */}
        <Section title="Subscription Health" subtitle="Active vs expired vs free members">
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={subscriptionData.pie} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                  {subscriptionData.pie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 flex-1">
              {subscriptionData.pie.map((entry, i) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{entry.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">{entry.value}</span>
                </div>
              ))}
              {subscriptionData.expiringIn30 > 0 && (
                <p className="text-[10px] text-amber-500 font-medium pt-1">
                  {subscriptionData.expiringIn30} subscription{subscriptionData.expiringIn30 > 1 ? 's' : ''} expiring within 30 days
                </p>
              )}
            </div>
          </div>
        </Section>
      </div>

      {/* ── Module Adoption ── */}
      <Section title="Module Adoption" subtitle="Total content and last 7 days activity per module">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={moduleData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="module" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="total" name="All Time" fill="#16a34a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="recent" name="Last 7 Days" fill="#86efac" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-600" /> All Time</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-300" /> Last 7 Days</span>
        </div>
      </Section>

      {/* ── Content Velocity ── */}
      <Section title="Content Velocity" subtitle="Daily posts across modules — last 30 days">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={velocityData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={4} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <Tooltip {...tooltipStyle} />
            <Line type="monotone" dataKey="Community" stroke="#16a34a" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Research" stroke="#6366f1" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Prices" stroke="#f59e0b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Marketplace" stroke="#ec4899" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-600" /> Community</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Research</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Prices</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-pink-500" /> Marketplace</span>
        </div>
      </Section>

      {/* ── Business Suite Health ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Business Suite — Revenue vs Expenses" subtitle="Monthly trend across all businesses (last 12 months)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={businessHealth.revByMonth} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v: number) => v >= 1000 ? `₦${(v / 1000).toFixed(0)}k` : `₦${v}`} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip {...tooltipStyle} formatter={(value: any) => `₦${Number(value).toLocaleString()}`} />
              <Bar dataKey="Revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-600" /> Revenue</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Expenses</span>
          </div>
        </Section>

        <Section title="Business Suite — Overview" subtitle="Invoice status and top expense categories">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Invoice Status</p>
              <div className="space-y-1.5">
                {businessHealth.invoicePie.map((entry, i) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-gray-600 dark:text-gray-400">{entry.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Top Expense Categories</p>
              <div className="space-y-1.5">
                {businessHealth.topCategories.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate mr-2">{cat.name}</span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-white whitespace-nowrap">₦{cat.value.toLocaleString()}</span>
                  </div>
                ))}
                {businessHealth.topCategories.length === 0 && <p className="text-xs text-gray-400">No expenses recorded</p>}
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{businessHealth.totalBusinesses}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Businesses</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">₦{businessHealth.totalRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Total Revenue</p>
            </div>
            <div>
              <p className={`text-lg font-bold ${businessHealth.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>₦{businessHealth.netProfit.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Net Profit</p>
            </div>
          </div>
        </Section>
      </div>

      {/* ── Business Intelligence ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Businesses by Revenue */}
        <Section title="Top Businesses — Revenue" subtitle="Highest-earning businesses on the platform">
          {businessIntel.topByRevenue.length === 0 ? (
            <p className="text-xs text-gray-400">No revenue data yet</p>
          ) : (
            <div className="space-y-2">
              {businessIntel.topByRevenue.map((b, i) => (
                <div key={b.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs font-bold w-5 text-center shrink-0 ${i < 3 ? 'text-green-600' : 'text-gray-400'}`}>{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{b.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{b.ownerName}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-green-600 whitespace-nowrap">{fmtNaira(b.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Top Users of Business Module */}
        <Section title="Top Users — Business Module" subtitle="Most active business owners by revenue">
          {businessIntel.topUsers.length === 0 ? (
            <p className="text-xs text-gray-400">No business users yet</p>
          ) : (
            <div className="space-y-2">
              {businessIntel.topUsers.map((u, i) => (
                <div key={u.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs font-bold w-5 text-center shrink-0 ${i < 3 ? 'text-green-600' : 'text-gray-400'}`}>{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                      <p className="text-[10px] text-gray-400">{u.businesses} biz · {u.invoices} invoices</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-green-600 whitespace-nowrap">{fmtNaira(u.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Business Insights */}
        <Section title="Business Insights" subtitle="Key intelligence metrics">
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Revenue Concentration</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {businessIntel.top80Count} of {businessIntel.totalBizCount} businesses
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  generate {businessIntel.concentrationPct}% of total platform revenue
                </p>
                {businessIntel.totalBizCount > 0 && businessIntel.top80Count <= Math.ceil(businessIntel.totalBizCount * 0.2) && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                    ⚠ High concentration — revenue depends on few businesses
                  </p>
                )}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Average Invoice Value</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtNaira(businessIntel.avgInvoice)}</p>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Businesses by Volume</p>
                <div className="space-y-1 mt-1">
                  {businessIntel.topByVolume.slice(0, 5).map((b, i) => (
                    <div key={b.id} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate mr-2">{i + 1}. {b.name}</span>
                      <span className="text-xs font-medium text-gray-900 dark:text-white whitespace-nowrap">{b.invoiceCount} inv</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* ── Mentorship Health ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Mentorship Health" subtitle="Request status breakdown">
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={mentorshipHealth.pie} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                  {mentorshipHealth.pie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              <div className="flex justify-between text-xs"><span className="text-gray-500 dark:text-gray-400">Total Mentors</span><span className="font-semibold text-gray-900 dark:text-white">{mentorshipHealth.mentors}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500 dark:text-gray-400">Total Requests</span><span className="font-semibold text-gray-900 dark:text-white">{mentorshipHealth.total}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500 dark:text-gray-400">Accepted</span><span className="font-semibold text-green-600">{mentorshipHealth.accepted}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500 dark:text-gray-400">Completed</span><span className="font-semibold text-green-600">{mentorshipHealth.completed}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500 dark:text-gray-400">Pending</span><span className="font-semibold text-amber-500">{mentorshipHealth.pending}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500 dark:text-gray-400">Declined</span><span className="font-semibold text-red-500">{mentorshipHealth.declined}</span></div>
              {mentorshipHealth.mentors > 0 && (
                <p className="text-[10px] text-gray-400 pt-1">
                  Avg {(mentorshipHealth.total / mentorshipHealth.mentors).toFixed(1)} requests per mentor
                </p>
              )}
            </div>
          </div>
        </Section>

      {/* ── Gender & Inclusion ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gender Breakdown Pie */}
        <Section title="Gender Breakdown" subtitle={`${genderStats.femalePct}% female participation across ${genderStats.total} members`}>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={genderStats.pie} cx="50%" cy="50%" innerRadius={35} outerRadius={65} dataKey="value" paddingAngle={2}>
                  {genderStats.pie.map((_, i) => (
                    <Cell key={i} fill={['#ec4899', '#3b82f6', '#8b5cf6', '#9ca3af', '#d1d5db'][i % 5]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 flex-1">
              {genderStats.pie.map((entry, i) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ['#ec4899', '#3b82f6', '#8b5cf6', '#9ca3af', '#d1d5db'][i % 5] }} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{entry.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Female Participation by Module */}
        <Section title="Female Participation by Module" subtitle="Unique female users per module">
          <div className="space-y-2">
            {genderStats.moduleBreakdown.map(m => (
              <div key={m.module}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-gray-600 dark:text-gray-400">{m.module}</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">{m.female} / {m.total} <span className="text-gray-400 font-normal">({m.pct}%)</span></span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-pink-500" style={{ width: `${m.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Female Signup Trend */}
        <Section title="Female Signup Trend" subtitle="Monthly female vs other signups (last 12 months)">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={genderStats.femaleGrowth} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="Female" fill="#ec4899" radius={[3, 3, 0, 0]} stackId="a" />
              <Bar dataKey="Other" fill="#3b82f6" radius={[3, 3, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-pink-500" /> Female</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Other</span>
          </div>
        </Section>
      </div>

      {/* ── Search Insights ── */}
      {searchInsights && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search Volume Trend */}
          <Section title="Search Volume" subtitle={`${searchInsights.totalSearches.toLocaleString()} searches · ${searchInsights.uniqueSearchers} unique searchers`}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={searchInsights.dailyTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9ca3af' }} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="searches" fill="#16a34a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="pt-2 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wide text-gray-400">Searches by Module</p>
              {searchInsights.byModule.map(m => (
                <div key={m.module} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">{m.module}</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">{m.count}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Top Search Terms */}
          <Section title="Top Search Terms" subtitle="Most frequently searched queries">
            <div className="space-y-1.5">
              {searchInsights.topTerms.map((t, i) => (
                <div key={t.term} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs font-bold w-5 text-center shrink-0 ${i < 3 ? 'text-green-600' : 'text-gray-400'}`}>{i + 1}</span>
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{t.term}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-500 whitespace-nowrap">{t.count}x</span>
                </div>
              ))}
              {searchInsights.topTerms.length === 0 && <p className="text-xs text-gray-400">No searches recorded yet</p>}
            </div>
          </Section>

          {/* Zero-Result Searches */}
          <Section title="Zero-Result Searches" subtitle="What users searched but couldn't find">
            {searchInsights.zeroResultTerms.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-2xl mb-1">✅</p>
                <p className="text-xs text-gray-400">All searches returned results</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {searchInsights.zeroResultTerms.map((t, i) => (
                  <div key={t.term} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-red-500 font-bold w-5 text-center shrink-0">{i + 1}</span>
                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{t.term}</span>
                    </div>
                    <span className="text-xs font-medium text-red-400 whitespace-nowrap">{t.count}x</span>
                  </div>
                ))}
                <p className="text-[10px] text-amber-600 dark:text-amber-400 pt-2">
                  💡 These represent unmet demand — consider adding content or features to address them
                </p>
              </div>
            )}
          </Section>
        </div>
      )}

        {/* Quick Insights */}
        <Section title="Quick Insights" subtitle="Auto-generated observations">
          <div className="space-y-3">
            {/* Most active module */}
            {moduleData.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-green-500 text-sm mt-0.5">●</span>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <strong className="text-gray-900 dark:text-white">{moduleData[0].module}</strong> is your most active module with {moduleData[0].total} total items ({moduleData[0].recent} in the last 7 days).
                </p>
              </div>
            )}
            {/* Least active module */}
            {moduleData.length > 1 && moduleData[moduleData.length - 1].recent === 0 && (
              <div className="flex items-start gap-2">
                <span className="text-red-500 text-sm mt-0.5">●</span>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <strong className="text-gray-900 dark:text-white">{moduleData[moduleData.length - 1].module}</strong> had zero activity in the last 7 days. Consider promoting it.
                </p>
              </div>
            )}
            {/* Funnel dropoff */}
            {funnel.length >= 3 && funnel[0].value > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-amber-500 text-sm mt-0.5">●</span>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {Math.round(((funnel[0].value - funnel[2].value) / funnel[0].value) * 100)}% of registered users have never created content. Onboarding prompts could help.
                </p>
              </div>
            )}
            {/* Expiring subscriptions */}
            {subscriptionData.expiringIn30 > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-amber-500 text-sm mt-0.5">●</span>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <strong className="text-gray-900 dark:text-white">{subscriptionData.expiringIn30}</strong> subscription{subscriptionData.expiringIn30 > 1 ? 's' : ''} expiring in the next 30 days. Send retention emails.
                </p>
              </div>
            )}
            {/* Growth trend */}
            {growthRate > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-green-500 text-sm mt-0.5">●</span>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Member signups are up <strong className="text-green-600 dark:text-green-400">{growthRate}%</strong> month-over-month. Momentum is building.
                </p>
              </div>
            )}
            {growthRate < 0 && (
              <div className="flex items-start gap-2">
                <span className="text-red-500 text-sm mt-0.5">●</span>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Signups dropped <strong className="text-red-500">{Math.abs(growthRate)}%</strong> from last month. Review acquisition channels.
                </p>
              </div>
            )}
            {/* Waitlist conversion */}
            {waitlistSignups.length > 0 && members.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-blue-500 text-sm mt-0.5">●</span>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Waitlist-to-member ratio: <strong className="text-gray-900 dark:text-white">{waitlistSignups.length}</strong> waitlist → <strong className="text-gray-900 dark:text-white">{members.length}</strong> registered ({Math.round((members.length / (members.length + waitlistSignups.length)) * 100)}% conversion).
                </p>
              </div>
            )}
          </div>
        </Section>
      </div>

      </div>
    </div>
  )
}

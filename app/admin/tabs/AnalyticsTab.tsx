'use client'
import { useMemo, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'
import jsPDF from 'jspdf'

// ── Types ──
interface AnalyticsProps {
  members: { id: string; created_at: string; is_verified: boolean; is_elite: boolean; is_suspended: boolean; subscription_plan: string | null; subscription_expires_at: string | null }[]
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
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent || 'text-gray-900 dark:text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
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
  const { members, waitlistSignups, communityPosts, researchPosts, opportunities, listings, grants, priceReports, mentorProfiles, mentorshipRequests, businesses, invoices, businessExpenses } = props
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
    const freeTier = members.filter(m => !m.subscription_plan)
    const expiringIn30 = members.filter(m => {
      if (!m.subscription_expires_at) return false
      const exp = new Date(m.subscription_expires_at)
      const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30)
      return exp > new Date() && exp <= thirtyDays
    })

    return {
      pie: [
        { name: 'Active Subscribers', value: activeSubs.length },
        { name: 'Expired', value: expiredSubs.length },
        { name: 'Free', value: freeTier.length },
      ],
      activeSubs: activeSubs.length,
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

  const tooltipStyle = { contentStyle: { background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }, labelStyle: { color: '#9ca3af' }, itemStyle: { color: '#d1d5db' } }

  // ── PDF Export (data-driven, no canvas) ──
  const exportPDF = () => {
    setExportingPdf(true)
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pw = 210 // page width
      const margin = 14
      const usable = pw - margin * 2
      let y = margin

      const checkPage = (need: number) => {
        if (y + need > 280) { pdf.addPage(); y = margin }
      }

      // ── Helper: draw a simple table ──
      const drawTable = (headers: string[], rows: string[][], colWidths: number[]) => {
        checkPage(10 + rows.length * 7)
        // Header row
        pdf.setFillColor(22, 163, 106)
        pdf.rect(margin, y, usable, 7, 'F')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8)
        pdf.setTextColor(255, 255, 255)
        let cx = margin + 2
        headers.forEach((h, i) => { pdf.text(h, cx, y + 5); cx += colWidths[i] })
        y += 7
        // Data rows
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(55, 65, 81)
        rows.forEach((row, ri) => {
          checkPage(7)
          if (ri % 2 === 0) { pdf.setFillColor(249, 250, 251); pdf.rect(margin, y, usable, 7, 'F') }
          cx = margin + 2
          row.forEach((cell, i) => { pdf.text(String(cell), cx, y + 5); cx += colWidths[i] })
          y += 7
        })
      }

      // ── Title ──
      pdf.setFontSize(18)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(17, 24, 39)
      pdf.text('AgroYield Network — Analytics Report', margin, y + 6)
      y += 10
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(107, 114, 128)
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, margin, y + 4)
      y += 10

      // ── Section: Key Metrics ──
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(17, 24, 39)
      pdf.text('Key Metrics', margin, y + 4)
      y += 8
      const metrics = [
        ['Total Members', String(members.length)],
        ['Waitlist', String(waitlistSignups.length)],
        ['Growth (MoM)', `${growthRate >= 0 ? '+' : ''}${growthRate}%`],
        ['Active (7d)', String(funnel[funnel.length - 1]?.value ?? 0)],
        ['Active Subscribers', String(subscriptionData.activeSubs)],
        ['Mentors', String(mentorshipHealth.mentors)],
        ['Businesses', String(businessHealth.totalBusinesses)],
        ['Platform GMV', fmtNaira(businessHealth.totalRevenue)],
        ['Net Profit', fmtNaira(businessHealth.netProfit)],
      ]
      drawTable(['Metric', 'Value'], metrics, [100, 82])
      y += 6

      // ── Section: Growth Trends (last 12 months) ──
      checkPage(20)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(17, 24, 39)
      pdf.text('Growth Trends (Last 12 Months)', margin, y + 4)
      y += 8
      drawTable(
        ['Month', 'New Members', 'Cumulative', 'Waitlist'],
        growthData.map(g => [g.label, String(g['New Members']), String(g['Total Members']), String(g['Waitlist Signups'])]),
        [40, 40, 50, 52],
      )
      y += 6

      // ── Section: Module Adoption ──
      checkPage(20)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(17, 24, 39)
      pdf.text('Module Adoption', margin, y + 4)
      y += 8
      drawTable(
        ['Module', 'Total', 'Last 7 Days'],
        moduleData.map(m => [m.module, String(m.total), String(m.recent)]),
        [80, 50, 52],
      )
      y += 6

      // ── Section: Engagement Funnel ──
      checkPage(20)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(17, 24, 39)
      pdf.text('Engagement Funnel', margin, y + 4)
      y += 8
      drawTable(
        ['Stage', 'Count'],
        funnel.map(f => [f.name, String(f.value)]),
        [100, 82],
      )
      y += 6

      // ── Section: Subscription Health ──
      checkPage(20)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(17, 24, 39)
      pdf.text('Subscription Health', margin, y + 4)
      y += 8
      drawTable(
        ['Status', 'Count'],
        subscriptionData.pie.map((p: { name: string; value: number }) => [p.name, String(p.value)]),
        [100, 82],
      )
      y += 6

      // ── Section: Business Suite ──
      checkPage(20)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(17, 24, 39)
      pdf.text('Business Suite Health', margin, y + 4)
      y += 8
      const bizMetrics = [
        ['Businesses', String(businessHealth.totalBusinesses)],
        ['Total Invoices', String(businessHealth.totalInvoices)],
        ['Total Revenue (Paid)', fmtNaira(businessHealth.totalRevenue)],
        ['Total Expenses', fmtNaira(businessHealth.totalExpenseAmount)],
        ['Net Profit', fmtNaira(businessHealth.netProfit)],
      ]
      drawTable(['Metric', 'Value'], bizMetrics, [100, 82])
      y += 4

      if (businessHealth.invoicePie.length > 0) {
        checkPage(14)
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Invoice Status', margin, y + 4)
        y += 6
        drawTable(
          ['Status', 'Count'],
          businessHealth.invoicePie.map((p: { name: string; value: number }) => [p.name, String(p.value)]),
          [100, 82],
        )
        y += 4
      }

      if (businessHealth.topCategories.length > 0) {
        checkPage(14)
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Top Expense Categories', margin, y + 4)
        y += 6
        drawTable(
          ['Category', 'Amount'],
          businessHealth.topCategories.map((c: { name: string; value: number }) => [c.name, fmtNaira(c.value)]),
          [100, 82],
        )
        y += 4
      }
      y += 2

      // ── Section: Mentorship Health ──
      checkPage(20)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(17, 24, 39)
      pdf.text('Mentorship Health', margin, y + 4)
      y += 8
      const mentorMetrics = [
        ['Active Mentors', String(mentorshipHealth.mentors)],
        ['Total Requests', String(mentorshipHealth.total)],
        ...mentorshipHealth.pie.map((p: { name: string; value: number }) => [p.name, String(p.value)]),
      ]
      drawTable(['Metric', 'Value'], mentorMetrics, [100, 82])
      y += 6

      // ── Section: Monthly Revenue Trend ──
      if (businessHealth.revByMonth.length > 0) {
        checkPage(20)
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(17, 24, 39)
        pdf.text('Monthly Revenue vs Expenses', margin, y + 4)
        y += 8
        drawTable(
          ['Month', 'Revenue', 'Expenses'],
          businessHealth.revByMonth.map((m: { label: string; Revenue: number; Expenses: number }) => [m.label, fmtNaira(m.Revenue), fmtNaira(m.Expenses)]),
          [60, 60, 62],
        )
      }

      // ── Footer ──
      const pageCount = pdf.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)
        pdf.setFontSize(7)
        pdf.setTextColor(156, 163, 175)
        pdf.text(`AgroYield Network Analytics — Page ${i} of ${pageCount}`, margin, 290)
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
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard label="Total Members" value={members.length} accent="text-green-600 dark:text-green-400" />
        <StatCard label="Waitlist" value={waitlistSignups.length} />
        <StatCard label="Growth (MoM)" value={`${growthRate >= 0 ? '+' : ''}${growthRate}%`} accent={growthRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} />
        <StatCard label="Active (7d)" value={funnel[funnel.length - 1]?.value ?? 0} sub={`${members.length > 0 ? Math.round((funnel[funnel.length - 1]?.value ?? 0) / members.length * 100) : 0}% of members`} />
        <StatCard label="Subscribers" value={subscriptionData.activeSubs} sub={`${subscriptionData.expiringIn30} expiring in 30d`} accent="text-amber-600 dark:text-amber-400" />
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

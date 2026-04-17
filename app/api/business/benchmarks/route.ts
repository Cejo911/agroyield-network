import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getBusinessAccess } from '@/lib/business-access'

/**
 * GET /api/business/benchmarks?business_id=xxx&period=month
 *
 * Returns the current business's KPIs alongside anonymous peer averages.
 * Peer group = businesses sharing the same sector (primary), narrowed by
 * state if enough peers exist (≥3). Falls back to sector-only if not.
 *
 * All peer data is aggregated — no individual business data is exposed.
 */

function getPeriodStart(period: string): string | null {
  const now = new Date()
  if (period === 'month')   return now.toISOString().slice(0, 7) + '-01'
  if (period === 'quarter') { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10) }
  if (period === 'year')    return `${now.getFullYear()}-01-01`
  return null // 'all'
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const businessId = url.searchParams.get('business_id')
    const period = url.searchParams.get('period') || 'month'
    if (!businessId) return NextResponse.json({ error: 'business_id required' }, { status: 400 })

    // Verify user has access to this business
    const access = await getBusinessAccess(supabase, user.id, businessId)
    if (!access) return NextResponse.json({ error: 'No access to this business' }, { status: 403 })

    const admin = getSupabaseAdmin()
    const periodStart = getPeriodStart(period)

    // Fetch this business's sector/state
    const { data: biz } = await admin
      .from('businesses')
      .select('sector, state, business_size')
      .eq('id', businessId)
      .single()

    if (!biz?.sector) {
      return NextResponse.json({
        benchmarks: null,
        reason: 'no_sector',
        message: 'Set your sector in Business Settings to unlock peer benchmarks.',
      })
    }

    // ── Compute THIS business's KPIs ────────────────────────────
    let invoiceQuery = admin
      .from('invoices')
      .select('status, total')
      .eq('business_id', businessId)
      .eq('is_active', true)
    if (periodStart) invoiceQuery = invoiceQuery.gte('issue_date', periodStart)
    const { data: myInvoices } = await invoiceQuery

    let expenseQuery = admin
      .from('business_expenses')
      .select('amount')
      .eq('business_id', businessId)
    if (periodStart) expenseQuery = expenseQuery.gte('date', periodStart)
    const { data: myExpenses } = await expenseQuery

    const myRevenue = (myInvoices || [])
      .filter(i => i.status === 'paid')
      .reduce((s, i) => s + Number(i.total || 0), 0)
    const myTotalExpenses = (myExpenses || []).reduce((s, e) => s + Number(e.amount || 0), 0)
    const myMargin = myRevenue > 0 ? ((myRevenue - myTotalExpenses) / myRevenue) * 100 : 0
    const myExpenseRatio = myRevenue > 0 ? (myTotalExpenses / myRevenue) * 100 : 0
    const myCollectionRate = (myInvoices || []).length > 0
      ? ((myInvoices || []).filter(i => i.status === 'paid').length / (myInvoices || []).length) * 100
      : 0

    // ── Find peer businesses ────────────────────────────────────
    // Start with sector + state, fall back to sector-only if <3 peers
    let peerFilter = admin
      .from('businesses')
      .select('id')
      .eq('sector', biz.sector)
      .neq('id', businessId)

    if (biz.state) {
      const { data: statePeers } = await admin
        .from('businesses')
        .select('id')
        .eq('sector', biz.sector)
        .eq('state', biz.state)
        .neq('id', businessId)

      if (statePeers && statePeers.length >= 3) {
        peerFilter = peerFilter.eq('state', biz.state)
      }
    }

    const { data: peerBizzes } = await peerFilter
    const peerIds = (peerBizzes || []).map(b => b.id)

    if (peerIds.length < 2) {
      return NextResponse.json({
        benchmarks: {
          you: {
            profitMargin: round(myMargin),
            expenseRatio: round(myExpenseRatio),
            collectionRate: round(myCollectionRate),
            revenue: Math.round(myRevenue),
          },
          peers: null,
          peerCount: peerIds.length,
          peerGroup: biz.state ? `${biz.sector} in ${biz.state}` : biz.sector,
        },
        reason: 'too_few_peers',
        message: `Only ${peerIds.length} other ${biz.sector} business${peerIds.length === 1 ? '' : 'es'} on the platform. Benchmarks unlock with 2+ peers.`,
      })
    }

    // ── Compute peer aggregate KPIs ─────────────────────────────
    // Fetch all peer invoices and expenses in bulk
    let peerInvoiceQuery = admin
      .from('invoices')
      .select('business_id, status, total')
      .in('business_id', peerIds)
      .eq('is_active', true)
    if (periodStart) peerInvoiceQuery = peerInvoiceQuery.gte('issue_date', periodStart)
    const { data: peerInvoices } = await peerInvoiceQuery

    let peerExpenseQuery = admin
      .from('business_expenses')
      .select('business_id, amount')
      .in('business_id', peerIds)
    if (periodStart) peerExpenseQuery = peerExpenseQuery.gte('date', periodStart)
    const { data: peerExpenses } = await peerExpenseQuery

    // Group by business and compute per-business KPIs
    const peerMetrics: { margin: number; expenseRatio: number; collectionRate: number; revenue: number }[] = []

    for (const pid of peerIds) {
      const inv = (peerInvoices || []).filter(i => i.business_id === pid)
      const exp = (peerExpenses || []).filter(e => e.business_id === pid)
      const rev = inv.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0)
      const expenses = exp.reduce((s, e) => s + Number(e.amount || 0), 0)

      // Skip businesses with zero activity — they'd skew averages
      if (inv.length === 0 && exp.length === 0) continue

      const m = rev > 0 ? ((rev - expenses) / rev) * 100 : 0
      const er = rev > 0 ? (expenses / rev) * 100 : 0
      const cr = inv.length > 0 ? (inv.filter(i => i.status === 'paid').length / inv.length) * 100 : 0

      peerMetrics.push({ margin: m, expenseRatio: er, collectionRate: cr, revenue: rev })
    }

    if (peerMetrics.length < 2) {
      return NextResponse.json({
        benchmarks: {
          you: {
            profitMargin: round(myMargin),
            expenseRatio: round(myExpenseRatio),
            collectionRate: round(myCollectionRate),
            revenue: Math.round(myRevenue),
          },
          peers: null,
          peerCount: peerMetrics.length,
          peerGroup: biz.state ? `${biz.sector} in ${biz.state}` : biz.sector,
        },
        reason: 'too_few_active_peers',
        message: 'Not enough active peers with financial data yet. Keep recording — benchmarks will appear as the community grows.',
      })
    }

    // Compute medians (more resilient to outliers than averages)
    const median = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    }

    const peerMedianMargin = median(peerMetrics.map(p => p.margin))
    const peerMedianExpenseRatio = median(peerMetrics.map(p => p.expenseRatio))
    const peerMedianCollectionRate = median(peerMetrics.map(p => p.collectionRate))
    const peerMedianRevenue = median(peerMetrics.map(p => p.revenue))

    // Determine which state label to show
    const peerGroupLabel = biz.state
      ? (peerIds.length >= 3 ? `${biz.sector} in ${biz.state}` : `${biz.sector} (nationwide)`)
      : `${biz.sector} (nationwide)`

    return NextResponse.json({
      benchmarks: {
        you: {
          profitMargin: round(myMargin),
          expenseRatio: round(myExpenseRatio),
          collectionRate: round(myCollectionRate),
          revenue: Math.round(myRevenue),
        },
        peers: {
          profitMargin: round(peerMedianMargin),
          expenseRatio: round(peerMedianExpenseRatio),
          collectionRate: round(peerMedianCollectionRate),
          revenue: Math.round(peerMedianRevenue),
        },
        peerCount: peerMetrics.length,
        peerGroup: peerGroupLabel,
      },
      reason: null,
      message: null,
    })
  } catch (err) {
    console.error('Benchmarks API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function round(n: number): number {
  return Math.round(n * 10) / 10
}

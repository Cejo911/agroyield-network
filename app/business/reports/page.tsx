import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import ReportExport from './ReportExport'
import { getBusinessAccess } from '@/lib/business-access'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

function fmt(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 })
    .format(n).replace('NGN', '₦')
}

function monthLabel(yyyy_mm: string) {
  const [y, m] = yyyy_mm.split('-')
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

export default async function ReportsPage() {
  const supabase = (await createClient()) as SupabaseClient<Database>
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Business access (owner or team member) — respects active business cookie
  const cookieStore = await cookies()
  const access = await getBusinessAccess(supabase, user.id, cookieStore.get('active_biz_id')?.value)
  const businessId = access?.businessId || ''

  // Get business
  const { data: business } = access ? await supabase
    .from('businesses')
    .select('id, name')
    .eq('id', businessId)
    .maybeSingle() : { data: null }

  // Invoices — simple select, NO join
  const { data: invoicesRaw } = await supabase
    .from('invoices')
    .select('id, status, total, issue_date')
    .eq('business_id', businessId)

  // Invoice items — separate query for top products. Note: invoice_items has
  // only `line_total`; previous code referenced `total`/`amount` (silently
  // returned undefined under the `any` cast). Bug fixed.
  const { data: invoiceItemsRaw } = await supabase
    .from('invoice_items')
    .select('invoice_id, description, line_total')

  // Expenses
  const { data: expensesRaw } = await supabase
    .from('business_expenses')
    .select('amount, date, category')
    .eq('business_id', businessId)

  // Customers
  const { data: customersRaw } = await supabase
    .from('customers')
    .select('id, name')
    .eq('business_id', businessId)

  // Invoice customers — for top customer spend
  const { data: invoiceCustomers } = await supabase
    .from('invoices')
    .select('customer_id, total, status')
    .eq('business_id', businessId)
    .eq('status', 'paid')

  // Products — for inventory valuation
  const { data: productsRaw } = await supabase
    .from('business_products')
    .select('name, stock_quantity, cost_price, unit_price, low_stock_threshold, is_active')
    .eq('business_id', businessId)
    .eq('is_active', true)

  const products = productsRaw || []

  const invoices  = invoicesRaw  || []
  const expenses  = expensesRaw  || []
  const customers = customersRaw || []
  const invoiceItems = invoiceItemsRaw || []

  // Revenue totals
  const paidInvoices  = invoices.filter(i => i.status === 'paid')
  const totalRevenue  = paidInvoices.reduce((s, i) => s + Number(i.total || 0), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const netProfit     = totalRevenue - totalExpenses
  const profitMargin  = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'
  const outstanding   = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + Number(i.total || 0), 0)
  const overdue       = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.total || 0), 0)

  // Inventory valuation
  const inventoryCostValue = products.reduce((s, p) => s + (p.stock_quantity || 0) * (p.cost_price || 0), 0)
  const inventoryRetailValue = products.reduce((s, p) => s + (p.stock_quantity || 0) * (p.unit_price || 0), 0)
  const totalStockItems = products.reduce((s, p) => s + (p.stock_quantity || 0), 0)
  const lowStockProducts = products.filter(p => (p.stock_quantity || 0) <= (p.low_stock_threshold || 5))

  // Last 6 months P&L
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    return d.toISOString().slice(0, 7)
  })

  const monthlyPL = months.map(m => {
    const rev = paidInvoices.filter(i => i.issue_date?.slice(0, 7) === m).reduce((s, i) => s + Number(i.total || 0), 0)
    const exp = expenses.filter(e => e.date?.slice(0, 7) === m).reduce((s, e) => s + Number(e.amount || 0), 0)
    return { month: m, revenue: rev, expenses: exp, profit: rev - exp }
  })

  const maxBarValue = Math.max(...monthlyPL.map(m => Math.max(m.revenue, m.expenses)), 1)

  // Expense breakdown by category
  const expByCategory = expenses.reduce((acc: Record<string, number>, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount || 0)
    return acc
  }, {})
  const topExpenseCategories = Object.entries(expByCategory).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Top products — built from separate invoice_items query
  const paidInvoiceIds = new Set(paidInvoices.map(i => i.id))
  const productTotals: Record<string, number> = {}
  invoiceItems
    .filter(item => paidInvoiceIds.has(item.invoice_id))
    .forEach((item) => {
      const key = item.description || 'Unknown'
      const val = Number(item.line_total) || 0
      productTotals[key] = (productTotals[key] || 0) + val
    })
  const topProducts = Object.entries(productTotals).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxProduct  = topProducts[0]?.[1] || 1

  // Top customers
  const customerSpend: Record<string, number> = {}
  ;(invoiceCustomers || []).forEach(inv => {
    if (inv.customer_id) customerSpend[inv.customer_id] = (customerSpend[inv.customer_id] || 0) + Number(inv.total || 0)
  })
  const topCustomers = Object.entries(customerSpend).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, total]) => ({ name: customers.find(c => c.id === id)?.name || 'Unknown', total }))
  const maxCustomer = topCustomers[0]?.total || 1

  // Invoice status counts
  const statusCounts = ['draft', 'sent', 'paid', 'overdue'].map(s => ({
    label: s.charAt(0).toUpperCase() + s.slice(1),
    count: invoices.filter(i => i.status === s).length,
    color: s === 'paid' ? 'text-green-600' : s === 'overdue' ? 'text-red-600' : s === 'sent' ? 'text-blue-600' : 'text-gray-500',
  }))

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Business Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Financial overview for {business?.name || 'your business'}</p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <ReportExport period="Last 6 Months" />
          <Link href="/business/reports/print" target="_blank"
            className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold no-underline hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
            🖨️ Print
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-7">
        {[
          { label: 'Total Revenue', value: fmt(totalRevenue), valueClass: 'text-green-600', bgClass: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Total Expenses', value: fmt(totalExpenses), valueClass: 'text-red-600', bgClass: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Net Profit', value: fmt(netProfit), valueClass: netProfit >= 0 ? 'text-green-600' : 'text-red-600', bgClass: netProfit >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Profit Margin', value: `${profitMargin}%`, valueClass: 'text-blue-600', bgClass: 'bg-blue-50 dark:bg-blue-900/20' },
        ].map(card => (
          <div key={card.label} className={`${card.bgClass} rounded-xl p-5`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{card.label}</p>
            <p className={`text-xl font-bold ${card.valueClass}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Outstanding & Overdue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Outstanding</p>
          <p className="text-xl font-bold text-amber-600">{fmt(outstanding)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Overdue</p>
          <p className="text-xl font-bold text-red-600">{fmt(overdue)}</p>
        </div>
      </div>

      {/* Inventory Valuation */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-7">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Inventory Valuation</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Retail Value</p>
            <p className="text-lg font-bold text-green-600">{fmt(inventoryRetailValue)}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Cost Value</p>
            <p className="text-lg font-bold text-blue-600">{fmt(inventoryCostValue)}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Items in Stock</p>
            <p className="text-lg font-bold text-gray-700 dark:text-white">{totalStockItems.toLocaleString()}</p>
          </div>
          <div className={`${lowStockProducts.length > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-gray-50 dark:bg-gray-800'} rounded-lg p-4`}>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Low Stock Items</p>
            <p className={`text-lg font-bold ${lowStockProducts.length > 0 ? 'text-amber-600' : 'text-gray-700 dark:text-white'}`}>{lowStockProducts.length}</p>
          </div>
        </div>
        {lowStockProducts.length > 0 && (
          <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-3">
            <p className="text-xs font-semibold text-amber-600 mb-2">⚠️ Low Stock Alert</p>
            {lowStockProducts.slice(0, 5).map(p => (
              <div key={p.name} className="flex justify-between py-1 text-sm">
                <span className="text-gray-700 dark:text-gray-300">{p.name}</span>
                <span className="text-amber-600 font-semibold">{p.stock_quantity} remaining</span>
              </div>
            ))}
            {lowStockProducts.length > 5 && (
              <p className="text-xs text-gray-500 mt-1">+{lowStockProducts.length - 5} more</p>
            )}
          </div>
        )}
      </div>

      {/* Monthly P&L Chart */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-7">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-5">Monthly Revenue vs Expenses (Last 6 Months)</h2>
        <div className="flex gap-3 items-end h-40">
          {monthlyPL.map(m => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div className="flex gap-0.5 items-end w-full">
                <div className="flex-1 bg-green-600 rounded-t" style={{ height: `${Math.max((m.revenue / maxBarValue) * 130, m.revenue > 0 ? 4 : 0)}px` }} title={fmt(m.revenue)} />
                <div className="flex-1 bg-red-500 rounded-t" style={{ height: `${Math.max((m.expenses / maxBarValue) * 130, m.expenses > 0 ? 4 : 0)}px` }} title={fmt(m.expenses)} />
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center">{monthLabel(m.month)}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3">
          <span className="text-xs text-green-600">■ Revenue</span>
          <span className="text-xs text-red-500">■ Expenses</span>
        </div>
      </div>

      {/* Top Products & Top Customers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-7">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Top Products / Services</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-500">No data yet</p>
          ) : topProducts.map(([name, total]) => (
            <div key={name} className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{name}</span>
                <span className="text-sm text-gray-900 dark:text-white font-semibold">{fmt(total)}</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                <div className="h-1.5 bg-blue-600 rounded-full" style={{ width: `${(total / maxProduct) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Top Customers</h2>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-gray-500">No data yet</p>
          ) : topCustomers.map(c => (
            <div key={c.name} className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{c.name}</span>
                <span className="text-sm text-gray-900 dark:text-white font-semibold">{fmt(c.total)}</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                <div className="h-1.5 bg-green-600 rounded-full" style={{ width: `${(c.total / maxCustomer) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expense Breakdown & Invoice Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-7">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Expense Breakdown</h2>
          {topExpenseCategories.length === 0 ? (
            <p className="text-sm text-gray-500">No expenses recorded</p>
          ) : topExpenseCategories.map(([cat, total]) => (
            <div key={cat} className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800">
              <span className="text-sm text-gray-700 dark:text-gray-300">{cat}</span>
              <span className="text-sm font-semibold text-red-600">{fmt(total)}</span>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Invoice Status Summary</h2>
          {statusCounts.map(s => (
            <div key={s.label} className="flex justify-between items-center py-2.5 border-b border-gray-50 dark:border-gray-800">
              <span className="text-sm text-gray-700 dark:text-gray-300">{s.label}</span>
              <span className={`text-xl font-bold ${s.color}`}>{s.count}</span>
            </div>
          ))}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Invoices</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{invoices.length}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ReportExport from './ReportExport'

function fmt(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(n).replace('NGN', '₦')
}

function monthLabel(yyyy_mm: string) {
  const [y, m] = yyyy_mm.split('-')
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: rawPeriod } = await searchParams
  const period = ['month', 'quarter', 'year', 'all'].includes(rawPeriod || '') ? rawPeriod! : 'all'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Invoices
  const { data: invoicesRaw } = await supabase
    .from('invoices')
    .select('status, total_amount, issue_date, invoice_items(description, total, amount)')
    .eq('user_id', user.id)

  // Expenses
  const { data: expensesRaw } = await supabase
    .from('business_expenses')
    .select('amount, date, category')
    .eq('user_id', user.id)

  // Customers
  const { data: customersRaw } = await supabase
    .from('customers')
    .select('id, name')
    .eq('user_id', user.id)

  const { data: invoiceCustomers } = await supabase
    .from('invoices')
    .select('customer_id, total_amount, status')
    .eq('user_id', user.id)
    .eq('status', 'paid')

  const invoices  = invoicesRaw  || []
  const expenses  = expensesRaw  || []
  const customers = customersRaw || []

  // Revenue totals
  const paidInvoices  = invoices.filter(i => i.status === 'paid')
  const totalRevenue  = paidInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const netProfit     = totalRevenue - totalExpenses
  const profitMargin  = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'
  const outstanding   = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + Number(i.total_amount || 0), 0)
  const overdue       = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.total_amount || 0), 0)

  // Last 6 months P&L
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    return d.toISOString().slice(0, 7)
  })

  const monthlyPL = months.map(m => {
    const rev = paidInvoices.filter(i => i.issue_date?.slice(0, 7) === m).reduce((s, i) => s + Number(i.total_amount || 0), 0)
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

  // Top products
  const productTotals: Record<string, number> = {}
  paidInvoices.forEach(inv => {
    const items = (inv.invoice_items as any[]) || []
    items.forEach((item: any) => {
      const key = item.description
      const val = Number(item.total) || Number(item.amount) || 0
      productTotals[key] = (productTotals[key] || 0) + val
    })
  })
  const topProducts = Object.entries(productTotals).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxProduct  = topProducts[0]?.[1] || 1

  // Top customers
  const customerSpend: Record<string, number> = {}
  ;(invoiceCustomers || []).forEach(inv => {
    if (inv.customer_id) customerSpend[inv.customer_id] = (customerSpend[inv.customer_id] || 0) + Number(inv.total_amount || 0)
  })
  const topCustomers = Object.entries(customerSpend)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, total]) => ({ name: customers.find(c => c.id === id)?.name || 'Unknown', total }))
  const maxCustomer = topCustomers[0]?.total || 1

  // Invoice status counts
  const statusCounts = ['draft', 'sent', 'paid', 'overdue'].map(s => ({
    label: s.charAt(0).toUpperCase() + s.slice(1),
    count: invoices.filter(i => i.status === s).length,
    color: s === 'paid' ? 'text-green-600' : s === 'overdue' ? 'text-red-600' : s === 'sent' ? 'text-blue-600' : 'text-gray-500',
  }))

  return (
    <div>

      {/* Header with export buttons */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-500 text-sm mt-0.5">Your business performance at a glance</p>
        </div>
        <ReportExport period={period} />
      </div>

      {/* P&L Summary — hero section */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-2xl p-6 mb-6 text-white">
        <p className="text-green-200 text-xs font-semibold uppercase tracking-wide mb-4">All-Time Profit & Loss</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-green-200 text-xs mb-1">Total Revenue</p>
            <p className="text-2xl font-bold">{fmt(totalRevenue)}</p>
          </div>
          <div>
            <p className="text-green-200 text-xs mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-red-200">{fmt(totalExpenses)}</p>
          </div>
          <div>
            <p className="text-green-200 text-xs mb-1">Net Profit</p>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-white' : 'text-red-300'}`}>{fmt(netProfit)}</p>
          </div>
          <div>
            <p className="text-green-200 text-xs mb-1">Profit Margin</p>
            <p className={`text-2xl font-bold ${Number(profitMargin) >= 0 ? 'text-white' : 'text-red-300'}`}>{profitMargin}%</p>
          </div>
        </div>
      </div>

      {/* Outstanding / Overdue */}
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Paid</p>
          <p className="text-xl font-bold text-green-600">{fmt(totalRevenue)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Outstanding</p>
          <p className="text-xl font-bold text-blue-600">{fmt(outstanding)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Overdue</p>
          <p className="text-xl font-bold text-red-600">{fmt(overdue)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Total Expenses</p>
          <p className="text-xl font-bold text-orange-600">{fmt(totalExpenses)}</p>
        </div>
      </div>

      {/* Monthly P&L bar chart */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-6">
          Monthly Revenue vs Expenses (Last 6 Months)
        </h2>
        <div className="flex items-end gap-3 h-40">
          {monthlyPL.map(({ month, revenue, expenses: exp, profit }) => (
            <div key={month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end gap-0.5 h-32">
                <div
                  className="flex-1 bg-green-500 rounded-t-sm transition-all"
                  style={{ height: `${(revenue / maxBarValue) * 100}%`, minHeight: revenue > 0 ? '4px' : '0' }}
                  title={`Revenue: ${fmt(revenue)}`}
                />
                <div
                  className="flex-1 bg-red-400 rounded-t-sm transition-all"
                  style={{ height: `${(exp / maxBarValue) * 100}%`, minHeight: exp > 0 ? '4px' : '0' }}
                  title={`Expenses: ${fmt(exp)}`}
                />
              </div>
              <span className={`text-xs font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {profit >= 0 ? '+' : ''}{fmt(profit)}
              </span>
              <span className="text-xs text-gray-400">{monthLabel(month)}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-green-500 rounded-sm inline-block" /> Revenue</div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-red-400 rounded-sm inline-block" /> Expenses</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Top expense categories */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">Top Expense Categories</h2>
          {topExpenseCategories.length === 0 ? (
            <p className="text-sm text-gray-400">No expenses recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {topExpenseCategories.map(([cat, total]) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{cat}</span>
                    <span className="font-semibold text-gray-800 dark:text-white">{fmt(total)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${(total / totalExpenses) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top products by revenue */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">Top Products by Revenue</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400">No paid invoices yet.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map(([name, total]) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400 truncate max-w-[140px]">{name}</span>
                    <span className="font-semibold text-gray-800 dark:text-white">{fmt(total)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${(total / maxProduct) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Top customers */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">Top Customers by Spend</h2>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-gray-400">No paid invoices yet.</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map(({ name, total }) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{name}</span>
                    <span className="font-semibold text-gray-800 dark:text-white">{fmt(total)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(total / maxCustomer) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invoice status summary */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">Invoice Summary</h2>
          <div className="space-y-3">
            {statusCounts.map(({ label, count, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                <span className={`text-sm font-bold ${color}`}>{count}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Invoices</span>
              <span className="text-sm font-bold text-gray-800 dark:text-white">{invoices.length}</span>
            </div>
          </div>
          <Link href="/business/invoices" className="mt-4 block text-center text-xs font-semibold text-green-700 hover:text-green-800 transition-colors">
            View all invoices →
          </Link>
        </div>
      </div>

    </div>
  )
}

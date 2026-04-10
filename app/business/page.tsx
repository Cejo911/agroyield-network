import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function fmt(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(n).replace('NGN', '₦')
}

export default async function BusinessDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('user_id', user.id)
    .single()

  const thisMonth = new Date().toISOString().slice(0, 7)

  // Revenue — paid invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('status, total_amount, created_at')
    .eq('user_id', user.id)

  const allInvoices = invoices || []
  const paidRevenue     = allInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount || 0), 0)
  const outstanding     = allInvoices.filter(i => i.status === 'sent').reduce((s, i) => s + Number(i.total_amount || 0), 0)
  const overdueAmount   = allInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.total_amount || 0), 0)
  const monthRevenue    = allInvoices.filter(i => i.status === 'paid' && i.created_at?.slice(0, 7) === thisMonth).reduce((s, i) => s + Number(i.total_amount || 0), 0)

  const draftCount    = allInvoices.filter(i => i.status === 'draft').length
  const sentCount     = allInvoices.filter(i => i.status === 'sent').length
  const paidCount     = allInvoices.filter(i => i.status === 'paid').length
  const overdueCount  = allInvoices.filter(i => i.status === 'overdue').length

  // Expenses
  const { data: expensesData } = await supabase
    .from('business_expenses')
    .select('amount, date')
    .eq('user_id', user.id)

  const allExpenses    = expensesData || []
  const totalExpenses  = allExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const monthExpenses  = allExpenses.filter(e => e.date?.slice(0, 7) === thisMonth).reduce((s, e) => s + Number(e.amount), 0)

  // Profit
  const netProfit      = paidRevenue - totalExpenses
  const monthProfit    = monthRevenue - monthExpenses
  const profitMargin   = paidRevenue > 0 ? Math.round((netProfit / paidRevenue) * 100) : 0

  if (!business) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <p className="text-amber-800 font-semibold mb-2">Set up your business first</p>
        <p className="text-amber-700 text-sm mb-4">Add your business details to start creating invoices.</p>
        <Link href="/business/setup" className="inline-block bg-amber-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg">
          Go to Setup →
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{business.name}</h1>
        <p className="text-gray-500 text-sm mt-0.5">Business Overview</p>
      </div>

      {/* P&L highlight — the hero card */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-2xl p-5 mb-6 text-white">
        <p className="text-green-200 text-xs font-semibold uppercase tracking-wide mb-3">This Month — Profit & Loss</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-green-200 text-xs mb-1">Revenue</p>
            <p className="text-xl font-bold">{fmt(monthRevenue)}</p>
          </div>
          <div>
            <p className="text-green-200 text-xs mb-1">Expenses</p>
            <p className="text-xl font-bold text-red-200">{fmt(monthExpenses)}</p>
          </div>
          <div>
            <p className="text-green-200 text-xs mb-1">Net Profit</p>
            <p className={`text-xl font-bold ${monthProfit >= 0 ? 'text-white' : 'text-red-300'}`}>
              {fmt(monthProfit)}
            </p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-green-700">{fmt(paidRevenue)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Total Expenses</p>
          <p className="text-xl font-bold text-red-600">{fmt(totalExpenses)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Net Profit</p>
          <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-gray-800 dark:text-white' : 'text-red-600'}`}>{fmt(netProfit)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Profit Margin</p>
          <p className={`text-xl font-bold ${profitMargin >= 0 ? 'text-gray-800 dark:text-white' : 'text-red-600'}`}>{profitMargin}%</p>
        </div>
      </div>

      {/* Invoice status + outstanding */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">Invoice Status</p>
          <div className="space-y-2">
            {[
              { label: 'Draft',    count: draftCount,   color: 'bg-gray-400' },
              { label: 'Sent',     count: sentCount,    color: 'bg-blue-500' },
              { label: 'Paid',     count: paidCount,    color: 'bg-green-500' },
              { label: 'Overdue',  count: overdueCount, color: 'bg-red-500' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-gray-600 dark:text-gray-400">{label}</span>
                </div>
                <span className="font-semibold text-gray-800 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">Outstanding</p>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Awaiting Payment</p>
              <p className="text-lg font-bold text-blue-600">{fmt(outstanding)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Overdue</p>
              <p className="text-lg font-bold text-red-600">{fmt(overdueAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { href: '/business/invoices/new', label: 'New Invoice',  icon: '🧾', desc: 'Create an invoice or receipt' },
          { href: '/business/expenses',     label: 'Add Expense',  icon: '💸', desc: 'Record a business expense' },
          { href: '/business/reports',      label: 'View Reports', icon: '📊', desc: 'Revenue, profit & P&L' },
        ].map(q => (
          <Link key={q.href} href={q.href}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-green-300 hover:shadow-sm transition-all group">
            <div className="text-2xl mb-2">{q.icon}</div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white group-hover:text-green-700">{q.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{q.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

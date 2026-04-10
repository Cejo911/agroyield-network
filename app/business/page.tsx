import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PeriodToggle from './PeriodToggle'

function fmt(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', minimumFractionDigits: 2,
  }).format(n).replace('NGN', '₦')
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getPeriodStart(period: string): string | null {
  const now = new Date()
  if (period === 'month')   return now.toISOString().slice(0, 7) + '-01'
  if (period === 'quarter') { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10) }
  if (period === 'year')    return `${now.getFullYear()}-01-01`
  return null
}

const STATUS_STYLES: Record<string, string> = {
  draft:   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  sent:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  paid:    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

export default async function BusinessDashboard({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: rawPeriod } = await searchParams
  const period = ['month', 'quarter', 'year', 'all'].includes(rawPeriod || '') ? rawPeriod! : 'month'
  const periodStart = getPeriodStart(period)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Business profile
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, logo_url, address, phone')
    .eq('user_id', user.id)
    .single()

  // All invoices
  const { data: allInvoicesRaw } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, total_amount, issue_date, customer_id')
    .eq('user_id', user.id)
    .order('issue_date', { ascending: false })

  // All expenses
  const { data: allExpensesRaw } = await supabase
    .from('business_expenses')
    .select('id, description, category, amount, date')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  // Customers (for onboarding check + name lookup)
  const { data: customersRaw } = await supabase
    .from('customers')
    .select('id, name')
    .eq('user_id', user.id)

  const allInvoices = allInvoicesRaw || []
  const allExpenses = allExpensesRaw || []
  const customers   = customersRaw   || []

  // Filter by period
  const invoices = periodStart
    ? allInvoices.filter(i => i.issue_date >= periodStart)
    : allInvoices
  const expenses = periodStart
    ? allExpenses.filter(e => e.date >= periodStart)
    : allExpenses

  // P&L calculations
  const paidInvoices   = invoices.filter(i => i.status === 'paid')
  const revenue        = paidInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0)
  const totalExpenses  = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const netProfit      = revenue - totalExpenses
  const profitMargin   = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '0.0'
  const outstanding    = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + Number(i.total_amount || 0), 0)
  const overdueAmt     = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.total_amount || 0), 0)

  // Invoice status counts (from period-filtered data)
  const draftCount   = invoices.filter(i => i.status === 'draft').length
  const sentCount    = invoices.filter(i => i.status === 'sent').length
  const paidCount    = invoices.filter(i => i.status === 'paid').length
  const overdueCount = invoices.filter(i => i.status === 'overdue').length
  const totalCount   = invoices.length

  // Recent activity (always last 4, not period-filtered)
  const recentInvoices = allInvoices.slice(0, 4)
  const recentExpenses = allExpenses.slice(0, 4)

  // Customer name lookup
  const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]))

  // Onboarding checklist
  const setupDone     = !!(business?.name && business?.phone)
  const customersDone = customers.length > 0
  const invoiceDone   = allInvoices.length > 0
  const expenseDone   = allExpenses.length > 0
  const allDone       = setupDone && customersDone && invoiceDone && expenseDone
  const completedSteps = [setupDone, customersDone, invoiceDone, expenseDone].filter(Boolean).length

  if (!business) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center">
        <p className="text-amber-800 dark:text-amber-400 font-semibold mb-2">Set up your business first</p>
        <p className="text-amber-700 dark:text-amber-500 text-sm mb-4">Add your business name, contact details and banking info to start creating invoices.</p>
        <Link href="/business/setup" className="inline-block bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
          Go to Setup →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {business.logo_url ? (
            <img src={business.logo_url} alt="logo"
              className="w-10 h-10 rounded-lg object-contain border border-gray-200 dark:border-gray-700 bg-white" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-700 font-bold text-lg">
              {business.name[0]}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{business.name}</h1>
            <p className="text-xs text-gray-400">Business Overview</p>
          </div>
        </div>
        <PeriodToggle current={period} />
      </div>

      {/* Onboarding checklist — hidden once all 4 steps complete */}
      {!allDone && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-white">Get started — {completedSteps}/4 steps complete</p>
              <p className="text-xs text-gray-400 mt-0.5">Complete these steps to unlock the full dashboard</p>
            </div>
            <span className="text-xs font-bold text-green-700 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
              {Math.round((completedSteps / 4) * 100)}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mb-4 overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${(completedSteps / 4) * 100}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { done: setupDone,     label: 'Business Setup',    href: '/business/setup',     icon: '⚙️' },
              { done: customersDone, label: 'Add a Customer',    href: '/business/customers', icon: '👥' },
              { done: invoiceDone,   label: 'Create Invoice',    href: '/business/invoices/new', icon: '🧾' },
              { done: expenseDone,   label: 'Record Expense',    href: '/business/expenses',  icon: '💸' },
            ].map(step => (
              <Link key={step.label} href={step.done ? '#' : step.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                  step.done
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 cursor-default'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-green-300 hover:text-green-700'
                }`}>
                <span>{step.done ? '✅' : step.icon}</span>
                {step.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* P&L Hero card */}
      <div className="bg-gradient-to-r from-green-800 to-green-600 rounded-2xl p-5 text-white">
        <p className="text-green-200 text-xs font-semibold uppercase tracking-wider mb-4">
          {{ month: 'This Month', quarter: 'Last 3 Months', year: 'This Year', all: 'All Time' }[period]} — Profit & Loss
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-green-300 text-xs mb-1">Revenue</p>
            <p className="text-2xl font-bold">{fmt(revenue)}</p>
          </div>
          <div>
            <p className="text-green-300 text-xs mb-1">Expenses</p>
            <p className="text-2xl font-bold text-red-300">{fmt(totalExpenses)}</p>
          </div>
          <div>
            <p className="text-green-300 text-xs mb-1">Net Profit</p>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-white' : 'text-red-300'}`}>
              {netProfit >= 0 ? '' : '-'}{fmt(Math.abs(netProfit))}
            </p>
          </div>
        </div>
      </div>

      {/* Colour-coded stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Revenue</p>
          <p className="text-xl font-bold text-green-600">{fmt(revenue)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Expenses</p>
          <p className="text-xl font-bold text-red-500">{fmt(totalExpenses)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Net Profit</p>
          <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-gray-800 dark:text-white' : 'text-red-500'}`}>
            {fmt(netProfit)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Profit Margin</p>
          <p className={`text-xl font-bold ${Number(profitMargin) >= 0 ? 'text-gray-800 dark:text-white' : 'text-red-500'}`}>
            {profitMargin}%
          </p>
        </div>
      </div>

      {/* Invoice status badges + Outstanding */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice Status</p>
            <span className="text-xs text-gray-400">{totalCount} total</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Draft',   count: draftCount,   style: STATUS_STYLES.draft   },
              { label: 'Sent',    count: sentCount,    style: STATUS_STYLES.sent    },
              { label: 'Paid',    count: paidCount,    style: STATUS_STYLES.paid    },
              { label: 'Overdue', count: overdueCount, style: STATUS_STYLES.overdue },
            ].map(({ label, count, style }) => (
              <span key={label}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${style}`}>
                {count} {label}
              </span>
            ))}
          </div>
          {totalCount > 0 && (
            <div className="mt-3 h-1.5 flex rounded-full overflow-hidden gap-0.5">
              {paidCount    > 0 && <div className="bg-green-500" style={{ flex: paidCount }} />}
              {sentCount    > 0 && <div className="bg-blue-400"  style={{ flex: sentCount }} />}
              {overdueCount > 0 && <div className="bg-red-400"   style={{ flex: overdueCount }} />}
              {draftCount   > 0 && <div className="bg-gray-300"  style={{ flex: draftCount }} />}
            </div>
          )}
          <Link href="/business/invoices"
            className="mt-3 block text-xs font-semibold text-green-700 hover:text-green-800 transition-colors">
            View all invoices →
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Outstanding</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40">
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Awaiting Payment</p>
                <p className="text-xs text-blue-400">{sentCount} invoice{sentCount !== 1 ? 's' : ''}</p>
              </div>
              <p className="text-base font-bold text-blue-600 dark:text-blue-400">{fmt(outstanding)}</p>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40">
              <div>
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">Overdue</p>
                <p className="text-xs text-red-400">{overdueCount} invoice{overdueCount !== 1 ? 's' : ''}</p>
              </div>
              <p className="text-base font-bold text-red-600 dark:text-red-400">{fmt(overdueAmt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity feed */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent invoices */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Invoices</p>
            <Link href="/business/invoices/new"
              className="text-xs font-semibold text-green-700 hover:text-green-800">+ New</Link>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-gray-400 mb-2">No invoices yet</p>
              <Link href="/business/invoices/new"
                className="text-xs font-semibold text-green-700 hover:text-green-800">Create your first invoice →</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {recentInvoices.map(inv => (
                <Link key={inv.id} href={`/business/invoices/${inv.id}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                  <div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 group-hover:text-green-700 transition-colors">
                      {inv.invoice_number}
                    </p>
                    <p className="text-xs text-gray-400">{customerMap[inv.customer_id] || 'Unknown'} · {fmtDate(inv.issue_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-800 dark:text-white">{fmt(Number(inv.total_amount || 0))}</p>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${STATUS_STYLES[inv.status] || STATUS_STYLES.draft}`}>
                      {inv.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {recentInvoices.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-50 dark:border-gray-800">
              <Link href="/business/invoices" className="text-xs font-semibold text-gray-400 hover:text-green-700 transition-colors">
                View all →
              </Link>
            </div>
          )}
        </div>

        {/* Recent expenses */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Expenses</p>
            <Link href="/business/expenses"
              className="text-xs font-semibold text-green-700 hover:text-green-800">+ Add</Link>
          </div>
          {recentExpenses.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-gray-400 mb-2">No expenses recorded</p>
              <Link href="/business/expenses"
                className="text-xs font-semibold text-green-700 hover:text-green-800">Record your first expense →</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {recentExpenses.map(exp => (
                <div key={exp.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{exp.description}</p>
                    <p className="text-xs text-gray-400">{exp.category} · {fmtDate(exp.date)}</p>
                  </div>
                  <p className="text-xs font-bold text-red-500">{fmt(Number(exp.amount))}</p>
                </div>
              ))}
            </div>
          )}
          {recentExpenses.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-50 dark:border-gray-800">
              <Link href="/business/expenses" className="text-xs font-semibold text-gray-400 hover:text-green-700 transition-colors">
                View all →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { href: '/business/invoices/new', icon: '🧾', label: 'New Invoice',  desc: 'Create an invoice or receipt' },
          { href: '/business/expenses',     icon: '💸', label: 'Add Expense',  desc: 'Record a business expense'   },
          { href: '/business/reports',      icon: '📊', label: 'View Reports', desc: 'Revenue, profit & P&L'       },
        ].map(q => (
          <Link key={q.href} href={q.href}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-green-300 dark:hover:border-green-700 hover:shadow-sm transition-all group">
            <div className="text-2xl mb-2">{q.icon}</div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
              {q.label}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{q.desc}</p>
          </Link>
        ))}
      </div>

    </div>
  )
}

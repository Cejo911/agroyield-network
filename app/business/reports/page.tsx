import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ReportExport from './ReportExport'

function fmt(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 })
    .format(n).replace('NGN', '₦')
}

function monthLabel(yyyy_mm: string) {
  const [y, m] = yyyy_mm.split('-')
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get business (always by user_id — this is correct)
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('user_id', user.id)
    .maybeSingle()

  const businessId = business?.id || ''

  // Invoices — filter by business_id (NOT user_id)
  const { data: invoicesRaw } = await supabase
    .from('invoices')
    .select('status, total, issue_date, invoice_items(description, total, amount)')
    .eq('business_id', businessId)

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

  // Invoice customers — also filter by business_id
  const { data: invoiceCustomers } = await supabase
    .from('invoices')
    .select('customer_id, total, status')
    .eq('business_id', businessId)
    .eq('status', 'paid')

  const invoices  = invoicesRaw  || []
  const expenses  = expensesRaw  || []
  const customers = customersRaw || []

  // Revenue totals
  const paidInvoices  = invoices.filter(i => i.status === 'paid')
  const totalRevenue  = paidInvoices.reduce((s, i) => s + Number(i.total || 0), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const netProfit     = totalRevenue - totalExpenses
  const profitMargin  = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'
  const outstanding   = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + Number(i.total || 0), 0)
  const overdue       = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.total || 0), 0)

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
    <div style={{ fontFamily: 'Inter, sans-serif', padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#111827', margin: 0 }}>Business Reports</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Financial overview for {business?.name || 'your business'}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <ReportExport />
          <Link href="/business/reports/print" target="_blank"
            style={{ background: '#111827', color: '#fff', padding: '9px 18px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
            🖨️ Print Report
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Revenue', value: fmt(totalRevenue), color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Total Expenses', value: fmt(totalExpenses), color: '#dc2626', bg: '#fef2f2' },
          { label: 'Net Profit', value: fmt(netProfit), color: netProfit >= 0 ? '#16a34a' : '#dc2626', bg: netProfit >= 0 ? '#f0fdf4' : '#fef2f2' },
          { label: 'Profit Margin', value: `${profitMargin}%`, color: '#2563eb', bg: '#eff6ff' },
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, borderRadius: '12px', padding: '20px' }}>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: card.color, margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Outstanding & Overdue */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
        <div style={{ background: '#fffbeb', borderRadius: '12px', padding: '20px' }}>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outstanding</p>
          <p style={{ fontSize: '22px', fontWeight: 700, color: '#d97706', margin: 0 }}>{fmt(outstanding)}</p>
        </div>
        <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '20px' }}>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overdue</p>
          <p style={{ fontSize: '22px', fontWeight: 700, color: '#dc2626', margin: 0 }}>{fmt(overdue)}</p>
        </div>
      </div>

      {/* Monthly P&L Chart */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '28px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 20px 0' }}>Monthly Revenue vs Expenses (Last 6 Months)</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', height: '160px' }}>
          {monthlyPL.map(m => (
            <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', width: '100%' }}>
                <div style={{ flex: 1, background: '#16a34a', height: `${Math.max((m.revenue / maxBarValue) * 130, m.revenue > 0 ? 4 : 0)}px`, borderRadius: '4px 4px 0 0', minHeight: m.revenue > 0 ? '4px' : '0' }} title={fmt(m.revenue)} />
                <div style={{ flex: 1, background: '#ef4444', height: `${Math.max((m.expenses / maxBarValue) * 130, m.expenses > 0 ? 4 : 0)}px`, borderRadius: '4px 4px 0 0', minHeight: m.expenses > 0 ? '4px' : '0' }} title={fmt(m.expenses)} />
              </div>
              <p style={{ fontSize: '10px', color: '#6b7280', margin: 0, textAlign: 'center' }}>{monthLabel(m.month)}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
          <span style={{ fontSize: '12px', color: '#16a34a' }}>■ Revenue</span>
          <span style={{ fontSize: '12px', color: '#ef4444' }}>■ Expenses</span>
        </div>
      </div>

      {/* Top Products & Top Customers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
        {/* Top Products */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 16px 0' }}>Top Products / Services</h2>
          {topProducts.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>No data yet</p>
          ) : topProducts.map(([name, total]) => (
            <div key={name} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{name}</span>
                <span style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>{fmt(total)}</span>
              </div>
              <div style={{ background: '#f3f4f6', borderRadius: '4px', height: '6px' }}>
                <div style={{ background: '#2563eb', borderRadius: '4px', height: '6px', width: `${(total / maxProduct) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Top Customers */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 16px 0' }}>Top Customers</h2>
          {topCustomers.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>No data yet</p>
          ) : topCustomers.map(c => (
            <div key={c.name} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{c.name}</span>
                <span style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>{fmt(c.total)}</span>
              </div>
              <div style={{ background: '#f3f4f6', borderRadius: '4px', height: '6px' }}>
                <div style={{ background: '#16a34a', borderRadius: '4px', height: '6px', width: `${(c.total / maxCustomer) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expense Breakdown & Invoice Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
        {/* Expense Breakdown */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 16px 0' }}>Expense Breakdown</h2>
          {topExpenseCategories.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>No expenses recorded</p>
          ) : topExpenseCategories.map(([cat, total]) => (
            <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: '13px', color: '#374151' }}>{cat}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>{fmt(total)}</span>
            </div>
          ))}
        </div>

        {/* Invoice Status */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 16px 0' }}>Invoice Status Summary</h2>
          {statusCounts.map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: '13px', color: '#374151' }}>{s.label}</span>
              <span style={{ fontSize: '20px', fontWeight: 700 }} className={s.color}>{s.count}</span>
            </div>
          ))}
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>Total Invoices</span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{invoices.length}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

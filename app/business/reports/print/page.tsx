import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PrintButton from './PrintButton'

export const dynamic = 'force-dynamic'

function fmt(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(n).replace('NGN', '₦')
}
function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d }
}
function monthLabel(ym: string) {
  try { const [y, m] = ym.split('-'); return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) } catch { return ym }
}
function invoiceTotal(inv: any): number {
  return Number(inv.total_amount || inv.amount || inv.total || 0)
}

export default async function ReportsPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: rawPeriod } = await searchParams
  const period = ['month', 'quarter', 'year', 'all'].includes(rawPeriod || '') ? rawPeriod! : 'all'

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const [invoicesRes, expensesRes, customersRes, businessRes] = await Promise.all([
    supabase.from('invoices').select('*').eq('user_id', user.id).order('issue_date', { ascending: false }),
    supabase.from('business_expenses').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    supabase.from('customers').select('id, name').eq('user_id', user.id),
    supabase.from('businesses').select('*').eq('user_id', user.id).maybeSingle(),
  ])

  const allInvoices = (invoicesRes.data  || []) as any[]
  const allExpenses = (expensesRes.data  || []) as any[]
  const customers   = (customersRes.data || []) as any[]
  const business    = businessRes.data   || null

  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c.name]))

  const now = new Date()
  let periodStart: string | null = null
  if (period === 'month')   periodStart = now.toISOString().slice(0, 7) + '-01'
  if (period === 'quarter') { const d = new Date(); d.setMonth(d.getMonth() - 3); periodStart = d.toISOString().slice(0, 10) }
  if (period === 'year')    periodStart = `${now.getFullYear()}-01-01`

  const invoices = periodStart ? allInvoices.filter((i) => i.issue_date >= periodStart!) : allInvoices
  const expenses = periodStart ? allExpenses.filter((e) => e.date >= periodStart!) : allExpenses

  const paidInvoices  = invoices.filter((i) => i.status === 'paid')
  const totalRevenue  = paidInvoices.reduce((s, i) => s + invoiceTotal(i), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const netProfit     = totalRevenue - totalExpenses
  const profitMargin  = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'

  const periodLabel = { month: 'This Month', quarter: 'Last 3 Months', year: 'This Year', all: 'All Time' }[period]

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i)); return d.toISOString().slice(0, 7)
  })

  const expByCategory: Record<string, number> = {}
  allExpenses.forEach((e) => { expByCategory[e.category] = (expByCategory[e.category] || 0) + Number(e.amount || 0) })
  const topCategories = Object.entries(expByCategory).sort((a, b) => b[1] - a[1])

  const G  = '#15803d'
  const DG = '#0f5c2e'
  const cell = '5px 10px'

  return (
    <div style={{ background: '#f3f4f6' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; }
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-wrapper { padding: 0 !important; background: white !important; }
          .print-page { box-shadow: none !important; width: 100% !important; border-radius: 0 !important; }
          .print-footer { page-break-before: avoid; }
          tr { page-break-inside: avoid; }
          @page { size: A4; margin: 6mm; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ background: '#1f2937', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ color: '#9ca3af', fontSize: '13px' }}>Report Preview — {periodLabel}</span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <a href="/business/reports" style={{ color: '#9ca3af', fontSize: '13px', textDecoration: 'none' }}>← Back</a>
          <PrintButton />
        </div>
      </div>

      <div className="print-wrapper" style={{ padding: '24px 16px 48px', background: '#f3f4f6' }}>
        <div className="print-page" style={{ maxWidth: '794px', margin: '0 auto', background: '#fff', fontSize: '11px', color: '#1f2937', boxShadow: '0 4px 32px rgba(0,0,0,0.12)', borderRadius: '4px', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ background: `linear-gradient(135deg, ${DG}, ${G})`, padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {business?.logo_url ? (
                <img src={business.logo_url} alt="logo" style={{ width: '46px', height: '46px', borderRadius: '8px', objectFit: 'contain', background: '#fff', padding: '3px' }} />
              ) : (
                <div style={{ width: '46px', height: '46px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: '#fff' }}>
                  {(business?.name || 'B')[0]}
                </div>
              )}
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>{business?.name || 'My Business'}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginTop: '2px' }}>Business Performance Report</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '3px' }}>{periodLabel}</div>
              <div style={{ color: '#fff', fontSize: '11px', fontWeight: 600 }}>Generated {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            </div>
          </div>

          <div style={{ padding: '16px 32px' }}>

            {/* P&L Summary */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: G, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Profit & Loss Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { label: 'Total Revenue',  value: fmt(totalRevenue),  color: '#16a34a' },
                  { label: 'Total Expenses', value: fmt(totalExpenses), color: '#dc2626' },
                  { label: 'Net Profit',     value: fmt(netProfit),     color: netProfit >= 0 ? '#111827' : '#dc2626' },
                  { label: 'Profit Margin',  value: `${profitMargin}%`, color: Number(profitMargin) >= 0 ? '#111827' : '#dc2626' },
                ].map(card => (
                  <div key={card.label} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '8px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>{card.label}</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: card.color }}>{card.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Invoice Status + Expenses by Category */}
            <div style={{ marginBottom: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: G, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Invoice Status</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: G }}>
                      {['Status', 'Count', 'Amount'].map((h, i) => (
                        <th key={h} style={{ padding: cell, color: '#fff', fontWeight: 700, fontSize: '10px', textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {['draft', 'sent', 'paid', 'overdue'].map((s, idx) => {
                      const filtered = invoices.filter((i) => i.status === s)
                      const total = filtered.reduce((sum, i) => sum + invoiceTotal(i), 0)
                      return (
                        <tr key={s} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: cell, textTransform: 'capitalize', fontWeight: 500 }}>{s}</td>
                          <td style={{ padding: cell, textAlign: 'right' }}>{filtered.length}</td>
                          <td style={{ padding: cell, textAlign: 'right', fontWeight: 600 }}>{fmt(total)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: G, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Expenses by Category</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: G }}>
                      {['Category', 'Amount'].map((h, i) => (
                        <th key={h} style={{ padding: cell, color: '#fff', fontWeight: 700, fontSize: '10px', textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topCategories.length === 0 ? (
                      <tr><td colSpan={2} style={{ padding: '8px', color: '#9ca3af', textAlign: 'center' }}>No expenses recorded</td></tr>
                    ) : topCategories.slice(0, 6).map(([cat, total], idx) => (
                      <tr key={cat} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: cell }}>{cat}</td>
                        <td style={{ padding: cell, textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>{fmt(total as number)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Monthly P&L */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: G, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Monthly P&L — Last 6 Months</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: G }}>
                    {['Month', 'Revenue', 'Expenses', 'Net Profit', 'Margin'].map((h, i) => (
                      <th key={h} style={{ padding: cell, color: '#fff', fontWeight: 700, fontSize: '10px', textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {months.map((m, idx) => {
                    const rev  = paidInvoices.filter((i) => i.issue_date?.slice(0, 7) === m).reduce((s, i) => s + invoiceTotal(i), 0)
                    const exp  = allExpenses.filter((e) => e.date?.slice(0, 7) === m).reduce((s, e) => s + Number(e.amount || 0), 0)
                    const prof = rev - exp
                    const mg   = rev > 0 ? `${((prof / rev) * 100).toFixed(1)}%` : '—'
                    return (
                      <tr key={m} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: cell, fontWeight: 500 }}>{monthLabel(m)}</td>
                        <td style={{ padding: cell, textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>{fmt(rev)}</td>
                        <td style={{ padding: cell, textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>{fmt(exp)}</td>
                        <td style={{ padding: cell, textAlign: 'right', fontWeight: 700, color: prof >= 0 ? '#111827' : '#dc2626' }}>{fmt(prof)}</td>
                        <td style={{ padding: cell, textAlign: 'right', color: '#6b7280' }}>{mg}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Invoice Detail */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: G, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Invoice Detail</div>
              {invoices.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', background: '#f9fafb', borderRadius: '8px' }}>No invoices found for this period.</div>
              ) : (
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                    <thead>
                      <tr style={{ background: G }}>
                        {['Invoice #', 'Date', 'Customer', 'Status', 'Amount'].map((h, i) => (
                          <th key={h} style={{ padding: cell, color: '#fff', fontWeight: 700, fontSize: '10px', textAlign: i < 4 ? 'left' : 'right' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.slice(0, 20).map((inv: any, idx: number) => (
                        <tr key={inv.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: cell, fontWeight: 600 }}>{inv.invoice_number}</td>
                          <td style={{ padding: cell, color: '#6b7280' }}>{fmtDate(inv.issue_date)}</td>
                          <td style={{ padding: cell }}>{customerMap[inv.customer_id] || '—'}</td>
                          <td style={{ padding: cell }}>
                            <span style={{
                              fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '100px',
                              background: inv.status === 'paid' ? '#dcfce7' : inv.status === 'overdue' ? '#fee2e2' : inv.status === 'sent' ? '#dbeafe' : '#f3f4f6',
                              color: inv.status === 'paid' ? '#15803d' : inv.status === 'overdue' ? '#dc2626' : inv.status === 'sent' ? '#1d4ed8' : '#6b7280',
                            }}>{inv.status?.toUpperCase()}</span>
                          </td>
                          <td style={{ padding: cell, textAlign: 'right', fontWeight: 600 }}>{fmt(invoiceTotal(inv))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {invoices.length > 20 && (
                    <div style={{ textAlign: 'center', padding: '6px', color: '#9ca3af', fontSize: '10px' }}>
                      Showing 20 of {invoices.length} invoices. Export to Excel for the full list.
                    </div>
                  )}
                </>
              )}
            </div>

          </div>

          {/* Footer — page-break-before:avoid keeps it on the same page as content */}
          <div className="print-footer" style={{ background: `linear-gradient(135deg, ${DG}, ${G})`, padding: '10px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px' }}>{business?.name} · {business?.address} · {business?.phone}</span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', fontStyle: 'italic' }}>Generated by AgroYield Business Suite</span>
          </div>

        </div>
      </div>
    </div>
  )
}

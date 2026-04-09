import { createClient } from '@/lib/supabase/server'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: business } = await supabase.from('businesses').select('id, name').eq('user_id', user!.id).single()

  if (!business) return (
    <div className="bg-white rounded-xl border p-8 text-center">
      <p className="text-gray-500">Set up your business profile first.</p>
      <a href="/business/setup" className="mt-3 inline-block text-green-600 font-medium hover:underline">Go to Setup →</a>
    </div>
  )

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, status, total, subtotal, issue_date, customer_id, customers(name)')
    .eq('business_id', business.id)
    .eq('is_active', true)
    .order('issue_date', { ascending: true })

  const { data: invoiceItems } = await supabase
    .from('invoice_items')
    .select('description, quantity, line_total, product_id, business_products(name), invoice_id')
    .in('invoice_id', (invoices ?? []).map(i => i.id))

  const all = invoices ?? []
  const items = invoiceItems ?? []

  const fmt = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

  // Revenue summary
  const totalPaid = all.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total ?? 0), 0)
  const totalOutstanding = all.filter(i => i.status === 'sent').reduce((s, i) => s + (i.total ?? 0), 0)
  const totalOverdue = all.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.total ?? 0), 0)
  const totalDraft = all.filter(i => i.status === 'draft').reduce((s, i) => s + (i.total ?? 0), 0)

  // Monthly revenue (paid invoices only)
  const monthlyMap: Record<string, number> = {}
  all.filter(i => i.status === 'paid').forEach(inv => {
    const month = (inv.issue_date ?? '').slice(0, 7) // YYYY-MM
    monthlyMap[month] = (monthlyMap[month] ?? 0) + (inv.total ?? 0)
  })
  const monthlyData = Object.entries(monthlyMap).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
  const maxMonthly = Math.max(...monthlyData.map(([, v]) => v), 1)

  // Top products by revenue
  const productMap: Record<string, { name: string; total: number; count: number }> = {}
  items.forEach(item => {
    const key = (item.business_products as any)?.name ?? item.description
    if (!productMap[key]) productMap[key] = { name: key, total: 0, count: 0 }
    productMap[key].total += item.line_total ?? 0
    productMap[key].count += 1
  })
  const topProducts = Object.values(productMap).sort((a, b) => b.total - a.total).slice(0, 5)
  const maxProduct = Math.max(...topProducts.map(p => p.total), 1)

  // Top customers by spend (paid only)
  const customerMap: Record<string, { name: string; total: number; count: number }> = {}
  all.filter(i => i.status === 'paid').forEach(inv => {
    const name = (inv.customers as any)?.name ?? 'Unknown'
    if (!customerMap[name]) customerMap[name] = { name, total: 0, count: 0 }
    customerMap[name].total += inv.total ?? 0
    customerMap[name].count += 1
  })
  const topCustomers = Object.values(customerMap).sort((a, b) => b.total - a.total).slice(0, 5)
  const maxCustomer = Math.max(...topCustomers.map(c => c.total), 1)

  // Invoice counts
  const statusCount = { draft: 0, sent: 0, paid: 0, overdue: 0 }
  all.forEach(i => { if (i.status in statusCount) (statusCount as any)[i.status]++ })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Business Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">{business.name}</p>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue (Paid)', value: fmt(totalPaid), color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Outstanding (Sent)', value: fmt(totalOutstanding), color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Overdue', value: fmt(totalOverdue), color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Draft Value', value: fmt(totalDraft), color: 'text-gray-600', bg: 'bg-gray-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-white`}>
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly Revenue Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Monthly Revenue (Last 6 Months — Paid)</h2>
        {monthlyData.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No paid invoices yet.</p>
        ) : (
          <div className="flex items-end gap-3 h-40">
            {monthlyData.map(([month, value]) => {
              const height = Math.round((value / maxMonthly) * 100)
              const label = new Date(month + '-01').toLocaleString('en-NG', { month: 'short', year: '2-digit' })
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{fmt(value).replace('₦', '₦')}</span>
                  <div className="w-full bg-green-500 rounded-t-md transition-all" style={{ height: `${Math.max(height, 4)}%` }} />
                  <span className="text-xs text-gray-400">{label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Top Products by Revenue</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No invoice items yet.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map(p => (
                <div key={p.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 truncate max-w-[60%]">{p.name}</span>
                    <span className="text-gray-500 font-medium">{fmt(p.total)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(p.total / maxProduct) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Top Customers by Spend (Paid)</h2>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No paid invoices with customers yet.</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map(c => (
                <div key={c.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 truncate max-w-[60%]">{c.name}</span>
                    <span className="text-gray-500 font-medium">{fmt(c.total)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${(c.total / maxCustomer) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invoice Status Summary */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Invoice Status Summary</h2>
        <div className="grid grid-cols-4 gap-4 text-center">
          {[
            { label: 'Draft', count: statusCount.draft, color: 'bg-gray-100 text-gray-600' },
            { label: 'Sent', count: statusCount.sent, color: 'bg-blue-50 text-blue-700' },
            { label: 'Paid', count: statusCount.paid, color: 'bg-green-50 text-green-700' },
            { label: 'Overdue', count: statusCount.overdue, color: 'bg-red-50 text-red-600' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl px-4 py-4 ${s.color}`}>
              <p className="text-3xl font-bold">{s.count}</p>
              <p className="text-xs mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

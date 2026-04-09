import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function BusinessDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  if (!business) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
        <div className="text-5xl mb-4">🏪</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Set up your business</h2>
        <p className="text-gray-500 mb-6">Add your business profile to start creating invoices, tracking customers and products.</p>
        <Link href="/business/setup" className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium">
          Get Started
        </Link>
      </div>
    )
  }

  const [{ count: productCount }, { count: customerCount }, { data: invoices }] = await Promise.all([
    supabase.from('business_products').select('*', { count: 'exact', head: true }).eq('business_id', business.id).eq('is_active', true),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('business_id', business.id).eq('is_active', true),
    supabase.from('invoices').select('status, total').eq('business_id', business.id).eq('is_active', true),
  ])

  const totalRevenue = (invoices ?? []).filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total ?? 0), 0)
  const draftCount = (invoices ?? []).filter(i => i.status === 'draft').length
  const sentCount = (invoices ?? []).filter(i => i.status === 'sent').length
  const overdueCount = (invoices ?? []).filter(i => i.status === 'overdue').length
  const fmt = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{business.address}</p>
        </div>
        <Link href="/business/invoices/new" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium transition-colors">
          + New Invoice
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: fmt(totalRevenue), color: 'text-green-600' },
          { label: 'Products', value: productCount ?? 0, color: 'text-blue-600' },
          { label: 'Customers', value: customerCount ?? 0, color: 'text-purple-600' },
          { label: 'Invoices', value: (invoices ?? []).length, color: 'text-gray-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Invoice Status</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Draft', count: draftCount, color: 'bg-gray-100 text-gray-600' },
            { label: 'Sent / Awaiting', count: sentCount, color: 'bg-blue-50 text-blue-700' },
            { label: 'Overdue', count: overdueCount, color: 'bg-red-50 text-red-600' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg px-4 py-3 ${s.color}`}>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { href: '/business/invoices/new', icon: '🧾', label: 'New Invoice' },
          { href: '/business/products', icon: '📦', label: 'Manage Products' },
          { href: '/business/customers', icon: '👥', label: 'Manage Customers' },
          { href: '/business/reports', icon: '📊', label: 'View Reports' },
          { href: '/business/setup', icon: '⚙️', label: 'Business Settings' },
          { href: '/business/invoices', icon: '📋', label: 'All Invoices' },
        ].map(l => (
          <Link key={l.href} href={l.href} className="bg-white border border-gray-100 rounded-xl p-4 hover:border-green-200 hover:bg-green-50 transition-colors flex items-center gap-3 text-sm font-medium text-gray-700">
            <span className="text-xl">{l.icon}</span>{l.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

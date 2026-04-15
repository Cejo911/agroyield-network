import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import AppNav from '@/app/components/AppNav'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Business Preview — Admin — AgroYield Network',
}

const fmt = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

const STATUS_BADGE: Record<string, string> = {
  draft:   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  sent:    'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  paid:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  overdue: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

export default async function BusinessPreviewPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params
  const supabase = await createClient()

  // Auth + admin check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: adminProfile } = await (supabase as any)
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!adminProfile?.is_admin) redirect('/dashboard')

  // Service-role client to bypass RLS — admin has already been verified above
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  // Fetch business
  const { data: business } = await admin
    .from('businesses').select('*').eq('id', businessId).single()
  if (!business) notFound()

  // Fetch business owner profile
  const { data: owner } = await adminAny
    .from('profiles')
    .select('id, first_name, last_name, email, subscription_tier, subscription_expires_at')
    .eq('id', business.user_id)
    .single()

  // Fetch recent invoices (last 20)
  const { data: invoices } = await admin
    .from('invoices')
    .select('id, invoice_number, document_type, status, total, issue_date, due_date, customers(name)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch expenses summary
  const { data: expenses } = await admin
    .from('expenses')
    .select('id, description, amount, category, date')
    .eq('business_id', businessId)
    .order('date', { ascending: false })
    .limit(20)

  // Fetch products/inventory
  const { data: products } = await admin
    .from('business_products')
    .select('id, name, unit, unit_price, stock_quantity, is_active')
    .eq('business_id', businessId)
    .order('name')

  // Fetch team members
  const { data: teamRaw } = await adminAny
    .from('business_team')
    .select('id, role, user_id, profiles(first_name, last_name, email)')
    .eq('business_id', businessId)

  // Fetch customers
  const { data: customers } = await admin
    .from('customers')
    .select('id, name, email, phone')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('name')
    .limit(30)

  // Compute summary stats
  const invoiceList = (invoices ?? []) as any[]
  const expenseList = (expenses ?? []) as any[]
  const productList = (products ?? []) as any[]
  const teamList = (teamRaw ?? []) as any[]
  const customerList = (customers ?? []) as any[]

  const totalRevenue = invoiceList
    .filter((inv: any) => inv.status === 'paid')
    .reduce((sum: number, inv: any) => sum + (Number(inv.total) || 0), 0)
  const totalExpenses = expenseList.reduce((sum: number, exp: any) => sum + (Number(exp.amount) || 0), 0)
  const overdueCount = invoiceList.filter((inv: any) => inv.status === 'overdue').length
  const activeProducts = productList.filter((p: any) => p.is_active).length

  const ownerName = [owner?.first_name, owner?.last_name].filter(Boolean).join(' ') || 'Unknown'
  const ownerTier = owner?.subscription_tier || 'free'

  const tierBadge = ownerTier === 'growth'
    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
    : ownerTier === 'pro'
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              ← Back to Admin
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {business.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Owner: {ownerName} · {owner?.email || '—'}
              <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${tierBadge}`}>
                {ownerTier}
              </span>
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
            👁 Read-Only Preview
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Revenue (Paid)', value: fmt(totalRevenue), color: 'text-green-700 dark:text-green-400' },
            { label: 'Expenses', value: fmt(totalExpenses), color: 'text-red-600 dark:text-red-400' },
            { label: 'Overdue Invoices', value: String(overdueCount), color: overdueCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400' },
            { label: 'Active Products', value: String(activeProducts), color: 'text-gray-700 dark:text-gray-300' },
          ].map(card => (
            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{card.label}</p>
              <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Business Details */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 mb-6">
          <h2 className="font-semibold text-gray-800 dark:text-white mb-3">Business Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {[
              ['Address', business.address],
              ['Phone', business.phone],
              ['Email', business.email],
              ['CAC Number', business.cac_number],
              ['VAT / TIN', business.vat_tin],
              ['Bank', business.bank_name],
              ['Account Name', business.account_name],
              ['Account Number', business.account_number],
              ['Invoice Prefix', business.invoice_prefix],
            ].filter(([, val]) => val).map(([label, val]) => (
              <div key={label as string} className="flex justify-between py-1.5 border-b border-gray-50 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">{label}</span>
                <span className="text-gray-900 dark:text-white font-medium text-right">{val}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Two-column: Invoices + Expenses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Recent Invoices */}
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
            <h2 className="font-semibold text-gray-800 dark:text-white mb-3">
              Recent Invoices <span className="text-xs font-normal text-gray-400">({invoiceList.length})</span>
            </h2>
            {invoiceList.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No invoices yet</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {invoiceList.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-400">{inv.customers?.name || '—'} · {inv.issue_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(Number(inv.total) || 0)}</p>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${STATUS_BADGE[inv.status] || STATUS_BADGE.draft}`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Expenses */}
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
            <h2 className="font-semibold text-gray-800 dark:text-white mb-3">
              Recent Expenses <span className="text-xs font-normal text-gray-400">({expenseList.length})</span>
            </h2>
            {expenseList.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No expenses recorded</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {expenseList.map((exp: any) => (
                  <div key={exp.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{exp.description}</p>
                      <p className="text-xs text-gray-400">{exp.category || '—'} · {exp.date}</p>
                    </div>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">{fmt(Number(exp.amount) || 0)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Two-column: Products + Team/Customers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Products / Inventory */}
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
            <h2 className="font-semibold text-gray-800 dark:text-white mb-3">
              Products / Inventory <span className="text-xs font-normal text-gray-400">({productList.length})</span>
            </h2>
            {productList.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No products listed</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {productList.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {p.name}
                        {!p.is_active && <span className="ml-1.5 text-[10px] text-gray-400">(inactive)</span>}
                      </p>
                      <p className="text-xs text-gray-400">{p.unit} · Stock: {p.stock_quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(Number(p.unit_price) || 0)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Team + Customers */}
          <div className="space-y-6">
            {/* Team Members */}
            <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
              <h2 className="font-semibold text-gray-800 dark:text-white mb-3">
                Team Members <span className="text-xs font-normal text-gray-400">({teamList.length})</span>
              </h2>
              {teamList.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No team members</p>
              ) : (
                <div className="space-y-2">
                  {teamList.map((tm: any) => {
                    const p = tm.profiles
                    const name = [p?.first_name, p?.last_name].filter(Boolean).join(' ') || p?.email || '—'
                    return (
                      <div key={tm.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                        <p className="text-sm text-gray-900 dark:text-white">{name}</p>
                        <span className="text-xs text-gray-400 capitalize">{tm.role || 'member'}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Customers */}
            <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
              <h2 className="font-semibold text-gray-800 dark:text-white mb-3">
                Customers <span className="text-xs font-normal text-gray-400">({customerList.length})</span>
              </h2>
              {customerList.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No customers yet</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {customerList.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">{c.name}</p>
                        {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                      </div>
                      {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

      </main>
    </div>
  )
}

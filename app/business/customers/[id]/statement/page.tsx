import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StatementControls from './StatementControls'

function fmt(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 })
    .format(n).replace('NGN', '₦')
}

const DOC_LABELS: Record<string, string> = {
  invoice: 'Invoice',
  proforma: 'Proforma',
  receipt: 'Receipt',
  delivery_note: 'Delivery Note',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-50 text-blue-700',
  paid: 'bg-green-50 text-green-700',
  overdue: 'bg-red-50 text-red-600',
}

export default async function CustomerStatementPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { from?: string; to?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!business) redirect('/business/setup')

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, email, phone, address')
    .eq('id', params.id)
    .maybeSingle()

  if (!customer) redirect('/business/customers')

  const now = new Date()
  const defaultFrom = `${now.getFullYear()}-01-01`
  const defaultTo = now.toISOString().split('T')[0]
  const from = searchParams.from || defaultFrom
  const to = searchParams.to || defaultTo

  const { data: invoicesRaw } = await supabase
    .from('invoices')
    .select('id, invoice_number, document_type, issue_date, due_date, status, total')
    .eq('business_id', business.id)
    .eq('customer_id', params.id)
    .eq('is_active', true)
    .gte('issue_date', from)
    .lte('issue_date', to)
    .order('issue_date', { ascending: true })

  const invoices = invoicesRaw || []
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total || 0), 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0)
  const totalOutstanding = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + Number(i.total || 0), 0)

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px', fontFamily: 'Inter, sans-serif' }}>

      <Link href="/business/customers" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-6">
        ← Back to Customers
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Statement</h1>
          <p className="text-gray-500 text-sm mt-1">{business.name}</p>
        </div>
        <Link
          href={`/business/customers/${params.id}/statement/print?from=${from}&to=${to}`}
          target="_blank"
          className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-700"
        >
          🖨️ Print / PDF
        </Link>
      </div>

      {/* Customer Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Customer</h2>
        <p className="text-lg font-bold text-gray-900">{customer.name}</p>
        {customer.email   && <p className="text-sm text-gray-500 mt-0.5">{customer.email}</p>}
        {customer.phone   && <p className="text-sm text-gray-500">{customer.phone}</p>}
        {customer.address && <p className="text-sm text-gray-500">{customer.address}</p>}
      </div>

      {/* Date range + share */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Statement Period</h2>
        <StatementControls customerId={params.id} from={from} to={to} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Total Invoiced</p>
          <p className="text-xl font-bold text-gray-900">{fmt(totalInvoiced)}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Total Paid</p>
          <p className="text-xl font-bold text-green-700">{fmt(totalPaid)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Outstanding</p>
          <p className="text-xl font-bold text-red-600">{fmt(totalOutstanding)}</p>
        </div>
      </div>

      {/* Invoices table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Transaction History</h2>
        </div>
        {invoices.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            No invoices found for this period.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Document</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Due Date</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Amount</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-500">{inv.issue_date}</td>
                  <td className="px-5 py-3">
                    <Link href={`/business/invoices/${inv.id}`} className="font-medium text-green-700 hover:underline">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{DOC_LABELS[inv.document_type] ?? inv.document_type}</td>
                  <td className="px-5 py-3 text-gray-500">{inv.due_date ?? '—'}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmt(Number(inv.total || 0))}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50">
              <tr>
                <td colSpan={4} className="px-5 py-3 text-sm font-bold text-gray-900">Total Outstanding</td>
                <td className="px-5 py-3 text-right font-bold text-red-600 text-base">{fmt(totalOutstanding)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

    </div>
  )
}

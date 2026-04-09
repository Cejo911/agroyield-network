import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-50 text-blue-700',
  paid: 'bg-green-50 text-green-700',
  overdue: 'bg-red-50 text-red-600',
}

const DOC_LABELS: Record<string, string> = {
  invoice: 'Invoice', proforma: 'Proforma',
  receipt: 'Receipt', delivery_note: 'Delivery Note',
}

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: business } = await supabase.from('businesses').select('id').eq('user_id', user!.id).single()

  if (!business) return (
    <div className="bg-white rounded-xl border p-8 text-center">
      <p className="text-gray-500">Set up your business profile first.</p>
      <a href="/business/setup" className="mt-3 inline-block text-green-600 font-medium hover:underline">Go to Setup →</a>
    </div>
  )

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, document_type, status, issue_date, due_date, total, customers(name)')
    .eq('business_id', business.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const fmt = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Invoices & Documents</h1>
        <Link href="/business/invoices/new" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
          + New Document
        </Link>
      </div>

      {!invoices || invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <div className="text-4xl mb-3">🧾</div>
          <p className="text-gray-500 mb-4">No documents yet.</p>
          <Link href="/business/invoices/new" className="text-green-600 font-medium hover:underline text-sm">+ Create your first invoice</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Number</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(invoices as any[]).map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/business/invoices/${inv.id}`} className="font-medium text-green-700 hover:underline">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{DOC_LABELS[inv.document_type] ?? inv.document_type}</td>
                  <td className="px-4 py-3 text-gray-700">{(inv.customers as any)?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.issue_date}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">{fmt(inv.total ?? 0)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

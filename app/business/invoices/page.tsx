import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import InvoicesTable from './InvoicesTable'

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  if (!business) return (
    <div className="bg-white rounded-xl border p-8 text-center">
      <p className="text-gray-500">Set up your business profile first.</p>
      <a href="/business/setup" className="mt-3 inline-block text-green-600 font-medium hover:underline">Go to Setup →</a>
    </div>
  )

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, document_type, status, issue_date, due_date, total, paid_at, payment_method, business_id, user_id, customers(name)')
    .eq('business_id', business.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices & Documents</h1>
        <Link
          href="/business/invoices/new"
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
        >
          + New Document
        </Link>
      </div>

      {!invoices || invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <div className="text-4xl mb-3">🧾</div>
          <p className="text-gray-500 mb-4">No documents yet.</p>
          <Link href="/business/invoices/new" className="text-green-600 font-medium hover:underline text-sm">
            + Create your first invoice
          </Link>
        </div>
      ) : (
        <InvoicesTable invoices={invoices as any[]} />
      )}
    </div>
  )
}

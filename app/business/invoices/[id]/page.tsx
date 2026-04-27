import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import InvoiceActions from './InvoiceActions'
import RecurringCreateWarning from './RecurringCreateWarning'
import { getBusinessAccess } from '@/lib/business-access'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type Customer = Pick<
  Database['public']['Tables']['customers']['Row'],
  'name' | 'email' | 'phone' | 'address'
>
type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']

const DOC_LABELS: Record<string, string> = {
  invoice: 'INVOICE', proforma: 'PROFORMA INVOICE',
  receipt: 'RECEIPT', delivery_note: 'DELIVERY NOTE',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-50 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-50 text-red-600',
}

export default async function InvoiceViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = (await createClient()) as SupabaseClient<Database>
  const { data: { user } } = await supabase.auth.getUser()

  const cookieStore = await cookies()
  const access = await getBusinessAccess(supabase, user!.id, cookieStore.get('active_biz_id')?.value)
  if (!access) notFound()

  const { data: inv } = await supabase
    .from('invoices')
    .select('*, customers(name, email, phone, address), invoice_items(*, business_products(name, unit))')
    .eq('id', id)
    .eq('business_id', access.businessId)
    .single()

  if (!inv) notFound()

  const { data: business } = await supabase.from('businesses').select('*').eq('id', inv.business_id).single()

  const fmt = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
  // Embedded relations: `customers` is a one-to-one (returns object or null);
  // `invoice_items` is a one-to-many (array). Narrow defensively in case the
  // generated types surface either as a union.
  const customer = (Array.isArray(inv.customers) ? inv.customers[0] : inv.customers) as Customer | null
  const items: InvoiceItem[] = (inv.invoice_items as unknown as InvoiceItem[] | null) ?? []

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Deferred warning from the new-invoice flow (e.g. recurring
          template POST failed while the invoice itself saved). Renders
          nothing unless sessionStorage has a message. */}
      <RecurringCreateWarning />

      {/* Header actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link href="/business/invoices" className="text-sm text-gray-500 hover:text-gray-700">← Back to Invoices</Link>
        <div className="flex items-center gap-2">
          <Link href={`/invoice-print/${id}`} target="_blank"
            className="border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            🖨 Print / PDF
          </Link>
          <InvoiceActions id={id} status={inv.status ?? ''} />
        </div>
      </div>

      {/* Invoice document */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 sm:p-8">
        {/* Document header */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4 sm:items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{business?.name}</h1>
            {business?.address && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{business.address}</p>}
            {business?.phone && <p className="text-sm text-gray-500 dark:text-gray-400">{business.phone}</p>}
            {business?.email && <p className="text-sm text-gray-500 dark:text-gray-400">{business.email}</p>}
            {(business?.cac_number || business?.vat_tin) && (
              <div className="flex flex-wrap gap-x-4 mt-1">
                {business.cac_number && <p className="text-xs text-gray-400">CAC: {business.cac_number}</p>}
                {business.vat_tin && <p className="text-xs text-gray-400">TIN: {business.vat_tin}</p>}
              </div>
            )}
          </div>
          <div className="sm:text-right">
            <div className="text-2xl font-bold text-gray-400 dark:text-gray-500">{(inv.document_type && DOC_LABELS[inv.document_type]) ?? inv.document_type}</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">{inv.invoice_number}</div>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium capitalize ${(inv.status && STATUS_COLORS[inv.status]) ?? 'bg-gray-100 text-gray-600'}`}>
              {inv.status}
            </span>
          </div>
        </div>

        {/* Bill to + dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-8">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bill To</p>
            {customer ? (
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-0.5">
                <p className="font-semibold">{customer.name}</p>
                {customer.email && <p className="text-gray-500 dark:text-gray-400">{customer.email}</p>}
                {customer.phone && <p className="text-gray-500 dark:text-gray-400">{customer.phone}</p>}
                {customer.address && <p className="text-gray-500 dark:text-gray-400">{customer.address}</p>}
              </div>
            ) : <p className="text-sm text-gray-400 italic">No customer assigned</p>}
          </div>
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Issue Date:</span>
              <span className="font-medium text-gray-900 dark:text-white">{inv.issue_date}</span>
            </div>
            {inv.due_date && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Due Date:</span>
                <span className="font-medium text-gray-900 dark:text-white">{inv.due_date}</span>
              </div>
            )}
          </div>
        </div>

       {/* Line items — Desktop table */}
        <table className="w-full text-sm mb-6 hidden sm:table">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 font-semibold text-gray-600 dark:text-gray-300">Description</th>
              <th className="text-right py-2 font-semibold text-gray-600 dark:text-gray-300 pr-3">Qty</th>
              <th className="text-right py-2 font-semibold text-gray-600 dark:text-gray-300 pr-3">Unit Price</th>
              <th className="text-right py-2 font-semibold text-gray-600 dark:text-gray-300">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-50 dark:border-gray-800">
                <td className="py-2.5 text-gray-700 dark:text-gray-300">{item.description}</td>
                <td className="py-2.5 text-right text-gray-600 dark:text-gray-400 pr-3">{item.quantity}</td>
                <td className="py-2.5 text-right text-gray-600 dark:text-gray-400 pr-3">{fmt(item.unit_price ?? 0)}</td>
                <td className="py-2.5 text-right font-medium text-gray-800 dark:text-white">{fmt(item.line_total ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Line items — Mobile cards */}
        <div className="sm:hidden space-y-2 mb-6">
          <div className="border-b-2 border-gray-200 dark:border-gray-700 pb-2">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Items</p>
          </div>
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between py-2 border-b border-gray-50 dark:border-gray-800">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300">{item.description}</p>
                <p className="text-xs text-gray-400">{item.quantity} × {fmt(item.unit_price ?? 0)}</p>
              </div>
              <p className="text-sm font-medium text-gray-800 dark:text-white ml-3">{fmt(item.line_total ?? 0)}</p>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full sm:w-64 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal</span><span>{fmt(inv.subtotal ?? 0)}</span>
            </div>
            {Number(inv.delivery_charge ?? 0) > 0 && (
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Delivery</span><span>{fmt(inv.delivery_charge ?? 0)}</span>
              </div>
            )}
            {inv.apply_vat && (
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>VAT ({inv.vat_rate ?? 7.5}%)</span><span>{fmt(inv.vat_amount ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 dark:text-white text-base pt-2 border-t-2 border-gray-200 dark:border-gray-700">
              <span>Total</span><span>{fmt(inv.total ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {inv.notes && (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{inv.notes}</p>
          </div>
        )}

        {/* Bank details */}
        {business?.account_number && (inv.document_type === 'invoice' || inv.document_type === 'proforma') && (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment Details</p>
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-0.5">
              {business.bank_name && <p><span className="text-gray-400">Bank:</span> {business.bank_name}</p>}
              {business.account_name && <p><span className="text-gray-400">Account Name:</span> {business.account_name}</p>}
              {business.account_number && <p><span className="text-gray-400">Account Number:</span> {business.account_number}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

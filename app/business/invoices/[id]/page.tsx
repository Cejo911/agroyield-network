import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import InvoiceActions from './InvoiceActions'

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: inv } = await supabase
    .from('invoices')
    .select('*, customers(name, email, phone, address), invoice_items(*, business_products(name, unit))')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (!inv) notFound()

  const { data: business } = await supabase.from('businesses').select('*').eq('id', inv.business_id).single()

  const fmt = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
  const customer = inv.customers as any
  const items = (inv.invoice_items as any[]) ?? []

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <a href="/business/invoices" className="text-sm text-gray-500 hover:text-gray-700">← Back to Invoices</a>
        <div className="flex items-center gap-2">
          <a href={`/invoice-print/${id}`} target="_blank"
            className="border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            🖨 Print / PDF
          </a>
          <InvoiceActions id={id} status={inv.status} />
        </div>
      </div>

      {/* Invoice document */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
        {/* Document header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{business?.name}</h1>
            {business?.address && <p className="text-sm text-gray-500 mt-1">{business.address}</p>}
            {business?.phone && <p className="text-sm text-gray-500">{business.phone}</p>}
            {business?.email && <p className="text-sm text-gray-500">{business.email}</p>}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-400">{DOC_LABELS[inv.document_type] ?? inv.document_type}</div>
            <div className="text-lg font-bold text-gray-900 mt-1">{inv.invoice_number}</div>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {inv.status}
            </span>
          </div>
        </div>

        {/* Bill to + dates */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bill To</p>
            {customer ? (
              <div className="text-sm text-gray-700 space-y-0.5">
                <p className="font-semibold">{customer.name}</p>
                {customer.email && <p className="text-gray-500">{customer.email}</p>}
                {customer.phone && <p className="text-gray-500">{customer.phone}</p>}
                {customer.address && <p className="text-gray-500">{customer.address}</p>}
              </div>
            ) : <p className="text-sm text-gray-400 italic">No customer assigned</p>}
          </div>
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Issue Date:</span>
              <span className="font-medium">{inv.issue_date}</span>
            </div>
            {inv.due_date && (
              <div className="flex justify-between">
                <span className="text-gray-500">Due Date:</span>
                <span className="font-medium">{inv.due_date}</span>
              </div>
            )}
          </div>
        </div>

        {/* Line items */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 font-semibold text-gray-600">Description</th>
              <th className="text-right py-2 font-semibold text-gray-600">Qty</th>
              <th className="text-right py-2 font-semibold text-gray-600">Unit Price</th>
              <th className="text-right py-2 font-semibold text-gray-600">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => (
              <tr key={item.id} className="border-b border-gray-50">
                <td className="py-2.5 text-gray-700">{item.description}</td>
                <td className="py-2.5 text-right text-gray-600">{item.quantity}</td>
                <td className="py-2.5 text-right text-gray-600">{fmt(item.unit_price)}</td>
                <td className="py-2.5 text-right font-medium text-gray-800">{fmt(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>{fmt(inv.subtotal ?? 0)}</span>
            </div>
            {inv.apply_vat && (
              <div className="flex justify-between text-gray-600">
                <span>VAT (7.5%)</span><span>{fmt(inv.vat_amount ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t-2 border-gray-200">
              <span>Total</span><span>{fmt(inv.total ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {inv.notes && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-gray-600 whitespace-pre-line">{inv.notes}</p>
          </div>
        )}

        {/* Bank details */}
        {business?.account_number && (inv.document_type === 'invoice' || inv.document_type === 'proforma') && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment Details</p>
            <div className="text-sm text-gray-600 space-y-0.5">
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

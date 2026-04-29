'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const PAYMENT_METHODS = [
  'Bank Transfer', 'Cash', 'POS / Card',
  'Cheque', 'Mobile Money', 'USSD', 'Other',
]

type InvoiceProp = {
  id: string
  invoice_number: string
  status: string | null
  total: number | null
  paid_at: string | null
  business_id: string
  user_id: string
}

export default function RecordPaymentButton({ invoice }: { invoice: InvoiceProp }) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm]       = useState({
    paid_at:           new Date().toISOString().slice(0, 10),
    payment_method:    'Bank Transfer',
    payment_reference: '',
    payment_notes:     '',
  })
  const router = useRouter()

  if (invoice.status === 'paid') {
    return (
      <span className="text-xs text-green-600 font-semibold">
        ✓ Paid {invoice.paid_at
          ? new Date(invoice.paid_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : ''}
      </span>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient() as SupabaseClient<Database>

    // If invoice was draft (stock not yet deducted), deduct now
    if (invoice.status === 'draft') {
      const { data: items } = await supabase
        .from('invoice_items')
        .select('product_id, quantity')
        .eq('invoice_id', invoice.id)
        .not('product_id', 'is', null)

      if (items) {
        for (const item of items) {
          if (!item.product_id) continue
          const qty = item.quantity ?? 0
          const { data: product } = await supabase
            .from('business_products')
            .select('stock_quantity, cost_price')
            .eq('id', item.product_id)
            .single()

          if (!product) continue

          await supabase.from('stock_movements').insert({
            business_id: invoice.business_id,
            user_id: invoice.user_id,
            product_id: item.product_id,
            type: 'out',
            quantity: qty,
            cost_price: product.cost_price || 0,
            reason: 'sale',
            note: 'Auto-deducted: payment recorded directly',
            invoice_id: invoice.id,
          })

          await supabase
            .from('business_products')
            .update({ stock_quantity: (product.stock_quantity ?? 0) - qty })
            .eq('id', item.product_id)
        }
      }
    }

    const { error } = await supabase
      .from('invoices')
      .update({
        status:            'paid',
        paid_at:           form.paid_at,
        payment_method:    form.payment_method,
        payment_reference: form.payment_reference || null,
        payment_notes:     form.payment_notes     || null,
      })
      .eq('id', invoice.id)
    setLoading(false)
    if (!error) { setOpen(false); router.refresh() }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-md hover:bg-green-700 transition-colors"
      >
        Record Payment
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-xl shadow-2xl p-7 w-full max-w-md mx-4">

            {/* Header */}
            <div className="flex justify-between items-start mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {invoice.invoice_number} &middot; ₦{Number(invoice.total ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Payment Date *</label>
                <input
                  type="date" required
                  value={form.paid_at}
                  onChange={e => setForm(f => ({ ...f, paid_at: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Payment Method *</label>
                <select
                  value={form.payment_method}
                  onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Reference / Transaction ID <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. TRF/2026/04/00123"
                  value={form.payment_reference}
                  onChange={e => setForm(f => ({ ...f, payment_reference: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Notes <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <textarea
                  placeholder="Any additional payment notes..."
                  value={form.payment_notes}
                  onChange={e => setForm(f => ({ ...f, payment_notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Warning */}
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
                ⚠️ This will mark the invoice as <strong>Paid</strong> and update your P&L immediately.
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button" onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold text-sm rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={loading}
                  className="flex-2 flex-grow-[2] py-2.5 bg-green-600 text-white font-semibold text-sm rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {loading ? 'Recording...' : '✓ Confirm Payment'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  )
}

'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const PAYMENT_METHODS = [
  'Bank Transfer', 'Cash', 'POS / Card',
  'Cheque', 'Mobile Money', 'USSD', 'Other',
]

export default function RecordPaymentButton({ invoice }: { invoice: any }) {
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
      <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
        ✓ Paid {invoice.paid_at
          ? new Date(invoice.paid_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : ''}
      </span>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
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
        style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
      >
        Record Payment
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>Record Payment</h2>
                <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '3px' }}>
                  {invoice.invoice_number} · {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(invoice.total_amount || invoice.amount || 0)).replace('NGN', '₦')}
                </p>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Payment Date */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' }}>Payment Date *</label>
                <input
                  type="date" required
                  value={form.paid_at}
                  onChange={e => setForm(f => ({ ...f, paid_at: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Payment Method */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' }}>Payment Method *</label>
                <select
                  value={form.payment_method}
                  onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', background: 'white' }}
                >
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Reference */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' }}>
                  Reference / Transaction ID <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. TRF/2026/04/00123"
                  value={form.payment_reference}
                  onChange={e => setForm(f => ({ ...f, payment_reference: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' }}>
                  Notes <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
                </label>
                <textarea
                  placeholder="Any additional payment notes..."
                  value={form.payment_notes}
                  onChange={e => setForm(f => ({ ...f, payment_notes: e.target.value }))}
                  rows={2}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {/* Confirmation notice */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#15803d' }}>
                ⚠️ This will mark the invoice as <strong>Paid</strong> and cannot be undone automatically.
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button" onClick={() => setOpen(false)}
                  style={{ flex: 1, padding: '11px', background: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', color: '#374151' }}
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={loading}
                  style={{ flex: 2, padding: '11px', background: loading ? '#86efac' : '#16a34a', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', color: 'white' }}
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

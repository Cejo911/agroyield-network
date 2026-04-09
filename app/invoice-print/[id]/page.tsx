import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PrintButton from './PrintButton'

const DOC_LABELS: Record<string, string> = {
  invoice: 'INVOICE', proforma: 'PROFORMA INVOICE',
  receipt: 'RECEIPT', delivery_note: 'DELIVERY NOTE',
}

const STATUS_WATERMARK: Record<string, { text: string; color: string }> = {
  draft:   { text: 'DRAFT',   color: 'rgba(107,114,128,0.07)' },
  overdue: { text: 'OVERDUE', color: 'rgba(239,68,68,0.06)'   },
  paid:    { text: 'PAID',    color: 'rgba(22,163,74,0.07)'   },
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: inv } = await supabase
    .from('invoices')
    .select('*, customers(name, email, phone, address), invoice_items(*, business_products(name, unit))')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!inv) notFound()

  const { data: business } = await supabase.from('businesses').select('*').eq('id', inv.business_id).single()

  const fmt = (n: number) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
  const customer = inv.customers as any
  const items = (inv.invoice_items as any[]) ?? []
  const watermark = STATUS_WATERMARK[inv.status]
  const accentColor = '#15803d'

  return (
    <>
      <style>{`
        @media print {
          header, nav, .no-print { display: none !important; }
          body { margin: 0 !important; background: #fff !important; }
          @page { size: A4; margin: 0; }
          .invoice-wrap { padding: 14mm 18mm !important; }
        }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print bg-gray-100 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <a href={`/business/invoices/${id}`} className="text-sm text-gray-500 hover:text-gray-700">← Back to Invoice</a>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">In print dialog: set margins to None, uncheck Headers &amp; footers</span>
          <PrintButton />
        </div>
      </div>

      {/* Invoice */}
      <div className="invoice-wrap" style={{ padding: '32px 48px', background: '#fff', position: 'relative', overflow: 'hidden' }}>

        {/* Watermark */}
        {watermark && (
          <div style={{
            position: 'absolute', top: '42%', left: '50%',
            transform: 'translate(-50%, -50%) rotate(-45deg)',
            fontSize: '120px', fontWeight: 900, color: watermark.color,
            textTransform: 'uppercase', letterSpacing: '12px',
            whiteSpace: 'nowrap', pointerEvents: 'none', userSelect: 'none', zIndex: 0,
          }}>
            {watermark.text}
          </div>
        )}

        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* Green header band */}
          <div style={{
            background: accentColor, borderRadius: '10px',
            padding: '20px 28px', marginBottom: '28px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {business?.logo_url ? (
                <img src={business.logo_url} alt="Logo"
                  style={{ width: '56px', height: '56px', objectFit: 'contain', borderRadius: '6px', background: '#fff', padding: '4px' }} />
              ) : (
                <div style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🏪</div>
              )}
              <div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{business?.name}</div>
                {business?.address && <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>{business.address}</div>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '4px', textTransform: 'uppercase' }}>
                {DOC_LABELS[inv.document_type] ?? inv.document_type}
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>{inv.invoice_number}</div>
            </div>
          </div>

          {/* Business contact + Bill To + Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '28px' }}>

            {/* From */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>From</div>
              <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.8 }}>
                {business?.phone && <div>{business.phone}</div>}
                {business?.email && <div style={{ color: '#15803d' }}>{business.email}</div>}
              </div>
            </div>

            {/* Bill To */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Bill To</div>
              {customer ? (
                <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.8 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>{customer.name}</div>
                  {customer.email && <div style={{ color: '#6b7280' }}>{customer.email}</div>}
                  {customer.phone && <div>{customer.phone}</div>}
                  {customer.address && <div style={{ color: '#6b7280' }}>{customer.address}</div>}
                </div>
              ) : <div style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>No customer assigned</div>}
            </div>

            {/* Invoice meta */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Invoice Details</div>
              <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Issue Date</span>
                  <span style={{ fontWeight: 600 }}>{formatDate(inv.issue_date)}</span>
                </div>
                {inv.due_date && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Due Date</span>
                    <span style={{ fontWeight: 600, color: inv.status === 'overdue' ? '#dc2626' : '#111827' }}>{formatDate(inv.due_date)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Status</span>
                  <span style={{
                    fontWeight: 700, textTransform: 'capitalize', fontSize: '12px',
                    color: inv.status === 'paid' ? '#15803d' : inv.status === 'overdue' ? '#dc2626' : inv.status === 'sent' ? '#2563eb' : '#6b7280'
                  }}>
                    {inv.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Items table */}
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ background: '#f0fdf4' }}>
                <th style={{ textAlign: 'left', padding: '11px 14px', fontWeight: 700, color: '#15803d', fontSize: '12px', letterSpacing: '0.5px', borderTop: `2px solid ${accentColor}`, borderBottom: `2px solid ${accentColor}` }}>
                  Description
                </th>
                <th style={{ textAlign: 'center', padding: '11px 8px', fontWeight: 700, color: '#15803d', fontSize: '12px', width: '60px', borderTop: `2px solid ${accentColor}`, borderBottom: `2px solid ${accentColor}` }}>
                  Qty
                </th>
                <th style={{ textAlign: 'right', padding: '11px 14px', fontWeight: 700, color: '#15803d', fontSize: '12px', width: '130px', borderTop: `2px solid ${accentColor}`, borderBottom: `2px solid ${accentColor}` }}>
                  Unit Price
                </th>
                <th style={{ textAlign: 'right', padding: '11px 14px', fontWeight: 700, color: '#15803d', fontSize: '12px', width: '130px', borderTop: `2px solid ${accentColor}`, borderBottom: `2px solid ${accentColor}` }}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => (
                <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '11px 14px', color: '#374151', fontSize: '14px', borderBottom: '1px solid #f3f4f6' }}>{item.description}</td>
                  <td style={{ padding: '11px 8px', textAlign: 'center', color: '#6b7280', fontSize: '14px', borderBottom: '1px solid #f3f4f6' }}>{item.quantity}</td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', color: '#6b7280', fontSize: '14px', borderBottom: '1px solid #f3f4f6' }}>{fmt(item.unit_price)}</td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: '#111827', fontSize: '14px', borderBottom: '1px solid #f3f4f6' }}>{fmt(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals + Notes side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px', marginBottom: '28px', alignItems: 'start' }}>

            {/* Notes */}
            <div>
              {inv.notes && (
                <div style={{ padding: '14px 18px', background: '#f9fafb', borderRadius: '8px', borderLeft: `3px solid ${accentColor}` }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>Notes</div>
                  <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{inv.notes}</div>
                </div>
              )}
            </div>

            {/* Totals */}
            <div>
              <div style={{ fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>
                  <span>Subtotal</span><span style={{ fontWeight: 500 }}>{fmt(inv.subtotal ?? 0)}</span>
                </div>
                {inv.apply_vat && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>
                    <span>VAT (7.5%)</span><span style={{ fontWeight: 500 }}>{fmt(inv.vat_amount ?? 0)}</span>
                  </div>
                )}
              </div>
              {/* Total highlight box */}
              <div style={{
                background: accentColor, borderRadius: '8px', padding: '12px 16px', marginTop: '8px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Total Due</span>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>{fmt(inv.total ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Bank details */}
          {business?.account_number && (inv.document_type === 'invoice' || inv.document_type === 'proforma') && (
            <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#15803d', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>
                Payment Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '13px', color: '#374151' }}>
                {business.bank_name && (
                  <div>
                    <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Bank</div>
                    <div style={{ fontWeight: 600 }}>{business.bank_name}</div>
                  </div>
                )}
                {business.account_name && (
                  <div>
                    <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Account Name</div>
                    <div style={{ fontWeight: 600 }}>{business.account_name}</div>
                  </div>
                )}
                {business.account_number && (
                  <div>
                    <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Account Number</div>
                    <div style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '1px', color: '#111827' }}>{business.account_number}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>
              {business?.name} — {business?.address}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic', fontWeight: 500 }}>
              Thank you for your business.
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

// app/invoice-print/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PrintButton from './PrintButton'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', minimumFractionDigits: 2
  }).format(amount).replace('NGN', '₦')
}

export default async function InvoicePrintPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('id', params.id)
    .single()

  if (!invoice) notFound()

  const { data: business } = await supabase
    .from('businesses')
    .eq('user_id', invoice.user_id)
    .select('*')
    .single()

  const { data: customer } = await supabase
    .from('customers')
    .eq('id', invoice.customer_id)
    .select('*')
    .single()

  const items = invoice.invoice_items || []
  const subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0)
  const vat = invoice.vat_amount || 0
  const total = invoice.total_amount || subtotal

  const watermarkLabel =
    invoice.status === 'draft' ? 'DRAFT' :
    invoice.status === 'overdue' ? 'OVERDUE' :
    invoice.status === 'paid' ? 'PAID' : null

  const statusColor =
    invoice.status === 'paid' ? '#16a34a' :
    invoice.status === 'overdue' ? '#dc2626' :
    invoice.status === 'sent' ? '#2563eb' : '#6b7280'

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; padding: 0; background: #e5e7eb; }
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          .invoice-root { box-shadow: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body { height: auto !important; overflow: hidden !important; }
          .invoice-root { page-break-after: avoid; break-after: avoid; overflow: hidden !important; }
        }
      `}</style>

      {/* Screen toolbar */}
      <div className="no-print" style={{ background: '#1f2937', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#9ca3af', fontSize: '13px' }}>Invoice Preview — {invoice.invoice_number}</span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <a href={`/business/invoices/${invoice.id}`} style={{ color: '#9ca3af', fontSize: '13px', textDecoration: 'none' }}>← Back</a>
          <PrintButton />
        </div>
      </div>

      {/* Page wrapper */}
      <div style={{ background: '#e5e7eb', padding: '32px 0 48px', minHeight: 'calc(100vh - 53px)' }} className="no-print-bg">
        {/* Invoice sheet */}
        <div
          className="invoice-root"
          style={{
            width: '210mm',
            margin: '0 auto',
            background: '#fff',
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: '13px',
            color: '#1f2937',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
          }}
        >
          {/* Watermark — position: absolute (NOT fixed) */}
          {watermarkLabel && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-35deg)',
              fontSize: '90px',
              fontWeight: 900,
              color: 'rgba(0,0,0,0.055)',
              letterSpacing: '8px',
              pointerEvents: 'none',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              zIndex: 0,
            }}>
              {watermarkLabel}
            </div>
          )}

          {/* Content sits above watermark */}
          <div style={{ position: 'relative', zIndex: 1 }}>

            {/* Top accent strip */}
            <div style={{ height: '7px', background: 'linear-gradient(90deg, #0f5c2e, #15803d, #22c55e)' }} />

            {/* Header band */}
            <div style={{
              background: 'linear-gradient(135deg, #0f5c2e 0%, #15803d 100%)',
              padding: '28px 36px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              {/* Logo + business name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {business?.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt="logo"
                    style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover', background: '#fff', padding: '4px' }}
                  />
                ) : (
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '26px', fontWeight: 800, color: '#fff'
                  }}>
                    {(business?.name || 'B')[0]}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                    {business?.name || 'Your Business'}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', marginTop: '3px' }}>
                    {[business?.address, business?.phone, business?.email].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>

              {/* Doc type + invoice number */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {invoice.document_type || 'INVOICE'}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
                  {invoice.invoice_number}
                </div>
              </div>
            </div>

            {/* Bill To + Invoice Details card */}
            <div style={{ padding: '28px 36px 20px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                overflow: 'hidden',
              }}>
                {/* Bill To */}
                <div style={{ padding: '20px 24px', borderRight: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#15803d', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Bill To
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827', marginBottom: '6px' }}>
                    {customer?.name || invoice.customer_name}
                  </div>
                  {customer?.address && <div style={{ color: '#6b7280', marginBottom: '3px' }}>{customer.address}</div>}
                  {customer?.phone && <div style={{ color: '#6b7280', marginBottom: '3px' }}>{customer.phone}</div>}
                  {customer?.email && <div style={{ color: '#15803d', fontSize: '12px' }}>{customer.email}</div>}
                </div>

                {/* Invoice Details */}
                <div style={{ padding: '20px 24px', background: '#f0fdf4' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#15803d', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Invoice Details
                  </div>
                  {[
                    ['Issue Date', formatDate(invoice.issue_date)],
                    invoice.due_date ? ['Due Date', formatDate(invoice.due_date)] : null,
                    ['Reference', invoice.invoice_number],
                    ['Status', invoice.status?.toUpperCase()],
                  ].filter(Boolean).map(([label, value]: any) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                      <span style={{ color: '#6b7280', fontSize: '12px' }}>{label}</span>
                      <span style={{
                        fontWeight: 600,
                        fontSize: '12px',
                        color: label === 'Status' ? statusColor : '#111827',
                        letterSpacing: label === 'Status' ? '0.5px' : 'normal',
                      }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Line items table */}
            <div style={{ padding: '0 36px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '48%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '20%' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: '#15803d' }}>
                    {['DESCRIPTION', 'QTY', 'UNIT PRICE', 'AMOUNT'].map((h, i) => (
                      <th key={h} style={{
                        padding: '11px 14px',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '1px',
                        textAlign: i === 0 ? 'left' : 'right',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, idx: number) => (
                    <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '11px 14px', color: '#111827' }}>
                        <div style={{ fontWeight: 500 }}>{item.description}</div>
                        {item.notes && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{item.notes}</div>}
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', color: '#374151' }}>{item.quantity}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', color: '#374151' }}>{formatCurrency(item.unit_price)}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals + Payment Details */}
            <div style={{ padding: '20px 36px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
              {/* Payment details */}
              <div>
                {(business?.bank_name || business?.account_number) && (
                  <div style={{
                    borderLeft: '3px solid #15803d',
                    paddingLeft: '14px',
                    background: '#f0fdf4',
                    borderRadius: '0 8px 8px 0',
                    padding: '14px 16px 14px 16px',
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#15803d', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Payment Details
                    </div>
                    {business.bank_name && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>Bank</span>
                        <span style={{ fontWeight: 600, fontSize: '12px', color: '#111827' }}>{business.bank_name}</span>
                      </div>
                    )}
                    {business.account_name && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>Account Name</span>
                        <span style={{ fontWeight: 600, fontSize: '12px', color: '#111827' }}>{business.account_name}</span>
                      </div>
                    )}
                    {business.account_number && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>Account Number</span>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f5c2e', letterSpacing: '1px' }}>{business.account_number}</span>
                      </div>
                    )}
                  </div>
                )}
                {invoice.notes && (
                  <div style={{ marginTop: '12px', padding: '12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '5px' }}>Notes</div>
                    <div style={{ fontSize: '12px', color: '#78350f', lineHeight: '1.5' }}>{invoice.notes}</div>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                <div style={{ padding: '12px 18px', background: '#f9fafb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#6b7280' }}>Subtotal</span>
                    <span style={{ fontWeight: 500 }}>{formatCurrency(subtotal)}</span>
                  </div>
                  {vat > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>VAT</span>
                      <span style={{ fontWeight: 500 }}>{formatCurrency(vat)}</span>
                    </div>
                  )}
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #0f5c2e, #15803d)',
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>Total Due</span>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' }}>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              background: 'linear-gradient(135deg, #0f5c2e, #15803d)',
              padding: '14px 36px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '4px',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px' }}>
                {business?.name} · {business?.address} · {business?.phone}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontStyle: 'italic' }}>
                Thank you for your business.
              </span>
            </div>

          </div>{/* end z-index wrapper */}
        </div>{/* end invoice-root */}
      </div>
    </>
  )
}

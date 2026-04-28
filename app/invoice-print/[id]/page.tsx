import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getBusinessAccess } from '@/lib/business-access'
import InvoiceShareActions from './InvoiceShareActions'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']

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

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = (await createClient()) as SupabaseClient<Database>

  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getBusinessAccess(supabase, user.id) : null

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('id', id)
    .single()

  if (!invoice) notFound()
  // Verify the current user has access to this invoice's business
  if (access && invoice.business_id !== access.businessId) notFound()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', invoice.business_id)
    .single()

  const { data: customer } = invoice.customer_id
    ? await supabase
        .from('customers')
        .select('*')
        .eq('id', invoice.customer_id)
        .single()
    : { data: null }

  const items: InvoiceItem[] = (invoice.invoice_items as InvoiceItem[] | null) ?? []

  // Compute each line total — falls back to qty × unit_price when line_total is null.
  // Note: previous code referenced item.total / item.amount which never existed
  // on invoice_items (canonical column is line_total). Bug fixed in pass.
  const computedItems = items.map((item) => ({
    ...item,
    _total:
      Number(item.line_total) ||
      (Number(item.quantity ?? 0) * Number(item.unit_price ?? 0)) ||
      0,
  }))

  const subtotal = computedItems.reduce((sum, item) => sum + item._total, 0)
  const delivery = Number(invoice.delivery_charge || 0)
  const vat = Number(invoice.vat_amount || 0)
  // Prefer the persisted invoice total; fall back to the locally computed sum.
  // Previous code also tried `invoice.total_amount` — that column doesn't exist
  // (canonical column is `total`). Bug fixed in pass.
  const total = Number(invoice.total) || (subtotal + delivery + vat)

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
          .page-wrapper { background: #fff !important; padding: 0 !important; min-height: 0 !important; }
          .invoice-root { box-shadow: none !important; page-break-after: avoid; break-after: avoid; overflow: hidden !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* Screen toolbar */}
      <div className="no-print" style={{ background: '#1f2937', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#9ca3af', fontSize: '13px' }}>Invoice Preview — {invoice.invoice_number}</span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <a href={`/business/invoices/${id}`} style={{ color: '#9ca3af', fontSize: '13px', textDecoration: 'none' }}>← Back</a>
          <InvoiceShareActions invoiceId={id} invoiceNumber={invoice.invoice_number} />
        </div>
      </div>

      {/* Page wrapper */}
      <div className="page-wrapper" style={{ background: '#e5e7eb', padding: '32px 0 48px' }}>

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
          {/* Watermark */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {business?.logo_url ? (
                  // Print page — see business/reports/print/page.tsx for the
                  // full rationale. Native <img> renders predictably across
                  // print engines; Next/Image's lazy loading is unreliable
                  // at print-render time.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={business.logo_url}
                    alt="logo"
                    style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'contain', background: '#fff', padding: '4px' }}
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
                  {(business?.cac_number || business?.vat_tin) && (
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginTop: '3px' }}>
                      {[business.cac_number ? `CAC: ${business.cac_number}` : null, business.vat_tin ? `TIN: ${business.vat_tin}` : null].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {invoice.document_type || 'INVOICE'}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
                  {invoice.invoice_number}
                </div>
              </div>
            </div>

            {/* Bill To + Invoice Details */}
            <div style={{ padding: '28px 36px 20px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                overflow: 'hidden',
              }}>
                <div style={{ padding: '20px 24px', borderRight: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#15803d', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>Bill To</div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827', marginBottom: '6px' }}>
                    {customer?.name || 'Customer'}
                  </div>
                  {customer?.address && <div style={{ color: '#6b7280', marginBottom: '3px' }}>{customer.address}</div>}
                  {customer?.phone && <div style={{ color: '#6b7280', marginBottom: '3px' }}>{customer.phone}</div>}
                  {customer?.email && <div style={{ color: '#15803d', fontSize: '12px' }}>{customer.email}</div>}
                </div>
                <div style={{ padding: '20px 24px', background: '#f0fdf4' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#15803d', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>Invoice Details</div>
                  {([
                    invoice.issue_date ? ['Issue Date', formatDate(invoice.issue_date)] as const : null,
                    invoice.due_date ? ['Due Date', formatDate(invoice.due_date)] as const : null,
                    ['Reference', invoice.invoice_number] as const,
                    ['Status', invoice.status?.toUpperCase() ?? ''] as const,
                  ].filter(Boolean) as ReadonlyArray<readonly [string, string | undefined]>).map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                      <span style={{ color: '#6b7280', fontSize: '12px' }}>{label}</span>
                      <span style={{ fontWeight: 600, fontSize: '12px', color: label === 'Status' ? statusColor : '#111827' }}>
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
                  {computedItems.map((item, idx) => (
                    <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '11px 14px', color: '#111827' }}>
                        <div style={{ fontWeight: 500 }}>{item.description}</div>
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', color: '#374151' }}>{item.quantity}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', color: '#374151' }}>{formatCurrency(Number(item.unit_price ?? 0))}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>{formatCurrency(item._total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals + Payment Details */}
            <div style={{ padding: '20px 36px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
              <div>
                {(business?.bank_name || business?.account_number) && (
                  <div style={{
                    borderLeft: '3px solid #15803d',
                    background: '#f0fdf4',
                    borderRadius: '0 8px 8px 0',
                    padding: '14px 16px',
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#15803d', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Payment Details</div>
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

              <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                <div style={{ padding: '12px 18px', background: '#f9fafb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#6b7280' }}>Subtotal</span>
                    <span style={{ fontWeight: 500 }}>{formatCurrency(subtotal)}</span>
                  </div>
                  {delivery > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#6b7280' }}>Delivery</span>
                      <span style={{ fontWeight: 500 }}>{formatCurrency(delivery)}</span>
                    </div>
                  )}
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
                {[business?.name, business?.address, business?.phone, business?.cac_number ? `CAC: ${business.cac_number}` : null].filter(Boolean).join(' · ')}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontStyle: 'italic' }}>
                Thank you for your business.
              </span>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

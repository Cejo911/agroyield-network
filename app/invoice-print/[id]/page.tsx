import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PrintButton from './PrintButton'

const DOC_LABELS: Record<string, string> = {
  invoice: 'INVOICE', proforma: 'PROFORMA INVOICE',
  receipt: 'RECEIPT', delivery_note: 'DELIVERY NOTE',
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

  return (
    <>
      <style>{`
        @media print {
          header, nav, .no-print { display: none !important; }
          body { margin: 0 !important; background: #fff !important; }
          @page {
            size: A4;
            margin: 18mm 20mm;
          }
          .invoice-wrap {
            padding: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print bg-gray-100 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <a href={`/business/invoices/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Invoice
        </a>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Tip: uncheck "Headers and footers" in the print dialog</span>
          <PrintButton />
        </div>
      </div>

      {/* Invoice */}
      <div className="invoice-wrap" style={{ padding: '32px 48px', background: '#fff' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            {business?.logo_url && (
              <img src={business.logo_url} alt="Logo"
                style={{ width: '72px', height: '72px', objectFit: 'contain', borderRadius: '8px' }} />
            )}
            <div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', marginBottom: '6px', lineHeight: 1.2 }}>
                {business?.name}
              </div>
              {business?.address && <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '2px' }}>{business.address}</div>}
              {business?.phone && <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '2px' }}>{business.phone}</div>}
              {business?.email && <div style={{ fontSize: '14px', color: '#6b7280' }}>{business.email}</div>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#d1d5db', letterSpacing: '3px' }}>
              {DOC_LABELS[inv.document_type] ?? inv.document_type}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginTop: '6px' }}>
              {inv.invoice_number}
            </div>
          </div>
        </div>

        {/* Bill to + Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '28px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>
              Bill To
            </div>
            {customer ? (
              <div style={{ fontSize: '15px', color: '#374151', lineHeight: 1.7 }}>
                <div style={{ fontWeight: 700, fontSize: '16px' }}>{customer.name}</div>
                {customer.email && <div style={{ color: '#6b7280' }}>{customer.email}</div>}
                {customer.phone && <div style={{ color: '#6b7280' }}>{customer.phone}</div>}
                {customer.address && <div style={{ color: '#6b7280' }}>{customer.address}</div>}
              </div>
            ) : (
              <div style={{ fontSize: '14px', color: '#9ca3af', fontStyle: 'italic' }}>No customer assigned</div>
            )}
          </div>
          <div style={{ fontSize: '14px', color: '#374151' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ color: '#6b7280' }}>Issue Date</span>
              <span style={{ fontWeight: 600 }}>{inv.issue_date}</span>
            </div>
            {inv.due_date && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ color: '#6b7280' }}>Due Date</span>
                <span style={{ fontWeight: 600 }}>{inv.due_date}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Status</span>
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{inv.status}</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '2.5px solid #111827', marginBottom: '4px' }} />

        {/* Items table */}
        <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: 700, color: '#374151', fontSize: '13px', letterSpacing: '0.3px' }}>Description</th>
              <th style={{ textAlign: 'right', padding: '12px 0', fontWeight: 700, color: '#374151', fontSize: '13px', width: '60px' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 700, color: '#374151', fontSize: '13px', width: '130px' }}>Unit Price</th>
              <th style={{ textAlign: 'right', padding: '12px 0', fontWeight: 700, color: '#374151', fontSize: '13px', width: '130px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 0', color: '#374151', fontSize: '15px' }}>{item.description}</td>
                <td style={{ padding: '12px 0', textAlign: 'right', color: '#6b7280', fontSize: '15px' }}>{item.quantity}</td>
                <td style={{ padding: '12px 8px', textAlign: 'right', color: '#6b7280', fontSize: '15px' }}>{fmt(item.unit_price)}</td>
                <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 700, color: '#111827', fontSize: '15px' }}>{fmt(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
          <div style={{ width: '280px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#6b7280' }}>
              <span>Subtotal</span><span style={{ fontWeight: 500 }}>{fmt(inv.subtotal ?? 0)}</span>
            </div>
            {inv.apply_vat && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#6b7280' }}>
                <span>VAT (7.5%)</span><span style={{ fontWeight: 500 }}>{fmt(inv.vat_amount ?? 0)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '18px', color: '#111827', paddingTop: '10px', borderTop: '2.5px solid #111827', marginTop: '8px' }}>
              <span>Total</span><span>{fmt(inv.total ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {inv.notes && (
          <div style={{ marginBottom: '28px', padding: '16px 20px', background: '#f9fafb', borderRadius: '8px', borderLeft: '3px solid #d1fae5' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Notes</div>
            <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{inv.notes}</div>
          </div>
        )}

        {/* Bank details */}
        {business?.account_number && (inv.document_type === 'invoice' || inv.document_type === 'proforma') && (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px', marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>
              Payment Details
            </div>
            <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 2 }}>
              {business.bank_name && (
                <div><span style={{ color: '#9ca3af', display: 'inline-block', width: '140px' }}>Bank:</span>{business.bank_name}</div>
              )}
              {business.account_name && (
                <div><span style={{ color: '#9ca3af', display: 'inline-block', width: '140px' }}>Account Name:</span>{business.account_name}</div>
              )}
              {business.account_number && (
                <div><span style={{ color: '#9ca3af', display: 'inline-block', width: '140px' }}>Account Number:</span>{business.account_number}</div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ paddingTop: '16px', borderTop: '1px solid #e5e7eb', textAlign: 'center', fontSize: '13px', color: '#9ca3af' }}>
          Thank you for your business.
        </div>

      </div>
    </>
  )
}

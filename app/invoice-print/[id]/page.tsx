import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

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
      {/* Print button — hidden when printing */}
      <div style={{ padding: '16px 32px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}
        className="no-print">
        <button onClick={() => window.print()}
          style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
          🖨 Print / Save as PDF
        </button>
        <button onClick={() => window.close()}
          style={{ background: '#fff', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
          Close
        </button>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          @page { size: A4; margin: 20mm; }
        }
      `}</style>

      {/* Invoice */}
      <div style={{ maxWidth: '794px', margin: '0 auto', padding: '40px 48px', background: '#fff', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>{business?.name}</div>
            {business?.address && <div style={{ fontSize: '13px', color: '#6b7280' }}>{business.address}</div>}
            {business?.phone && <div style={{ fontSize: '13px', color: '#6b7280' }}>{business.phone}</div>}
            {business?.email && <div style={{ fontSize: '13px', color: '#6b7280' }}>{business.email}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#9ca3af', letterSpacing: '2px' }}>
              {DOC_LABELS[inv.document_type] ?? inv.document_type}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>{inv.invoice_number}</div>
          </div>
        </div>

        {/* Bill to + Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '32px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Bill To</div>
            {customer ? (
              <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>
                <div style={{ fontWeight: 600 }}>{customer.name}</div>
                {customer.email && <div style={{ color: '#6b7280' }}>{customer.email}</div>}
                {customer.phone && <div style={{ color: '#6b7280' }}>{customer.phone}</div>}
                {customer.address && <div style={{ color: '#6b7280' }}>{customer.address}</div>}
              </div>
            ) : <div style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>No customer</div>}
          </div>
          <div style={{ fontSize: '13px', color: '#374151' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#6b7280' }}>Issue Date:</span>
              <span style={{ fontWeight: 600 }}>{inv.issue_date}</span>
            </div>
            {inv.due_date && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#6b7280' }}>Due Date:</span>
                <span style={{ fontWeight: 600 }}>{inv.due_date}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Status:</span>
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{inv.status}</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '2px solid #111827', marginBottom: '16px' }} />

        {/* Items table */}
        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600, color: '#374151' }}>Description</th>
              <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600, color: '#374151' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600, color: '#374151' }}>Unit Price</th>
              <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600, color: '#374151' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 0', color: '#374151' }}>{item.description}</td>
                <td style={{ padding: '10px 0', textAlign: 'right', color: '#6b7280' }}>{item.quantity}</td>
                <td style={{ padding: '10px 0', textAlign: 'right', color: '#6b7280' }}>{fmt(item.unit_price)}</td>
                <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, color: '#111827' }}>{fmt(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
          <div style={{ width: '240px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#6b7280' }}>
              <span>Subtotal</span><span>{fmt(inv.subtotal ?? 0)}</span>
            </div>
            {inv.apply_vat && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#6b7280' }}>
                <span>VAT (7.5%)</span><span>{fmt(inv.vat_amount ?? 0)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '15px', color: '#111827', paddingTop: '8px', borderTop: '2px solid #111827', marginTop: '6px' }}>
              <span>Total</span><span>{fmt(inv.total ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {inv.notes && (
          <div style={{ marginBottom: '24px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Notes</div>
            <div style={{ fontSize: '13px', color: '#4b5563', whiteSpace: 'pre-line' }}>{inv.notes}</div>
          </div>
        )}

        {/* Bank details */}
        {business?.account_number && (inv.document_type === 'invoice' || inv.document_type === 'proforma') && (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Payment Details</div>
            <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.8' }}>
              {business.bank_name && <div><span style={{ color: '#9ca3af' }}>Bank: </span>{business.bank_name}</div>}
              {business.account_name && <div><span style={{ color: '#9ca3af' }}>Account Name: </span>{business.account_name}</div>}
              {business.account_number && <div><span style={{ color: '#9ca3af' }}>Account Number: </span>{business.account_number}</div>}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '48px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', textAlign: 'center', fontSize: '11px', color: '#9ca3af' }}>
          Thank you for your business.
        </div>
      </div>
    </>
  )
}

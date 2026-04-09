import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PrintButton from './PrintButton'

const DOC_LABELS: Record<string, string> = {
  invoice: 'INVOICE', proforma: 'PROFORMA INVOICE',
  receipt: 'RECEIPT', delivery_note: 'DELIVERY NOTE',
}

const WATERMARKS: Record<string, { text: string; color: string }> = {
  draft:   { text: 'DRAFT',   color: 'rgba(156,163,175,0.10)' },
  overdue: { text: 'OVERDUE', color: 'rgba(239,68,68,0.08)'   },
  paid:    { text: 'PAID',    color: 'rgba(22,163,74,0.09)'   },
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  draft:   { bg: '#f3f4f6', color: '#6b7280' },
  sent:    { bg: '#eff6ff', color: '#2563eb' },
  paid:    { bg: '#dcfce7', color: '#15803d' },
  overdue: { bg: '#fee2e2', color: '#dc2626' },
}

function fmtDate(s: string) {
  if (!s) return '—'
  return new Date(s + 'T00:00:00').toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: inv } = await supabase
    .from('invoices')
    .select('*, customers(name, email, phone, address), invoice_items(*, business_products(name, unit))')
    .eq('id', id).eq('user_id', user.id).single()
  if (!inv) notFound()

  const { data: biz } = await supabase.from('businesses').select('*').eq('id', inv.business_id).single()

  const fmt = (n: number) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
  const customer = inv.customers as any
  const items = (inv.invoice_items as any[]) ?? []
  const wm = WATERMARKS[inv.status]
  const ss = STATUS_STYLE[inv.status] ?? STATUS_STYLE.draft
  const dark = '#0f5c2e'
  const mid  = '#15803d'
  const light = '#f0fdf4'

  return (
    <>
      <style>{`
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; height: auto !important; background: #fff !important; }
          header, nav, .no-print { display: none !important; }
          @page { size: A4; margin: 0; }
          .invoice-root { page-break-after: avoid; break-after: avoid; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ background: '#1f2937', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href={`/business/invoices/${id}`} style={{ color: '#9ca3af', fontSize: '13px', textDecoration: 'none' }}>← Back to Invoice</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#6b7280', fontSize: '11px' }}>In print dialog → Margins: None → Uncheck Headers &amp; footers</span>
          <PrintButton />
        </div>
      </div>

      {/* Page */}
      <div className="invoice-root" style={{ background: '#fff', padding: '0 0 0 0', fontFamily: "'Segoe UI', Arial, sans-serif" }}>

        {/* Watermark */}
        {wm && (
          <div aria-hidden style={{
            position: 'fixed', top: '38%', left: '50%',
            transform: 'translate(-50%, -50%) rotate(-42deg)',
            fontSize: '130px', fontWeight: 900, color: wm.color,
            letterSpacing: '14px', whiteSpace: 'nowrap',
            pointerEvents: 'none', userSelect: 'none', zIndex: 0,
          }}>{wm.text}</div>
        )}

        <div style={{ position: 'relative', zIndex: 1, padding: '0 52px 40px 52px' }}>

          {/* ── TOP ACCENT STRIP ── */}
          <div style={{ background: dark, height: '7px', margin: '0 -52px 0 -52px' }} />

          {/* ── HEADER BAND ── */}
          <div style={{
            background: `linear-gradient(135deg, ${dark} 0%, ${mid} 100%)`,
            margin: '0 -52px', padding: '22px 52px 22px 52px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '28px',
          }}>
            {/* Left: logo + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {biz?.logo_url ? (
                <img src={biz.logo_url} alt="logo"
                  style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '8px', background: '#fff', padding: '5px' }} />
              ) : (
                <div style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>🏪</div>
              )}
              <div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#fff', lineHeight: 1.15 }}>{biz?.name}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginTop: '3px' }}>
                  {[biz?.address, biz?.phone, biz?.email].filter(Boolean).join('  ·  ')}
                </div>
              </div>
            </div>
            {/* Right: doc type + number */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '4px' }}>
                {DOC_LABELS[inv.document_type] ?? inv.document_type}
              </div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#fff', letterSpacing: '1px' }}>{inv.invoice_number}</div>
            </div>
          </div>

          {/* ── INFO ROW: Bill To + Invoice Meta ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', marginBottom: '28px', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>

            {/* Bill To */}
            <div style={{ padding: '18px 22px', borderRight: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: mid, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>Bill To</div>
              {customer ? (
                <div style={{ fontSize: '13px', lineHeight: 1.8, color: '#374151' }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>{customer.name}</div>
                  {customer.address && <div style={{ color: '#6b7280' }}>{customer.address}</div>}
                  {customer.phone && <div>{customer.phone}</div>}
                  {customer.email && <div style={{ color: mid }}>{customer.email}</div>}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>No customer assigned</div>
              )}
            </div>

            {/* Invoice meta */}
            <div style={{ padding: '18px 22px', background: light }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: mid, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>Invoice Details</div>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    { label: 'Issue Date', value: fmtDate(inv.issue_date) },
                    ...(inv.due_date ? [{ label: 'Due Date', value: fmtDate(inv.due_date) }] : []),
                    { label: 'Reference', value: inv.invoice_number },
                  ].map(r => (
                    <tr key={r.label}>
                      <td style={{ padding: '4px 0', color: '#6b7280', whiteSpace: 'nowrap', paddingRight: '16px' }}>{r.label}</td>
                      <td style={{ padding: '4px 0', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{r.value}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ padding: '4px 0', color: '#6b7280' }}>Status</td>
                    <td style={{ padding: '4px 0', textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: '20px',
                        fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                        background: ss.bg, color: ss.color,
                      }}>{inv.status}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── ITEMS TABLE ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: dark }}>
                <th style={{ textAlign: 'left', padding: '11px 14px', color: '#fff', fontWeight: 700, fontSize: '11px', letterSpacing: '0.8px', textTransform: 'uppercase', borderRadius: '0' }}>Description</th>
                <th style={{ textAlign: 'center', padding: '11px 10px', color: '#fff', fontWeight: 700, fontSize: '11px', letterSpacing: '0.8px', textTransform: 'uppercase', width: '60px' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '11px 14px', color: '#fff', fontWeight: 700, fontSize: '11px', letterSpacing: '0.8px', textTransform: 'uppercase', width: '140px' }}>Unit Price</th>
                <th style={{ textAlign: 'right', padding: '11px 14px', color: '#fff', fontWeight: 700, fontSize: '11px', letterSpacing: '0.8px', textTransform: 'uppercase', width: '140px' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, i: number) => (
                <tr key={item.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 14px', color: '#1f2937', fontSize: '14px' }}>{item.description}</td>
                  <td style={{ padding: '12px 10px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>{item.quantity}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: '#6b7280', fontSize: '14px' }}>{fmt(item.unit_price)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#111827', fontSize: '14px' }}>{fmt(item.line_total)}</td>
                </tr>
              ))}
              {/* Empty rows for visual breathing room */}
              {items.length < 3 && Array.from({ length: 3 - items.length }).map((_, i) => (
                <tr key={`empty-${i}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 14px' }}>&nbsp;</td>
                  <td /><td /><td />
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── BOTTOM SECTION: Notes + Totals ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', marginBottom: '24px', alignItems: 'start' }}>

            {/* Notes + Payment details stacked */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {inv.notes && (
                <div style={{ padding: '14px 18px', background: light, borderRadius: '8px', borderLeft: `4px solid ${mid}` }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: mid, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>Notes</div>
                  <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{inv.notes}</div>
                </div>
              )}

              {biz?.account_number && (inv.document_type === 'invoice' || inv.document_type === 'proforma') && (
                <div style={{ padding: '14px 18px', background: light, borderRadius: '8px', borderLeft: `4px solid ${mid}` }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: mid, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>Payment Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', fontSize: '13px' }}>
                    {biz.bank_name && (<><span style={{ color: '#6b7280' }}>Bank</span><span style={{ fontWeight: 600, color: '#111827' }}>{biz.bank_name}</span></>)}
                    {biz.account_name && (<><span style={{ color: '#6b7280' }}>Account Name</span><span style={{ fontWeight: 600, color: '#111827' }}>{biz.account_name}</span></>)}
                    {biz.account_number && (<><span style={{ color: '#6b7280' }}>Account Number</span><span style={{ fontWeight: 700, fontSize: '15px', color: dark, letterSpacing: '1px' }}>{biz.account_number}</span></>)}
                  </div>
                </div>
              )}
            </div>

            {/* Totals card */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#6b7280' }}>Subtotal</span>
                  <span style={{ fontWeight: 500, color: '#374151' }}>{fmt(inv.subtotal ?? 0)}</span>
                </div>
                {inv.apply_vat && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#6b7280' }}>VAT (7.5%)</span>
                    <span style={{ fontWeight: 500, color: '#374151' }}>{fmt(inv.vat_amount ?? 0)}</span>
                  </div>
                )}
              </div>
              <div style={{ background: dark, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Total Due</span>
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>{fmt(inv.total ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* ── FOOTER BAND ── */}
          <div style={{
            background: `linear-gradient(135deg, ${dark} 0%, ${mid} 100%)`,
            margin: '0 -52px -40px -52px',
            padding: '14px 52px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
              {biz?.name}{biz?.address ? ` · ${biz.address}` : ''}{biz?.phone ? ` · ${biz.phone}` : ''}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' }}>
              Thank you for your business.
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

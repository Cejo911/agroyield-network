import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PrintButton from './PrintButton'

function fmt(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 })
    .format(n).replace('NGN', '₦')
}

const DOC_LABELS: Record<string, string> = {
  invoice: 'Invoice',
  proforma: 'Proforma',
  receipt: 'Receipt',
  delivery_note: 'Delivery Note',
}

export default async function StatementPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { id } = await params
  const { from: fromParam, to: toParam } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, address, email, phone')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!business) redirect('/business/setup')

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, email, phone, address')
    .eq('id', id)
    .eq('business_id', business.id)
    .maybeSingle()

  if (!customer) redirect('/business/customers')

  const now = new Date()
  const defaultFrom = `${now.getFullYear()}-01-01`
  const defaultTo = now.toISOString().split('T')[0]
  const from = fromParam || defaultFrom
  const to = toParam || defaultTo

  const { data: invoicesRaw } = await supabase
    .from('invoices')
    .select('id, invoice_number, document_type, issue_date, due_date, status, total')
    .eq('business_id', business.id)
    .eq('customer_id', id)
    .eq('is_active', true)
    .gte('issue_date', from)
    .lte('issue_date', to)
    .order('issue_date', { ascending: true })

  const invoices = invoicesRaw || []
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total || 0), 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0)
  const totalOutstanding = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + Number(i.total || 0), 0)

  const printDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const fromLabel = new Date(from).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const toLabel   = new Date(to).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: '32px', maxWidth: '800px', margin: '0 auto', color: '#111827' }}>

      <PrintButton />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: 0 }}>CUSTOMER STATEMENT</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>Period: {fromLabel} — {toLabel}</p>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0 0' }}>Printed: {printDate}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: 700, fontSize: '15px', margin: 0 }}>{business.name}</p>
          {business.email   && <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>{business.email}</p>}
          {business.phone   && <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>{business.phone}</p>}
          {business.address && <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>{business.address}</p>}
        </div>
      </div>

      {/* Customer Info */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, margin: '0 0 6px 0' }}>Statement For</p>
        <p style={{ fontWeight: 700, fontSize: '16px', margin: 0 }}>{customer.name}</p>
        {customer.email   && <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>{customer.email}</p>}
        {customer.phone   && <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>{customer.phone}</p>}
        {customer.address && <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>{customer.address}</p>}
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Invoiced', value: fmt(totalInvoiced), color: '#111827' },
          { label: 'Total Paid',     value: fmt(totalPaid),     color: '#16a34a' },
          { label: 'Outstanding',    value: fmt(totalOutstanding), color: '#dc2626' },
        ].map(card => (
          <div key={card.label} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px' }}>
            <p style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, margin: '0 0 4px 0' }}>{card.label}</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: card.color, margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
            {['Date', 'Document', 'Type', 'Due Date', 'Amount', 'Status'].map(h => (
              <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Amount' ? 'right' : 'left', fontWeight: 600, color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoices.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>No invoices found for this period.</td>
            </tr>
          ) : invoices.map((inv, i) => (
            <tr key={inv.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              <td style={{ padding: '10px 12px', color: '#6b7280' }}>{inv.issue_date}</td>
              <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827' }}>{inv.invoice_number}</td>
              <td style={{ padding: '10px 12px', color: '#6b7280' }}>{DOC_LABELS[inv.document_type] ?? inv.document_type}</td>
              <td style={{ padding: '10px 12px', color: '#6b7280' }}>{inv.due_date ?? '—'}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>{fmt(Number(inv.total || 0))}</td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{
                  padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, textTransform: 'capitalize',
                  background: inv.status === 'paid' ? '#f0fdf4' : inv.status === 'overdue' ? '#fef2f2' : inv.status === 'sent' ? '#eff6ff' : '#f3f4f6',
                  color: inv.status === 'paid' ? '#16a34a' : inv.status === 'overdue' ? '#dc2626' : inv.status === 'sent' ? '#2563eb' : '#6b7280',
                }}>
                  {inv.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid #e5e7eb',

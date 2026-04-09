'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Product = { id: string; name: string; unit: string; unit_price: number }
type Customer = { id: string; name: string }
type LineItem = { product_id: string; description: string; quantity: string; unit_price: string; line_total: number }

const DOC_TYPES = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'proforma', label: 'Proforma Invoice' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'delivery_note', label: 'Delivery Note' },
]

export default function NewInvoicePage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [business, setBusiness] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [docType, setDocType] = useState('invoice')
  const [customerId, setCustomerId] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [applyVat, setApplyVat] = useState(false)
  const [items, setItems] = useState<LineItem[]>([
    { product_id: '', description: '', quantity: '1', unit_price: '', line_total: 0 }
  ])

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: biz } = await supabase.from('businesses').select('*').eq('user_id', user.id).single()
    if (!biz) { setLoading(false); return }
    setBusiness(biz)
    const [{ data: prods }, { data: custs }] = await Promise.all([
      supabase.from('business_products').select('id, name, unit, unit_price').eq('business_id', biz.id).eq('is_active', true).order('name'),
      supabase.from('customers').select('id, name').eq('business_id', biz.id).eq('is_active', true).order('name'),
    ])
    setProducts(prods ?? [])
    setCustomers(custs ?? [])
    setLoading(false)
  }

  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    setItems(prev => {
      const updated = [...prev]
      const item = { ...updated[index], [field]: value }
      if (field === 'product_id' && value) {
        const prod = products.find(p => p.id === value)
        if (prod) { item.description = prod.name; item.unit_price = String(prod.unit_price) }
      }
      item.line_total = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
      updated[index] = item
      return updated
    })
  }

  const addItem = () => setItems(prev => [...prev, { product_id: '', description: '', quantity: '1', unit_price: '', line_total: 0 }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))

  const subtotal = items.reduce((s, i) => s + i.line_total, 0)
  const vatAmount = applyVat ? subtotal * 0.075 : 0
  const total = subtotal + vatAmount
  const fmt = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business) return
    setSaving(true)
    const newCounter = (business.invoice_counter ?? 0) + 1
    const invoiceNumber = `${business.invoice_prefix ?? 'INV'}-${String(newCounter).padStart(4, '0')}`
    await supabase.from('businesses').update({ invoice_counter: newCounter }).eq('id', business.id)
    const { data: inv } = await supabase.from('invoices').insert({
      business_id: business.id,
      user_id: business.user_id,
      customer_id: customerId || null,
      invoice_number: invoiceNumber,
      document_type: docType,
      status: 'draft',
      issue_date: issueDate,
      due_date: dueDate || null,
      notes: notes || null,
      apply_vat: applyVat,
      vat_rate: 7.5,
      subtotal,
      vat_amount: vatAmount,
      total,
    }).select().single()

    if (inv) {
      const lineItems = items
        .filter(i => i.description && (parseFloat(i.unit_price) || 0) > 0)
        .map(i => ({
          invoice_id: inv.id,
          product_id: i.product_id || null,
          description: i.description,
          quantity: parseFloat(i.quantity) || 1,
          unit_price: parseFloat(i.unit_price) || 0,
          line_total: i.line_total,
        }))
      if (lineItems.length > 0) await supabase.from('invoice_items').insert(lineItems)
      router.push(`/business/invoices/${inv.id}`)
    }
    setSaving(false)
  }

  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>
  if (!business) return (
    <div className="bg-white rounded-xl border p-8 text-center">
      <p className="text-gray-500">Set up your business first.</p>
      <a href="/business/setup" className="mt-3 inline-block text-green-600 font-medium hover:underline">Go to Setup →</a>
    </div>
  )

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">New Document</h1>
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Document Type */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Document Type</h2>
          <div className="flex flex-wrap gap-2">
            {DOC_TYPES.map(t => (
              <button key={t.value} type="button" onClick={() => setDocType(t.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${docType === t.value ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-green-300'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="">— Select customer (optional) —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Items</h2>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-1">
              <div className="col-span-3">Product</div>
              <div className="col-span-4">Description</div>
              <div className="col-span-1">Qty</div>
              <div className="col-span-2">Unit Price</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3">
                  <select value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Custom</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="col-span-4">
                  <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                    placeholder="Description" required
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="col-span-1">
                  <input type="number" min="0" step="0.01" value={item.quantity}
                    onChange={e => updateItem(i, 'quantity', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="col-span-2">
                  <input type="number" min="0" step="0.01" value={item.unit_price}
                    onChange={e => updateItem(i, 'unit_price', e.target.value)} placeholder="0.00"
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="col-span-1 text-right text-xs font-medium text-gray-700 flex items-center justify-end gap-1">
                  <span>{fmt(item.line_total)}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-base leading-none">×</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addItem} className="mt-3 text-sm text-green-600 hover:underline font-medium">
            + Add line
          </button>

          {/* Totals */}
          <div className="mt-5 pt-4 border-t border-gray-100 max-w-xs ml-auto space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span className="font-medium">{fmt(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input type="checkbox" checked={applyVat} onChange={e => setApplyVat(e.target.checked)}
                  className="rounded border-gray-300 text-green-600" />
                Apply VAT (7.5%)
              </label>
              <span className="text-sm font-medium">{fmt(vatAmount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>Total</span><span>{fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Notes</h2>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Payment instructions, delivery terms, thank you message..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
        </div>

        <div className="flex gap-3">
          <a href="/business/invoices" className="flex-1 text-center border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            Cancel
          </a>
          <button type="submit" disabled={saving || items.every(i => !i.description)}
            className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors text-sm">
            {saving ? 'Creating...' : 'Create Document'}
          </button>
        </div>
      </form>
    </div>
  )
}

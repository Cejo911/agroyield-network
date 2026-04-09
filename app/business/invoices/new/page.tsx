'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface LineItem {
  description: string
  quantity: string
  unit_price: string
}

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
}

interface Business {
  id: string
  name: string
  invoice_prefix: string | null
  invoice_counter: number | null
}

export default function NewInvoicePage() {
  const router = useRouter()
  const supabase = createClient()

  const [business, setBusiness] = useState<Business | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState('')
  const [documentType, setDocumentType] = useState('INVOICE')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [vatPercent, setVatPercent] = useState('')
  const [items, setItems] = useState<LineItem[]>([
    { description: '', quantity: '1', unit_price: '' }
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: biz } = await supabase
        .from('businesses')
        .select('id, name, invoice_prefix, invoice_counter')
        .eq('user_id', user.id)
        .single()
      setBusiness(biz)

      const { data: custs } = await supabase
        .from('customers')
        .select('id, name, email, phone, address')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name')
      setCustomers(custs || [])
    }
    load()
  }, [])

  function addItem() {
    setItems([...items, { description: '', quantity: '1', unit_price: '' }])
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof LineItem, value: string) {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function lineTotal(item: LineItem) {
    const qty = parseFloat(item.quantity) || 0
    const price = parseFloat(item.unit_price) || 0
    return qty * price
  }

  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0)
  const vatAmount = subtotal * ((parseFloat(vatPercent) || 0) / 100)
  const totalAmount = subtotal + vatAmount

  function formatCurrency(n: number) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency', currency: 'NGN', minimumFractionDigits: 2
    }).format(n).replace('NGN', '₦')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!customerId) { setError('Please select a customer.'); return }
    if (items.some(i => !i.description || !i.unit_price)) {
      setError('Please fill in all line item descriptions and prices.')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Increment counter and generate invoice number
      const currentCounter = business?.invoice_counter || 0
      const newCounter = currentCounter + 1
      const prefix = business?.invoice_prefix || 'INV'
      const invoiceNumber = `${prefix}-${String(newCounter).padStart(4, '0')}`

      // Update counter on business
      await supabase
        .from('businesses')
        .update({ invoice_counter: newCounter })
        .eq('id', business!.id)

      // Insert invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          customer_id: customerId,
          invoice_number: invoiceNumber,
          document_type: documentType,
          issue_date: issueDate,
          due_date: dueDate || null,
          notes: notes || null,
          status: 'draft',
          subtotal_amount: subtotal,
          vat_percent: parseFloat(vatPercent) || 0,
          vat_amount: vatAmount,
          total_amount: totalAmount,
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Insert line items — save both `total` and `amount` columns
      const lineItems = items.map(item => {
        const qty = parseFloat(item.quantity) || 0
        const price = parseFloat(item.unit_price) || 0
        const rowTotal = qty * price
        return {
          invoice_id: invoice.id,
          description: item.description,
          quantity: qty,
          unit_price: price,
          total: rowTotal,
          amount: rowTotal,
        }
      })

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(lineItems)

      if (itemsError) throw itemsError

      router.push(`/business/invoices/${invoice.id}`)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
        <p className="text-gray-500 text-sm mt-1">Create a new invoice or receipt</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Header fields */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Invoice Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Document Type</label>
              <select
                value={documentType}
                onChange={e => setDocumentType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="INVOICE">Invoice</option>
                <option value="RECEIPT">Receipt</option>
                <option value="PROFORMA">Proforma Invoice</option>
                <option value="QUOTE">Quote</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
              <select
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select customer…</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date <span className="text-gray-400">(optional)</span></label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Line Items</h2>

          {/* Header row */}
          <div className="grid grid-cols-12 gap-2 mb-2 px-1">
            <div className="col-span-3 text-xs font-medium text-gray-500">Product</div>
            <div className="col-span-3 text-xs font-medium text-gray-500">Description</div>
            <div className="col-span-1 text-xs font-medium text-gray-500">Qty</div>
            <div className="col-span-2 text-xs font-medium text-gray-500">Unit Price</div>
            <div className="col-span-2 text-xs font-medium text-gray-500 text-right">Total</div>
            <div className="col-span-1" />
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3">
                  <input
                    type="text"
                    placeholder="Item name"
                    value={item.description}
                    onChange={e => updateItem(idx, 'description', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    placeholder="Details (optional)"
                    value={item.description}
                    onChange={e => updateItem(idx, 'description', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="col-span-1">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={item.unit_price}
                    onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div className="col-span-2 text-right text-sm font-semibold text-gray-800">
                  {formatCurrency(lineTotal(item))}
                </div>
                <div className="col-span-1 flex justify-center">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-gray-400 hover:text-red-500 text-lg leading-none"
                    >×</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-4 text-sm text-green-700 font-medium hover:text-green-900 flex items-center gap-1"
          >
            + Add line item
          </button>
        </div>

        {/* Totals + Notes */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Notes</h2>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Payment terms, thank you note, etc."
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">VAT %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="0"
                value={vatPercent}
                onChange={e => setVatPercent(e.target.value)}
                className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {vatAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">VAT ({vatPercent}%)</span>
                  <span className="font-medium">{formatCurrency(vatAmount)}</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-3 flex justify-between">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-bold text-green-700 text-lg">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.push('/business/invoices')}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-green-700 rounded-lg hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Create Invoice'}
          </button>
        </div>

      </form>
    </div>
  )
}

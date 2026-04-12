'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const TRANSITIONS: Record<string, { label: string; next: string; color: string }[]> = {
  draft:   [{ label: 'Mark as Sent', next: 'sent', color: 'bg-blue-600 text-white hover:bg-blue-700' }],
  sent:    [
    { label: 'Mark as Paid', next: 'paid', color: 'bg-green-600 text-white hover:bg-green-700' },
    { label: 'Mark Overdue', next: 'overdue', color: 'bg-red-500 text-white hover:bg-red-600' },
  ],
  paid:    [{ label: 'Revert to Draft', next: 'draft', color: 'bg-gray-200 text-gray-700 hover:bg-gray-300' }],
  overdue: [
    { label: 'Mark as Paid', next: 'paid', color: 'bg-green-600 text-white hover:bg-green-700' },
    { label: 'Revert to Sent', next: 'sent', color: 'bg-blue-600 text-white hover:bg-blue-700' },
  ],
}

export default function InvoiceActions({ id, status }: { id: string; status: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const handleStatus = async (next: string) => {
    setLoading(true)

    // Determine if we need to deduct or restore stock
    const shouldDeductStock = status === 'draft' && next === 'sent'
    const shouldRestoreStock = (status === 'paid' || status === 'sent') && next === 'draft'

    if (shouldDeductStock || shouldRestoreStock) {
      // Fetch invoice line items with their product details
      const { data: items } = await supabase
        .from('invoice_items')
        .select('product_id, quantity')
        .eq('invoice_id', id)
        .not('product_id', 'is', null)

      // Fetch the invoice to get business_id and user_id
      const { data: invoice } = await supabase
        .from('invoices')
        .select('business_id, user_id')
        .eq('id', id)
        .single()

      if (items && invoice) {
        for (const item of items) {
          // Get current product stock and cost
          const { data: product } = await supabase
            .from('business_products')
            .select('stock_quantity, cost_price')
            .eq('id', item.product_id)
            .single()

          if (!product) continue

          const movementType = shouldDeductStock ? 'out' : 'in'
          const newQty = shouldDeductStock
            ? product.stock_quantity - item.quantity
            : product.stock_quantity + item.quantity

          // Record the stock movement
          await supabase.from('stock_movements').insert({
            business_id: invoice.business_id,
            user_id: invoice.user_id,
            product_id: item.product_id,
            type: movementType,
            quantity: item.quantity,
            cost_price: product.cost_price || 0,
            reason: shouldDeductStock ? 'sale' : 'adjustment',
            note: shouldDeductStock
              ? `Auto-deducted: invoice marked as sent`
              : `Auto-restored: invoice reverted to draft`,
            invoice_id: id,
          })

          // Update product stock quantity
          await supabase
            .from('business_products')
            .update({ stock_quantity: newQty })
            .eq('id', item.product_id)
        }
      }
    }

    await supabase.from('invoices').update({ status: next, updated_at: new Date().toISOString() }).eq('id', id)
    router.refresh()
    setLoading(false)
  }

  const handleDelete = async () => {
    setLoading(true)

    // If invoice was sent/paid/overdue (stock was deducted), restore stock before deleting
    const stockDeductedStatuses = ['sent', 'paid', 'overdue']
    if (stockDeductedStatuses.includes(status)) {
      const { data: items } = await supabase
        .from('invoice_items')
        .select('product_id, quantity')
        .eq('invoice_id', id)
        .not('product_id', 'is', null)

      const { data: invoice } = await supabase
        .from('invoices')
        .select('business_id, user_id')
        .eq('id', id)
        .single()

      if (items && invoice) {
        for (const item of items) {
          const { data: product } = await supabase
            .from('business_products')
            .select('stock_quantity, cost_price')
            .eq('id', item.product_id)
            .single()

          if (!product) continue

          await supabase.from('stock_movements').insert({
            business_id: invoice.business_id,
            user_id: invoice.user_id,
            product_id: item.product_id,
            type: 'in',
            quantity: item.quantity,
            cost_price: product.cost_price || 0,
            reason: 'adjustment',
            note: 'Auto-restored: invoice deleted',
            invoice_id: id,
          })

          await supabase
            .from('business_products')
            .update({ stock_quantity: product.stock_quantity + item.quantity })
            .eq('id', item.product_id)
        }
      }
    }

    await supabase.from('invoices').update({ is_active: false }).eq('id', id)
    router.push('/business/invoices')
  }

  const transitions = TRANSITIONS[status] ?? []

  return (
    <div className="flex items-center gap-2">
      {transitions.map(t => (
        <button key={t.next} onClick={() => handleStatus(t.next)} disabled={loading}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${t.color}`}>
          {t.label}
        </button>
      ))}
      {!showDelete ? (
        <button onClick={() => setShowDelete(true)} className="text-sm text-red-500 hover:text-red-700 px-2">
          Delete
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Sure?</span>
          <button onClick={handleDelete} disabled={loading} className="text-xs text-red-600 font-medium hover:underline">Yes</button>
          <button onClick={() => setShowDelete(false)} className="text-xs text-gray-400 hover:underline">No</button>
        </div>
      )}
    </div>
  )
}

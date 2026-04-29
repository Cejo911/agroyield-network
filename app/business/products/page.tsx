'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/components/Toast'
import { getBusinessAccess } from '@/lib/business-access'
import { getActiveBusinessId } from '@/lib/business-cookie'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type Product = {
  id: string
  name: string
  description: string | null
  unit: string
  unit_price: number
  cost_price: number
  stock_quantity: number
  low_stock_threshold: number
  is_active: boolean
}

type StockMovement = {
  id: string
  product_id: string
  type: string
  quantity: number
  cost_price: number | null
  reason: string
  note: string | null
  invoice_id: string | null
  created_at: string | null
}

const PREDEFINED_UNITS = ['unit', 'bag', 'kg', 'litre', 'tonne', 'carton', 'piece', 'crate', 'bundle', 'dozen', 'service']

export default function ProductsPage() {
  const supabase = createClient() as SupabaseClient<Database>
  const { showError } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Product form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', unit: 'unit', customUnit: '', unit_price: '', cost_price: '', low_stock_threshold: '5' })
  const [useCustomUnit, setUseCustomUnit] = useState(false)

  // Stock movement state
  const [showStockModal, setShowStockModal] = useState(false)
  const [stockProduct, setStockProduct] = useState<Product | null>(null)
  const [stockForm, setStockForm] = useState({ type: 'in' as 'in' | 'out', quantity: '', cost_price: '', reason: 'purchase', note: '' })
  const [stockSaving, setStockSaving] = useState(false)

  // Stock history state
  const [showHistory, setShowHistory] = useState(false)
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null)
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Mount-once load — same canonical pattern as business/assets/page.tsx.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const access = await getBusinessAccess(supabase, user.id, getActiveBusinessId())
    if (!access) { setLoading(false); return }
    setBusinessId(access.businessId)
    const { data } = await supabase.from('business_products').select('*').eq('business_id', access.businessId).eq('is_active', true).order('name')
    setProducts((data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      unit: p.unit ?? 'unit',
      unit_price: p.unit_price,
      cost_price: p.cost_price ?? 0,
      stock_quantity: p.stock_quantity ?? 0,
      low_stock_threshold: p.low_stock_threshold ?? 5,
      is_active: p.is_active,
    })))
    setLoading(false)
  }

  // ── Product CRUD ──────────────────────────────────────────────

  const openNew = () => {
    setEditingId(null)
    setForm({ name: '', description: '', unit: 'unit', customUnit: '', unit_price: '', cost_price: '', low_stock_threshold: '5' })
    setUseCustomUnit(false)
    setShowForm(true)
  }

  const openEdit = (p: Product) => {
    setEditingId(p.id)
    const isPredefined = PREDEFINED_UNITS.includes(p.unit)
    setForm({
      name: p.name,
      description: p.description ?? '',
      unit: isPredefined ? p.unit : 'custom',
      customUnit: isPredefined ? '' : p.unit,
      unit_price: String(p.unit_price),
      cost_price: String(p.cost_price || ''),
      low_stock_threshold: String(p.low_stock_threshold),
    })
    setUseCustomUnit(!isPredefined)
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || !userId) return
    setSaving(true)
    const finalUnit = useCustomUnit ? form.customUnit.trim().toLowerCase() : form.unit
    const payload = {
      name: form.name,
      description: form.description || null,
      unit: finalUnit,
      unit_price: parseFloat(form.unit_price) || 0,
      cost_price: parseFloat(form.cost_price) || 0,
      low_stock_threshold: parseFloat(form.low_stock_threshold) || 5,
      updated_at: new Date().toISOString(),
    }
    if (editingId) {
      await supabase.from('business_products').update(payload).eq('id', editingId)
    } else {
      await supabase.from('business_products').insert({ ...payload, business_id: businessId, user_id: userId })
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this product?')) return
    await supabase.from('business_products').update({ is_active: false }).eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  // ── Stock Movement ────────────────────────────────────────────

  const openStockModal = (p: Product, type: 'in' | 'out') => {
    setStockProduct(p)
    setStockForm({
      type,
      quantity: '',
      cost_price: type === 'in' ? String(p.cost_price || '') : '',
      reason: type === 'in' ? 'purchase' : 'sale',
      note: '',
    })
    setShowStockModal(true)
  }

  const handleStockSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stockProduct || !businessId || !userId) return
    const qty = parseFloat(stockForm.quantity)
    if (!qty || qty <= 0) return

    // For stock out, check if sufficient stock
    if (stockForm.type === 'out' && qty > stockProduct.stock_quantity) {
      showError(`Insufficient stock. Available: ${stockProduct.stock_quantity} ${stockProduct.unit}`)
      return
    }

    setStockSaving(true)

    // Insert stock movement
    await supabase.from('stock_movements').insert({
      business_id: businessId,
      user_id: userId,
      product_id: stockProduct.id,
      type: stockForm.type,
      quantity: qty,
      cost_price: parseFloat(stockForm.cost_price) || 0,
      reason: stockForm.reason,
      note: stockForm.note || null,
    })

    // Update product stock quantity and cost price (for stock in)
    const newQty = stockForm.type === 'in'
      ? stockProduct.stock_quantity + qty
      : stockProduct.stock_quantity - qty

    const updatePayload: Database['public']['Tables']['business_products']['Update'] = { stock_quantity: newQty }
    if (stockForm.type === 'in' && parseFloat(stockForm.cost_price) > 0) {
      updatePayload.cost_price = parseFloat(stockForm.cost_price)
    }

    await supabase.from('business_products').update(updatePayload).eq('id', stockProduct.id)

    setStockSaving(false)
    setShowStockModal(false)
    load()
  }

  // ── Stock History ─────────────────────────────────────────────

  const openHistory = async (p: Product) => {
    setHistoryProduct(p)
    setHistoryLoading(true)
    setShowHistory(true)
    const { data } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', p.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setMovements((data ?? []) as StockMovement[])
    setHistoryLoading(false)
  }

  // ── Helpers ───────────────────────────────────────────────────

  const fmt = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const lowStockCount = products.filter(p => p.stock_quantity <= p.low_stock_threshold && p.unit !== 'service').length

  const IN_REASONS = ['purchase', 'production', 'return', 'adjustment', 'other']
  const OUT_REASONS = ['sale', 'damaged', 'expired', 'adjustment', 'other']

  if (loading) return <div className="text-center py-10 text-gray-500">Loading...</div>

  if (!businessId) return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-8 text-center">
      <p className="text-gray-500 dark:text-gray-400">Set up your business profile first.</p>
      <a href="/business/setup" className="mt-3 inline-block text-green-600 font-medium hover:underline">Go to Setup →</a>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products & Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {products.length} product{products.length !== 1 ? 's' : ''} · Total inventory value: {fmt(products.reduce((s, p) => s + (p.stock_quantity * (p.cost_price || p.unit_price)), 0))}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 flex-1 sm:w-56"
          />
          <button onClick={openNew} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors whitespace-nowrap">
            + Add Product
          </button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-800 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-orange-600 text-lg">⚠️</span>
          <p className="text-sm text-orange-900 dark:text-orange-300 font-medium">
            {lowStockCount} product{lowStockCount !== 1 ? 's' : ''} {lowStockCount !== 1 ? 'are' : 'is'} running low on stock
          </p>
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{editingId ? 'Edit Product' : 'New Product'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product / Service Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. Maize (50kg bag)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Optional details"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                <div className="flex gap-2">
                  <select
                    value={useCustomUnit ? 'custom' : form.unit}
                    onChange={e => {
                      if (e.target.value === 'custom') {
                        setUseCustomUnit(true)
                        setForm(f => ({ ...f, unit: 'custom' }))
                      } else {
                        setUseCustomUnit(false)
                        setForm(f => ({ ...f, unit: e.target.value, customUnit: '' }))
                      }
                    }}
                    className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {PREDEFINED_UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                    <option value="custom">Custom unit…</option>
                  </select>
                  {useCustomUnit && (
                    <input
                      value={form.customUnit}
                      onChange={e => setForm(f => ({ ...f, customUnit: e.target.value }))}
                      required
                      className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g. basket"
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Selling Price (₦) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.unit_price}
                    onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
                    required
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cost Price (₦)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost_price}
                    onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Low Stock Alert Threshold</label>
                <input
                  type="number"
                  min="0"
                  value={form.low_stock_threshold}
                  onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="5"
                />
                <p className="text-xs text-gray-500 mt-1">You&apos;ll be alerted when stock falls to or below this quantity</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Movement Modal */}
      {showStockModal && stockProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
              {stockForm.type === 'in' ? '📥 Stock In' : '📤 Stock Out'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {stockProduct.name} · Current stock: <strong className="text-gray-800 dark:text-white">{stockProduct.stock_quantity} {stockProduct.unit}</strong>
            </p>
            <form onSubmit={handleStockSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity ({stockProduct.unit}) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={stockForm.quantity}
                  onChange={e => setStockForm(f => ({ ...f, quantity: e.target.value }))}
                  required
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0"
                  autoFocus
                />
              </div>
              {stockForm.type === 'in' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cost Price per {stockProduct.unit} (₦)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={stockForm.cost_price}
                    onChange={e => setStockForm(f => ({ ...f, cost_price: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason *</label>
                <select
                  value={stockForm.reason}
                  onChange={e => setStockForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {(stockForm.type === 'in' ? IN_REASONS : OUT_REASONS).map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note</label>
                <input
                  value={stockForm.note}
                  onChange={e => setStockForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Optional note"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={stockSaving}
                  className={`flex-1 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors ${
                    stockForm.type === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  {stockSaving ? 'Saving...' : stockForm.type === 'in' ? 'Record Stock In' : 'Record Stock Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock History Modal */}
      {showHistory && historyProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Stock History</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{historyProduct.name} · Current: {historyProduct.stock_quantity} {historyProduct.unit}</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
            </div>
            {historyLoading ? (
              <p className="text-center text-gray-500 py-8">Loading…</p>
            ) : movements.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No stock movements recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {movements.map(m => (
                  <div key={m.id} className="flex items-center justify-between border border-gray-100 dark:border-gray-800 rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${m.type === 'in' ? 'text-green-600' : 'text-red-500'}`}>
                        {m.type === 'in' ? '+' : '−'}{m.quantity}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white capitalize">{m.reason}</p>
                        {m.note && <p className="text-xs text-gray-500">{m.note}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      {m.cost_price !== null && m.cost_price > 0 && <p className="text-xs text-gray-500">{fmt(m.cost_price)}/{historyProduct.unit}</p>}
                      {m.created_at && <p className="text-xs text-gray-500">{new Date(m.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-10 text-center">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-gray-500 dark:text-gray-400 mb-4">No products yet. Add your first product or service.</p>
          <button onClick={openNew} className="text-green-600 font-medium hover:underline text-sm">+ Add Product</button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <table className="w-full text-sm hidden md:table">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Product / Service</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Unit</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Cost</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Selling Price</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Stock</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filteredProducts.map(p => {
                const isLow = p.unit !== 'service' && p.stock_quantity <= p.low_stock_threshold
                const isOut = p.unit !== 'service' && p.stock_quantity === 0
                return (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 dark:text-white">{p.name}</p>
                      {p.description && <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.unit}</td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{p.cost_price ? fmt(p.cost_price) : '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-white">{fmt(p.unit_price)}</td>
                    <td className="px-4 py-3 text-center">
                      {p.unit === 'service' ? (
                        <span className="text-xs text-gray-500">N/A</span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span className={`font-semibold ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-800 dark:text-white'}`}>
                            {p.stock_quantity}
                          </span>
                          {isOut && <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 px-1.5 py-0.5 rounded-full">OUT</span>}
                          {isLow && !isOut && <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-1.5 py-0.5 rounded-full">LOW</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {p.unit !== 'service' && (
                        <>
                          <button onClick={() => openStockModal(p, 'in')} className="text-xs text-green-600 hover:underline mr-2">+In</button>
                          <button onClick={() => openStockModal(p, 'out')} className="text-xs text-orange-600 hover:underline mr-2">−Out</button>
                          <button onClick={() => openHistory(p)} className="text-xs text-gray-500 hover:underline mr-2">History</button>
                        </>
                      )}
                      <button onClick={() => openEdit(p)} className="text-xs text-blue-600 hover:underline mr-2">Edit</button>
                      <button onClick={() => handleDelete(p.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {filteredProducts.map(p => {
              const isLow = p.unit !== 'service' && p.stock_quantity <= p.low_stock_threshold
              const isOut = p.unit !== 'service' && p.stock_quantity === 0
              return (
                <div key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-white truncate">{p.name}</p>
                      {p.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{p.description}</p>}
                    </div>
                    {p.unit !== 'service' && (
                      <div className="flex items-center gap-1.5 ml-3">
                        <span className={`text-sm font-bold ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-800 dark:text-white'}`}>
                          {p.stock_quantity}
                        </span>
                        <span className="text-xs text-gray-500">{p.unit}</span>
                        {isOut && <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 px-1.5 py-0.5 rounded-full">OUT</span>}
                        {isLow && !isOut && <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-1.5 py-0.5 rounded-full">LOW</span>}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    {p.cost_price > 0 && (
                      <div>
                        <span className="text-gray-500">Cost:</span>{' '}
                        <span className="text-gray-600 dark:text-gray-300">{fmt(p.cost_price)}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Price:</span>{' '}
                      <span className="font-medium text-gray-800 dark:text-white">{fmt(p.unit_price)}</span>
                    </div>
                    {p.unit === 'service' && (
                      <span className="text-gray-500">Service</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    {p.unit !== 'service' && (
                      <>
                        <button onClick={() => openStockModal(p, 'in')} className="text-xs font-medium text-green-600 hover:underline">+In</button>
                        <button onClick={() => openStockModal(p, 'out')} className="text-xs font-medium text-orange-600 hover:underline">−Out</button>
                        <button onClick={() => openHistory(p)} className="text-xs text-gray-500 hover:underline">History</button>
                      </>
                    )}
                    <button onClick={() => openEdit(p)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

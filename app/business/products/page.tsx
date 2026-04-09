'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Product = {
  id: string
  name: string
  description: string | null
  unit: string
  unit_price: number
  is_active: boolean
}

export default function ProductsPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', unit: 'unit', unit_price: '' })

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: biz } = await supabase.from('businesses').select('id').eq('user_id', user.id).single()
    if (!biz) { setLoading(false); return }
    setBusinessId(biz.id)
    const { data } = await supabase.from('business_products').select('*').eq('business_id', biz.id).eq('is_active', true).order('name')
    setProducts(data ?? [])
    setLoading(false)
  }

  const openNew = () => {
    setEditingId(null)
    setForm({ name: '', description: '', unit: 'unit', unit_price: '' })
    setShowForm(true)
  }

  const openEdit = (p: Product) => {
    setEditingId(p.id)
    setForm({ name: p.name, description: p.description ?? '', unit: p.unit, unit_price: String(p.unit_price) })
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      name: form.name,
      description: form.description || null,
      unit: form.unit,
      unit_price: parseFloat(form.unit_price) || 0,
      updated_at: new Date().toISOString(),
    }
    if (editingId) {
      await supabase.from('business_products').update(payload).eq('id', editingId)
    } else {
      await supabase.from('business_products').insert({ ...payload, business_id: businessId, user_id: user!.id })
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

  const fmt = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>

  if (!businessId) return (
    <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
      <p className="text-gray-500">Set up your business profile first.</p>
      <a href="/business/setup" className="mt-3 inline-block text-green-600 font-medium hover:underline">Go to Setup →</a>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products & Services</h1>
        <button onClick={openNew} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
          + Add Product
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">{editingId ? 'Edit Product' : 'New Product'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product / Service Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. Maize (50kg bag)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Optional details" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    {['unit', 'bag', 'kg', 'litre', 'tonne', 'carton', 'piece', 'service'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₦) *</label>
                  <input type="number" min="0" step="0.01" value={form.unit_price}
                    onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product List */}
      {products.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-gray-500 mb-4">No products yet. Add your first product or service.</p>
          <button onClick={openNew} className="text-green-600 font-medium hover:underline text-sm">+ Add Product</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Product / Service</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Unit</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Unit Price</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{p.name}</p>
                    {p.description && <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.unit}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">{fmt(p.unit_price)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(p)} className="text-xs text-blue-600 hover:underline mr-3">Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

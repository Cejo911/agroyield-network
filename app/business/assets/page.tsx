'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getBusinessAccess } from '@/lib/business-access'
import { getActiveBusinessId } from '@/lib/business-cookie'

type Asset = {
  id: string
  name: string
  category: string
  description: string | null
  serial_number: string | null
  tag_number: string | null
  purchase_date: string | null
  purchase_price: number
  current_value: number
  location: string | null
  condition: string
  assigned_to: string | null
  photo_url: string | null
  status: string
  notes: string | null
  created_at: string
}

const CATEGORIES = [
  'Vehicles & Transport',
  'Machinery & Equipment',
  'Furniture & Fittings',
  'Electronics & IT',
]

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor']

const STATUSES = ['active', 'disposed', 'sold', 'written_off']

const STATUS_STYLES: Record<string, string> = {
  active:     'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  disposed:   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  sold:       'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  written_off:'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

const CONDITION_STYLES: Record<string, string> = {
  Excellent: 'text-green-600 dark:text-green-400',
  Good:      'text-blue-600 dark:text-blue-400',
  Fair:      'text-amber-600 dark:text-amber-400',
  Poor:      'text-red-600 dark:text-red-400',
}

const CATEGORY_ICONS: Record<string, string> = {
  'Vehicles & Transport':   '🚗',
  'Machinery & Equipment':  '⚙️',
  'Furniture & Fittings':   '🪑',
  'Electronics & IT':       '💻',
}

const emptyForm = {
  name: '',
  category: 'Machinery & Equipment',
  description: '',
  serial_number: '',
  tag_number: '',
  purchase_date: '',
  purchase_price: '',
  current_value: '',
  location: '',
  condition: 'Good',
  assigned_to: '',
  notes: '',
}

export default function AssetsPage() {
  const supabase = createClient()
  const [assets, setAssets] = useState<Asset[]>([])
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('active')

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  // Detail view
  const [viewAsset, setViewAsset] = useState<Asset | null>(null)

  // Mount-once effect: load() reads from supabase + cookie state and is
  // recreated each render, but we deliberately want it called exactly once
  // on mount. Adding `load` to deps would loop; wrapping in useCallback
  // would just push the same problem into another dep list. The intent
  // is "fire once after mount" — the canonical escape hatch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const access = await getBusinessAccess(supabase, user.id, getActiveBusinessId())
    if (!access) { setLoading(false); return }
    setBusinessId(access.businessId)
    const { data } = await supabase
      .from('business_assets')
      .select('*')
      .eq('business_id', access.businessId)
      .order('created_at', { ascending: false })
    setAssets(data ?? [])
    setLoading(false)
  }

  // ── CRUD ──────────────────────────────────────────────────────

  const openNew = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (a: Asset) => {
    setEditingId(a.id)
    setForm({
      name: a.name,
      category: a.category,
      description: a.description ?? '',
      serial_number: a.serial_number ?? '',
      tag_number: a.tag_number ?? '',
      purchase_date: a.purchase_date ?? '',
      purchase_price: String(a.purchase_price || ''),
      current_value: String(a.current_value || ''),
      location: a.location ?? '',
      condition: a.condition,
      assigned_to: a.assigned_to ?? '',
      notes: a.notes ?? '',
    })
    setShowForm(true)
    setViewAsset(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || !userId) return
    setSaving(true)
    const purchasePrice = parseFloat(form.purchase_price) || 0
    const payload = {
      name: form.name,
      category: form.category,
      description: form.description || null,
      serial_number: form.serial_number || null,
      tag_number: form.tag_number || null,
      purchase_date: form.purchase_date || null,
      purchase_price: purchasePrice,
      current_value: parseFloat(form.current_value) || purchasePrice,
      location: form.location || null,
      condition: form.condition,
      assigned_to: form.assigned_to || null,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    }
    if (editingId) {
      await supabase.from('business_assets').update(payload).eq('id', editingId)
    } else {
      await supabase.from('business_assets').insert({ ...payload, business_id: businessId, user_id: userId, status: 'active' })
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    await supabase.from('business_assets').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id)
    setViewAsset(null)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently remove this asset record?')) return
    await supabase.from('business_assets').delete().eq('id', id)
    setViewAsset(null)
    load()
  }

  // ── Helpers ───────────────────────────────────────────────────

  const fmt = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const filtered = assets.filter(a => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (a.serial_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (a.tag_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (a.assigned_to ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'All' || a.category === categoryFilter
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  // Summary stats
  const activeAssets = assets.filter(a => a.status === 'active')
  const totalPurchaseValue = activeAssets.reduce((s, a) => s + (a.purchase_price || 0), 0)
  const totalCurrentValue = activeAssets.reduce((s, a) => s + (a.current_value || 0), 0)
  const categoryBreakdown = CATEGORIES.map(c => ({
    category: c,
    count: activeAssets.filter(a => a.category === c).length,
    icon: CATEGORY_ICONS[c],
  }))

  const inputClass = "w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
  const selectClass = "w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"

  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assets Register</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {activeAssets.length} active asset{activeAssets.length !== 1 ? 's' : ''} · Value: {fmt(totalCurrentValue)}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search assets…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 flex-1 sm:w-56"
          />
          <button onClick={openNew} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors whitespace-nowrap">
            + Add Asset
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {categoryBreakdown.map(c => (
          <button
            key={c.category}
            onClick={() => setCategoryFilter(categoryFilter === c.category ? 'All' : c.category)}
            className={`bg-white dark:bg-gray-900 rounded-xl border p-3 text-left transition-colors ${
              categoryFilter === c.category
                ? 'border-green-400 dark:border-green-600 ring-1 ring-green-400 dark:ring-green-600'
                : 'border-gray-200 dark:border-gray-800 hover:border-green-300 dark:hover:border-green-700'
            }`}
          >
            <div className="text-xl mb-1">{c.icon}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{c.category}</p>
            <p className="text-lg font-bold text-gray-800 dark:text-white">{c.count}</p>
          </button>
        ))}
      </div>

      {/* Value Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide mb-1">Total Assets</p>
          <p className="text-xl font-bold text-gray-800 dark:text-white">{activeAssets.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide mb-1">Purchase Value</p>
          <p className="text-xl font-bold text-gray-800 dark:text-white">{fmt(totalPurchaseValue)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide mb-1">Current Value</p>
          <p className={`text-xl font-bold ${totalCurrentValue < totalPurchaseValue ? 'text-amber-600' : 'text-green-600'}`}>
            {fmt(totalCurrentValue)}
          </p>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {['All', ...STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors capitalize whitespace-nowrap ${
              statusFilter === s
                ? 'bg-green-700 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {s === 'written_off' ? 'Written Off' : s}
          </button>
        ))}
      </div>

      {/* Asset Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{editingId ? 'Edit Asset' : 'Register New Asset'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className={labelClass}>Asset Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                  className={inputClass} placeholder="e.g. Toyota Hilux, Generator 10kVA" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Category *</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className={selectClass}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Condition</label>
                  <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                    className={selectClass}>
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className={inputClass} placeholder="Optional details about the asset" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Serial Number</label>
                  <input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))}
                    className={inputClass} placeholder="e.g. SN-12345" />
                </div>
                <div>
                  <label className={labelClass}>Tag / ID Number</label>
                  <input value={form.tag_number} onChange={e => setForm(f => ({ ...f, tag_number: e.target.value }))}
                    className={inputClass} placeholder="e.g. AST-001" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Purchase Date</label>
                  <input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))}
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Purchase Price (₦)</label>
                  <input type="number" min="0" step="0.01" value={form.purchase_price}
                    onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))}
                    className={inputClass} placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className={labelClass}>Current Value (₦)</label>
                <input type="number" min="0" step="0.01" value={form.current_value}
                  onChange={e => setForm(f => ({ ...f, current_value: e.target.value }))}
                  className={inputClass} placeholder="Leave blank to use purchase price" />
                <p className="text-xs text-gray-400 mt-1">Estimated current market or book value</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Location</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    className={inputClass} placeholder="e.g. Main Office, Warehouse" />
                </div>
                <div>
                  <label className={labelClass}>Assigned To</label>
                  <input value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                    className={inputClass} placeholder="e.g. Emeka, Operations" />
                </div>
              </div>

              <div>
                <label className={labelClass}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} className={`${inputClass} resize-none`} placeholder="Any additional notes about this asset" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Saving...' : editingId ? 'Update Asset' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Asset Detail Modal */}
      {viewAsset && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{viewAsset.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{CATEGORY_ICONS[viewAsset.category]} {viewAsset.category}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[viewAsset.status] || STATUS_STYLES.active}`}>
                    {viewAsset.status === 'written_off' ? 'Written Off' : viewAsset.status}
                  </span>
                </div>
              </div>
              <button onClick={() => setViewAsset(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
            </div>

            {viewAsset.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{viewAsset.description}</p>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              {viewAsset.serial_number && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Serial No.</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{viewAsset.serial_number}</p>
                </div>
              )}
              {viewAsset.tag_number && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Tag / ID</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{viewAsset.tag_number}</p>
                </div>
              )}
              {viewAsset.purchase_date && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Purchased</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{fmtDate(viewAsset.purchase_date)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Purchase Price</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white">{fmt(viewAsset.purchase_price)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Current Value</p>
                <p className={`text-sm font-bold ${viewAsset.current_value < viewAsset.purchase_price ? 'text-amber-600' : 'text-green-600'}`}>
                  {fmt(viewAsset.current_value)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Condition</p>
                <p className={`text-sm font-semibold ${CONDITION_STYLES[viewAsset.condition] || 'text-gray-800 dark:text-white'}`}>
                  {viewAsset.condition}
                </p>
              </div>
              {viewAsset.location && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Location</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{viewAsset.location}</p>
                </div>
              )}
              {viewAsset.assigned_to && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Assigned To</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{viewAsset.assigned_to}</p>
                </div>
              )}
            </div>

            {viewAsset.notes && (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mb-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{viewAsset.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => openEdit(viewAsset)}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  Edit
                </button>
                {viewAsset.status === 'active' && (
                  <>
                    <button onClick={() => handleStatusChange(viewAsset.id, 'disposed')}
                      className="text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      Mark Disposed
                    </button>
                    <button onClick={() => handleStatusChange(viewAsset.id, 'sold')}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                      Mark Sold
                    </button>
                    <button onClick={() => handleStatusChange(viewAsset.id, 'written_off')}
                      className="text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      Write Off
                    </button>
                  </>
                )}
                {viewAsset.status !== 'active' && (
                  <button onClick={() => handleStatusChange(viewAsset.id, 'active')}
                    className="text-xs font-medium text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                    Reactivate
                  </button>
                )}
                <button onClick={() => handleDelete(viewAsset.id)}
                  className="text-xs font-medium text-red-500 hover:text-red-700 px-3 py-1.5 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Asset List */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-10 text-center">
          <div className="text-4xl mb-3">🏗️</div>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {assets.length === 0 ? 'No assets registered yet. Add your first asset.' : 'No assets match your filters.'}
          </p>
          {assets.length === 0 && (
            <button onClick={openNew} className="text-green-600 font-medium hover:underline text-sm">+ Register Asset</button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <table className="w-full text-sm hidden md:table">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Asset</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Category</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Condition</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Purchase Price</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Current Value</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => setViewAsset(a)}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 dark:text-white">{a.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {a.tag_number && <span className="text-xs text-gray-400">{a.tag_number}</span>}
                      {a.location && <span className="text-xs text-gray-400">· {a.location}</span>}
                      {a.assigned_to && <span className="text-xs text-gray-400">· {a.assigned_to}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    <span className="mr-1">{CATEGORY_ICONS[a.category]}</span>{a.category}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold ${CONDITION_STYLES[a.condition] || ''}`}>{a.condition}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{fmt(a.purchase_price)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-white">{fmt(a.current_value)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[a.status] || STATUS_STYLES.active}`}>
                      {a.status === 'written_off' ? 'Written Off' : a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(a)} className="text-xs text-blue-600 hover:underline mr-2">Edit</button>
                    <button onClick={() => handleDelete(a.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map(a => (
              <div key={a.id} className="p-4 space-y-2" onClick={() => setViewAsset(a)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-white truncate">{a.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{CATEGORY_ICONS[a.category]} {a.category}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ml-2 ${STATUS_STYLES[a.status] || STATUS_STYLES.active}`}>
                    {a.status === 'written_off' ? 'W/O' : a.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-gray-400">Value:</span>{' '}
                    <span className="font-medium text-gray-800 dark:text-white">{fmt(a.current_value)}</span>
                  </div>
                  <span className={`font-semibold ${CONDITION_STYLES[a.condition] || ''}`}>{a.condition}</span>
                  {a.location && <span className="text-gray-400 truncate">{a.location}</span>}
                </div>

                {(a.tag_number || a.assigned_to) && (
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {a.tag_number && <span>{a.tag_number}</span>}
                    {a.assigned_to && <span>→ {a.assigned_to}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

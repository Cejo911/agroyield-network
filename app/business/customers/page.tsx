'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getBusinessAccess } from '@/lib/business-access'
import { getActiveBusinessId } from '@/lib/business-cookie'

type Customer = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
}

export default function CustomersPage() {
  const supabase = createClient()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' })

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const access = await getBusinessAccess(supabase, user.id, getActiveBusinessId())
    if (!access) { setLoading(false); return }
    setBusinessId(access.businessId)
    const { data } = await supabase.from('customers').select('*').eq('business_id', access.businessId).eq('is_active', true).order('name')
    setCustomers(data ?? [])
    setLoading(false)
  }

  const openNew = () => {
    setEditingId(null)
    setForm({ name: '', email: '', phone: '', address: '' })
    setShowForm(true)
  }

  const openEdit = (c: Customer) => {
    setEditingId(c.id)
    setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '' })
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      updated_at: new Date().toISOString(),
    }
    if (editingId) {
      await supabase.from('customers').update(payload).eq('id', editingId)
    } else {
      await supabase.from('customers').insert({ ...payload, business_id: businessId, user_id: user!.id })
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this customer?')) return
    await supabase.from('customers').update({ is_active: false }).eq('id', id)
    setCustomers(prev => prev.filter(c => c.id !== id))
  }
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').toLowerCase().includes(search.toLowerCase())
  )
  
  
  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>

  if (!businessId) return (
    <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
      <p className="text-gray-500">Set up your business profile first.</p>
      <a href="/business/setup" className="mt-3 inline-block text-green-600 font-medium hover:underline">Go to Setup →</a>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search customers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 flex-1 sm:w-56"
          />
          <button onClick={openNew} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors whitespace-nowrap">
            + Add
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{editingId ? 'Edit Customer' : 'New Customer'}</h2>
          <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. Emeka Trading Co." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="customer@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="+234..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Street, City, State" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-gray-500 mb-4">No customers yet. Add your first customer.</p>
          <button onClick={openNew} className="text-green-600 font-medium hover:underline text-sm">+ Add Customer</button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <table className="w-full text-sm hidden md:table">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Address</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filteredCustomers.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {c.email && <p>{c.email}</p>}
                    {c.phone && <p>{c.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{c.address ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <a href={`/business/customers/${c.id}/statement`} className="text-xs text-green-600 hover:underline mr-3">Statement</a>
                    <button onClick={() => openEdit(c)} className="text-xs text-blue-600 hover:underline mr-3">Edit</button>
                    <button onClick={() => handleDelete(c.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {filteredCustomers.map(c => (
              <div key={c.id} className="p-4 space-y-2">
                <p className="font-medium text-gray-800 dark:text-white">{c.name}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                  {c.phone && <span>{c.phone}</span>}
                  {c.email && <span className="truncate max-w-[200px]">{c.email}</span>}
                  {c.address && <span className="truncate max-w-[200px]">{c.address}</span>}
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <a href={`/business/customers/${c.id}/statement`} className="text-xs font-medium text-green-600 hover:underline">Statement</a>
                  <button onClick={() => openEdit(c)} className="text-xs text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(c.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

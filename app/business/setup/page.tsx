'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function BusinessSetup() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', address: '', phone: '', email: '',
    bank_name: '', account_name: '', account_number: '', invoice_prefix: 'INV',
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('businesses').select('*').eq('user_id', user.id).single()
      if (data) {
        setBusinessId(data.id)
        setForm({
          name: data.name ?? '',
          address: data.address ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          bank_name: data.bank_name ?? '',
          account_name: data.account_name ?? '',
          account_number: data.account_number ?? '',
          invoice_prefix: data.invoice_prefix ?? 'INV',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (businessId) {
      await supabase.from('businesses').update({ ...form, updated_at: new Date().toISOString() }).eq('id', businessId)
    } else {
      await supabase.from('businesses').insert({ ...form, user_id: user.id })
    }
    setSaving(false)
    router.push('/business')
    router.refresh()
  }

  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  )

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {businessId ? 'Business Settings' : 'Set Up Your Business'}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Business Details</h2>
          {field('Business Name *', 'name', 'text', 'e.g. Chidi Farms Ltd')}
          {field('Address', 'address', 'text', 'Street, City, State')}
          {field('Phone', 'phone', 'tel', '+234...')}
          {field('Email', 'email', 'email', 'info@yourbusiness.com')}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Bank Details</h2>
          {field('Bank Name', 'bank_name', 'text', 'e.g. Access Bank')}
          {field('Account Name', 'account_name', 'text', 'Name on account')}
          {field('Account Number', 'account_number', 'text', '0123456789')}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Invoice Settings</h2>
          {field('Invoice Prefix', 'invoice_prefix', 'text', 'e.g. INV, AGY, CF')}
          <p className="text-xs text-gray-400">
            Invoices will be numbered: {form.invoice_prefix || 'INV'}-0001, {form.invoice_prefix || 'INV'}-0002...
          </p>
        </div>

        <button
          type="submit"
          disabled={saving || !form.name}
          className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : businessId ? 'Save Changes' : 'Create Business'}
        </button>
      </form>
    </div>
  )
}

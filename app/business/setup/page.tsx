'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function BusinessSetup() {
  const supabase = createClient()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', address: '', phone: '', email: '',
    bank_name: '', account_name: '', account_number: '',
    invoice_prefix: 'INV', logo_url: '',
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
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
          logo_url: data.logo_url ?? '',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}/logo.${ext}`
    const { error } = await supabase.storage
      .from('business-logos')
      .upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from('business-logos')
        .getPublicUrl(path)
      setForm(f => ({ ...f, logo_url: publicUrl }))
    }
    setUploading(false)
  }

  const handleRemoveLogo = () => setForm(f => ({ ...f, logo_url: '' }))

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
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {businessId ? 'Business Settings' : 'Set Up Your Business'}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Logo */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-white">Business Logo</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="w-20 h-20 object-contain rounded-lg border border-gray-100" />
            ) : (
              <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-3xl">
                🏪
              </div>
            )}
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="block border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : form.logo_url ? 'Change Logo' : 'Upload Logo'}
              </button>
              {form.logo_url && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="block text-xs text-red-500 hover:underline"
                >
                  Remove logo
                </button>
              )}
              <p className="text-xs text-gray-400">PNG, JPG or SVG. Appears on invoices.</p>
            </div>
          </div>
        </div>

        {/* Business Details */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-white">Business Details</h2>
          {field('Business Name *', 'name', 'text', 'e.g. Chidi Farms Ltd')}
          {field('Address', 'address', 'text', 'Street, City, State')}
          {field('Phone', 'phone', 'tel', '+234...')}
          {field('Email', 'email', 'email', 'info@yourbusiness.com')}
        </div>

        {/* Bank Details */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-white">Bank Details</h2>
          {field('Bank Name', 'bank_name', 'text', 'e.g. Access Bank')}
          {field('Account Name', 'account_name', 'text', 'Name on account')}
          {field('Account Number', 'account_number', 'text', '0123456789')}
        </div>

        {/* Invoice Settings */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-white">Invoice Settings</h2>
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

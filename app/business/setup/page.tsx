'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { getBusinessAccess } from '@/lib/business-access'
import { getActiveBusinessId, setActiveBusinessId } from '@/lib/business-cookie'
import BusinessSetupGuide from './BusinessSetupGuide'
import BusinessLogo from '@/app/components/design/BusinessLogo'

/** Wrapper with Suspense boundary — required by Next.js for useSearchParams */
export default function BusinessSetupPage() {
  return (
    <Suspense fallback={<div className="text-center py-10 text-gray-400">Loading...</div>}>
      <BusinessSetup />
    </Suspense>
  )
}

/** Nigerian banks — CBN-licensed commercial banks + popular fintechs/mobile money */
const NIGERIAN_BANKS = [
  'Access Bank',
  'Citibank Nigeria',
  'Ecobank Nigeria',
  'Fidelity Bank',
  'First Bank of Nigeria',
  'First City Monument Bank (FCMB)',
  'Globus Bank',
  'Guaranty Trust Bank (GTBank)',
  'Heritage Bank',
  'Jaiz Bank',
  'Keystone Bank',
  'Kuda Bank',
  'Lotus Bank',
  'Moniepoint',
  'OPay',
  'Optimus Bank',
  'PalmPay',
  'Parallex Bank',
  'Polaris Bank',
  'Premium Trust Bank',
  'Providus Bank',
  'Stanbic IBTC Bank',
  'Standard Chartered Bank',
  'Sterling Bank',
  'SunTrust Bank',
  'TAJBank',
  'Titan Trust Bank',
  'Union Bank of Nigeria',
  'United Bank for Africa (UBA)',
  'Unity Bank',
  'VFD Microfinance Bank',
  'Wema Bank',
  'Zenith Bank',
]

const SECTORS = [
  'Crop Farming',
  'Livestock & Poultry',
  'Fisheries & Aquaculture',
  'Agro-Processing',
  'Input Supply',
  'Equipment & Machinery',
  'Transport & Logistics',
  'Trading & Export',
  'Consulting & Advisory',
  'Other',
]

const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe',
  'Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara',
  'Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau',
  'Rivers','Sokoto','Taraba','Yobe','Zamfara',
]

const BUSINESS_SIZES = [
  'Micro (1-9 staff)',
  'Small (10-49 staff)',
  'Medium (50-199 staff)',
  'Large (200+ staff)',
]

function BusinessSetup() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNewMode = searchParams.get('new') === 'true'
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const coverFileRef = useRef<HTMLInputElement>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [customBank, setCustomBank] = useState(false)
  const [form, setForm] = useState({
    name: '', address: '', phone: '', alt_phone: '', whatsapp: '', email: '',
    cac_number: '', vat_tin: '',
    bank_name: '', account_name: '', account_number: '',
    invoice_prefix: 'INV', logo_url: '',
    sector: '', state: '', business_size: '',
    // Showcase — powers /b/{slug} public marketing page
    tagline: '', about: '', cover_image_url: '',
    website: '', instagram: '', facebook: '',
    opening_hours: '', founded_year: '',
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // In "new business" mode, skip loading the existing business — show blank form
      if (!isNewMode) {
        const access = await getBusinessAccess(supabase, user.id, getActiveBusinessId())
        const { data } = access
          ? await supabase.from('businesses').select('*').eq('id', access.businessId).single()
          : { data: null }
        if (data) {
          setBusinessId(data.id)
          const bankName = data.bank_name ?? ''
          setForm({
            name: data.name ?? '',
            address: data.address ?? '',
            phone: data.phone ?? '',
            alt_phone: data.alt_phone ?? '',
            whatsapp: data.whatsapp ?? '',
            email: data.email ?? '',
            cac_number: data.cac_number ?? '',
            vat_tin: data.vat_tin ?? '',
            bank_name: bankName,
            account_name: data.account_name ?? '',
            account_number: data.account_number ?? '',
            invoice_prefix: data.invoice_prefix ?? 'INV',
            logo_url: data.logo_url ?? '',
            sector: data.sector ?? '',
            state: data.state ?? '',
            business_size: data.business_size ?? '',
            tagline: data.tagline ?? '',
            about: data.about ?? '',
            cover_image_url: data.cover_image_url ?? '',
            website: data.website ?? '',
            instagram: data.instagram ?? '',
            facebook: data.facebook ?? '',
            opening_hours: data.opening_hours ?? '',
            founded_year: data.founded_year != null ? String(data.founded_year) : '',
          })
          // If existing bank name isn't in the standard list, show custom input
          if (bankName && !NIGERIAN_BANKS.includes(bankName)) {
            setCustomBank(true)
          }
        }
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      // Use businessId if editing, or a timestamp for new businesses (will be unique)
      const folder = businessId || `${userId}/new_${Date.now()}`
      const path = `${folder}/logo.${ext}`
      const { error } = await supabase.storage
        .from('business-logos')
        .upload(path, file, { upsert: true })
      if (error) {
        console.error('Logo upload error:', error)
        alert('Failed to upload logo: ' + error.message)
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('business-logos')
          .getPublicUrl(path)
        // Cache-buster: upsert writes to the same path, so the public URL is
        // stable and browsers + Supabase CDN keep serving the old bytes.
        // Appending ?v=<timestamp> forces a fresh fetch without changing the
        // underlying file name.
        setForm(f => ({ ...f, logo_url: `${publicUrl}?v=${Date.now()}` }))
      }
    } catch (err: unknown) {
      console.error('Logo upload exception:', err)
      alert('Upload failed — please try again.')
    }
    setUploading(false)
  }

  const handleRemoveLogo = () => setForm(f => ({ ...f, logo_url: '' }))
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploadingCover(true)
    try {
      const ext = file.name.split('.').pop()
      const folder = businessId || `${userId}/new_${Date.now()}`
      const path = `${folder}/cover.${ext}`
      const { error } = await supabase.storage
        .from('business-logos')
        .upload(path, file, { upsert: true })
      if (error) {
        alert('Failed to upload cover image: ' + error.message)
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('business-logos')
          .getPublicUrl(path)
        // Cache-buster — same-path upsert means the public URL is stable, so
        // browsers + CDN keep serving the old image without this query string.
        setForm(f => ({ ...f, cover_image_url: `${publicUrl}?v=${Date.now()}` }))
      }
    } catch (err) {
      console.error('Cover upload exception:', err)
      alert('Upload failed — please try again.')
    }
    setUploadingCover(false)
  }
  const handleRemoveCover = () => setForm(f => ({ ...f, cover_image_url: '' }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    // Build a DB-safe payload — founded_year is integer in DB, empty string must become null
    const payload = {
      ...form,
      founded_year: form.founded_year ? parseInt(form.founded_year, 10) : null,
    }

    if (businessId) {
      const { error } = await supabase.from('businesses').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', businessId)
      if (error) {
        alert('Failed to update business: ' + error.message)
        setSaving(false)
        return
      }
      setSaving(false)
      // Hard navigate so the sidebar BusinessSwitcher reloads with the new business list
      window.location.href = '/business'
    } else {
      // Guard: check tier-based business creation limit
      try {
        const tierRes = await fetch('/api/tier/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_business' }),
        })
        const tierCheck = await tierRes.json()
        if (!tierCheck.allowed) {
          alert(tierCheck.reason + '. Upgrade your plan at /pricing to create more businesses.')
          setSaving(false)
          return
        }
      } catch { /* fail open if tier check fails */ }
      const { data: newBiz, error } = await supabase.from('businesses').insert({ ...payload, user_id: user.id }).select('id, slug').single()
      if (error) {
        alert('Failed to create business: ' + error.message)
        setSaving(false)
        return
      }
      if (newBiz) {
        setActiveBusinessId(newBiz.id)
        // Fire-and-forget: send welcome notification + email
        fetch('/api/business/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: newBiz.id, businessName: form.name }),
        }).catch(() => {})
      }
      setSaving(false)
      // Celebration page; falls back to /business if slug missing (edge case)
      const nextSlug = newBiz?.slug
      window.location.href = nextSlug ? `/business/setup/complete?slug=${encodeURIComponent(nextSlug)}` : '/business'
    }
  }
  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '', required = false) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {businessId ? 'Business Settings' : isNewMode ? 'Create New Business' : 'Set Up Your Business'}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Logo */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-white">Business Logo</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <BusinessLogo
              src={form.logo_url}
              name={form.name || 'Business'}
              size="lg"
              fallback={
                <div className="w-full h-full rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-3xl">
                  🏪
                </div>
              }
            />
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
          {field('Business Name *', 'name', 'text', 'e.g. Chidi Farms Ltd', true)}
          {field('Address *', 'address', 'text', 'Street, City, State', true)}
          {field('Phone *', 'phone', 'tel', '+234...', true)}
          {field('Alternative Phone', 'alt_phone', 'tel', '+234...')}
          {field('WhatsApp Number', 'whatsapp', 'tel', '+234...')}
          {field('Email', 'email', 'email', 'info@yourbusiness.com')}
        </div>

        {/* Sector & Classification — powers peer benchmarking */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-white">Sector & Classification</h2>
          <p className="text-xs text-gray-400">Used for anonymous peer benchmarking — see how your business compares to others in your sector and region.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sector</label>
            <select
              value={form.sector}
              onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select sector…</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
            <select
              value={form.state}
              onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select state…</option>
              {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Size</label>
            <select
              value={form.business_size}
              onChange={e => setForm(f => ({ ...f, business_size: e.target.value }))}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select size…</option>
              {BUSINESS_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        
       {/* Business Showcase — drives the public /b/{slug} marketing page */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-white">Business Showcase</h2>
          <p className="text-xs text-gray-400">
            These fields power your public marketing page at <span className="font-mono">/b/your-slug</span>.
          </p>

          {/* Cover image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cover Image</label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {form.cover_image_url ? (
                <Image src={form.cover_image_url} alt="Cover" width={160} height={80} className="object-cover rounded-lg border border-gray-100" />
              ) : (
                <div className="w-40 h-20 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-2xl">🖼️</div>
              )}
              <div className="space-y-2">
                <input ref={coverFileRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                <button
                  type="button"
                  onClick={() => coverFileRef.current?.click()}
                  disabled={uploadingCover}
                  className="block border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  {uploadingCover ? 'Uploading...' : form.cover_image_url ? 'Change Cover' : 'Upload Cover'}
                </button>
                {form.cover_image_url && (
                  <button type="button" onClick={handleRemoveCover} className="block text-xs text-red-500 hover:underline">
                    Remove cover
                  </button>
                )}
                <p className="text-xs text-gray-400">Wide banner shown at the top of your public page. 1600×400 recommended.</p>
              </div>
            </div>
          </div>

          {field('Tagline', 'tagline', 'text', 'One-line pitch — e.g. "Premium cassava flour from Ogun farms"')}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">About Your Business</label>
            <textarea
              value={form.about}
              onChange={e => setForm(f => ({ ...f, about: e.target.value }))}
              rows={5}
              placeholder="Tell customers what you do, who you serve, and why it matters."
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('Founded (Year)', 'founded_year', 'number', 'e.g. 2018')}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Opening Hours</label>
              <textarea
                value={form.opening_hours}
                onChange={e => setForm(f => ({ ...f, opening_hours: e.target.value }))}
                rows={3}
                placeholder="Mon–Sat 8am–6pm&#10;Sun closed"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Website & Socials */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-white">Website & Socials</h2>
          <p className="text-xs text-gray-400">At least one lets customers verify and follow your business.</p>
          {field('Website', 'website', 'url', 'https://yourbusiness.com')}
          {field('Instagram', 'instagram', 'text', '@yourhandle or full URL')}
          {field('Facebook', 'facebook', 'text', 'page handle or full URL')}
        </div>

        {/* Public URL — read-only, only when editing an existing business */}
        {businessId && form.name && (
          <div className="bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800 p-5 space-y-2">
            <h2 className="font-semibold text-green-800 dark:text-green-300 text-sm">Your Public URL</h2>
            <p className="text-xs text-green-700 dark:text-green-400">
              Your business is discoverable at this link. Share it freely — it works even when you&apos;re not logged in.
            </p>
            <code className="block text-xs bg-white dark:bg-gray-900 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700 rounded px-3 py-2 break-all">
              agroyield.africa/b/(your-slug)
            </code>
            <p className="text-[11px] text-gray-500">
              To rename your slug, contact support at <a href="mailto:hello@agroyield.africa" className="underline">hello@agroyield.africa</a>.
            </p>
          </div>
        )} 
        
        {/* Registration & Tax (optional — shown on invoices when provided) */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-white">Registration & Tax</h2>
          <p className="text-xs text-gray-400">Optional — these appear on your invoices and receipts when provided.</p>
          {field('CAC Registration Number', 'cac_number', 'text', 'e.g. RC-1234567')}
          {field('VAT / TIN Number', 'vat_tin', 'text', 'e.g. 12345678-0001')}
        </div>

        {/* Bank Details */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-white">Bank Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Name</label>
            {customBank ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.bank_name}
                  onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                  placeholder="Enter bank or institution name"
                  className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  type="button"
                  onClick={() => { setCustomBank(false); setForm(f => ({ ...f, bank_name: '' })) }}
                  className="text-xs text-green-600 hover:underline whitespace-nowrap px-2"
                >
                  ← Back to list
                </button>
              </div>
            ) : (
              <select
                value={NIGERIAN_BANKS.includes(form.bank_name) ? form.bank_name : ''}
                onChange={e => {
                  if (e.target.value === '__other__') {
                    setCustomBank(true)
                    setForm(f => ({ ...f, bank_name: '' }))
                  } else {
                    setForm(f => ({ ...f, bank_name: e.target.value }))
                  }
                }}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select bank…</option>
                {NIGERIAN_BANKS.map(bank => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
                <option value="__other__">Other (type manually)</option>
              </select>
            )}
          </div>
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
          disabled={saving || !form.name || !form.address || !form.phone}
          className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : businessId ? 'Save Changes' : 'Create Business'}
        </button>
      </form>

      {/* Floating setup guide */}
      <BusinessSetupGuide form={form} />
    </div>
  )
}

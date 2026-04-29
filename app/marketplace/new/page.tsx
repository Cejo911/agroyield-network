'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import useProfileGate from '@/app/hooks/useProfileGate'
import ProfileGateBanner from '@/app/components/ProfileGateBanner'
import InstitutionGateBanner from '@/app/components/InstitutionGateBanner'
import ImageUploader from '@/app/components/ImageUploader'
import { createClient } from '@/lib/supabase/client'
import BackButton from '@/app/components/BackButton'

const DEFAULT_CATEGORIES = ['produce', 'inputs', 'equipment', 'livestock', 'oil', 'services', 'other']
const CONDITIONS = ['new', 'used']
const TYPES = ['sell', 'buy', 'trade']
const STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
]

const inputCls = 'w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500'

export default function NewListingPage() {
  const router = useRouter()
  const { ready: gateReady, allowed: profileComplete, missing: profileMissing, isInstitution, isInstitutionVerified } = useProfileGate()
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [userId, setUserId] = useState<string>('')
  const [form, setForm] = useState({
    title: '', category: '', type: '', price: '',
    price_negotiable: false, description: '', state: '', contact: '',
    condition: '',
  })

  // Get current user ID for upload folder
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  useEffect(() => {
    fetch('/api/content-types')
      .then(r => r.json())
      .then(data => {
        if (data.marketplaceCategories) {
          let cats = data.marketplaceCategories
          // Handle if the API returns a JSON string instead of a parsed array
          if (typeof cats === 'string') {
            try { cats = JSON.parse(cats) } catch {}
          }
          if (Array.isArray(cats) && cats.length) {
            // Strip any stray brackets or quotes from each value
            const cleaned = cats
              .map((c: unknown) => String(c).replace(/^["'\[]+|["'\]]+$/g, '').trim())
              .filter(Boolean)
            setCategories(cleaned)
          }
        }
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, price: form.price ? parseFloat(form.price) : null, image_urls: imageUrls }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post listing')
      if (data.pending) {
        setMessage({ type: 'success', text: 'Listing submitted for review. An admin will approve it shortly.' })
        setTimeout(() => router.push('/marketplace'), 2000)
      } else {
        setMessage({ type: 'success', text: 'Listing posted successfully! Redirecting...' })
        setTimeout(() => router.push(`/marketplace/${data.id}`), 2000)
      }
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Something went wrong' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <BackButton fallbackHref="/marketplace" label="Back to Marketplace" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Post a Listing</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">List a product, input, equipment or service.</p>
        </div>

        {gateReady && !profileComplete ? (
          <ProfileGateBanner missing={profileMissing} />
        ) : gateReady && isInstitution && !isInstitutionVerified ? (
          <InstitutionGateBanner />
        ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. 50kg bags of yellow maize for sale"
                className={inputCls}
              />
            </div>

            {/* Listing Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Listing Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, type }))}
                    className={`py-2.5 rounded-lg border text-sm font-medium capitalize transition-colors ${
                      form.type === type
                        ? 'border-green-600 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-green-300 dark:hover:border-green-700'
                    }`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, category: cat, condition: cat.toLowerCase() === 'equipment' ? prev.condition : '' }))}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium capitalize transition-colors ${
                      form.category === cat
                        ? 'border-green-600 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-green-300 dark:hover:border-green-700'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Condition — only for equipment */}
            {form.category.toLowerCase() === 'equipment' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Condition <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {CONDITIONS.map(cond => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, condition: cond }))}
                      className={`py-2.5 rounded-lg border text-sm font-medium capitalize transition-colors ${
                        form.condition === cond
                          ? 'border-green-600 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-green-300 dark:hover:border-green-700'
                      }`}>
                      {cond}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price (NGN){' '}
                {form.type === 'trade' && (
                  <span className="text-gray-500 dark:text-gray-500 font-normal">— optional for trades</span>
                )}
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="e.g. 25000"
                  className={inputCls}
                />
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={form.price_negotiable}
                    onChange={e => setForm(prev => ({ ...prev, price_negotiable: e.target.checked }))}
                    className="rounded"
                  />
                  Negotiable
                </label>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                placeholder="Describe what you are selling, buying or trading..."
                className={inputCls}
              />
            </div>

            {/* Photos */}
            {userId && (
              <ImageUploader
                bucket="marketplace-images"
                folder={userId}
                maxImages={4}
                maxSizeMB={2}
                value={imageUrls}
                onChange={setImageUrls}
              />
            )}

            {/* State + Contact */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  State
                </label>
                <select
                  value={form.state}
                  onChange={e => setForm(prev => ({ ...prev, state: e.target.value }))}
                  className={inputCls}>
                  <option value="">Select state</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contact
                </label>
                <input
                  type="text"
                  value={form.contact}
                  onChange={e => setForm(prev => ({ ...prev, contact: e.target.value }))}
                  placeholder="Phone or email"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Message */}
            {message && (
              <div role={message.type === 'error' ? 'alert' : 'status'} className={`rounded-lg px-4 py-3 text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>
                {message.text}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !form.title || !form.type || !form.category || (form.category.toLowerCase() === 'equipment' && !form.condition)}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors">
              {loading ? 'Posting...' : 'Post Listing'}
            </button>

          </form>
        </div>
        )}
      </main>
    </div>
  )
}

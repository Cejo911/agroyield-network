'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import Link from 'next/link'

const CATEGORIES = ['Research', 'Startup', 'Student', 'Women', 'Innovation', 'Farmer', 'Policy']

export default function PostGrantPage() {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    funder: '',
    description: '',
    category: 'Research' as string,
    amount_min: '',
    amount_max: '',
    currency: 'NGN',
    region: '',
    stage: '',
    eligibility: '',
    deadline: '',
    apply_link: '',
    featured: false,
    status: 'open' as string,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const payload = {
      title: form.title.trim(),
      funder: form.funder.trim(),
      description: form.description.trim() || null,
      category: form.category,
      amount_min: form.amount_min ? parseFloat(form.amount_min) : null,
      amount_max: form.amount_max ? parseFloat(form.amount_max) : null,
      currency: form.currency,
      region: form.region.trim() || null,
      stage: form.stage.trim() || null,
      eligibility: form.eligibility.trim() || null,
      deadline: form.deadline || null,
      apply_link: form.apply_link.trim() || null,
      featured: form.featured,
      status: form.status,
      posted_by: user.id,
    }

    const { error } = await (supabase as any).from('grants').insert(payload)

    setSaving(false)
    if (error) {
      alert(`Error: ${error.message}`)
      return
    }
    router.push('/grants')
  }

  const inputCls = 'w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/grants" className="text-sm text-green-600 hover:underline mb-4 inline-block">
          ← Back to Grants
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Post a Grant</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Add a new funding opportunity for the community.</p>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Grant Title <span className="text-red-500">*</span>
            </label>
            <input type="text" required value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. AGRA Youth in Agriculture Grant 2026"
              className={inputCls} />
          </div>

          {/* Funder */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Funder / Organisation <span className="text-red-500">*</span>
            </label>
            <input type="text" required value={form.funder}
              onChange={e => setForm({ ...form, funder: e.target.value })}
              placeholder="e.g. Alliance for a Green Revolution in Africa"
              className={inputCls} />
          </div>

          {/* Category + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputCls}>
                <option value="open">Open</option>
                <option value="upcoming">Upcoming</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Min Amount</label>
              <input type="number" value={form.amount_min}
                onChange={e => setForm({ ...form, amount_min: e.target.value })}
                placeholder="e.g. 500000"
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Max Amount</label>
              <input type="number" value={form.amount_max}
                onChange={e => setForm({ ...form, amount_max: e.target.value })}
                placeholder="e.g. 2000000"
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Currency</label>
              <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className={inputCls}>
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea value={form.description} rows={5}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the grant, its purpose, and what it covers..."
              className={inputCls + ' resize-none'} />
          </div>

          {/* Eligibility */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Eligibility Requirements</label>
            <textarea value={form.eligibility} rows={3}
              onChange={e => setForm({ ...form, eligibility: e.target.value })}
              placeholder="Who can apply? Age, nationality, qualification requirements..."
              className={inputCls + ' resize-none'} />
          </div>

          {/* Region + Stage */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Region</label>
              <input type="text" value={form.region}
                onChange={e => setForm({ ...form, region: e.target.value })}
                placeholder="e.g. Nigeria, West Africa, Global"
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Stage</label>
              <input type="text" value={form.stage}
                onChange={e => setForm({ ...form, stage: e.target.value })}
                placeholder="e.g. Early-stage, Growth, Research"
                className={inputCls} />
            </div>
          </div>

          {/* Deadline + Apply Link */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Deadline</label>
              <input type="date" value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Application URL</label>
              <input type="url" value={form.apply_link}
                onChange={e => setForm({ ...form, apply_link: e.target.value })}
                placeholder="https://..."
                className={inputCls} />
            </div>
          </div>

          {/* Featured toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.featured}
              onChange={e => setForm({ ...form, featured: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Featured grant (appears at top of listings)</span>
          </label>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.back()}
              className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
              Cancel
            </button>
            <button type="submit" disabled={saving || !form.title.trim() || !form.funder.trim()}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-50 transition-colors">
              {saving ? 'Posting...' : 'Post Grant'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

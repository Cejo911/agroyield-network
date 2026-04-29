'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import { createClient } from '@/lib/supabase/client'
import { COMMODITIES } from '@/app/prices/commodities'
const STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
  'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
  'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba',
  'Yobe','Zamfara',
]
const UNITS = ['kg', 'tonne', 'bag (50kg)', 'bag (100kg)', 'crate', 'bunch', 'piece', 'litre']

const inputCls = 'w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

export default function EditPriceReportPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [fetching, setFetching] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    category: '', commodity: '', price_per_unit: '',
    unit: '', market_name: '', state: '', notes: '',
  })

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: report } = await supabase
        .from('price_reports')
        .select('*')
        .eq('id', id)
        .single()

      if (!report) { router.push('/prices'); return }
      if (report.user_id !== user.id) { router.push('/prices'); return }

      setForm({
        category:      report.category ?? '',
        commodity:     report.commodity ?? '',
        price_per_unit: report.price_per_unit != null
          ? String(report.price_per_unit)
          : report.price != null ? String(report.price) : '',
        unit:          report.unit ?? '',
        market_name:   report.market_name ?? '',
        state:         report.state ?? '',
        notes:         report.notes ?? '',
      })
      setFetching(false)
    }
    load()
  }, [id, router])

  const currentCommodities = form.category ? (COMMODITIES[form.category] ?? []) : []

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === 'category') {
      setForm(prev => ({ ...prev, category: value, commodity: '' }))
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const priceValue = parseFloat(form.price_per_unit)
    if (!form.price_per_unit || isNaN(priceValue) || priceValue <= 0) {
      setError('Please enter a valid price.')
      return
    }
    setSubmitting(true)
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('price_reports')
      .update({
        category:      form.category,
        commodity:     form.commodity,
        price:         priceValue,
        price_per_unit: priceValue,
        unit:          form.unit,
        market_name:   form.market_name,
        state:         form.state,
        notes:         form.notes || null,
      })
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      setSubmitting(false)
      return
    }
    router.push('/prices')
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <AppNav />
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Edit Price Report</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Update the details of your price report.</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-5">

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select name="category" value={form.category} onChange={handleChange} required className={inputCls}>
              <option value="">Select category</option>
              {Object.keys(COMMODITIES).map(cat => (
                <option key={cat} value={cat}>
                  {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Commodity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Commodity <span className="text-red-500">*</span>
            </label>
            <select name="commodity" value={form.commodity} onChange={handleChange} required
              disabled={!form.category}
              className={`${inputCls} disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600`}>
              <option value="">Select commodity</option>
              {currentCommodities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Price + Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price (₦) <span className="text-red-500">*</span>
              </label>
              <input type="number" name="price_per_unit" value={form.price_per_unit}
                onChange={handleChange} required min="1" step="0.01"
                placeholder="e.g. 35000" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unit <span className="text-red-500">*</span>
              </label>
              <select name="unit" value={form.unit} onChange={handleChange} required className={inputCls}>
                <option value="">Select unit</option>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Market */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Market Name <span className="text-red-500">*</span>
            </label>
            <input type="text" name="market_name" value={form.market_name}
              onChange={handleChange} required placeholder="e.g. Mile 12 Market" className={inputCls} />
          </div>

          {/* State */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <select name="state" value={form.state} onChange={handleChange} required className={inputCls}>
              <option value="">Select state</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes <span className="text-gray-500 dark:text-gray-500">(optional)</span>
            </label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
              placeholder="Any additional context about this price..."
              className={`${inputCls} resize-none`} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.push('/prices')}
              className="flex-1 py-3 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors">
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

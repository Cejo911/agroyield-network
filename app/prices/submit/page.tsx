'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import { createClient } from '@/lib/supabase/client'

const COMMODITIES: Record<string, string[]> = {
  grains: ['Maize', 'Rice', 'Sorghum', 'Millet', 'Wheat', 'Barley'],
  legumes: ['Soybeans', 'Cowpea', 'Groundnut', 'Sesame', 'Beans'],
  tubers: ['Cassava', 'Yam', 'Sweet Potato', 'Cocoyam', 'Irish Potato'],
  vegetables: ['Tomato', 'Pepper', 'Onion', 'Cabbage', 'Carrot', 'Spinach'],
  fruits: ['Banana', 'Plantain', 'Mango', 'Orange', 'Pineapple', 'Watermelon'],
  livestock: ['Cattle', 'Goat', 'Sheep', 'Pig', 'Poultry', 'Fish'],
  cash_crops: ['Cocoa', 'Coffee', 'Cotton', 'Rubber', 'Palm Oil', 'Sugarcane'],
}

const STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
  'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
  'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba',
  'Yobe','Zamfara',
]

const UNITS = ['kg', 'tonne', 'bag (50kg)', 'bag (100kg)', 'crate', 'bunch', 'piece', 'litre']

export default function SubmitPricePage() {
  const router = useRouter()
  const [form, setForm] = useState({
    category: '',
    commodity: '',
    price_per_unit: '',
    unit: '',
    market_name: '',
    state: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const currentCommodities: string[] = form.category ? (COMMODITIES[form.category] ?? []) : []

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
    setSubmitting(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('You must be signed in to submit prices.')
      setSubmitting(false)
      return
    }

    const { error: insertError } = await supabase.from('price_reports').insert({
      user_id: user.id,
      category: form.category,
      commodity: form.commodity,
      price_per_unit: parseFloat(form.price_per_unit),
      unit: form.unit,
      market_name: form.market_name,
      state: form.state,
      notes: form.notes || null,
    })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    router.push('/prices')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Submit a Price Report</h1>
        <p className="text-gray-500 mb-8">Help the community by sharing current commodity prices from your local market.</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select category</option>
              {Object.keys(COMMODITIES).map(cat => (
                <option key={cat} value={cat}>{cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
              ))}
            </select>
          </div>

          {/* Commodity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commodity <span className="text-red-500">*</span></label>
            <select
              name="commodity"
              value={form.commodity}
              onChange={handleChange}
              required
              disabled={!form.category}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
            >
              <option value="">Select commodity</option>
              {currentCommodities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Price + Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₦) <span className="text-red-500">*</span></label>
              <input
                type="number"
                name="price_per_unit"
                value={form.price_per_unit}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="e.g. 35000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit <span className="text-red-500">*</span></label>
              <select
                name="unit"
                value={form.unit}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select unit</option>
                {UNITS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Market */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Market Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="market_name"
              value={form.market_name}
              onChange={handleChange}
              required
              placeholder="e.g. Mile 12 Market"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State <span className="text-red-500">*</span></label>
            <select
              name="state"
              value={form.state}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select state</option>
              {STATES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400">(optional)</span></label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Any additional context about this price..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit Price Report'}
          </button>
        </form>
      </div>
    </div>
  )
}

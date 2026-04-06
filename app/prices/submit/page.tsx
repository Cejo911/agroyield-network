
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const COMMODITIES: Record<string, string[]> = {
  grains: ['Maize', 'Rice', 'Wheat', 'Sorghum', 'Millet'],
  tubers: ['Yam', 'Cassava', 'Sweet Potato', 'Irish Potato'],
  legumes: ['Cowpea', 'Soybean', 'Groundnut'],
  vegetables: ['Tomato', 'Pepper', 'Onion', 'Spinach', 'Cabbage'],
  oils: ['Palm Oil', 'Groundnut Oil', 'Soybean Oil'],
  livestock: ['Chicken', 'Goat', 'Cow', 'Catfish', 'Tilapia'],
  other: ['Other'],
}

const UNITS = ['kg', '50kg bag', '100kg bag', 'ton', 'tuber', 'bunch', 'crate', 'litre', 'piece']

const STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
]

export default function SubmitPricePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({
    category: '',
    commodity: '',
    customCommodity: '',
    price: '',
    unit: '',
    market_name: '',
    state: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commodity: form.commodity === 'Other' ? form.customCommodity : form.commodity,
          category: form.category,
          price: parseFloat(form.price),
          unit: form.unit,
          market_name: form.market_name,
          state: form.state,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit price')

      setMessage({ type: 'success', text: 'Price reported successfully! Redirecting...' })
      setTimeout(() => router.push('/prices'), 1500)
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Something went wrong' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌾</span>
            <span className="font-bold text-green-700 text-lg">AgroYield Network</span>
          </div>
          <Link href="/prices" className="text-sm text-gray-600 hover:text-green-700 font-medium">
            Back to Price Tracker
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Report a Price</h1>
          <p className="text-gray-500 mt-1">Share a commodity price from your local market.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Object.keys(COMMODITIES).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, category: cat, commodity: '' }))}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium capitalize transition-colors ${
                      form.category === cat
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:border-green-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {form.category && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commodity <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMODITIES[form.category].map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, commodity: item }))}
                      className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                        form.commodity === item
                          ? 'bg-green-600 text-white border-green-600'
                          : 'border-gray-300 text-gray-600 hover:border-green-400'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                {form.commodity === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter commodity name"
                    value={form.customCommodity}
                    onChange={e => setForm(prev => ({ ...prev, customCommodity: e.target.value }))}
                    className="mt-3 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (₦) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="e.g. 500"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.unit}
                  onChange={e => setForm(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select unit</option>
                  {UNITS.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Market Name</label>
                <input
                  type="text"
                  value={form.market_name}
                  onChange={e => setForm(prev => ({ ...prev, market_name: e.target.value }))}
                  placeholder="e.g. Mile 12 Market"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <select
                  value={form.state}
                  onChange={e => setForm(prev => ({ ...prev, state: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select state</option>
                  {STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {message && (
              <div className={`rounded-lg px-4 py-3 text-sm ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !form.commodity || !form.price || !form.unit}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Price'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

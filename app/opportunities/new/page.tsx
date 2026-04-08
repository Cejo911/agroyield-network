'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppNav from '@/app/components/AppNav'

const DEFAULT_TYPES = ['grant', 'fellowship', 'job', 'partnership', 'internship', 'training']

export default function NewOpportunityPage() {
  const router = useRouter()
  const [types, setTypes] = useState<string[]>(DEFAULT_TYPES)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState({
    title: '', type: '', organisation: '', location: '',
    description: '', requirements: '', deadline: '', url: '',
  })

  useEffect(() => {
    fetch('/api/content-types')
      .then(r => r.json())
      .then(data => { if (data.opportunityTypes?.length) setTypes(data.opportunityTypes) })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post opportunity')

      if (data.pending) {
        setMessage({ type: 'success', text: 'Opportunity submitted for review. An admin will approve it shortly.' })
      } else {
        setMessage({ type: 'success', text: 'Opportunity posted successfully! Redirecting...' })
      }
      setTimeout(() => router.push('/opportunities'), 2000)
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Something went wrong' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Post an Opportunity</h1>
          <p className="text-gray-500 mt-1">Share a grant, job, fellowship or partnership with the network.</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text" required value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. AGRA Small Grants Programme 2026"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {types.map(type => (
                  <button key={type} type="button"
                    onClick={() => setForm(prev => ({ ...prev, type }))}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium capitalize transition-colors ${
                      form.type === type
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:border-green-300'
                    }`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organisation</label>
                <input type="text" value={form.organisation}
                  onChange={e => setForm(prev => ({ ...prev, organisation: e.target.value }))}
                  placeholder="e.g. AGRA, FAO, USAID"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input type="text" value={form.location}
                  onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. Nigeria or Remote"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={4} placeholder="Describe the opportunity..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
              <textarea value={form.requirements}
                onChange={e => setForm(prev => ({ ...prev, requirements: e.target.value }))}
                rows={3} placeholder="Who is eligible to apply?"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                <input type="date" value={form.deadline}
                  onChange={e => setForm(prev => ({ ...prev, deadline: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Application URL</label>
                <input type="url" value={form.url}
                  onChange={e => setForm(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {message && (
              <div className={`rounded-lg px-4 py-3 text-sm ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {message.text}
              </div>
            )}

            <button type="submit" disabled={loading || !form.title || !form.type}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
              {loading ? 'Posting...' : 'Post Opportunity'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

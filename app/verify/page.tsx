'use client'

import { useState } from 'react'
import AppNav from '@/app/components/AppNav'

const PLANS = [
  {
    key: 'monthly',
    label: 'Monthly',
    price: '₦2,500',
    period: 'per month',
    savings: null,
  },
  {
    key: 'yearly',
    label: 'Yearly',
    price: '₦25,000',
    period: 'per year',
    savings: 'Save ₦5,000 — 2 months free',
  },
]

const PERKS = [
  'Green ✓ verified badge on your profile',
  'Verified badge in the member directory',
  'Verified badge on your public profile link',
  'Increased trust and credibility with other members',
  'Priority visibility in search results',
]

export default function VerifyPage() {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubscribe = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Failed to start payment')
      window.location.href = data.url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5 mb-4">
            <span className="text-green-700 text-sm font-semibold">AgroYield Verification</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Get Verified on AgroYield Network</h1>
          <p className="text-gray-500 text-base">
            Stand out in Nigeria's agricultural professional community with a verified badge that signals authenticity and credibility.
          </p>
        </div>

        {/* Plan selector */}
        <div className="flex gap-3 mb-6">
          {PLANS.map(plan => (
            <button key={plan.key} onClick={() => setSelectedPlan(plan.key as 'monthly' | 'yearly')}
              className={`flex-1 rounded-xl border-2 p-4 text-left transition-all ${
                selectedPlan === plan.key
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-green-300'
              }`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{plan.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{plan.price}</p>
                  <p className="text-xs text-gray-500">{plan.period}</p>
                </div>
                {selectedPlan === plan.key && (
                  <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              {plan.savings && (
                <p className="text-xs font-semibold text-green-600 mt-2">{plan.savings}</p>
              )}
            </button>
          ))}
        </div>

        {/* Perks */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-4">What you get with verification:</p>
          <div className="space-y-3">
            {PERKS.map(perk => (
              <div key={perk} className="flex items-start gap-3">
                <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="#16a34a" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-gray-700">{perk}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Elite note */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="#d97706">
              <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">Elite Crown Badge</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Verified members who fully meet AgroYield's excellence criteria can be awarded the golden crown badge by our admin team. This is an invitation-only distinction for outstanding contributors to Nigerian agriculture.
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {/* CTA */}
        <button onClick={handleSubscribe} disabled={loading}
          className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-base hover:bg-green-700 disabled:opacity-50 transition-colors">
          {loading ? 'Redirecting to payment…' : `Get Verified — ${selectedPlan === 'yearly' ? '₦25,000/year' : '₦2,500/month'}`}
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">
          Secure payment via Paystack · Cancel anytime
        </p>

      </div>
    </div>
  )
}

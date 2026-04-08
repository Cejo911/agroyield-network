'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  monthly: number
  annual:  number
}

const FEATURES = [
  'Verified badge on your profile',
  'Priority placement in search results',
  'Post unlimited opportunities & listings',
  'Access to verified-only opportunities',
  'Direct messaging with other members',
  'Professional directory listing',
  'Early access to platform features',
]

export default function PricingClient({ monthly, annual }: Props) {
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const price              = billingCycle === 'monthly' ? monthly : annual
  const monthlyEquivalent  = billingCycle === 'annual' ? Math.round(annual / 12) : monthly
  const annualSaving       = Math.round(((monthly * 12 - annual) / (monthly * 12)) * 100)

  const handleSubscribe = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: billingCycle }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) { router.push('/auth/login?next=/pricing'); return }
        throw new Error(data.error ?? 'Payment initiation failed')
      }
      window.location.href = data.authorization_url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Get Verified on AgroYield Network
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-xl mx-auto">
          A verified badge builds trust, increases your visibility, and unlocks
          exclusive features for agricultural professionals across Africa.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              billingCycle === 'annual'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Annual
            {annualSaving > 0 && (
              <span className="ml-2 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 rounded-full">
                Save {annualSaving}%
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Pricing card */}
      <div className="max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl border-2 border-green-600 dark:border-green-500 shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Verified Member</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Full platform access</p>
          </div>
          <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-semibold px-3 py-1 rounded-full">
            ✓ Verified
          </span>
        </div>

        <div className="mb-6">
          <div className="flex items-end gap-1">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">
              ₦{price.toLocaleString()}
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-sm mb-1">
              / {billingCycle === 'monthly' ? 'month' : 'year'}
            </span>
          </div>
          {billingCycle === 'annual' && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              ₦{monthlyEquivalent.toLocaleString()}/month · billed annually
            </p>
          )}
        </div>

        <ul className="space-y-3 mb-8">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
              <svg
                className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50 transition-colors"
        >
          {loading ? 'Redirecting to payment…' : `Subscribe · ₦${price.toLocaleString()}`}
        </button>

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">
          Secure payment via Paystack · Cancel anytime
        </p>
      </div>

      <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-8">
        Already subscribed?{' '}
        <a href="/dashboard" className="text-green-600 dark:text-green-400 hover:underline">
          Go to your dashboard
        </a>
      </p>
    </div>
  )
}

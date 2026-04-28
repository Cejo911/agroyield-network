'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PRICING_FEATURES } from '@/lib/tiers'

interface UsageRow {
  label: string
  free: string
  pro: string
  growth: string
}

interface Props {
  proMonthly: number
  proAnnual: number
  growthMonthly: number
  growthAnnual: number
  freeTrialDays: number
  /** Per-tier per-feature monthly quotas pulled from settings.usage_limits.
   *  Rendered as additional rows in the feature comparison so marketing
   *  copy auto-tracks any admin retune. Optional for backwards compat. */
  usageRows?: UsageRow[]
}

function Check() {
  return (
    <svg aria-hidden="true" className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function Cross() {
  return (
    <svg aria-hidden="true" className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export default function PricingClient({ proMonthly, proAnnual, growthMonthly, growthAnnual, freeTrialDays, usageRows = [] }: Props) {
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [loadingTier, setLoadingTier] = useState<string | null>(null)
  const [error, setError] = useState('')

  const proPrice    = billing === 'monthly' ? proMonthly : proAnnual
  const growthPrice = billing === 'monthly' ? growthMonthly : growthAnnual
  const proMonthlyEq    = billing === 'annual' ? Math.round(proAnnual / 12) : proMonthly
  const growthMonthlyEq = billing === 'annual' ? Math.round(growthAnnual / 12) : growthMonthly
  const proSaving    = Math.round(((proMonthly * 12 - proAnnual) / (proMonthly * 12)) * 100)
  const growthSaving = Math.round(((growthMonthly * 12 - growthAnnual) / (growthMonthly * 12)) * 100)

  const handleSubscribe = async (tier: 'pro' | 'growth') => {
    setLoadingTier(tier)
    setError('')
    try {
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, billing }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) { router.push('/login?next=/pricing'); return }
        throw new Error(data.error ?? 'Payment initiation failed')
      }
      // Free trial — activated immediately, no Paystack redirect
      if (data.trial) {
        router.push('/subscribe/success?trial=true&tier=' + tier + '&days=' + data.days)
        return
      }
      window.location.href = data.authorization_url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoadingTier(null)
    }
  }

  const tiers = [
    {
      name: 'Starter',
      tier: 'free' as const,
      description: 'For students, researchers, and new agripreneurs exploring the platform.',
      price: 0,
      monthlyEq: 0,
      cta: 'Current Plan',
      featured: false,
    },
    {
      name: 'Pro',
      tier: 'pro' as const,
      description: 'For active SMEs running their business on AgroYield.',
      price: proPrice,
      monthlyEq: proMonthlyEq,
      cta: freeTrialDays > 0 ? `Start ${freeTrialDays}-day free trial` : `Subscribe · ₦${proPrice.toLocaleString()}`,
      featured: true,
      saving: billing === 'annual' ? proSaving : 0,
    },
    {
      name: 'Growth',
      tier: 'growth' as const,
      description: 'For agripreneurs managing multiple businesses.',
      price: growthPrice,
      monthlyEq: growthMonthlyEq,
      cta: `Subscribe · ₦${growthPrice.toLocaleString()}`,
      featured: false,
      saving: billing === 'annual' ? growthSaving : 0,
    },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Simple pricing, powerful tools
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl mx-auto">
          Every tier includes full access to Community, Directory, Mentorship, Marketplace, Grants,
          Price Intelligence, and Research Hub. Paid tiers unlock unlimited business tools.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              billing === 'monthly'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('annual')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              billing === 'annual'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Annual
            {proSaving > 0 && (
              <span className="ml-2 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 rounded-full">
                Save {proSaving}%
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {tiers.map(t => (
          <div
            key={t.tier}
            className={`bg-white dark:bg-gray-900 rounded-2xl border-2 shadow-sm p-7 flex flex-col ${
              t.featured
                ? 'border-green-600 dark:border-green-500 relative'
                : 'border-gray-200 dark:border-gray-800'
            }`}
          >
            {t.featured && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                Most Popular
              </div>
            )}

            <div className="mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t.name}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{t.description}</p>
            </div>

            <div className="mb-6">
              {t.price === 0 ? (
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">Free</span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm mb-1">forever</span>
                </div>
              ) : (
                <>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      ₦{t.price.toLocaleString()}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm mb-1">
                      / {billing === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  {billing === 'annual' && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      ₦{t.monthlyEq.toLocaleString()}/month · billed annually
                    </p>
                  )}
                  {t.saving && t.saving > 0 ? (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Save {t.saving}%</p>
                  ) : null}
                </>
              )}
            </div>

            {/* CTA */}
            {t.tier === 'free' ? (
              <button
                disabled
                className="w-full py-3 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 cursor-default mb-6"
              >
                {t.cta}
              </button>
            ) : (
              <button
                onClick={() => handleSubscribe(t.tier as 'pro' | 'growth')}
                disabled={loadingTier !== null}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 mb-6 ${
                  t.featured
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900'
                }`}
              >
                {loadingTier === t.tier ? 'Redirecting…' : t.cta}
              </button>
            )}

            {/* Features */}
            <ul className="space-y-2.5 flex-1">
              {PRICING_FEATURES.map(f => {
                const val = f[t.tier as keyof typeof f]
                const isIncluded = val === true || (typeof val === 'string' && val !== '')
                return (
                  <li key={f.label} className="flex items-start gap-2.5 text-sm">
                    {isIncluded ? <Check /> : <Cross />}
                    <span className={isIncluded ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}>
                      {typeof val === 'string' ? `${f.label}: ${val}` : f.label}
                    </span>
                  </li>
                )
              })}
              {/* Admin-configured usage quotas (settings.usage_limits) —
                  marketing copy auto-tracks the real enforcement. */}
              {usageRows.map(row => {
                const val = row[t.tier as 'free' | 'pro' | 'growth']
                return (
                  <li key={row.label} className="flex items-start gap-2.5 text-sm">
                    <Check />
                    <span className="text-gray-700 dark:text-gray-300">
                      {`${row.label}: ${val}`}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3 text-center max-w-md mx-auto mb-8">
          {error}
        </p>
      )}

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-6">Frequently asked questions</h2>
        <div className="space-y-4">
          {[
            {
              q: 'Can I change plans later?',
              a: 'Yes. You can upgrade at any time from your profile settings. Your new plan takes effect immediately.',
            },
            {
              q: 'What happens when my subscription expires?',
              a: 'You keep all your data. Your account reverts to the Starter plan with its limits until you renew.',
            },
            {
              q: 'Is there a free trial?',
              a: freeTrialDays > 0
                ? `Yes! New users get a ${freeTrialDays}-day free trial of the Pro plan. No payment required upfront.`
                : 'Not currently. But you can use the Starter plan for free with no time limit.',
            },
            {
              q: 'What payment methods are accepted?',
              a: 'We accept all Nigerian bank cards, bank transfers, and USSD payments via Paystack.',
            },
          ].map(faq => (
            <div key={faq.q} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1.5">{faq.q}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-10">
        Already subscribed?{' '}
        <a href="/dashboard" className="text-green-600 dark:text-green-400 hover:underline">
          Go to your dashboard
        </a>
      </p>
    </div>
  )
}

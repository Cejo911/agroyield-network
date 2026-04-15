'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function SuccessContent() {
  const searchParams = useSearchParams()
  const reference = searchParams.get('reference') ?? searchParams.get('trxref')
  const isTrial = searchParams.get('trial') === 'true'
  const trialTier = searchParams.get('tier')
  const trialDays = searchParams.get('days')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(isTrial ? 'success' : 'loading')
  const [plan, setPlan] = useState<string>(trialTier ?? '')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    // If this is a free trial activation, we already have the data
    if (isTrial) return

    if (!reference) {
      setStatus('error')
      setErrorMsg('No payment reference found.')
      return
    }

    fetch(`/api/payment/verify?reference=${reference}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPlan(data.tier ?? data.billing ?? 'pro')
          setStatus('success')
        } else {
          setErrorMsg(data.error ?? 'Verification failed.')
          setStatus('error')
        }
      })
      .catch(() => {
        setErrorMsg('Could not verify payment. Please contact support.')
        setStatus('error')
      })
  }, [reference, isTrial])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">Confirming your payment…</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Payment could not be confirmed</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{errorMsg}</p>
          <div className="flex flex-col gap-2">
            <Link
              href="/dashboard"
              className="bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link href="/pricing" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-2">
              Try again
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const tierLabel = plan === 'growth' ? 'Growth' : 'Pro'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {isTrial ? (
          <>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Your free trial is active!
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              You&apos;re now on the <span className="font-medium text-gray-700 dark:text-gray-300">{tierLabel}</span> plan.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              Enjoy {trialDays} days of unlimited access — no payment needed until your trial ends.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              You&apos;re now on {tierLabel}!
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Your <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">{tierLabel}</span> subscription is active.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              Your verified badge is now live on your profile.
            </p>
          </>
        )}

        <Link
          href="/dashboard"
          className="block bg-green-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}

export default function SubscribeSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}

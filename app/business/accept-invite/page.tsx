'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type InviteState = 'loading' | 'login_required' | 'accepting' | 'accepted' | 'error'

interface InviteDetails {
  business_name: string
  role: string
  invited_by_name: string
}

/** Wrapper with Suspense boundary — required by Next.js for useSearchParams */
export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const token = searchParams.get('token')

  const [state, setState] = useState<InviteState>('loading')
  const [details, setDetails] = useState<InviteDetails | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setState('error')
      setError('Invalid invitation link — no token provided.')
      return
    }
    checkAndAccept()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function checkAndAccept() {
    setState('loading')

    // First, look up the invitation using the token
    // We need service role to read by token without RLS issues for unauthenticated users
    // So we'll use an API route instead
    const res = await fetch(`/api/business/accept-invite?token=${token}`)
    const data = await res.json()

    if (!res.ok) {
      if (data.code === 'LOGIN_REQUIRED') {
        setDetails(data.details || null)
        setState('login_required')
        return
      }
      setState('error')
      setError(data.error || 'Failed to process invitation')
      return
    }

    // Success
    setDetails(data.details)
    setState('accepted')
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Processing your invitation…</p>
        </div>
      </div>
    )
  }

  if (state === 'login_required') {
    const loginUrl = `/login?redirect=/business/accept-invite?token=${token}`
    const signupUrl = `/register?redirect=/business/accept-invite?token=${token}`

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <p className="text-4xl mb-4">🤝</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Business Invitation</h1>
          {details && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              You&apos;ve been invited to join <strong className="text-gray-900 dark:text-white">{details.business_name}</strong> as
              {details.role === 'accountant' ? ' an ' : ' a '}
              <strong className="text-green-600 dark:text-green-400">{details.role === 'accountant' ? 'Accountant' : 'Staff'}</strong>
            </p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Please log in or create an account to accept this invitation.
          </p>
          <div className="space-y-3">
            <Link
              href={loginUrl}
              className="block w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Log In to Accept
            </Link>
            <Link
              href={signupUrl}
              className="block w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'accepted') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <p className="text-4xl mb-4">✅</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Welcome to the team!</h1>
          {details && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              You&apos;re now part of <strong className="text-gray-900 dark:text-white">{details.business_name}</strong> as
              {details.role === 'accountant' ? ' an ' : ' a '}
              <strong className="text-green-600 dark:text-green-400">{details.role === 'accountant' ? 'Accountant' : 'Staff'}</strong>.
            </p>
          )}
          <button
            onClick={() => router.push('/business')}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            Go to Business Dashboard →
          </button>
        </div>
      </div>
    )
  }

  // Error state
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
        <p className="text-4xl mb-4">⚠️</p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Invitation Error</h1>
        <p className="text-sm text-red-600 dark:text-red-400 mb-6">{error}</p>
        <Link
          href="/business"
          className="inline-block px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}

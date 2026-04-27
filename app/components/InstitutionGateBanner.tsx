'use client'

import Link from 'next/link'

/**
 * Banner shown when an unverified institution tries to post.
 * Explains that admin verification is required before they can create content.
 */
export default function InstitutionGateBanner() {
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5 text-center">
      <p className="text-2xl mb-2">⏳</p>
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
        Pending Verification
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Your institution is awaiting admin verification. Once approved, you&apos;ll be able to post
        opportunities, grants, marketplace listings, and research content.
      </p>
      <Link
        href="/profile"
        className="inline-block bg-gray-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-700 transition-colors"
      >
        View My Profile
      </Link>
    </div>
  )
}

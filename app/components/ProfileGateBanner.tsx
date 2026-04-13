'use client'

import Link from 'next/link'

/**
 * Banner shown when a user tries to post but hasn't completed their profile.
 * Displays which fields are missing and links to the profile page.
 */
export default function ProfileGateBanner({ missing }: { missing: string[] }) {
  return (
    <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-5 text-center">
      <p className="text-2xl mb-2">✏️</p>
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
        Complete your profile to post
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Before you can create a post, please fill in the following: {missing.join(', ')}.
      </p>
      <Link
        href="/profile"
        className="inline-block bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors"
      >
        Go to My Profile
      </Link>
    </div>
  )
}

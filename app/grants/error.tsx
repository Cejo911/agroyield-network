'use client'

export default function GrantsError({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-5xl mb-4">⚠️</p>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">We couldn&apos;t load the grants page. Please try again.</p>
        <button
          onClick={reset}
          className="bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

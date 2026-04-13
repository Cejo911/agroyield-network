'use client'

import { useRouter } from 'next/navigation'

export default function BackButton({ fallbackHref = '/directory', label = 'Back' }: { fallbackHref?: string; label?: string }) {
  const router = useRouter()

  return (
    <button
      onClick={() => {
        if (window.history.length > 1) {
          router.back()
        } else {
          router.push(fallbackHref)
        }
      }}
      className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 mb-4 transition-colors"
    >
      ← {label}
    </button>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  businessId: string
  initialSlug: string
  initialIsPublic: boolean
  aliases: { old_slug: string; created_at: string }[]
}

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://agroyield.africa'

/**
 * Admin slug manager — lives inside the business preview page.
 * Renders: public URL display, rename form (super admin only), is_public toggle,
 * and a list of historical aliases (for audit).
 *
 * Super-admin gating is enforced server-side in the API; this UI is already
 * rendered inside a super-admin-only page, so no extra client gate needed.
 */
export default function SlugManager({
  businessId,
  initialSlug,
  initialIsPublic,
  aliases,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [slug, setSlug] = useState(initialSlug)
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [pendingSlug, setPendingSlug] = useState(initialSlug)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const publicUrl = `${SITE_ORIGIN}/b/${slug}`
  const slugChanged = pendingSlug.trim().toLowerCase() !== slug

  async function patchBusiness(body: { slug?: string; isPublic?: boolean }) {
    setError(null)
    setSuccess(null)
    const res = await fetch(`/api/admin/business/${businessId}/slug`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || 'Request failed')
      return false
    }
    return true
  }

  function handleRename(e: React.FormEvent) {
    e.preventDefault()
    const normalised = pendingSlug.trim().toLowerCase()
    if (normalised === slug) {
      setError('Slug is unchanged.')
      return
    }
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(normalised) || normalised.length > 40) {
      setError('Use lowercase letters, numbers, and hyphens only (2–40 chars).')
      return
    }
    const confirmMsg =
      `Rename public URL from\n  /b/${slug}\nto\n  /b/${normalised}\n\n` +
      `The old URL will 301-redirect to the new one. Continue?`
    if (!confirm(confirmMsg)) return

    startTransition(async () => {
      const ok = await patchBusiness({ slug: normalised })
      if (ok) {
        setSlug(normalised)
        setPendingSlug(normalised)
        setSuccess('Slug renamed. Old URL now redirects.')
        router.refresh()
      }
    })
  }

  function handleTogglePublic() {
    const next = !isPublic
    const confirmMsg = next
      ? 'Make this business publicly visible at /b/{slug}?'
      : 'Hide this business? /b/{slug} will return 404. Old bookmarks and search results will break.'
    if (!confirm(confirmMsg)) return

    startTransition(async () => {
      const ok = await patchBusiness({ isPublic: next })
      if (ok) {
        setIsPublic(next)
        setSuccess(next ? 'Business is now public.' : 'Business is now hidden.')
        router.refresh()
      }
    })
  }

  return (
    <section className="bg-white dark:bg-gray-900 rounded-xl border border-amber-200 dark:border-amber-900 p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <span>🔗 Public URL</span>
          <span className="text-[10px] uppercase tracking-wide font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded">
            Super admin
          </span>
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400">Public</span>
          <button
            type="button"
            onClick={handleTogglePublic}
            disabled={isPending}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isPublic ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-700'
            } ${isPending ? 'opacity-50 cursor-wait' : ''}`}
            aria-label="Toggle public visibility"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                isPublic ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
      </div>

      {/* Current URL */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current URL</p>
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 font-mono text-sm">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`truncate flex-1 ${
              isPublic
                ? 'text-green-700 dark:text-green-400 hover:underline'
                : 'text-gray-400 line-through'
            }`}
          >
            {publicUrl}
          </a>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(publicUrl)}
            className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 px-2 py-1 rounded border border-gray-200 dark:border-gray-700"
          >
            Copy
          </button>
        </div>
        {!isPublic && (
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            ⚠ Hidden — visitors get a 404.
          </p>
        )}
      </div>

      {/* Rename form */}
      <form onSubmit={handleRename} className="space-y-2">
        <label htmlFor="slug-input" className="block text-xs text-gray-500 dark:text-gray-400">
          Rename slug
        </label>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
            <span className="px-3 py-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 select-none">
              /b/
            </span>
            <input
              id="slug-input"
              type="text"
              value={pendingSlug}
              onChange={(e) => setPendingSlug(e.target.value.toLowerCase())}
              disabled={isPending}
              pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
              maxLength={40}
              className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none font-mono text-gray-900 dark:text-white disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={isPending || !slugChanged}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Saving…' : 'Rename'}
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Lowercase letters, numbers, and hyphens (2–40 chars). Old URL will 301-redirect.
        </p>
      </form>

      {/* Feedback */}
      {error && (
        <div className="mt-3 text-sm rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2">
          {error}
        </div>
      )}
      {success && !error && (
        <div className="mt-3 text-sm rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-3 py-2">
          {success}
        </div>
      )}

      {/* Historical aliases */}
      {aliases.length > 0 && (
        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
            Historical URLs (301-redirect to current)
          </p>
          <ul className="space-y-1">
            {aliases.map((a) => (
              <li
                key={a.old_slug}
                className="flex items-center justify-between text-xs font-mono text-gray-500 dark:text-gray-400"
              >
                <span>/b/{a.old_slug}</span>
                <span className="text-gray-400">
                  retired {new Date(a.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

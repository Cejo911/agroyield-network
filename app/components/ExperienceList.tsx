import { formatRange, type ExperienceRow } from '@/lib/profile-experience'

// Read-only presentational component. Rendered on /directory/[id] and
// /u/[slug]. Owner-facing edit UI lives in app/profile/experience-editor.tsx.
//
// Intentionally a server component — no client-state needed for a pure
// timeline. Parent pages do the fetch and hand us the rows.

export default function ExperienceList({ rows }: { rows: ExperienceRow[] }) {
  if (!rows || rows.length === 0) return null

  return (
    <section className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
      <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
        <span>💼</span> Experience
      </h2>
      <ol className="space-y-5">
        {rows.map(row => (
          <li key={row.id} className="flex gap-3">
            <span
              aria-hidden
              className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                row.is_current
                  ? 'bg-green-500 ring-2 ring-green-200 dark:ring-green-900/40'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {row.role}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {row.organisation}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {formatRange(row)}
              </p>
              {row.description && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                  {row.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

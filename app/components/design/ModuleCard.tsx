import Link from 'next/link'
import type { ReactNode } from 'react'

// Design primitive — the clickable module tile rendered on the main
// /dashboard grid. Currently only the dashboard uses this, but it's a
// semantically distinct unit (navigation card → top-level module) and is
// rendered 9× from a MODULES array, so extracting it sets up a stable shape
// for future consumers (e.g. a plan-tier upsell card, a "recently used"
// sub-grid) and isolates the card styling from the page template.

export default function ModuleCard({
  href,
  title,
  description,
  icon,
}: {
  href: string
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <Link
      href={href}
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 hover:shadow-md hover:border-green-200 dark:hover:border-green-800 transition-all group"
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </Link>
  )
}

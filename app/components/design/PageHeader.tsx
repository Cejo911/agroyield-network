import type { ReactNode } from 'react'

// Design primitive — the module-page hero block: h1 title + description +
// optional right-side action slot. Extracted from 8 module pages that each
// shipped their own slightly-different copy.
//
// Responsive behavior:
// - Without actions → plain block with `mb-8`.
// - With actions    → flex column on mobile, flex row on sm+ (so the action
//   buttons don't cramp the title on narrow screens).

export default function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  const layoutClasses = actions
    ? 'flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8'
    : 'mb-8'

  return (
    <div className={layoutClasses}>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {description && (
          <p className="text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

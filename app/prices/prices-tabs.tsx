'use client'

import { useState, ReactNode } from 'react'

export default function PricesTabs({
  reportsTab,
  intelligenceTab,
}: {
  reportsTab: ReactNode
  intelligenceTab: ReactNode
}) {
  const [tab, setTab] = useState<'reports' | 'intelligence'>('reports')

  return (
    <div>
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => setTab('reports')}
          className={`text-sm font-medium px-4 py-2 rounded-md transition-colors ${
            tab === 'reports'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          📊 Reports
        </button>
        <button
          onClick={() => setTab('intelligence')}
          className={`text-sm font-medium px-4 py-2 rounded-md transition-colors ${
            tab === 'intelligence'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          📈 Intelligence
        </button>
      </div>
      {tab === 'reports' ? reportsTab : intelligenceTab}
    </div>
  )
}

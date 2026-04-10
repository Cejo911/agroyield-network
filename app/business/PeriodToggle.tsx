'use client'
import { useRouter } from 'next/navigation'

const PERIODS = [
  { value: 'month',   label: 'This Month' },
  { value: 'quarter', label: '3 Months'   },
  { value: 'year',    label: 'This Year'  },
  { value: 'all',     label: 'All Time'   },
]

export default function PeriodToggle({ current }: { current: string }) {
  const router = useRouter()
  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {PERIODS.map(p => (
        <button
          key={p.value}
          onClick={() => router.push(`/business?period=${p.value}`)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            current === p.value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

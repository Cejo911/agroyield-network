import AppNav from '@/app/components/AppNav'

export default function PricingLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <div className="max-w-4xl mx-auto px-4 py-10 text-center">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mx-auto mb-4" />
        <div className="h-4 w-72 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mx-auto mb-10" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 animate-pulse">
              <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-4 mx-auto" />
              <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-6 mx-auto" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-3 bg-gray-100 dark:bg-gray-800 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
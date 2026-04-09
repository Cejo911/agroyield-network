import AppNav from '@/app/components/AppNav'

export default function PricesLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Header + button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-36 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-3" />
            <div className="h-4 w-60 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        </div>
        {/* Category tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
          ))}
        </div>
        {/* Price cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-5 w-16 bg-gray-100 dark:bg-gray-800 rounded-full" />
              </div>
              <div className="h-7 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded mb-1" />
              <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

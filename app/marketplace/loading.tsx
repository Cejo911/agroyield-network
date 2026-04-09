import AppNav from '@/app/components/AppNav'

export default function MarketplaceLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Header + button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-40 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-3" />
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        </div>
        {/* Listings grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 animate-pulse">
              <div className="flex gap-2 mb-3">
                <div className="h-5 w-14 bg-gray-100 dark:bg-gray-800 rounded-full" />
                <div className="h-5 w-18 bg-gray-100 dark:bg-gray-800 rounded-full" />
              </div>
              <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-6 w-28 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded mb-1" />
              <div className="h-3 w-3/4 bg-gray-100 dark:bg-gray-800 rounded mb-4" />
              <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

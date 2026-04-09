import AppNav from '@/app/components/AppNav'

export default function OpportunitiesLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header + button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-44 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-3" />
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        </div>
        {/* Opportunity cards */}
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 animate-pulse">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="h-5 w-56 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-3 w-36 bg-gray-100 dark:bg-gray-800 rounded" />
                </div>
                <div className="h-6 w-20 bg-gray-100 dark:bg-gray-800 rounded-full" />
              </div>
              <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded mb-1" />
              <div className="h-3 w-4/5 bg-gray-100 dark:bg-gray-800 rounded mb-4" />
              <div className="flex gap-3">
                <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
                <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

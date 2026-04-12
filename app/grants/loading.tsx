export default function GrantsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-72 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-8" />
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mb-8 space-y-3">
          <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          <div className="flex gap-2">
            {[1,2,3,4].map(i => <div key={i} className="h-8 w-20 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />)}
          </div>
        </div>
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-2" />
              <div className="h-4 w-1/3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-3" />
              <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

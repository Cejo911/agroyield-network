export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-4 w-72 bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl mt-6" />
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-8 w-20 bg-gray-100 dark:bg-gray-800 rounded-full" />
            ))}
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-3">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
                </div>
              </div>
              <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded" />
              <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

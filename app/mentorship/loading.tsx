import AppNav from '@/app/components/AppNav'

export default function MentorshipLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-48 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-80 mb-8 animate-pulse" />
        <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg w-full mb-6 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex gap-4">
                <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-32 animate-pulse" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full animate-pulse" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-48 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

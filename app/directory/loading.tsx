import AppNav from '@/app/components/AppNav'

export default function DirectoryLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse mb-3" />
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
        {/* Search bar */}
        <div className="h-11 w-full max-w-md bg-gray-200 rounded-lg animate-pulse mb-8" />
        {/* Member cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 bg-gray-200 rounded-full flex-shrink-0" />
                <div>
                  <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-20 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="h-3 w-full bg-gray-100 rounded mb-1" />
              <div className="h-3 w-3/4 bg-gray-100 rounded mb-4" />
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-gray-100 rounded-full" />
                <div className="h-6 w-20 bg-gray-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

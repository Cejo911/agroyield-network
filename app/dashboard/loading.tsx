import AppNav from '@/app/components/AppNav'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-3" />
          <div className="h-4 w-72 bg-gray-200 rounded animate-pulse" />
        </div>
        {/* Module cards grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
              <div className="h-10 w-10 bg-gray-200 rounded-xl mb-4" />
              <div className="h-5 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-full bg-gray-100 rounded mb-1" />
              <div className="h-3 w-4/5 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import AppNav from '@/app/components/AppNav'

export default function ResearchLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Header + button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-44 bg-gray-200 rounded-lg animate-pulse mb-3" />
            <div className="h-4 w-72 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        {/* Research post cards */}
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
              <div className="flex gap-2 mb-3">
                <div className="h-5 w-20 bg-gray-100 rounded-full" />
                <div className="h-5 w-24 bg-gray-100 rounded-full" />
              </div>
              <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-full bg-gray-100 rounded mb-1" />
              <div className="h-3 w-5/6 bg-gray-100 rounded mb-1" />
              <div className="h-3 w-2/3 bg-gray-100 rounded mb-4" />
              <div className="h-3 w-28 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

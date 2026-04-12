import AppNav from '@/app/components/AppNav'

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-20 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          <div>
            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
        </div>
        {/* Form fields */}
        <div className="space-y-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
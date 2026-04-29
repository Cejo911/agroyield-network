import { getSettings } from '@/lib/settings'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function MaintenancePage() {
  // If maintenance is off, redirect to dashboard
  const settings = await getSettings(['maintenance_enabled', 'maintenance_message'])
  if (settings.maintenance_enabled !== 'true') {
    redirect('/dashboard')
  }

  const message = settings.maintenance_message || "We're upgrading the platform. We'll be back shortly!"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-6">🔧</div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Under Maintenance
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed mb-6">
          {message}
        </p>
        <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-4 py-2 rounded-lg text-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Our team is working on it
        </div>
        <p className="mt-8 text-xs text-gray-500 dark:text-gray-500">
          AgroYield Network &middot; Nigeria&apos;s Agricultural Professional Network
        </p>
        <p className="mt-1 text-[10px] text-gray-300 dark:text-gray-600">
          An Agcoms International Project
        </p>
      </div>
    </div>
  )
}

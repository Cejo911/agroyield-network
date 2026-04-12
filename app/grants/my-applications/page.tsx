import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppNav from '@/app/components/AppNav'

const statusMeta: Record<string, { label: string; color: string }> = {
  draft:       { label: 'Draft',       color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
  submitted:   { label: 'Submitted',   color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  shortlisted: { label: 'Shortlisted', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  rejected:    { label: 'Rejected',    color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
  awarded:     { label: 'Awarded',     color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
}

export default async function MyApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  // Fetch all applications with grant details
  const { data: applications } = await supabaseAny
    .from('grant_applications')
    .select('*, grants(*)')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  const apps = (applications ?? []) as any[]

  // Stats
  const total = apps.length
  const submitted = apps.filter((a: any) => a.status === 'submitted').length
  const shortlisted = apps.filter((a: any) => a.status === 'shortlisted').length
  const awarded = apps.filter((a: any) => a.status === 'awarded').length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <Link href="/grants" className="text-sm text-green-600 hover:underline mb-4 inline-block">
          ← Back to Grants
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">My Applications</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Track all your grant applications in one place.</p>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total', value: total, color: 'text-gray-900 dark:text-white' },
            { label: 'Submitted', value: submitted, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Shortlisted', value: shortlisted, color: 'text-yellow-600 dark:text-yellow-400' },
            { label: 'Awarded', value: awarded, color: 'text-green-600 dark:text-green-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Applications list */}
        {apps.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium">No applications yet</p>
            <p className="text-sm mt-1">
              <Link href="/grants" className="text-green-600 hover:underline">Browse grants</Link> and start tracking your applications.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {apps.map((app: any) => {
              const grant = app.grants
              if (!grant) return null
              const meta = statusMeta[app.status] || statusMeta.draft
              const docsDone = (app.documents ?? []).filter((d: any) => d.completed).length
              const docsTotal = (app.documents ?? []).length
              const deadline = grant.deadline
                ? new Date(grant.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : null

              return (
                <Link
                  key={app.id}
                  href={`/grants/${grant.id}`}
                  className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:border-green-300 dark:hover:border-green-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className="text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                          {grant.category}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{grant.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{grant.funder}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                        {deadline && <span>Deadline: {deadline}</span>}
                        {docsTotal > 0 && <span>Docs: {docsDone}/{docsTotal}</span>}
                        {app.submitted_at && (
                          <span>Submitted: {new Date(app.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                        )}
                      </div>
                    </div>
                    {docsTotal > 0 && (
                      <div className="shrink-0 w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                          {Math.round((docsDone / docsTotal) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

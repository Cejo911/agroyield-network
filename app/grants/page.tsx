import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import GrantsClient from './grants-client'
import FAQAccordion from '@/app/components/FAQAccordion'
import { MODULE_FAQS } from '@/lib/faq-data'

export default async function GrantsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  const [{ data: grants }, { data: applications }, { data: profile }] = await Promise.all([
    supabaseAny
      .from('grants')
      .select('*')
      .order('featured', { ascending: false })
      .order('deadline', { ascending: true }),
    supabaseAny
      .from('grant_applications')
      .select('grant_id, status')
      .eq('user_id', user.id),
    supabase
      .from('profiles')
      .select('is_admin, admin_role')
      .eq('id', user.id)
      .single(),
  ])

  // Build a map of user's applications: grant_id -> status
  const applicationMap: Record<string, string> = {}
  for (const app of (applications ?? []) as { grant_id: string; status: string }[]) {
    applicationMap[app.grant_id] = app.status
  }

  const isAdmin = profile?.is_admin === true

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Grants & Funding</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Discover grants, fellowships, and funding opportunities in agriculture.
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href="/grants/my-applications"
              className="text-sm font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg hover:border-green-400 dark:hover:border-green-600 transition-colors"
            >
              My Applications
            </a>
            {isAdmin && (
              <a
                href="/grants/post"
                className="text-sm font-semibold bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors"
              >
                + Post Grant
              </a>
            )}
          </div>
        </div>
        <GrantsClient grants={grants ?? []} applicationMap={applicationMap} />
        <FAQAccordion items={MODULE_FAQS.grants} title="Frequently Asked Questions" subtitle="Common questions about Grants" compact />
      </main>
    </div>
  )
}

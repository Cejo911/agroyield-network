import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import OpportunitiesClient from './opportunities-client'
import AppNav from '@/app/components/AppNav'
import FAQAccordion from '@/app/components/FAQAccordion'
import { MODULE_FAQS } from '@/lib/faq-data'

export default async function OpportunitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('id, user_id, title, type, organisation, location, description, deadline, is_closed, created_at, thumbnail_url')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Opportunities</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Jobs, internships, partnerships and training in agriculture.
            </p>
          </div>
          <Link href="/opportunities/new" className="bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
            Post opportunity
          </Link>
        </div>
        <OpportunitiesClient opportunities={(opportunities ?? []) as any} userId={user.id} />
        <FAQAccordion items={MODULE_FAQS.opportunities} title="Frequently Asked Questions" subtitle="Common questions about Opportunities" compact />
      </main>
    </div>
  )
}

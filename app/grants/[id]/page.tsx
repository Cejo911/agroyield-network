import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import GrantDetail from './grant-detail'

export default async function GrantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  const [{ data: grant }, { data: application }, { data: profile }] = await Promise.all([
    supabaseAny.from('grants').select('*').eq('id', id).single(),
    supabaseAny.from('grant_applications').select('*').eq('user_id', user.id).eq('grant_id', id).maybeSingle(),
    supabase.from('profiles').select('first_name, last_name, role, institution, location, bio, linkedin, email').eq('id', user.id).single(),
  ])

  if (!grant) notFound()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <GrantDetail
          grant={grant}
          application={application}
          userProfile={profile}
          userId={user.id}
        />
      </main>
    </div>
  )
}

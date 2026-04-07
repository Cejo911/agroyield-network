import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './profile-form'
import AppNav from '@/app/components/AppNav'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
          <p className="text-gray-500 mt-1">Help the community know who you are</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <ProfileForm
            userId={user.id}
            initialData={{
              first_name: profile?.first_name ?? null,
              last_name: profile?.last_name ?? null,
              role: profile?.role ?? null,
              bio: profile?.bio ?? null,
              location: profile?.location ?? null,
              institution: profile?.institution ?? null,
              interests: profile?.interests ?? null,
              linkedin: profile?.linkedin ?? null,
              twitter: profile?.twitter ?? null,
              website: profile?.website ?? null,
            }}
          />
        </div>
      </div>
    </div>
  )
}

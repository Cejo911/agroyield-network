import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import AppNav from '@/app/components/AppNav'
import SupportClient from './support-client'

export const metadata: Metadata = {
  title: 'Support — AgroYield Network',
  description: 'Get help from the AgroYield support team',
}

export default async function SupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <SupportClient userEmail={user.email ?? ''} />
      </main>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import AppNav from '@/app/components/AppNav'
import TicketDetail from './ticket-detail'

export const metadata: Metadata = {
  title: 'Ticket Detail — AgroYield Network',
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <TicketDetail ticketId={id} currentUserId={user.id} />
      </main>
    </div>
  )
}

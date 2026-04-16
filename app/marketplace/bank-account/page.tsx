import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import BankAccountForm from './bank-account-form'

export default async function BankAccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-lg mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Payout Account</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Set up your bank account to receive payouts when buyers purchase your listings.
          Your account details are verified through Paystack.
        </p>
        <BankAccountForm />
      </main>
    </div>
  )
}

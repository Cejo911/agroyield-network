import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { getBusinessAccess } from '@/lib/business-access'
import RecurringInvoicesList, { type RecurringRow } from './RecurringInvoicesList'

/**
 * Recurring Invoices list page (Unicorn #4).
 *
 * Lists all recurring invoice templates for the active business with
 * per-row Pause / Resume / End controls. Hidden from the nav for Free-tier
 * users (the "Make this recurring" toggle is Pro+; they'll see this page
 * empty otherwise).
 */
export default async function RecurringInvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const cookieStore = await cookies()
  const access = user
    ? await getBusinessAccess(supabase, user.id, cookieStore.get('active_biz_id')?.value)
    : null

  if (!access) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center">
        <p className="text-gray-500">Set up your business profile first.</p>
        <a href="/business/setup" className="mt-3 inline-block text-green-600 font-medium hover:underline">Go to Setup →</a>
      </div>
    )
  }

  const { data: recurring } = await supabase
    .from('recurring_invoices')
    .select(`
      id, customer_id, cadence, status, start_on, next_run_on, last_run_on, end_on,
      generated_count, last_error, created_at,
      customers(name)
    `)
    .eq('business_id', access.businessId)
    .order('created_at', { ascending: false })

  // Type the result — Supabase returns customers as array-or-object depending
  // on FK inference, but the select-with-()-syntax gives us an object.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = ((recurring ?? []) as any[]).map((r): RecurringRow => ({
    id: r.id,
    customer_id: r.customer_id,
    customerName: r.customers?.name ?? '(Unknown customer)',
    cadence: r.cadence,
    status: r.status,
    start_on: r.start_on,
    next_run_on: r.next_run_on,
    last_run_on: r.last_run_on,
    end_on: r.end_on,
    generated_count: r.generated_count,
    last_error: r.last_error,
  }))

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recurring Invoices</h1>
          <p className="text-gray-500 text-sm mt-1">
            Templates that auto-generate on schedule. Pro+ only.
          </p>
        </div>
        <Link
          href="/business/invoices/new"
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
        >
          + New Invoice
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-10 text-center">
          <div className="text-4xl mb-3">🔁</div>
          <p className="text-gray-500 dark:text-gray-400 mb-4">No recurring invoices yet.</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 max-w-md mx-auto">
            Tick &quot;Make this recurring&quot; on any new invoice to have it
            regenerate weekly, monthly, or quarterly.
          </p>
          <Link href="/business/invoices/new" className="text-green-600 font-medium hover:underline text-sm">
            + Create your first recurring invoice
          </Link>
        </div>
      ) : (
        <RecurringInvoicesList initialRows={rows} />
      )}
    </div>
  )
}

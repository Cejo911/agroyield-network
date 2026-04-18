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

  // Two-step fetch rather than a PostgREST embed. The initial
  // `20260418_recurring_invoices.sql` migration didn't declare
  // `customer_id REFERENCES customers(id)` — so an embed like
  // `customers(name)` would fail with "Could not find a relationship
  // between 'recurring_invoices' and 'customers' in the schema cache"
  // and silently collapse the page to the empty state. The follow-up
  // `20260418_recurring_invoices_fks.sql` adds the FK, but we keep this
  // two-query form regardless because (a) it's robust against future
  // schema-cache hiccups and (b) the extra round trip is cheap for a
  // business-scoped list that's typically <50 rows.
  const { data: recurring, error: recurringErr } = await supabase
    .from('recurring_invoices')
    .select(`
      id, customer_id, cadence, status, start_on, next_run_on, last_run_on, end_on,
      generated_count, last_error, created_at
    `)
    .eq('business_id', access.businessId)
    .order('created_at', { ascending: false })

  if (recurringErr) {
    // Log for Vercel + render a visible error instead of falling through
    // to the "no recurring invoices yet" state, which would be misleading.
    console.error('[recurring-invoices page] query failed', recurringErr)
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <h1 className="text-lg font-bold text-red-800 dark:text-red-300 mb-2">
          Could not load recurring invoices
        </h1>
        <p className="text-sm text-red-700 dark:text-red-400">
          {recurringErr.message}
        </p>
        <p className="text-xs text-red-600 dark:text-red-500 mt-3">
          If this persists, make sure the latest database migrations have been applied.
        </p>
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recurringRows = (recurring ?? []) as any[]
  const customerIds = Array.from(new Set(
    recurringRows.map(r => r.customer_id).filter((id): id is string => Boolean(id))
  ))

  const customerNameById = new Map<string, string>()
  if (customerIds.length > 0) {
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name')
      .in('id', customerIds)
    for (const c of (customers ?? []) as { id: string; name: string }[]) {
      customerNameById.set(c.id, c.name)
    }
  }

  const rows = recurringRows.map((r): RecurringRow => ({
    id: r.id,
    customer_id: r.customer_id,
    customerName: customerNameById.get(r.customer_id) ?? '(Unknown customer)',
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

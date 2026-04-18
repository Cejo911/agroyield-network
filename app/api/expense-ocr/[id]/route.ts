import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { sanitiseText } from '@/lib/sanitise'

/**
 * Expense OCR — per-receipt actions.
 *
 * PATCH /api/expense-ocr/[id]
 *   Commits a `pending` receipt to a real `business_expenses` row using
 *   the user's reviewed/edited values. Sets status='reviewed' and links
 *   expense_id back so we can audit which expense came from which scan.
 *
 *   Idempotent: if status is already 'reviewed' and expense_id is set,
 *   we no-op rather than create a duplicate expense. The UI shouldn't
 *   call this twice but defence in depth.
 *
 * DELETE /api/expense-ocr/[id]
 *   Soft-discards a pending receipt (status='discarded'). The storage
 *   object is deleted to reclaim space — receipts the user explicitly
 *   trashed don't need to live forever. The DB row stays for audit
 *   (count of scans-attempted-vs-committed is a useful product signal).
 */

const ALLOWED_CATEGORIES = [
  'Input Costs',
  'Transport & Logistics',
  'Labour & Wages',
  'Market Fees & Commissions',
  'Equipment & Maintenance',
  'Rent & Storage',
  'Utilities',
  'Marketing & Advertising',
  'Professional Services',
  'Other',
] as const

const ALLOWED_PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'POS', 'Mobile Money', 'Cheque'] as const

interface ReceiptRow {
  id: string
  business_id: string
  user_id: string
  status: string
  expense_id: string | null
  vendor: string | null
  amount: number | null
  receipt_date: string | null
  storage_path: string | null
}

async function loadReceipt(id: string, userId: string): Promise<ReceiptRow | null> {
  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from('expense_receipts')
    .select('id, business_id, user_id, status, expense_id, vendor, amount, receipt_date, storage_path')
    .eq('id', id)
    .maybeSingle()

  if (!data) return null
  const row = data as ReceiptRow

  // Owner-or-business-owner gate (matches RLS policy).
  if (row.user_id === userId) return row
  const { data: biz } = await admin
    .from('businesses')
    .select('user_id')
    .eq('id', row.business_id)
    .maybeSingle()
  if (biz && (biz as { user_id: string }).user_id === userId) return row
  return null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const receipt = await loadReceipt(id, user.id)
    if (!receipt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })

    // Idempotency guard.
    if (receipt.status === 'reviewed' && receipt.expense_id) {
      return NextResponse.json({
        ok: true,
        idempotent: true,
        receipt_id: receipt.id,
        expense_id: receipt.expense_id,
      })
    }

    if (receipt.status === 'discarded') {
      return NextResponse.json(
        { error: 'This receipt was discarded — re-scan it if you want to record it.' },
        { status: 409 },
      )
    }

    const body = await request.json() as {
      vendor?: string
      amount?: number
      date?: string
      category?: string
      description?: string
      paymentMethod?: string
      notes?: string | null
    }

    // Validate the user-edited fields.
    const vendor = sanitiseText(body.vendor ?? receipt.vendor ?? null)
    const amountNum = Number(body.amount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }

    const dateStr = (typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date))
      ? body.date
      : receipt.receipt_date
    if (!dateStr) {
      return NextResponse.json({ error: 'Receipt date is required (YYYY-MM-DD)' }, { status: 400 })
    }

    const category = (typeof body.category === 'string' && (ALLOWED_CATEGORIES as readonly string[]).includes(body.category))
      ? body.category
      : 'Other'

    const description = sanitiseText(body.description ?? vendor ?? 'Receipt')
    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const paymentMethod = (typeof body.paymentMethod === 'string' && (ALLOWED_PAYMENT_METHODS as readonly string[]).includes(body.paymentMethod))
      ? body.paymentMethod
      : 'Cash'

    const notes = sanitiseText(body.notes ?? null)

    const admin = getSupabaseAdmin()

    // Insert the business_expenses row first; on success link back from
    // the receipt. If the link update fails we have an orphan expense
    // (correct expense, missing audit pointer) which is preferable to
    // an orphan receipt (no expense, user thinks it was saved).
    const { data: expense, error: expenseErr } = await admin
      .from('business_expenses')
      .insert({
        user_id: user.id,
        business_id: receipt.business_id,
        date: dateStr,
        category,
        description,
        amount: amountNum,
        payment_method: paymentMethod,
        notes,
      })
      .select('id')
      .single()

    if (expenseErr || !expense) {
      console.error('[expense-ocr PATCH] expense insert failed:', expenseErr)
      return NextResponse.json(
        { error: `Could not save expense: ${expenseErr?.message ?? 'unknown error'}` },
        { status: 500 },
      )
    }

    const expenseId = (expense as { id: string }).id

    const { error: linkErr } = await admin
      .from('expense_receipts')
      .update({
        status: 'reviewed',
        expense_id: expenseId,
        // Persist the user's edits back to the receipt row so the audit
        // trail reflects the committed values, not just the raw extraction.
        vendor,
        amount: amountNum,
        receipt_date: dateStr,
        suggested_category: category,
      })
      .eq('id', receipt.id)

    if (linkErr) {
      console.error('[expense-ocr PATCH] link update failed (orphan expense exists):', linkErr)
      // Don't 500 — the user's expense is saved. Surface a soft warning.
      return NextResponse.json({
        ok: true,
        receipt_id: receipt.id,
        expense_id: expenseId,
        warning: 'Expense saved, but the receipt link could not be updated. The expense is correct; the audit pointer is missing.',
      })
    }

    return NextResponse.json({
      ok: true,
      receipt_id: receipt.id,
      expense_id: expenseId,
    })
  } catch (err) {
    console.error('[expense-ocr PATCH] threw:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not commit receipt' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const receipt = await loadReceipt(id, user.id)
    if (!receipt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })

    if (receipt.status === 'reviewed' && receipt.expense_id) {
      return NextResponse.json(
        { error: 'This receipt is already linked to an expense. Delete the expense from the Expenses page instead.' },
        { status: 409 },
      )
    }

    const admin = getSupabaseAdmin()

    // Best-effort: delete the storage object so we don't pay to host
    // discarded receipts. If this fails we still flip the row status —
    // a stale object is a minor annoyance, not a correctness issue.
    if (receipt.storage_path) {
      const { error: stErr } = await admin.storage.from('receipts').remove([receipt.storage_path])
      if (stErr) {
        console.warn('[expense-ocr DELETE] storage cleanup failed (continuing):', stErr)
      }
    }

    const { error: updErr } = await admin
      .from('expense_receipts')
      .update({ status: 'discarded' })
      .eq('id', receipt.id)

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[expense-ocr DELETE] threw:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not discard receipt' },
      { status: 500 },
    )
  }
}

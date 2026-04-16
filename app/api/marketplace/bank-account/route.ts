import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { sanitiseText } from '@/lib/sanitise'

/**
 * GET  /api/marketplace/bank-account — fetch current user's saved bank account
 * POST /api/marketplace/bank-account — save/update bank account + create Paystack transfer recipient
 */

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from('seller_bank_accounts')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ bank_account: data })
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const { success } = rateLimit(ip, { limit: 5, windowMs: 60_000 })
    if (!success) return rateLimitResponse()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as {
      bank_code: string
      account_number: string
    }

    const { bank_code, account_number } = body
    if (!bank_code || !account_number || account_number.length !== 10) {
      return NextResponse.json({ error: 'Valid bank code and 10-digit account number required' }, { status: 400 })
    }

    // Step 1: Resolve account name via Paystack
    const resolveRes = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    )
    const resolveData = await resolveRes.json()
    if (!resolveData.status) {
      return NextResponse.json(
        { error: resolveData.message ?? 'Could not verify account. Check details and try again.' },
        { status: 400 }
      )
    }
    const accountName = resolveData.data.account_name as string

    // Step 2: Get bank name from Paystack banks list (cached would be better, but fine for now)
    const banksRes = await fetch('https://api.paystack.co/bank', {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    })
    const banksData = await banksRes.json()
    const bank = (banksData.data as { code: string; name: string }[])
      ?.find(b => b.code === bank_code)
    const bankName = bank?.name ?? bank_code

    // Step 3: Create or update Paystack transfer recipient
    const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: accountName,
        account_number,
        bank_code,
        currency: 'NGN',
      }),
    })
    const recipientData = await recipientRes.json()
    if (!recipientData.status) {
      return NextResponse.json(
        { error: recipientData.message ?? 'Failed to create transfer recipient' },
        { status: 500 }
      )
    }
    const recipientCode = recipientData.data.recipient_code as string

    // Step 4: Upsert seller bank account in DB
    const admin = getSupabaseAdmin()
    const { error: dbError } = await admin
      .from('seller_bank_accounts')
      .upsert({
        user_id: user.id,
        bank_name: sanitiseText(bankName) ?? bankName,
        bank_code,
        account_number,
        account_name: accountName,
        recipient_code: recipientCode,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (dbError) {
      console.error('Bank account upsert failed:', dbError.message)
      return NextResponse.json({ error: 'Failed to save bank account' }, { status: 500 })
    }

    return NextResponse.json({
      bank_account: {
        bank_name: bankName,
        bank_code,
        account_number,
        account_name: accountName,
        recipient_code: recipientCode,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error('Bank account API error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

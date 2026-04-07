import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (adminClient as any)
      .from('settings')
      .select('key, value')

    const s = Object.fromEntries(
      ((data ?? []) as { key: string; value: string }[]).map(r => [r.key, r.value])
    )

    return NextResponse.json({
      monthlyNaira: parseInt(s['subscription_monthly_naira'] ?? '2500', 10),
      yearlyNaira:  parseInt(s['subscription_yearly_naira']  ?? '25000', 10),
      monthlyLabel: s['subscription_monthly_label'] ?? 'Monthly Verification',
      yearlyLabel:  s['subscription_yearly_label']  ?? 'Yearly Verification',
    })
  } catch {
    return NextResponse.json({
      monthlyNaira: 2500,
      yearlyNaira:  25000,
      monthlyLabel: 'Monthly Verification',
      yearlyLabel:  'Yearly Verification',
    })
  }
}

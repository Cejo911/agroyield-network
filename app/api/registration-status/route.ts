import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const { data } = await (getSupabaseAdmin() as any)
      .from('settings')
      .select('value')
      .eq('key', 'registration_enabled')
      .single()

    // Default to open if the setting hasn't been saved yet
    const enabled = data?.value !== 'false'
    return NextResponse.json({ enabled })
  } catch {
    return NextResponse.json({ enabled: true })
  }
}

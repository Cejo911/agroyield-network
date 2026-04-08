import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data } = await (adminClient as any)
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

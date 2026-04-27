import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export async function GET() {
  try {
    const admin = getSupabaseAdmin() as SupabaseClient<Database>
    const { data } = await admin
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

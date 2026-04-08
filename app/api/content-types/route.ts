import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DEFAULTS = {
  opportunity_types:      'grant,fellowship,job,partnership,internship,training',
  marketplace_categories: 'produce,inputs,equipment,livestock,services,other',
}

export async function GET() {
  try {
    const { data } = await (adminClient as any)
      .from('settings')
      .select('key, value')
      .in('key', ['opportunity_types', 'marketplace_categories'])

    const map: Record<string, string> = {}
    for (const row of (data ?? [])) map[row.key] = row.value

    const opportunityTypes = (map['opportunity_types'] ?? DEFAULTS.opportunity_types)
      .split(',').map((s: string) => s.trim()).filter(Boolean)

    const marketplaceCategories = (map['marketplace_categories'] ?? DEFAULTS.marketplace_categories)
      .split(',').map((s: string) => s.trim()).filter(Boolean)

    return NextResponse.json({ opportunityTypes, marketplaceCategories })
  } catch {
    return NextResponse.json({
      opportunityTypes:      DEFAULTS.opportunity_types.split(','),
      marketplaceCategories: DEFAULTS.marketplace_categories.split(','),
    })
  }
}

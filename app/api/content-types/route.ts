import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const DEFAULTS = {
  opportunity_types:      'job,internship,partnership,training,conference',
  marketplace_categories: 'produce,inputs,equipment,livestock,oil,services,other',
}

export async function GET() {
  try {
    const { data } = await (getSupabaseAdmin() as any)
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

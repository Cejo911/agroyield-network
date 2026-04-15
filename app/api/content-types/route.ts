import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const DEFAULTS = {
  opportunity_types:      ['Job', 'Internship', 'Partnership', 'Training', 'Conference'],
  marketplace_categories: ['Produce', 'Inputs', 'Equipment', 'Livestock', 'Oil', 'Services', 'Other'],
}

/** Parse a setting value that might be a JSON array string or a comma-separated string */
function parseList(raw: string | undefined, fallback: string[]): string[] {
  if (!raw) return fallback
  // Try JSON first (admin settings save as JSON.stringify([...]))
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
  } catch { /* not JSON, try comma-split */ }
  // Fallback: comma-separated
  const items = raw.split(',').map(s => s.trim()).filter(Boolean)
  return items.length > 0 ? items : fallback
}

export async function GET() {
  try {
    const { data } = await (getSupabaseAdmin() as any)
      .from('settings')
      .select('key, value')
      .in('key', ['opportunity_types', 'marketplace_categories'])

    const map: Record<string, string> = {}
    for (const row of (data ?? [])) map[row.key] = row.value

    return NextResponse.json({
      opportunityTypes:      parseList(map['opportunity_types'], DEFAULTS.opportunity_types),
      marketplaceCategories: parseList(map['marketplace_categories'], DEFAULTS.marketplace_categories),
    })
  } catch {
    return NextResponse.json({
      opportunityTypes:      DEFAULTS.opportunity_types,
      marketplaceCategories: DEFAULTS.marketplace_categories,
    })
  }
}

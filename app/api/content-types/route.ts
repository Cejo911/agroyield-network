import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { SAFE_DEFAULT_EXPENSE_CATEGORIES } from '@/lib/expense-categories'

const DEFAULTS = {
  opportunity_types:      ['Job', 'Internship', 'Partnership', 'Training', 'Conference'],
  marketplace_categories: ['Produce', 'Inputs', 'Equipment', 'Livestock', 'Oil', 'Services', 'Other'],
  // 19 Apr 2026: added so client components (e.g. app/business/expenses/page.tsx
  // which is `'use client'`) can fetch the admin-controlled list without
  // importing the server-only supabase admin client. Mirrors the single
  // source of truth in lib/expense-categories.ts.
  expense_categories:     [...SAFE_DEFAULT_EXPENSE_CATEGORIES],
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
      .in('key', ['opportunity_types', 'marketplace_categories', 'expense_categories'])

    const map: Record<string, string> = {}
    for (const row of (data ?? [])) map[row.key] = row.value

    return NextResponse.json({
      opportunityTypes:      parseList(map['opportunity_types'], DEFAULTS.opportunity_types),
      marketplaceCategories: parseList(map['marketplace_categories'], DEFAULTS.marketplace_categories),
      expenseCategories:     parseList(map['expense_categories'], DEFAULTS.expense_categories),
    })
  } catch {
    return NextResponse.json({
      opportunityTypes:      DEFAULTS.opportunity_types,
      marketplaceCategories: DEFAULTS.marketplace_categories,
      expenseCategories:     DEFAULTS.expense_categories,
    })
  }
}

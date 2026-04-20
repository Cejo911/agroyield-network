import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { globalSearch, countResults } from '@/lib/global-search'

/**
 * GET /api/search?q=<query>&limit=<n>
 *
 * Returns tab-grouped results + per-bucket counts. Used by the nav-bar
 * search dropdown for inline previews, and potentially by future
 * typeahead surfaces.
 *
 * Auth: requires a logged-in user — everything searchable today is
 * readable by any authenticated member. If we later expose search to
 * anonymous visitors, switch public surfaces (businesses, published
 * opportunities, etc.) to the service-role admin client rather than
 * removing the auth gate.
 */

const DEFAULT_LIMIT = 5
const MAX_LIMIT     = 20
const MAX_QUERY_LEN = 100

const emptyBody = (q: string) =>
  NextResponse.json({
    query: q,
    results: {
      profiles: [], opportunities: [], grants: [], marketplace_listings: [], businesses: [],
    },
    counts: {
      profiles: 0, opportunities: 0, grants: 0, marketplace_listings: 0, businesses: 0, total: 0,
    },
  })

export async function GET(request: NextRequest) {
  const q          = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, MAX_QUERY_LEN)
  const limitParam = request.nextUrl.searchParams.get('limit')
  const limit      = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(limitParam ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
  )

  if (q.length < 2) return emptyBody(q)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const results = await globalSearch(supabase, q, limit)
  const counts  = countResults(results)

  return NextResponse.json({ query: q, results, counts })
}

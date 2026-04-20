// Global site-wide search helper.
//
// Called from both the /search page (tab-grouped results) and the
// /api/search route (used by the nav-bar autocomplete / preview).
//
// The five searchable surfaces:
//   1. profiles              — member directory
//   2. opportunities         — jobs, fellowships, cross-posted grants
//   3. grants                — funding (status != 'closed')
//   4. marketplace_listings  — items for sale
//   5. businesses            — public agribusinesses
//
// Implementation notes:
//   • Uses OR-combined ILIKE against each searchable column. Trigram GIN
//     indexes from 20260420_global_search_trgm.sql accelerate these scans.
//   • Each surface applies its own visibility filter (is_active / is_public
//     / status) so drafts, closed items, and suspended businesses don't
//     leak through search.
//   • Per-surface limit keeps payload small for autocomplete-style callers;
//     the /search page over-fetches and paginates locally.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export type SearchProfile = {
  kind:         'profile'
  id:           string
  first_name:   string | null
  last_name:    string | null
  username:     string | null
  role:         string | null
  institution:  string | null
  avatar_url:   string | null
}

export type SearchOpportunity = {
  kind:         'opportunity'
  id:           string
  title:        string
  type:         string | null
  organisation: string | null
  location:     string | null
  deadline:     string | null
}

export type SearchGrant = {
  kind:         'grant'
  id:           string
  title:        string
  funder:       string
  category:     string | null
  region:       string | null
  deadline:     string | null
}

export type SearchMarketplaceListing = {
  kind:         'marketplace_listing'
  id:           string
  title:        string
  category:     string | null
  state:        string | null
  price:        number | null
}

export type SearchBusiness = {
  kind:         'business'
  id:           string
  slug:         string | null
  name:         string
  tagline:      string | null
  sector:       string | null
  state:        string | null
  is_verified:  boolean
}

export type GlobalSearchResults = {
  profiles:              SearchProfile[]
  opportunities:         SearchOpportunity[]
  grants:                SearchGrant[]
  marketplace_listings:  SearchMarketplaceListing[]
  businesses:            SearchBusiness[]
}

export type GlobalSearchCounts = {
  profiles:             number
  opportunities:        number
  grants:               number
  marketplace_listings: number
  businesses:           number
  total:                number
}

/**
 * Escape a raw user query for inclusion in an ILIKE pattern.
 *   - `_` and `%` are ILIKE wildcards; escape both so `john_doe` doesn't
 *     match any 7-character string starting with `john`.
 *   - `\` needs escaping because we pick it as our escape char in the
 *     generated pattern.
 */
export function escapeIlike(raw: string): string {
  return raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/**
 * Core site search. Returns the first `limit` rows per surface.
 *
 * Design choice: one round-trip per surface (5 queries) rather than a
 * single UNION RPC. The parallelism + simpler PostgREST filters cost less
 * in round-trip time than a bespoke SQL function would save, and keeps
 * the client-side TypeScript shape honest.
 */
export async function globalSearch(
  supabase: SupabaseClient,
  rawQuery: string,
  limit: number = 10
): Promise<GlobalSearchResults> {
  const empty: GlobalSearchResults = {
    profiles: [], opportunities: [], grants: [], marketplace_listings: [], businesses: [],
  }
  const q = rawQuery.trim()
  if (q.length < 2) return empty

  const pat = `%${escapeIlike(q)}%`

  const [profilesRes, opportunitiesRes, grantsRes, marketRes, businessRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, username, role, institution, avatar_url')
      .or(
        `first_name.ilike.${pat},last_name.ilike.${pat},username.ilike.${pat},role.ilike.${pat},institution.ilike.${pat},bio.ilike.${pat}`
      )
      .eq('is_suspended', false)
      .limit(limit),

    supabase
      .from('opportunities')
      .select('id, title, type, organisation, location, deadline')
      .or(
        `title.ilike.${pat},organisation.ilike.${pat},description.ilike.${pat},location.ilike.${pat}`
      )
      .eq('is_active', true)
      .eq('is_pending_review', false)
      .eq('is_closed', false)
      .order('created_at', { ascending: false })
      .limit(limit),

    supabase
      .from('grants')
      .select('id, title, funder, category, region, deadline')
      .or(
        `title.ilike.${pat},funder.ilike.${pat},description.ilike.${pat},region.ilike.${pat}`
      )
      .neq('status', 'closed')
      .order('created_at', { ascending: false })
      .limit(limit),

    supabase
      .from('marketplace_listings')
      .select('id, title, category, state, price')
      .or(
        `title.ilike.${pat},description.ilike.${pat},category.ilike.${pat},state.ilike.${pat}`
      )
      .eq('is_active', true)
      .eq('is_pending_review', false)
      .eq('is_closed', false)
      .order('created_at', { ascending: false })
      .limit(limit),

    supabase
      .from('businesses')
      .select('id, slug, name, tagline, sector, state, is_verified')
      .or(
        `name.ilike.${pat},tagline.ilike.${pat},about.ilike.${pat},sector.ilike.${pat},state.ilike.${pat}`
      )
      .eq('is_public', true)
      .order('is_verified', { ascending: false })
      .limit(limit),
  ])

  return {
    profiles: (profilesRes.data ?? []).map((r: Record<string, unknown>) => ({
      kind:         'profile' as const,
      id:           r.id as string,
      first_name:   (r.first_name as string) ?? null,
      last_name:    (r.last_name  as string) ?? null,
      username:     (r.username   as string) ?? null,
      role:         (r.role       as string) ?? null,
      institution:  (r.institution as string) ?? null,
      avatar_url:   (r.avatar_url as string) ?? null,
    })),
    opportunities: (opportunitiesRes.data ?? []).map((r: Record<string, unknown>) => ({
      kind:         'opportunity' as const,
      id:           r.id as string,
      title:        r.title as string,
      type:         (r.type as string) ?? null,
      organisation: (r.organisation as string) ?? null,
      location:     (r.location as string) ?? null,
      deadline:     (r.deadline as string) ?? null,
    })),
    grants: (grantsRes.data ?? []).map((r: Record<string, unknown>) => ({
      kind:     'grant' as const,
      id:       r.id as string,
      title:    r.title as string,
      funder:   r.funder as string,
      category: (r.category as string) ?? null,
      region:   (r.region as string) ?? null,
      deadline: (r.deadline as string) ?? null,
    })),
    marketplace_listings: (marketRes.data ?? []).map((r: Record<string, unknown>) => ({
      kind:     'marketplace_listing' as const,
      id:       r.id as string,
      title:    r.title as string,
      category: (r.category as string) ?? null,
      state:    (r.state as string) ?? null,
      price:    typeof r.price === 'number' ? (r.price as number) : null,
    })),
    businesses: (businessRes.data ?? []).map((r: Record<string, unknown>) => ({
      kind:         'business' as const,
      id:           r.id as string,
      slug:         (r.slug as string) ?? null,
      name:         r.name as string,
      tagline:      (r.tagline as string) ?? null,
      sector:       (r.sector as string) ?? null,
      state:        (r.state as string) ?? null,
      is_verified:  !!r.is_verified,
    })),
  }
}

/**
 * Summarise a result set into per-bucket counts + a total. Used for the
 * tab-row badges on /search. Cheap — it's just array lengths.
 */
export function countResults(results: GlobalSearchResults): GlobalSearchCounts {
  return {
    profiles:             results.profiles.length,
    opportunities:        results.opportunities.length,
    grants:               results.grants.length,
    marketplace_listings: results.marketplace_listings.length,
    businesses:           results.businesses.length,
    total:                results.profiles.length
                        + results.opportunities.length
                        + results.grants.length
                        + results.marketplace_listings.length
                        + results.businesses.length,
  }
}

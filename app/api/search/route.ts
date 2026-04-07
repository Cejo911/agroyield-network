import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const supabase = await createClient()
  const p = `%${q}%`

  const [people, opps, listings, research] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, role, institution')
      .or(`first_name.ilike.${p},last_name.ilike.${p},institution.ilike.${p}`)
      .limit(5),

    supabase
      .from('opportunities')
      .select('id, title, organisation, type')
      .or(`title.ilike.${p},organisation.ilike.${p}`)
      .limit(5),

    supabase
      .from('listings')
      .select('id, title, category')
      .or(`title.ilike.${p},category.ilike.${p}`)
      .limit(5),

    supabase
      .from('research_posts')
      .select('id, title, abstract')
      .or(`title.ilike.${p},abstract.ilike.${p}`)
      .limit(5),
  ])

  return NextResponse.json({
    results: {
      people: (people.data ?? []).map(p => ({
        id: p.id,
        title: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unnamed member',
        subtitle: [p.role, p.institution].filter(Boolean).join(' · '),
        href: `/directory/${p.id}`,
      })),
      opportunities: (opps.data ?? []).map(o => ({
        id: o.id,
        title: o.title,
        subtitle: [o.type, o.organisation].filter(Boolean).join(' · '),
        href: `/opportunities/${o.id}`,
      })),
      listings: (listings.data ?? []).map(l => ({
        id: l.id,
        title: l.title,
        subtitle: l.category,
        href: `/marketplace/${l.id}`,
      })),
      research: (research.data ?? []).map(r => ({
        id: r.id,
        title: r.title,
        subtitle: r.abstract ? r.abstract.slice(0, 90) + '…' : undefined,
        href: `/research/${r.id}`,
      })),
    },
  })
}

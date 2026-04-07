import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const supabase = await createClient()
  const pattern = `%${q}%`

  const [people, opps, listings, research] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, role, institution')
      .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},institution.ilike.${pattern}`)
      .limit(5),

    supabase
      .from('opportunities')
      .select('id, title, organisation, type')
      .or(`title.ilike.${pattern},organisation.ilike.${pattern}`)
      .limit(5),

    supabase
      .from('listings')
      .select('id, title, category')
      .or(`title.ilike.${pattern},category.ilike.${pattern}`)
      .limit(5),

    supabase
      .from('research_posts')
      .select('id, title, abstract')
      .or(`title.ilike.${pattern},abstract.ilike.${pattern}`)
      .limit(5),
  ])

  return NextResponse.json({
    results: {
      people: (people.data ?? []).map(member => ({
        id: member.id,
        title: `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim() || 'Unnamed member',
        subtitle: [member.role, member.institution].filter(Boolean).join(' · '),
        href: `/directory/${member.id}`,
      })),
      opportunities: (opps.data ?? []).map(opp => ({
        id: opp.id,
        title: opp.title,
        subtitle: [opp.type, opp.organisation].filter(Boolean).join(' · '),
        href: `/opportunities/${opp.id}`,
      })),
      listings: (listings.data ?? []).map(listing => ({
        id: listing.id,
        title: listing.title,
        subtitle: listing.category,
        href: `/marketplace/${listing.id}`,
      })),
      research: (research.data ?? []).map(post => ({
        id: post.id,
        title: post.title,
        subtitle: post.abstract ? `${post.abstract.slice(0, 90)}…` : undefined,
        href: `/research/${post.id}`,
      })),
    },
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sanitiseText } from '@/lib/sanitise'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

/**
 * /api/business-reviews
 *
 * POST   — reviewer creates a new review of a business (/b/{slug} write modal).
 * PATCH  — either:
 *            (a) the original reviewer edits their review, or
 *            (b) the business owner posts a seller_reply.
 *          We detect which by comparing auth.uid() to the reviewer_id /
 *          businesses.user_id. Admins moderate via the Reports tab + the
 *          extended /api/report flow; they do not use this route.
 *
 * Writes go through the service-role admin client so we can give callers
 * cleaner error messages than RLS's generic 403 (e.g. the unique-index
 * collision when someone tries to review the same business twice) — but the
 * ownership / self-review / auth checks are still enforced here, and RLS
 * remains the defence-in-depth layer as per scratchpad #31.
 */

const MAX_HEADLINE = 150
const MAX_BODY = 4000
const MAX_SELLER_REPLY = 2000

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Rate limit: 3 reviews per user per 24h. Keyed on user id so a user can't
    // bypass by rotating IP, and so one abusive IP can't block an office.
    const rl = rateLimit(`business-review:${user.id}`, {
      limit: 3,
      windowMs: 24 * 60 * 60 * 1000,
    })
    if (!rl.success) return rateLimitResponse()

    const body = await request.json() as {
      businessId: string
      rating:     number
      headline?:  string | null
      body?:      string | null
    }

    const { businessId, rating } = body

    if (!businessId || typeof businessId !== 'string') {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 })
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'rating must be an integer 1–5' }, { status: 400 })
    }

    const headline = sanitiseText(body.headline)
    const reviewBody = sanitiseText(body.body)
    if (headline && headline.length > MAX_HEADLINE) {
      return NextResponse.json({ error: `headline too long (max ${MAX_HEADLINE})` }, { status: 400 })
    }
    if (reviewBody && reviewBody.length > MAX_BODY) {
      return NextResponse.json({ error: `body too long (max ${MAX_BODY})` }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = getAdminClient() as any

    // Block self-review: check the business exists and the caller does not own it.
    const { data: biz, error: bizErr } = await adminAny.from('businesses')
      .select('id, user_id').eq('id', businessId).maybeSingle()
    if (bizErr) {
      return NextResponse.json({ error: bizErr.message }, { status: 500 })
    }
    if (!biz) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    if ((biz as { user_id: string }).user_id === user.id) {
      return NextResponse.json({ error: "You can't review your own business" }, { status: 403 })
    }

    const { data: inserted, error: insertErr } = await adminAny
      .from('business_reviews')
      .insert({
        business_id: businessId,
        reviewer_id: user.id,
        rating,
        headline,
        body: reviewBody,
      })
      .select('id')
      .single()

    if (insertErr) {
      // 23505 = unique_violation — user already reviewed this business
      if ((insertErr as { code?: string }).code === '23505') {
        return NextResponse.json(
          { error: 'You have already reviewed this business. Edit your existing review instead.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: (inserted as { id: string }).id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as {
      reviewId:     string
      rating?:      number
      headline?:    string | null
      body?:        string | null
      sellerReply?: string | null
    }

    const { reviewId } = body
    if (!reviewId || typeof reviewId !== 'string') {
      return NextResponse.json({ error: 'reviewId required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = getAdminClient() as any

    // Load the review + the owning business in one trip so we can branch
    // between reviewer-edit and owner-reply.
    const { data: review, error: reviewErr } = await adminAny
      .from('business_reviews')
      .select('id, business_id, reviewer_id, businesses!inner(user_id)')
      .eq('id', reviewId)
      .maybeSingle()

    if (reviewErr) {
      return NextResponse.json({ error: reviewErr.message }, { status: 500 })
    }
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    const r = review as {
      id: string
      business_id: string
      reviewer_id: string
      businesses: { user_id: string } | { user_id: string }[]
    }
    const ownerId = Array.isArray(r.businesses) ? r.businesses[0]?.user_id : r.businesses.user_id
    const isReviewer = r.reviewer_id === user.id
    const isOwner    = ownerId === user.id

    if (!isReviewer && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Reviewer edit path — can update rating / headline / body.
    if (isReviewer) {
      if (body.sellerReply !== undefined) {
        return NextResponse.json({ error: "Reviewers can't set seller_reply" }, { status: 400 })
      }

      const updates: Record<string, unknown> = {}

      if (body.rating !== undefined) {
        if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
          return NextResponse.json({ error: 'rating must be an integer 1–5' }, { status: 400 })
        }
        updates.rating = body.rating
      }

      if (body.headline !== undefined) {
        const headline = sanitiseText(body.headline)
        if (headline && headline.length > MAX_HEADLINE) {
          return NextResponse.json({ error: `headline too long (max ${MAX_HEADLINE})` }, { status: 400 })
        }
        updates.headline = headline
      }

      if (body.body !== undefined) {
        const reviewBody = sanitiseText(body.body)
        if (reviewBody && reviewBody.length > MAX_BODY) {
          return NextResponse.json({ error: `body too long (max ${MAX_BODY})` }, { status: 400 })
        }
        updates.body = reviewBody
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
      }

      const { error: updateErr } = await adminAny
        .from('business_reviews').update(updates).eq('id', reviewId)
      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true })
    }

    // Owner reply path — can only set seller_reply. Not the reviewer, and we
    // refuse changes to the review content itself.
    if (body.rating !== undefined || body.headline !== undefined || body.body !== undefined) {
      return NextResponse.json({ error: "Owners can't edit the review content" }, { status: 400 })
    }

    const sellerReply = sanitiseText(body.sellerReply)
    if (!sellerReply) {
      return NextResponse.json({ error: 'seller reply required' }, { status: 400 })
    }
    if (sellerReply.length > MAX_SELLER_REPLY) {
      return NextResponse.json({ error: `seller reply too long (max ${MAX_SELLER_REPLY})` }, { status: 400 })
    }

    const { error: replyErr } = await adminAny.from('business_reviews').update({
      seller_reply: sellerReply,
      replied_at:   new Date().toISOString(),
    }).eq('id', reviewId)

    if (replyErr) {
      return NextResponse.json({ error: replyErr.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

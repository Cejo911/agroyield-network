// app/api/business/upload/route.ts
//
// Server-side upload endpoint for business logo and cover images.
//
// Why this exists
// ---------------
// Direct supabase.storage.from('business-logos').upload(...) calls from
// the browser hit storage.objects RLS. The configured INSERT policy has
// two conditions OR'd together:
//   A. (storage.foldername(name))[1] = auth.uid()::text
//   B. (storage.foldername(name))[1] IN (SELECT b.id::text FROM
//      public.businesses WHERE b.user_id = auth.uid())
//
// In production, condition B silently fails (likely due to an out-of-band
// RLS or policy change on public.businesses), and even after switching the
// upload path to satisfy condition A, the upload still gets rejected. The
// runtime cause isn't visible from our debugging surface.
//
// This endpoint sidesteps the policy entirely: authenticate the user via
// the SSR cookie, verify ownership of the target business via the admin
// client, then perform the upload with the service-role admin client
// (which bypasses storage RLS by design). Same security model, just
// enforced in application code instead of via policy.
//
// Request
// -------
// POST /api/business/upload
//   Content-Type: multipart/form-data
//   Fields:
//     file       — the image file (required)
//     kind       — 'logo' | 'cover' (required)
//     businessId — string (optional). If absent, uploaded to a temp path
//                  under <userId>/new_<ts>/, used during first-time setup
//                  before the business row exists.
//
// Response
// --------
// 200 → { publicUrl: string, path: string }
// 400 → invalid form data
// 401 → not authed
// 403 → user does not own the businessId
// 413 → file too large (>10 MB; matches the bucket's typical limit)
// 415 → not an image MIME type
// 500 → upload failed
//
// Notes
// -----
// - We always write under <userId>/<businessId|new_ts>/<kind>.<ext>.
//   Existing covers/logos at the legacy <businessId>/... paths keep
//   rendering through bucket.public=true; on re-upload we write the new
//   path and the businesses row's logo_url / cover_image_url is updated
//   by the form save (server returns the public URL; client puts it in
//   form state and the existing PATCH/UPSERT writes it).
// - upsert:true so re-uploads to the same path overwrite cleanly.
// - We rate-limit lightly per IP to keep this in line with the rest of
//   the API surface; image uploads are bursty but not high-frequency.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_KINDS = new Set(['logo', 'cover'])
const ALLOWED_MIME_PREFIX = 'image/' // accept any image/* — bucket has its own MIME filter for the canonical list
const RATE_LIMIT_UPLOADS = 20
const RATE_WINDOW_MS = 60_000

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  )
}

export async function POST(request: NextRequest) {
  // 1. Rate limit (per IP, lightweight).
  const { success } = rateLimit(getIp(request), {
    limit: RATE_LIMIT_UPLOADS,
    windowMs: RATE_WINDOW_MS,
  })
  if (!success) return rateLimitResponse()

  // 2. Auth via SSR cookie.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3. Parse multipart form data.
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = form.get('file')
  const kind = form.get('kind')
  const businessIdRaw = form.get('businessId')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (typeof kind !== 'string' || !ALLOWED_KINDS.has(kind)) {
    return NextResponse.json(
      { error: 'kind must be "logo" or "cover"' },
      { status: 400 },
    )
  }
  const businessId =
    typeof businessIdRaw === 'string' && businessIdRaw.length > 0
      ? businessIdRaw
      : null

  // 4. File guards.
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 413 },
    )
  }
  if (!file.type.startsWith(ALLOWED_MIME_PREFIX)) {
    return NextResponse.json(
      { error: 'Only image files are allowed' },
      { status: 415 },
    )
  }

  // 5. Ownership check (when targeting an existing business).
  // Done with the admin client so RLS state on public.businesses can't
  // silently exclude the row — the same property that makes the storage
  // policy's condition B unreliable in prod is what we're sidestepping.
  // We re-implement the security check here in code, explicitly.
  const admin = getSupabaseAdmin()
  if (businessId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = admin as any
    const { data: biz, error: bizErr } = await adminAny
      .from('businesses')
      .select('id, user_id')
      .eq('id', businessId)
      .maybeSingle()
    if (bizErr) {
      console.error('[business/upload] business lookup failed:', bizErr)
      return NextResponse.json(
        { error: 'Failed to verify business ownership' },
        { status: 500 },
      )
    }
    if (!biz) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    if (biz.user_id !== user.id) {
      // Team-member access (accountant/staff) is not permitted to mutate
      // the public marketing assets — only the owner can. Mirrors
      // canEditSetup() in lib/business-access.ts.
      return NextResponse.json(
        { error: 'Only the business owner can update the logo or cover' },
        { status: 403 },
      )
    }
  }

  // 6. Compute storage path. Always under <userId>/ so the file is
  //    namespaced to the uploader; <businessId>/ subfolder when known,
  //    a timestamp-based subfolder for first-time setup.
  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const subfolder = businessId ?? `new_${Date.now()}`
  const path = `${user.id}/${subfolder}/${kind}.${ext}`

  // 7. Upload via service-role admin client. RLS bypass is the whole
  //    point of this endpoint — we've already enforced ownership above.
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadErr } = await admin.storage
    .from('business-logos')
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadErr) {
    console.error('[business/upload] storage upload failed:', {
      path,
      kind,
      businessId,
      userId: user.id,
      message: uploadErr.message,
    })
    return NextResponse.json(
      { error: uploadErr.message || 'Upload failed' },
      { status: 500 },
    )
  }

  // 8. Resolve public URL. business-logos has bucket.public=true so this
  //    URL is directly fetchable by browsers without auth.
  const {
    data: { publicUrl },
  } = admin.storage.from('business-logos').getPublicUrl(path)

  return NextResponse.json({ publicUrl, path })
}

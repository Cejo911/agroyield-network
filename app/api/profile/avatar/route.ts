// app/api/profile/avatar/route.ts
//
// Server-side upload endpoint for the user's profile avatar.
//
// Why this exists
// ---------------
// Direct supabase.storage.from('avatars').upload(...) calls from the
// browser hit the storage.objects RLS policy "Upload own avatar":
//   WITH CHECK (bucket_id = 'avatars'
//               AND auth.uid()::text = split_part(name, '.', 1))
//
// The path the client sends is correct ('<auth-uid>.<ext>') and the
// policy looks right. But the upload still gets rejected with
// "new row violates row-level security policy". That can only happen
// when auth.uid() is NULL on the storage server — i.e. the JWT the
// browser-side supabase client should be attaching to its storage
// requests isn't reaching the server in some environments. The same
// class of bug bit business-logos (tasks #48, #49); the same pattern
// fixes it: route the upload through a server-side endpoint that
// (a) reads the auth session from cookies (which works), and
// (b) uses the service-role admin client to write to storage
// (which bypasses storage RLS by design — we re-implement the
// security check here in code).
//
// Request
// -------
// POST /api/profile/avatar
//   Content-Type: multipart/form-data
//   Fields:
//     file — the image file (required)
//
// Response
// --------
// 200 → { publicUrl: string, path: string }
// 400 → invalid form data
// 401 → not authed
// 413 → file too large (>2 MB; matches the existing client-side cap)
// 415 → not an image MIME type
// 500 → upload failed
//
// Notes
// -----
// - We keep the legacy flat path `<userId>.<ext>` (no folder) so any
//   existing avatar URLs on profiles already render correctly without
//   a one-shot migration. The 5 historical avatars in the bucket all
//   use this shape.
// - upsert:true so re-uploads cleanly replace previous photos.
// - The caller is responsible for persisting the returned publicUrl
//   into profiles.avatar_url via the existing profile-form save path.
//   We do NOT update the row from this endpoint to keep concerns
//   separated (one HTTP, one mutation).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB — matches the long-standing client-side cap
const ALLOWED_MIME_PREFIX = 'image/'
const RATE_LIMIT_UPLOADS = 10 // user shouldn't upload more than ~10 avatars/min in any sane flow
const RATE_WINDOW_MS = 60_000

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  )
}

export async function POST(request: NextRequest) {
  // 1. Rate-limit per IP.
  const { success } = rateLimit(getIp(request), {
    limit: RATE_LIMIT_UPLOADS,
    windowMs: RATE_WINDOW_MS,
  })
  if (!success) return rateLimitResponse()

  // 2. Auth via SSR cookie. Whatever's broken about the browser
  //    storage client's JWT propagation, this server-side path
  //    works — same auth source the rest of the app's server
  //    components use to render the page.
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
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }

  // 4. File guards. Same MIME + size constraints the client enforces,
  //    repeated here as defence-in-depth in case the browser-side
  //    checks were bypassed.
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

  // 5. Compute storage path — legacy flat shape `<userId>.<ext>`.
  //    Lowercased extension so an iOS .JPG doesn't create a different
  //    object than the existing .jpg (would orphan the older one).
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${user.id}.${ext}`

  // 6. Upload via service-role admin client — bypasses storage RLS.
  //    Ownership has already been enforced above (the path is
  //    derived from the authed user's uid, full stop; the user
  //    cannot upload to anyone else's path).
  const admin = getSupabaseAdmin()
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadErr } = await admin.storage
    .from('avatars')
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadErr) {
    console.error('[profile/avatar] storage upload failed:', {
      path,
      userId: user.id,
      message: uploadErr.message,
    })
    return NextResponse.json(
      { error: uploadErr.message || 'Upload failed' },
      { status: 500 },
    )
  }

  // 7. Resolve public URL. avatars bucket is public=true so the URL
  //    is directly fetchable without auth.
  const {
    data: { publicUrl },
  } = admin.storage.from('avatars').getPublicUrl(path)

  return NextResponse.json({ publicUrl, path })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { getEffectiveTier } from '@/lib/tiers'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { checkQuota, incrementUsage, getMonthlyUsage, USAGE_LIMITS } from '@/lib/usage-tracking'

/**
 * Expense OCR API (Unicorn #5).
 *
 * POST /api/expense-ocr
 *   Accepts a multipart/form-data upload with a single `receipt` image.
 *   Runs the receipt through Anthropic Vision (Claude Haiku — cheapest
 *   vision-capable model, sufficient for printed receipt text), returns
 *   a `pending` row in expense_receipts for the user to review.
 *
 * GET /api/expense-ocr
 *   Lists pending + recent receipts for the active business, plus the
 *   current month's usage (used / limit / remaining). Used by the UI to
 *   render the scan-receipt modal's usage counter.
 *
 * Gates layered in order:
 *   1. Rate limit (5/min/user) — protects against upload-bombing.
 *   2. Auth — must be signed in.
 *   3. Admin kill-switch (`expense_ocr_enabled` setting) — emergency stop.
 *   4. Feature flag (`expense_ocr`) — staged rollout.
 *   5. Business ownership — can only scan for a business you own.
 *   6. Tier quota (Free 20/mo, Pro 100/mo, Growth unlimited) — paywall.
 *   7. File validation (mime, size) — reject oversized / wrong-type.
 *
 * Only step 6 is counted against the user's monthly quota, and only
 * AFTER the Vision extraction succeeds. Pre-extraction rejections don't
 * burn quota — see scratchpad note in lib/usage-tracking.ts.
 */

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'

// The Nigerian agri expense category vocabulary. Vision is asked to
// pick one of these so downstream charts/filters don't fragment.
// Mirrors CATEGORIES in app/business/expenses/page.tsx — keep in sync.
const EXPENSE_CATEGORIES = [
  'Input Costs',
  'Transport & Logistics',
  'Labour & Wages',
  'Market Fees & Commissions',
  'Equipment & Maintenance',
  'Rent & Storage',
  'Utilities',
  'Marketing & Advertising',
  'Professional Services',
  'Other',
] as const

interface VisionExtraction {
  vendor: string | null
  amount: number | null
  receipt_date: string | null   // YYYY-MM-DD
  vat_amount: number | null
  suggested_category: string | null
  confidence: number | null
  notes: string | null
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function todayIso(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

function extFromMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'bin'
}

/**
 * Call Anthropic Messages API with a single image + structured prompt.
 * We use fetch rather than the SDK for two reasons: (a) one less prod
 * dependency to pin/update, (b) matches the existing Resend-via-fetch
 * pattern in app/api/cron/weekly-digest/route.ts.
 */
async function callVision(
  imageBase64: string,
  mimeType: string,
): Promise<{ extraction: VisionExtraction; raw: unknown; model: string } | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { error: 'ANTHROPIC_API_KEY not configured on server' }
  }

  const prompt = [
    'You are extracting structured data from a Nigerian retail receipt photo.',
    'Return ONLY valid JSON matching this exact shape (no prose, no markdown fences):',
    '{',
    '  "vendor": string | null,            // vendor/store name as printed',
    '  "amount": number | null,            // TOTAL amount in Naira (NOT subtotal). Strip ₦ and commas.',
    '  "receipt_date": string | null,      // ISO YYYY-MM-DD. Null if unreadable.',
    '  "vat_amount": number | null,        // VAT line amount if printed separately, else null',
    '  "suggested_category": string | null,// One of: ' + EXPENSE_CATEGORIES.join(', '),
    '  "confidence": number | null,        // Your confidence 0.0..1.0 that vendor+amount are correct',
    '  "notes": string | null              // Brief note if something is ambiguous (e.g. "total partially obscured")',
    '}',
    '',
    'Rules:',
    '- If the image is not a receipt, set all fields to null and confidence=0.',
    '- Use null, not "N/A" or "unknown", for missing fields.',
    '- Amounts must be plain numbers (e.g. 15000.50 not "₦15,000.50").',
    '- suggested_category MUST be one of the listed categories or null.',
  ].join('\n')

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mimeType, data: imageBase64 },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    })

    const raw = await res.json().catch(() => ({}))

    if (!res.ok) {
      return { error: (raw as { error?: { message?: string } })?.error?.message ?? `Vision API ${res.status}` }
    }

    // Response shape: { content: [{ type: 'text', text: '...' }] }
    const content = (raw as { content?: Array<{ type: string; text?: string }> }).content
    const textPart = content?.find((c) => c.type === 'text')?.text
    if (!textPart) {
      return { error: 'Vision returned no text content' }
    }

    // Vision is instructed to return bare JSON, but be defensive about
    // stray markdown fences or leading commentary.
    const jsonMatch = textPart.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : textPart

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      return { error: 'Vision response was not valid JSON' }
    }

    const obj = parsed as Record<string, unknown>
    const extraction: VisionExtraction = {
      vendor: typeof obj.vendor === 'string' ? obj.vendor.trim().slice(0, 200) : null,
      amount: typeof obj.amount === 'number' && Number.isFinite(obj.amount) && obj.amount >= 0 ? obj.amount : null,
      receipt_date:
        typeof obj.receipt_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.receipt_date)
          ? obj.receipt_date
          : null,
      vat_amount: typeof obj.vat_amount === 'number' && Number.isFinite(obj.vat_amount) && obj.vat_amount >= 0 ? obj.vat_amount : null,
      suggested_category:
        typeof obj.suggested_category === 'string' &&
        (EXPENSE_CATEGORIES as readonly string[]).includes(obj.suggested_category)
          ? obj.suggested_category
          : null,
      confidence:
        typeof obj.confidence === 'number' && Number.isFinite(obj.confidence)
          ? Math.max(0, Math.min(1, obj.confidence))
          : null,
      notes: typeof obj.notes === 'string' ? obj.notes.trim().slice(0, 500) : null,
    }

    return { extraction, raw, model: DEFAULT_MODEL }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Vision call failed' }
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const businessId = request.nextUrl.searchParams.get('businessId')
  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  const admin = getSupabaseAdmin()

  // Business ownership check.
  const { data: biz } = await admin
    .from('businesses')
    .select('id, user_id')
    .eq('id', businessId)
    .maybeSingle()
  if (!biz || (biz as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Business not found or not yours' }, { status: 403 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_tier, subscription_expires_at')
    .eq('id', user.id)
    .maybeSingle()
  const tier = getEffectiveTier((profile as Record<string, unknown> | null) ?? {})

  const used = await getMonthlyUsage(businessId, 'expense_ocr')
  const limit = USAGE_LIMITS.expense_ocr[tier] ?? null

  const { data: receipts } = await admin
    .from('expense_receipts')
    .select('id, vendor, amount, receipt_date, vat_amount, suggested_category, status, receipt_url, confidence_score, created_at, expense_id')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    usage: { used, limit, remaining: limit === null ? null : Math.max(0, limit - used) },
    tier,
    receipts: receipts ?? [],
  })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const limit = rateLimit(`exp-ocr:${ip}`, { limit: 5, windowMs: 60_000 })
  if (!limit.success) return rateLimitResponse()

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Parse multipart form data. Next 16 runtime wraps Request properly.
    const form = await request.formData()
    const file = form.get('receipt')
    const businessId = form.get('businessId')

    if (typeof businessId !== 'string' || !businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 })
    }
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'receipt file required' }, { status: 400 })
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: 'Receipt must be a JPEG, PNG, or WebP image' },
        { status: 400 },
      )
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Receipt too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.` },
        { status: 400 },
      )
    }

    const admin = getSupabaseAdmin()

    // Admin kill-switch.
    const { data: killSwitch } = await admin
      .from('settings')
      .select('value')
      .eq('key', 'expense_ocr_enabled')
      .maybeSingle()
    if (killSwitch && (killSwitch as { value: string }).value !== 'true') {
      return NextResponse.json(
        { error: 'Receipt scanning is temporarily disabled. Please try again later.' },
        { status: 503 },
      )
    }

    // Feature flag gate (staged rollout).
    const flagOn = await isFeatureEnabled('expense_ocr', { userId: user.id, businessId })
    if (!flagOn) {
      return NextResponse.json(
        { error: "Receipt scanning isn't available for your account yet" },
        { status: 403 },
      )
    }

    // Business ownership check (defence-in-depth with RLS).
    const { data: biz } = await admin
      .from('businesses')
      .select('id, user_id')
      .eq('id', businessId)
      .maybeSingle()
    if (!biz || (biz as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Business not found or not yours' }, { status: 403 })
    }

    // Tier gate.
    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_tier, subscription_expires_at')
      .eq('id', user.id)
      .maybeSingle()
    const tier = getEffectiveTier((profile as Record<string, unknown> | null) ?? {})
    const quota = await checkQuota(businessId, 'expense_ocr', tier)
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: quota.reason ?? 'Monthly receipt scan quota reached',
          used: quota.used,
          limit: quota.limit,
          upgradeToTier: quota.upgradeToTier,
        },
        { status: 402 },
      )
    }

    // Upload to Supabase Storage — path convention matches the receipts
    // bucket policy in the migration: {businessId}/{uuid}.{ext}
    const ext = extFromMime(file.type)
    const fileId = crypto.randomUUID()
    const storagePath = `${businessId}/${fileId}.${ext}`

    const arrayBuf = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuf)

    const { error: uploadErr } = await admin.storage
      .from('receipts')
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      })
    if (uploadErr) {
      console.error('[expense-ocr] upload failed:', uploadErr)
      return NextResponse.json(
        { error: `Could not save receipt: ${uploadErr.message}` },
        { status: 500 },
      )
    }

    // Signed URL so the review UI can render the image without making the
    // bucket public. 1-hour lifetime is plenty for the review flow.
    const { data: signed } = await admin.storage
      .from('receipts')
      .createSignedUrl(storagePath, 60 * 60)
    const receiptUrl = signed?.signedUrl ?? ''

    // Call Vision with the image bytes we already have in memory.
    // Convert to base64 in Node (Buffer is available in the Next runtime).
    const base64 = Buffer.from(bytes).toString('base64')
    const visionResult = await callVision(base64, file.type)

    if ('error' in visionResult) {
      // Store a failed row so the user sees it in the list with a retry hint.
      // This does NOT increment the usage counter — failed extractions are free.
      const { data: failedRow } = await admin
        .from('expense_receipts')
        .insert({
          business_id: businessId,
          user_id: user.id,
          receipt_url: receiptUrl,
          storage_path: storagePath,
          mime_type: file.type,
          file_size_bytes: file.size,
          extraction_error: visionResult.error,
          model_used: DEFAULT_MODEL,
          status: 'failed',
        })
        .select()
        .single()

      return NextResponse.json(
        {
          error: `Could not read receipt: ${visionResult.error}`,
          receipt: failedRow ?? null,
        },
        { status: 502 },
      )
    }

    const { extraction, raw, model } = visionResult

    const { data: receiptRow, error: insertErr } = await admin
      .from('expense_receipts')
      .insert({
        business_id: businessId,
        user_id: user.id,
        receipt_url: receiptUrl,
        storage_path: storagePath,
        mime_type: file.type,
        file_size_bytes: file.size,
        vendor: extraction.vendor,
        amount: extraction.amount,
        receipt_date: extraction.receipt_date ?? todayIso(),
        vat_amount: extraction.vat_amount,
        suggested_category: extraction.suggested_category,
        raw_extraction: raw as Record<string, unknown>,
        confidence_score: extraction.confidence,
        model_used: model,
        status: 'pending',
      })
      .select()
      .single()

    if (insertErr || !receiptRow) {
      console.error('[expense-ocr] insert failed:', insertErr)
      return NextResponse.json(
        { error: `Could not save extraction: ${insertErr?.message ?? 'unknown error'}` },
        { status: 500 },
      )
    }

    // Only increment usage on a successful extraction.
    const newCount = await incrementUsage(businessId, user.id, 'expense_ocr')

    return NextResponse.json({
      receipt: receiptRow,
      extraction,
      usage: {
        used: newCount ?? quota.used + 1,
        limit: quota.limit,
        remaining: quota.limit === null ? null : Math.max(0, quota.limit - (newCount ?? quota.used + 1)),
      },
    })
  } catch (err) {
    console.error('[expense-ocr] POST threw:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Receipt scan failed' },
      { status: 500 },
    )
  }
}

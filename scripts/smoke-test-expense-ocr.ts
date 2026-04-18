#!/usr/bin/env tsx
/**
 * Smoke test for /api/expense-ocr
 * ================================
 *
 * Verifies the full round-trip: Vercel route → Anthropic Vision → Supabase Storage
 * → Postgres row insert → usage_tracking counter increment, plus idempotent DELETE
 * cleanup. Intentionally lightweight — pure Node 18+ fetch, no deps, no SDKs.
 *
 * Setup
 * -----
 * 1. Sign in to your app in a normal browser tab so Supabase sets an auth cookie.
 * 2. Open DevTools → Application → Cookies → pick the app domain.
 * 3. Find the `sb-<project-ref>-auth-token` cookie. If the session is large it
 *    splits into `sb-...-auth-token.0` and `sb-...-auth-token.1`. Copy ALL parts.
 * 4. Export env vars (paste the full Cookie header-style string in single quotes):
 *
 *    export TARGET_URL=https://agroyield.africa        # or http://localhost:3000
 *    export AUTH_COOKIE='sb-xxx-auth-token.0=...; sb-xxx-auth-token.1=...'
 *    export BUSINESS_ID='<uuid of a business you own>'
 *    # optional:
 *    export RECEIPT_PATH=./fixtures/sample-receipt.jpg # use a real receipt photo
 *    export CLEANUP=false                              # keep the row + file for inspection
 *    export VERBOSE=true                               # echo every URL + raw JSON
 *
 * Run
 * ---
 *    npx tsx scripts/smoke-test-expense-ocr.ts
 *
 * Notes
 * -----
 * - If RECEIPT_PATH is omitted, the script falls back to a 1×1 placeholder JPEG.
 *   That still verifies the endpoint wiring (auth → flag → quota → upload → Vision
 *   call → DB insert), but the Vision call will likely return an empty extraction
 *   and the API will record `status='failed'`. That's expected — it exercises the
 *   failure path and confirms quota is NOT incremented on failure.
 * - Use a real receipt JPEG for an end-to-end success test (expect status='pending',
 *   a filled vendor/amount, and the counter to move by exactly 1).
 * - Rate limit is 5 POSTs per minute per IP. Back off if you're iterating fast.
 */

import fs from 'node:fs'
import path from 'node:path'

const TARGET_URL = (process.env.TARGET_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const AUTH_COOKIE = process.env.AUTH_COOKIE
const BUSINESS_ID = process.env.BUSINESS_ID
const RECEIPT_PATH = process.env.RECEIPT_PATH
const CLEANUP = process.env.CLEANUP !== 'false'
const VERBOSE = process.env.VERBOSE === 'true'

// Minimal valid 1x1 JPEG (~125 bytes, base64-encoded). Not a real receipt — wiring test only.
const PLACEHOLDER_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////' +
  '////////////////////////////////////////////2wBDAf///////////////////////' +
  '/////////////////////////////////////////////////////////////////////wAA' +
  'RCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAA' +
  'AAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAM' +
  'AwEAAhEDEQA/AL+AH//Z'

type Json = Record<string, unknown>

function fail(msg: string, data?: unknown): never {
  console.error(`\n✗ ${msg}`)
  if (data !== undefined) console.error(data)
  process.exit(1)
}

function ok(msg: string) {
  console.log(`  ✓ ${msg}`)
}

function warn(msg: string) {
  console.warn(`  ⚠ ${msg}`)
}

function detectMime(name: string): string {
  const ext = path.extname(name).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  // fall through — if the user hands us an oddball extension we'll still try
  return 'image/jpeg'
}

async function apiFetch(pathname: string, init: RequestInit = {}): Promise<Response> {
  const url = TARGET_URL + pathname
  if (VERBOSE) console.log(`    → ${init.method ?? 'GET'} ${url}`)
  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Cookie: AUTH_COOKIE!,
    },
  })
}

async function main() {
  if (!AUTH_COOKIE) fail('Missing AUTH_COOKIE env var. See setup notes at top of file.')
  if (!BUSINESS_ID) fail('Missing BUSINESS_ID env var. Paste the UUID of a business you own.')

  // Resolve the receipt
  const fileBuf = RECEIPT_PATH
    ? fs.readFileSync(path.resolve(RECEIPT_PATH))
    : Buffer.from(PLACEHOLDER_JPEG_B64, 'base64')
  const fileName = RECEIPT_PATH ? path.basename(RECEIPT_PATH) : 'placeholder.jpg'
  const mimeType = detectMime(fileName)

  console.log('───── AgroYield Expense OCR Smoke Test ─────')
  console.log(`Target      : ${TARGET_URL}`)
  console.log(`Business ID : ${BUSINESS_ID}`)
  console.log(`File        : ${fileName} (${fileBuf.length.toLocaleString()} bytes, ${mimeType})`)
  console.log(`Cleanup     : ${CLEANUP ? 'on' : 'off'}`)
  console.log('─────────────────────────────────────────────\n')

  // ──────────────────────────────────────────────────────────────────────────
  // Step 1: Preflight GET — confirm we can read usage + list receipts
  // ──────────────────────────────────────────────────────────────────────────
  console.log('▶ Step 1: GET /api/expense-ocr (preflight)')
  const pre = await apiFetch(`/api/expense-ocr?businessId=${encodeURIComponent(BUSINESS_ID)}`)
  const preJson: Json = await pre.json().catch(() => ({}))
  if (!pre.ok) fail(`Preflight failed (HTTP ${pre.status})`, preJson)

  const preUsage = (preJson.usage as Json | undefined) ?? {}
  const preUsed = Number(preUsage.used ?? 0)
  const preLimit = preUsage.limit == null ? '∞' : String(preUsage.limit)
  const preTier = String(preJson.tier ?? 'unknown')
  const preCount = Array.isArray(preJson.receipts) ? preJson.receipts.length : 0
  ok(`tier=${preTier}  usage=${preUsed}/${preLimit}  existing receipts=${preCount}`)
  console.log('')

  // ──────────────────────────────────────────────────────────────────────────
  // Step 2: POST the receipt — the money call
  // ──────────────────────────────────────────────────────────────────────────
  console.log('▶ Step 2: POST /api/expense-ocr (upload + Vision extraction)')
  const form = new FormData()
  form.append('businessId', BUSINESS_ID!)
  form.append('receipt', new Blob([new Uint8Array(fileBuf)], { type: mimeType }), fileName)

  const t0 = Date.now()
  const postRes = await apiFetch('/api/expense-ocr', { method: 'POST', body: form })
  const elapsed = Date.now() - t0
  const postJson: Json = await postRes.json().catch(() => ({}))
  if (VERBOSE) console.log('    raw:', JSON.stringify(postJson, null, 2))

  const receipt = (postJson.receipt as Json | undefined) ?? {}
  const receiptId = receipt.id as string | undefined
  const receiptStatus = receipt.status as string | undefined

  if (!postRes.ok) {
    // Vision extraction failures return non-2xx but still insert a row with status='failed'.
    // That's correct behaviour — treat as a soft failure and continue to postflight so we can
    // assert the quota invariant and clean up the row.
    if (receiptId && receiptStatus === 'failed') {
      warn(`POST returned HTTP ${postRes.status} with status='failed' in ${elapsed} ms — Vision could not extract (expected for placeholder / unreadable images)`)
    } else {
      fail(`POST failed (HTTP ${postRes.status}) after ${elapsed} ms`, postJson)
    }
  } else {
    ok(`POST succeeded in ${elapsed} ms`)
  }

  console.log(`    id          : ${receiptId ?? '(none)'}`)
  console.log(`    status      : ${receiptStatus ?? '(none)'}`)
  console.log(`    vendor      : ${receipt.vendor ?? '(none)'}`)
  console.log(`    amount      : ${receipt.amount ?? '(none)'}`)
  console.log(`    receipt_date: ${receipt.receipt_date ?? '(none)'}`)
  console.log(`    vat_amount  : ${receipt.vat_amount ?? '(none)'}`)
  console.log(`    category    : ${receipt.suggested_category ?? '(none)'}`)
  console.log(`    confidence  : ${receipt.confidence_score ?? '(none)'}`)
  console.log(`    model       : ${receipt.model_used ?? '(none)'}`)
  console.log(`    storage     : ${receipt.storage_path ?? '(none)'}`)
  if (receipt.extraction_error) {
    warn(`extraction_error: ${receipt.extraction_error}`)
  }
  console.log('')

  // ──────────────────────────────────────────────────────────────────────────
  // Step 3: Postflight GET — verify DB write + quota behaviour
  // ──────────────────────────────────────────────────────────────────────────
  console.log('▶ Step 3: GET /api/expense-ocr (postflight)')
  const post = await apiFetch(`/api/expense-ocr?businessId=${encodeURIComponent(BUSINESS_ID)}`)
  const postJson2: Json = await post.json().catch(() => ({}))
  if (!post.ok) fail(`Postflight failed (HTTP ${post.status})`, postJson2)

  const postUsage = (postJson2.usage as Json | undefined) ?? {}
  const postUsed = Number(postUsage.used ?? 0)
  const delta = postUsed - preUsed
  console.log(`    usage: ${preUsed} → ${postUsed}  (Δ ${delta >= 0 ? '+' : ''}${delta})`)

  const receipts = Array.isArray(postJson2.receipts) ? (postJson2.receipts as Json[]) : []
  const found = receiptId ? receipts.find((r) => r.id === receiptId) : undefined
  if (found) ok(`receipt ${receiptId} appears in list (DB write confirmed)`)
  else warn(`receipt ${receiptId ?? '(no id)'} NOT found in list — DB write may have failed`)

  // Quota behaviour asserts
  if (receiptStatus === 'pending' && delta === 1) {
    ok('quota incremented by 1 on successful extraction — correct')
  } else if (receiptStatus === 'pending' && delta !== 1) {
    warn(`expected Δ=1 for pending status, got Δ=${delta}`)
  } else if (receiptStatus === 'failed' && delta === 0) {
    ok('quota did NOT increment on failed extraction — correct')
  } else if (receiptStatus === 'failed' && delta !== 0) {
    warn(`failed extraction should NOT burn quota, but Δ=${delta}`)
  } else {
    warn(`unexpected status/delta combo: status=${receiptStatus} delta=${delta}`)
  }
  console.log('')

  // ──────────────────────────────────────────────────────────────────────────
  // Step 4: DELETE cleanup (opt-out with CLEANUP=false)
  // ──────────────────────────────────────────────────────────────────────────
  if (CLEANUP && receiptId) {
    console.log('▶ Step 4: DELETE /api/expense-ocr/:id (cleanup)')
    const del = await apiFetch(`/api/expense-ocr/${receiptId}`, { method: 'DELETE' })
    const delJson: Json = await del.json().catch(() => ({}))
    if (del.ok) ok('receipt discarded + storage object removed')
    else warn(`DELETE returned HTTP ${del.status}: ${JSON.stringify(delJson)}`)
  } else if (!CLEANUP) {
    console.log('▶ Step 4: skipped (CLEANUP=false) — row + storage object left in place for inspection')
  } else {
    warn('no receipt id returned — skipping cleanup')
  }
  console.log('')

  console.log('✅ Smoke test complete.\n')
  console.log('Next checks in Supabase Dashboard:')
  console.log(`  • Table editor → expense_receipts → filter business_id = ${BUSINESS_ID}`)
  console.log('  • Table editor → usage_tracking → filter feature_key = expense_ocr (period = current YYYY-MM)')
  console.log('  • Storage → receipts bucket → look for the uploaded file under the business-id folder')
}

main().catch((err) => {
  console.error('\n✗ Smoke test threw:')
  console.error(err)
  process.exit(1)
})

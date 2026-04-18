#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# peek-receipt.sh
#
# Upload a receipt via the smoke test with CLEANUP=off, then pretty-print every
# receipt currently on file for $BUSINESS_ID and offer to open the latest signed
# URL in your browser. Handy for eyeballing "what did Vision actually see?"
# next to the original photo.
#
# Reuses the same env vars as the smoke test:
#   TARGET_URL, AUTH_COOKIE, BUSINESS_ID
#
# Usage:
#   ./scripts/peek-receipt.sh path/to/receipt.jpg
#
# Or with no args — skip the upload and just list what's already there:
#   ./scripts/peek-receipt.sh
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

: "${TARGET_URL:?Export TARGET_URL first (e.g. https://agroyield.africa)}"
: "${AUTH_COOKIE:?Export AUTH_COOKIE first (from DevTools > Cookies > sb-*-auth-token.0 + .1)}"
: "${BUSINESS_ID:?Export BUSINESS_ID first (UUID of a business you own)}"

if ! command -v jq >/dev/null 2>&1; then
  echo "✗ jq is not installed. macOS: brew install jq" >&2
  exit 1
fi

# ─── Step 1: Optional upload ─────────────────────────────────────────────────
if [[ $# -ge 1 ]]; then
  RECEIPT_PATH="$1"
  if [[ ! -f "$RECEIPT_PATH" ]]; then
    echo "✗ File not found: $RECEIPT_PATH" >&2
    exit 1
  fi
  echo "▶ Uploading $RECEIPT_PATH via smoke test (CLEANUP=off)…"
  echo ""
  CLEANUP=false RECEIPT_PATH="$RECEIPT_PATH" npx tsx scripts/smoke-test-expense-ocr.ts
  echo ""
else
  echo "▶ No file argument — listing existing receipts only."
  echo ""
fi

# ─── Step 2: Fetch the current list ──────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════════════"
echo "  Receipts for business $BUSINESS_ID"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""

RESP=$(curl -sS -H "Cookie: $AUTH_COOKIE" \
  "$TARGET_URL/api/expense-ocr?businessId=$BUSINESS_ID")

COUNT=$(echo "$RESP" | jq '.receipts | length')
TIER=$(echo "$RESP" | jq -r '.tier')
USED=$(echo "$RESP" | jq -r '.usage.used')
LIMIT=$(echo "$RESP" | jq -r '.usage.limit // "unlimited"')

echo "tier=$TIER   usage=$USED/$LIMIT   receipts on file=$COUNT"
echo ""

if [[ "$COUNT" == "0" ]]; then
  echo "(no receipts — either the list is empty or they were auto-cleaned)"
  exit 0
fi

# ─── Step 3: Pretty-print top 5, newest first ────────────────────────────────
echo "$RESP" | jq -r '
  .receipts[:5]
  | to_entries[]
  | "─── #\(.key + 1) ─────────────────────────────────────────────────────
id            : \(.value.id)
status        : \(.value.status)
created_at    : \(.value.created_at)
vendor        : \(.value.vendor // "(none)")
amount        : ₦\(.value.amount // "(none)")
receipt_date  : \(.value.receipt_date // "(none)")
vat_amount    : ₦\(.value.vat_amount // "(none)")
category      : \(.value.suggested_category // "(none)")
confidence    : \(.value.confidence_score // "(none)")
model         : \(.value.model_used // "(none)")
extract_error : \(.value.extraction_error // "(none — clean extraction)")
storage_path  : \(.value.storage_path)
"'

# ─── Step 4: Offer to open the latest signed image ───────────────────────────
LATEST_URL=$(echo "$RESP" | jq -r '.receipts[0].receipt_url // empty')
if [[ -n "$LATEST_URL" ]]; then
  echo ""
  echo "📎 Signed URL for receipt #1 (valid ~1 hour):"
  echo "$LATEST_URL"
  echo ""
  if command -v open >/dev/null 2>&1; then
    read -r -p "Open the image in your browser? [y/N] " REPLY
    if [[ "$REPLY" =~ ^[Yy]$ ]]; then
      open "$LATEST_URL"
    fi
  fi
fi

echo ""
echo "✨ Done. Check Supabase → Table editor → expense_receipts to confirm persistence."

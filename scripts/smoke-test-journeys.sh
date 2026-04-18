#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# smoke-test-journeys.sh
#
# Hits the critical public + authed routes and reports HTTP status + timing.
# Use this before flipping any feature flag for Beta to confirm the whole app
# still renders and the GET API endpoints respond.
#
# Reuses the same env vars as smoke-test-expense-ocr.ts:
#   TARGET_URL, AUTH_COOKIE, BUSINESS_ID
#
# Usage:
#   ./scripts/smoke-test-journeys.sh
#
# Optional env:
#   STRICT=1   exit non-zero if ANY check fails (default: report only)
#   QUIET=1    only print failures
# ──────────────────────────────────────────────────────────────────────────────

set -o pipefail   # NB: no -e, no -u — we want to keep running after individual failures (macOS bash 3.2 hates empty-array expansion under -u)

: "${TARGET_URL:?Export TARGET_URL first (e.g. https://agroyield.africa)}"
: "${AUTH_COOKIE:?Export AUTH_COOKIE first}"
: "${BUSINESS_ID:?Export BUSINESS_ID first}"

STRICT="${STRICT:-0}"
QUIET="${QUIET:-0}"

# Color helpers (no-op if not a TTY)
if [[ -t 1 ]]; then
  GREEN=$'\033[32m'; RED=$'\033[31m'; YELLOW=$'\033[33m'; DIM=$'\033[2m'; RESET=$'\033[0m'
else
  GREEN=''; RED=''; YELLOW=''; DIM=''; RESET=''
fi

pass=0
fail=0
warn=0
declare -a FAILED_ROUTES

# check <label> <expected_status> <auth: pub|priv> <method> <path>
check() {
  local label="$1" expected="$2" auth="$3" method="$4" path="$5"
  local url="$TARGET_URL$path"
  local cookie_arg=()
  [[ "$auth" == "priv" ]] && cookie_arg=(-H "Cookie: $AUTH_COOKIE")

  local t0 t1 elapsed status
  # macOS `date` can't do milliseconds — use python3 for portable ms precision
  t0=$(python3 -c 'import time; print(int(time.time()*1000))')
  status=$(curl -sS -o /dev/null -w '%{http_code}' -X "$method" "${cookie_arg[@]+"${cookie_arg[@]}"}" "$url" 2>/dev/null || echo "000")
  t1=$(python3 -c 'import time; print(int(time.time()*1000))')
  elapsed=$((t1 - t0))

  # Accept 200, 304 always; accept 30x for redirects on public pages; allow override via $expected
  local ok=0
  if [[ "$status" == "$expected" ]]; then
    ok=1
  elif [[ "$expected" == "2xx" && "$status" =~ ^2[0-9][0-9]$ ]]; then
    ok=1
  elif [[ "$expected" == "2xx-3xx" && "$status" =~ ^[23][0-9][0-9]$ ]]; then
    ok=1
  fi

  if [[ $ok -eq 1 ]]; then
    pass=$((pass + 1))
    [[ "$QUIET" == "1" ]] || printf '  %s✓%s %-44s %s%4sms %s%3s%s\n' \
      "$GREEN" "$RESET" "$label" "$DIM" "$elapsed" "$DIM" "$status" "$RESET"
  else
    fail=$((fail + 1))
    FAILED_ROUTES+=("$label → $method $path → got $status, expected $expected")
    printf '  %s✗%s %-44s %s%4sms %s%3s%s  expected %s\n' \
      "$RED" "$RESET" "$label" "$DIM" "$elapsed" "$RED" "$status" "$RESET" "$expected"
  fi
}

echo "═══════════════════════════════════════════════════════════════════════"
echo "  AgroYield Pre-Beta Smoke Test"
echo "  Target: $TARGET_URL"
echo "  Business ID: $BUSINESS_ID"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""

# ─── Public pages — render for unauth visitors ──────────────────────────────
echo "▶ Public pages (no auth)"
check "Landing"            "2xx-3xx" pub GET "/"
check "About"              "2xx-3xx" pub GET "/about"
check "Pricing"            "2xx-3xx" pub GET "/pricing"
check "Directory"          "2xx-3xx" pub GET "/directory"
check "Marketplace"        "2xx-3xx" pub GET "/marketplace"
check "Opportunities"      "2xx-3xx" pub GET "/opportunities"
check "Grants"             "2xx-3xx" pub GET "/grants"
check "Research"           "2xx-3xx" pub GET "/research"
check "Prices"             "2xx-3xx" pub GET "/prices"
check "FAQ"                "2xx-3xx" pub GET "/faq"
check "Privacy"            "2xx-3xx" pub GET "/privacy"
check "Terms"              "2xx-3xx" pub GET "/terms"
check "Contact"            "2xx-3xx" pub GET "/contact"
check "Signup"             "2xx-3xx" pub GET "/signup"
echo ""

# ─── Authed pages — render with cookie ──────────────────────────────────────
echo "▶ Authed pages (with cookie)"
check "Dashboard"          "2xx-3xx" priv GET "/dashboard"
check "Business overview"  "2xx-3xx" priv GET "/business"
check "Business setup"     "2xx-3xx" priv GET "/business/setup"
check "Invoices list"      "2xx-3xx" priv GET "/business/invoices"
check "New invoice"        "2xx-3xx" priv GET "/business/invoices/new"
check "Recurring invoices" "2xx-3xx" priv GET "/business/invoices/recurring"
check "Expenses"           "2xx-3xx" priv GET "/business/expenses"
check "Customers"          "2xx-3xx" priv GET "/business/customers"
check "Products"           "2xx-3xx" priv GET "/business/products"
check "Reports"            "2xx-3xx" priv GET "/business/reports"
check "Team"               "2xx-3xx" priv GET "/business/team"
check "Messages"           "2xx-3xx" priv GET "/messages"
check "Admin"              "2xx-3xx" priv GET "/admin"
echo ""

# ─── GET API endpoints ───────────────────────────────────────────────────────
echo "▶ GET API endpoints (with cookie + business id)"
check "Expense OCR list"   "200" priv GET "/api/expense-ocr?businessId=$BUSINESS_ID"
check "Business benchmarks" "200" priv GET "/api/business/benchmarks?business_id=$BUSINESS_ID&period=month"
check "Search (q=fish)"    "200" priv GET "/api/search?q=fish"
echo ""

# ─── Summary ────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════════════"
total=$((pass + fail))
if [[ $fail -eq 0 ]]; then
  echo "  ${GREEN}✅  $pass/$total checks passed${RESET}"
else
  echo "  ${RED}✗  $fail/$total checks failed${RESET}  (${GREEN}$pass passed${RESET})"
  echo ""
  echo "  Failed routes:"
  for line in "${FAILED_ROUTES[@]}"; do
    echo "    • $line"
  done
fi
echo "═══════════════════════════════════════════════════════════════════════"

if [[ "$STRICT" == "1" && $fail -gt 0 ]]; then
  exit 1
fi
exit 0

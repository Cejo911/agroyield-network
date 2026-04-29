#!/usr/bin/env bash
# ============================================================================
# scripts/apply-migrations.sh
#
# Diffs supabase/migrations/*.sql against the public._applied_migrations
# tracking table and applies any pending files via psql, then records each
# successful apply with sha256.
#
# Used by .github/workflows/db-migrate-prod.yml. Also runnable locally
# against a preview branch with DATABASE_URL pointing at the branch's
# pooler URL — useful for staging a migration before merge.
#
# Required env:
#   DATABASE_URL  — Postgres connection string with INSERT privileges on
#                   public._applied_migrations (pooler URL, port 6543, with
#                   the service-role-equivalent DB password).
#
# Optional env:
#   DRY_RUN=1     — prints "would apply" list without executing.
#                   No psql writes, no tracking inserts.
#   APPLIED_BY    — overrides the tracking row's applied_by column.
#                   Defaults to 'github_action'. Useful when running
#                   locally with APPLIED_BY=manual_sql_editor.
#
# Exit codes:
#   0   — no pending migrations OR all pending migrations applied cleanly
#   1   — argument / environment error
#   2   — content drift detected (a tracked file has been edited since
#         apply); operator must investigate before re-running
#   3   — psql apply failed for at least one file; details printed inline
# ============================================================================
set -euo pipefail

MIGRATIONS_DIR="${MIGRATIONS_DIR:-supabase/migrations}"
APPLIED_BY="${APPLIED_BY:-github_action}"
DRY_RUN="${DRY_RUN:-0}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL not set" >&2
  exit 1
fi

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "ERROR: migrations dir not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql not on PATH" >&2
  exit 1
fi

# ----------------------------------------------------------------------------
# 1. Collect repo files
# ----------------------------------------------------------------------------
mapfile -t REPO_FILES < <(
  find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' -printf '%f\n' | sort
)

if [[ ${#REPO_FILES[@]} -eq 0 ]]; then
  echo "No .sql files in $MIGRATIONS_DIR — nothing to do."
  exit 0
fi

echo "Found ${#REPO_FILES[@]} repo migration files."

# ----------------------------------------------------------------------------
# 2. Pull tracked filenames + sha256 from prod
# ----------------------------------------------------------------------------
# psql writes a TSV: filename<TAB>sha256_or_empty
TRACKED_TSV=$(psql "$DATABASE_URL" \
  --no-psqlrc --quiet --no-align --field-separator=$'\t' --tuples-only \
  -c "SELECT filename, COALESCE(content_sha256, '') FROM public._applied_migrations;"
)

declare -A TRACKED_SHA
while IFS=$'\t' read -r fname sha; do
  [[ -z "$fname" ]] && continue
  TRACKED_SHA["$fname"]="$sha"
done <<< "$TRACKED_TSV"

echo "Tracking table reports ${#TRACKED_SHA[@]} applied files."

# ----------------------------------------------------------------------------
# 3. Classify each repo file as PENDING / APPLIED / DRIFT
# ----------------------------------------------------------------------------
PENDING=()
DRIFT=()

for fname in "${REPO_FILES[@]}"; do
  full="$MIGRATIONS_DIR/$fname"
  this_sha=$(sha256sum "$full" | awk '{print $1}')

  if [[ -z "${TRACKED_SHA[$fname]+_}" ]]; then
    PENDING+=("$fname:$this_sha")
  else
    stored_sha="${TRACKED_SHA[$fname]}"
    # Empty stored_sha means baseline_reconcile — we never recorded a
    # hash for those files. Treat as "trust the baseline" and skip
    # drift comparison; future re-applies will populate sha256.
    if [[ -n "$stored_sha" && "$stored_sha" != "$this_sha" ]]; then
      DRIFT+=("$fname (file=$this_sha, tracked=$stored_sha)")
    fi
  fi
done

# ----------------------------------------------------------------------------
# 4. If any drift, refuse to apply anything — operator must reconcile first
# ----------------------------------------------------------------------------
if [[ ${#DRIFT[@]} -gt 0 ]]; then
  echo "" >&2
  echo "============================================================" >&2
  echo "CONTENT DRIFT DETECTED — refusing to apply." >&2
  echo "" >&2
  echo "These files have been edited after being applied:" >&2
  for d in "${DRIFT[@]}"; do
    echo "  - $d" >&2
  done
  echo "" >&2
  echo "Editing an applied migration in place is unsafe — production" >&2
  echo "doesn't see the new content. Create a NEW migration that" >&2
  echo "makes the desired change, OR (rare) reconcile by manually" >&2
  echo "running the new content + UPDATEing _applied_migrations." >&2
  echo "============================================================" >&2
  exit 2
fi

# ----------------------------------------------------------------------------
# 5. Nothing pending — done
# ----------------------------------------------------------------------------
if [[ ${#PENDING[@]} -eq 0 ]]; then
  echo "All ${#REPO_FILES[@]} repo migrations are already applied. Nothing to do."
  exit 0
fi

echo ""
echo "${#PENDING[@]} pending migration(s):"
for entry in "${PENDING[@]}"; do
  echo "  - ${entry%%:*}"
done

if [[ "$DRY_RUN" == "1" ]]; then
  echo ""
  echo "DRY_RUN=1 set — exiting without applying."
  exit 0
fi

# ----------------------------------------------------------------------------
# 6. Apply each pending migration in filename order, recording each on success
# ----------------------------------------------------------------------------
FAILED=()

for entry in "${PENDING[@]}"; do
  fname="${entry%%:*}"
  this_sha="${entry##*:}"
  full="$MIGRATIONS_DIR/$fname"

  echo ""
  echo "→ Applying $fname"

  # Single-transaction apply. ON_ERROR_STOP halts the script on any error.
  if psql "$DATABASE_URL" --no-psqlrc --quiet \
      --set=ON_ERROR_STOP=1 \
      --single-transaction \
      -f "$full"; then
    # Record successful apply
    psql "$DATABASE_URL" --no-psqlrc --quiet -c \
      "INSERT INTO public._applied_migrations (filename, applied_by, content_sha256)
       VALUES ('$fname', '$APPLIED_BY', '$this_sha');"
    echo "  ✓ applied + recorded"
  else
    echo "  ✗ FAILED — see psql output above" >&2
    FAILED+=("$fname")
    # Stop on first failure — don't apply further migrations after a break.
    break
  fi
done

# ----------------------------------------------------------------------------
# 7. Summary
# ----------------------------------------------------------------------------
echo ""
echo "============================================================"
applied_count=$((${#PENDING[@]} - ${#FAILED[@]}))
echo "Applied: $applied_count of ${#PENDING[@]} pending"
if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo "FAILED:" >&2
  for f in "${FAILED[@]}"; do echo "  - $f" >&2; done
  exit 3
fi
echo "============================================================"

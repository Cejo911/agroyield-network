#!/usr/bin/env bash
#
# gh-api.sh — GitHub REST API helper for AgroYield Network.
#
# Why this exists: there is no first-party GitHub MCP in the Cowork registry yet.
# Until one ships, programmatic GitHub access goes through curl + Personal Access
# Token. This script wraps the most common queries we'd otherwise hand-type.
#
# Setup: see docs/runbooks/github-pat-setup.md.
# Token resolution order:
#   1. $GITHUB_TOKEN environment variable
#   2. .env.local (project root) GITHUB_TOKEN=...
#
# Usage:
#   ./scripts/gh-api.sh <subcommand> [args]
#
# Subcommands:
#   list-prs                 List open PRs (number, title, author, age)
#   pr <number>              Show one PR's details (mergeable, checks, reviews)
#   pr-checks <number>       Show check runs for a PR's head SHA
#   ci-status [branch]       Latest workflow run for branch (default: main)
#   branch-protection [b]    Current protection rules for branch (default: main)
#   stale-prs [days]         PRs with no activity for N days (default: 7)
#   rate-limit               Show current GitHub API rate-limit budget
#   help                     This message
#
# All output is JSON unless the subcommand explicitly formats. Pipe through `jq`
# for filtering. Read-only — no subcommand mutates repo state.

set -euo pipefail

# ---------- config ----------
OWNER="Cejo911"
REPO="agroyield-network"
API="https://api.github.com"
ACCEPT="application/vnd.github+json"
API_VERSION="2022-11-28"

# ---------- token resolution ----------
resolve_token() {
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    return 0
  fi
  # Try .env.local at repo root.
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  if [[ -f "$script_dir/.env.local" ]]; then
    # Source only the GITHUB_TOKEN line — don't pollute env with other vars.
    GITHUB_TOKEN="$(grep -E '^GITHUB_TOKEN=' "$script_dir/.env.local" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
    export GITHUB_TOKEN
  fi
  if [[ -z "${GITHUB_TOKEN:-}" ]]; then
    echo "Error: GITHUB_TOKEN not set." >&2
    echo "  Either: export GITHUB_TOKEN=github_pat_..." >&2
    echo "  Or:     add GITHUB_TOKEN=github_pat_... to .env.local" >&2
    echo "  See:    docs/runbooks/github-pat-setup.md" >&2
    exit 1
  fi
}

# ---------- core curl wrapper ----------
gh_get() {
  local path="$1"
  curl -fsSL \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: $ACCEPT" \
    -H "X-GitHub-Api-Version: $API_VERSION" \
    "$API$path"
}

# ---------- subcommands ----------
sub_help() {
  sed -n '/^# Usage:/,/^# All output/p' "$0" | sed 's/^# \?//'
}

sub_list_prs() {
  gh_get "/repos/$OWNER/$REPO/pulls?state=open&per_page=50&sort=created&direction=desc" \
    | jq -r '.[] | "#\(.number)\t\(.user.login)\t\(.title)\t(\(.created_at | sub("T.*"; ""))) \(if .draft then "[DRAFT]" else "" end)"' \
    || gh_get "/repos/$OWNER/$REPO/pulls?state=open&per_page=50"
}

sub_pr() {
  local n="${1:?pr number required}"
  gh_get "/repos/$OWNER/$REPO/pulls/$n"
}

sub_pr_checks() {
  local n="${1:?pr number required}"
  local sha
  sha="$(gh_get "/repos/$OWNER/$REPO/pulls/$n" | jq -r '.head.sha')"
  if [[ -z "$sha" || "$sha" == "null" ]]; then
    echo "Error: could not resolve head SHA for PR #$n" >&2
    exit 1
  fi
  gh_get "/repos/$OWNER/$REPO/commits/$sha/check-runs"
}

sub_ci_status() {
  local branch="${1:-main}"
  gh_get "/repos/$OWNER/$REPO/actions/runs?branch=$branch&per_page=5" \
    | jq -r '.workflow_runs[] | "\(.created_at | sub("T"; " ") | sub("Z"; ""))\t\(.name)\t\(.status)\t\(.conclusion // "—")\t\(.html_url)"'
}

sub_branch_protection() {
  local branch="${1:-main}"
  gh_get "/repos/$OWNER/$REPO/branches/$branch/protection" \
    || echo "(no protection rules — or token lacks 'administration:read' permission)"
}

sub_stale_prs() {
  local days="${1:-7}"
  local cutoff
  cutoff="$(date -u -d "$days days ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
    || date -u -v-"${days}"d +%Y-%m-%dT%H:%M:%SZ)"
  gh_get "/repos/$OWNER/$REPO/pulls?state=open&per_page=50&sort=updated&direction=asc" \
    | jq -r --arg cutoff "$cutoff" '.[] | select(.updated_at < $cutoff) | "#\(.number)\t\(.updated_at | sub("T.*"; ""))\t\(.user.login)\t\(.title)"'
}

sub_rate_limit() {
  gh_get "/rate_limit" | jq '.resources.core'
}

# ---------- dispatch ----------
main() {
  local cmd="${1:-help}"
  shift || true

  if [[ "$cmd" != "help" ]]; then
    resolve_token
  fi

  case "$cmd" in
    help|-h|--help)         sub_help ;;
    list-prs)               sub_list_prs "$@" ;;
    pr)                     sub_pr "$@" ;;
    pr-checks)              sub_pr_checks "$@" ;;
    ci-status)              sub_ci_status "$@" ;;
    branch-protection)      sub_branch_protection "$@" ;;
    stale-prs)              sub_stale_prs "$@" ;;
    rate-limit)             sub_rate_limit ;;
    *)
      echo "Unknown subcommand: $cmd" >&2
      sub_help >&2
      exit 1
      ;;
  esac
}

main "$@"

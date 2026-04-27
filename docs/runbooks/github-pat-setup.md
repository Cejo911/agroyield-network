# GitHub PAT setup — for `scripts/gh-api.sh` + future `agroyield-pr-pulse` skill

> **Created:** 27 April 2026 (Beta launch +0h)
> **Why:** No first-party GitHub MCP exists in the Cowork registry yet. Until one ships, programmatic GitHub access goes through `curl` + Personal Access Token, wrapped by `scripts/gh-api.sh`. This runbook walks the one-time PAT setup.
> **Estimated time:** 5 minutes.

---

## What we're enabling

Once the token is in place, the following workflows light up:

- **PR queue visibility** — `gh-api list-prs` returns open PRs for the repo
- **CI status check at deploy time** — `gh-api ci-status main` returns latest workflow run status
- **Branch protection rules audit** — `gh-api branch-protection main` returns current protection config
- **Future `agroyield-pr-pulse` skill** — weekly digest of PR throughput, stale PRs, time-to-review (companion to `agroyield-daily-health`)

Without the token, these calls return `401 Unauthorized`. With it, the helper script is one line per use case.

---

## Step-by-step

### 1. Create a fine-grained Personal Access Token

Use **fine-grained** (not classic) — principle of least privilege. Classic tokens have org-wide scope by default.

1. Go to https://github.com/settings/personal-access-tokens/new
2. **Token name:** `agroyield-cowork-readonly` (or `agroyield-cowork-full` if you want write)
3. **Resource owner:** `Cejo911`
4. **Expiration:** 90 days (revisit ahead of expiry; longer expiries are convenient but also longer-blast-radius if leaked)
5. **Repository access:** "Only select repositories" → check `agroyield-network`
6. **Repository permissions:**
   - **Contents** — Read (required)
   - **Metadata** — Read (auto-required)
   - **Pull requests** — Read (start here; bump to Read+Write when we add auto-draft PR descriptions)
   - **Issues** — Read (bump to Read+Write to file issues programmatically)
   - **Actions** — Read (for CI status)
   - **Checks** — Read (for CI status detail)
7. **Account permissions:** none needed
8. Click "Generate token"
9. **Copy the token immediately** — GitHub shows it once. Format: `github_pat_<long-string>`

### 2. Store the token securely

The token is a credential. Treat it like the Supabase service-role key: never committed, never logged, never sent to chat assistants verbatim.

**Recommended: in your shell profile** (so it's available to any terminal session running `scripts/gh-api.sh`):

```bash
# In ~/.zshrc or ~/.bashrc
export GITHUB_TOKEN="github_pat_<paste-here>"
```

Then `source ~/.zshrc` (or open a new terminal).

**Alternative: in `.env.local` at the repo root** (if you'd rather keep it project-scoped):

```bash
# In agroyield-network/.env.local — gitignored, never committed
GITHUB_TOKEN=github_pat_<paste-here>
```

Then `scripts/gh-api.sh` will source it automatically (see the helper for details).

### 3. Verify the token works

```bash
curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/Cejo911/agroyield-network | jq '.full_name, .private'
```

Expected output:
```
"Cejo911/agroyield-network"
true
```

If you get `"message": "Bad credentials"` → token is wrong or wasn't exported. If you get `"message": "Not Found"` → token doesn't have access to this repo (re-check step 1.5).

### 4. Test via the helper

```bash
./scripts/gh-api.sh list-prs
```

Should return open PRs (or `[]` if none). See `scripts/gh-api.sh --help` for all subcommands.

---

## Rotation policy

- **Default expiry:** 90 days
- **Rotation reminder:** Add a calendar reminder for 7 days before expiry — gives time to regenerate without service disruption
- **On compromise:** revoke immediately at https://github.com/settings/personal-access-tokens, then regenerate per Step 1
- **On hire #2:** create a separate token for them; do NOT share

---

## Why fine-grained over classic

Classic PATs grant scopes (e.g. `repo`, `read:org`) that span every repo the user can access AND every org they belong to. A leaked classic token with `repo` scope can read every private repo Okoli has access to anywhere — far beyond `agroyield-network`. Fine-grained tokens scope to specific repos with specific permissions. The blast radius of a leaked fine-grained token is bounded by Step 1.5 (the repo list) and Step 1.6 (the permissions list).

---

## ⚠️ Sandbox limitation: helper is local-machine only

Important constraint discovered 27 Apr 2026 during end-to-end verification: the Cowork sandbox firewall blocks outbound HTTPS to non-allowlisted hosts, including `api.github.com`. This means:

- ✅ **Works:** running `./scripts/gh-api.sh <subcommand>` from your local terminal (Mac/Linux/WSL).
- ❌ **Does NOT work:** running the helper from inside a Cowork conversation. The token reads correctly and the script logic is fine, but the network call to GitHub never completes.

This is the same architectural pattern that lets Cowork-managed MCPs (Sentry, Supabase, Slack, Vercel) reach their backends while sandbox shells cannot — egress is allowlisted at the connector layer, not the shell layer.

**Practical implication:** the future `agroyield-pr-pulse` skill (companion to `agroyield-daily-health`, surfacing PR-queue + CI status) is parked until an official GitHub MCP ships in the Cowork registry. Until then, run the helper from your terminal as part of weekly review, or wire it into a local pre-push hook.

## When the official GitHub MCP ships

When Cowork adds GitHub to its first-party connector registry:

1. Connect via the Cowork UI (one-click, OAuth flow — no PAT to manage)
2. The new MCP tool calls replace the curl wrappers in `scripts/gh-api.sh`
3. The PAT can be revoked
4. Update `docs/agents-and-connectors.md` to flip GitHub from ⬜ to ✅
5. Update `agroyield-pr-pulse` skill (when it exists) to call `mcp__github__*` instead of shell-out

Until then, the curl path is the canonical workflow.

---

## Update log

- **27 Apr 2026** — Initial runbook. PAT-based curl path documented as the bridge until first-party GitHub MCP ships. Token rotation cadence set at 90 days.

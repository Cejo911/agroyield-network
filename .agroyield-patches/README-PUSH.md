# Dashboard Redesign — Push Instructions

The redesigned dashboard lives on a local branch in this sandbox but needs
**you** to push it to GitHub (the sandbox has no push credentials).

## What's ready

- `app/dashboard/page.tsx` — rewritten with hero, pill stats, softened module cards
- Typecheck passes clean (`npx tsc --noEmit` → exit 0)
- Production code on `main` at commit `9a4fd62` is **untouched** on GitHub

## Two-step push (run from your local machine, in the repo root)

### Step 1 — Sync main with your local workspace

The mount's working tree has the new file staged as a modification on `main`.
Your mount also has two leftover 0-byte lock files (`.git/HEAD.lock`,
`.git/index.lock`) from earlier. Delete them first, then branch cleanly:

```bash
cd /path/to/agroyield-network

# Remove stale locks (safe — they're zero-byte, nobody owns them now)
rm -f .git/HEAD.lock .git/index.lock

# Create and switch to the feature branch
git checkout -b feat/dashboard-redesign

# Stage and commit the redesigned dashboard
git add app/dashboard/page.tsx
git commit -m "Dashboard redesign: hero strip, pill stats, softened module cards"

# Push — Vercel will create a preview URL automatically
git push -u origin feat/dashboard-redesign
```

### Step 2 — After you merge (or discard)

- **Merge**: once you're happy with the preview, merge the PR on GitHub.
- **Discard**: `git checkout main && git branch -D feat/dashboard-redesign`,
  then `git push origin --delete feat/dashboard-redesign`. Production is
  completely untouched.

## Alternative — apply from patch

If you prefer the branch to match the sandbox commit message exactly:

```bash
git checkout -b feat/dashboard-redesign main
git am .agroyield-patches/0001-Dashboard-redesign-*.patch
git push -u origin feat/dashboard-redesign
```

## What Vercel will do

The moment you push `feat/dashboard-redesign`, Vercel detects the new branch
and spins up a preview deployment at something like:

```
https://agroyield-network-git-feat-dashboard-redesign-<hash>.vercel.app
```

That preview URL reads the same Supabase database as production, so you'll
see real data in the hero stats. Click around, screenshot, decide. Production
at `agroyield.africa` stays on `main` until you merge.

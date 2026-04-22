# Rate-Limiting Verification — Pre-Launch Checklist

**Owner:** @okoli **Target date:** before 27 Apr 06:30 WAT **Est. time:** 15 min

This runbook proves that the three layers of abuse protection for AgroYield
Network are working in production. Layers, from closest-to-user to
deepest-in-app:

1. **Vercel edge** — Basic DDoS (free tier), Attack Challenge Mode (panic button).
2. **Vercel Firewall (optional)** — Pro plan WAF / rate-limit rules.
3. **App-level rate-limiter** — `lib/rate-limit.ts`, 5 req / 60 s per IP on
   every anon-writable route.

---

## 1. Confirm app-level rate-limiter is live

Runs against a **Vercel Preview deployment**, not prod, so we don't pollute
`waitlist_signups` / `contact_messages` with junk rows during testing.

**Prep:**
```
PREVIEW_URL=https://<your-preview>.vercel.app    # or staging alias
```

**Test:** fire 7 requests in the same 60-s window from the same IP at the
waitlist endpoint (clean to test — dedup `23505` catches repeat emails).

```bash
for i in $(seq 1 7); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$PREVIEW_URL/api/waitlist" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"ratelimit-test-$i@agroyield.dev\"}")
  echo "Request $i → HTTP $STATUS"
done
```

**Expected output:**
```
Request 1 → HTTP 200
Request 2 → HTTP 200
Request 3 → HTTP 200
Request 4 → HTTP 200
Request 5 → HTTP 200
Request 6 → HTTP 429
Request 7 → HTTP 429
```

If you see all 7 × 200, the limiter is bypassed — investigate:
- Is the preview deploy built from the current main branch? (`git log -1 lib/rate-limit.ts` on deploy commit)
- Is `x-forwarded-for` reaching the route correctly? Vercel always sends it; a misconfigured middleware could strip it.

After the drill, delete any test rows:
```sql
delete from waitlist_signups where email like '%@agroyield.dev';
```

---

## 2. Confirm Vercel Firewall posture

Vercel dashboard path: **Project → Firewall** (tab at the top of the project
page, between "Deployments" and "Analytics" on current UI).

**What to see:**

| Panel | Expected state | Why |
|---|---|---|
| **Attack Challenge Mode** | Disabled (panic button, don't pre-arm) | Enabled only during an active incident — presents a JS challenge to every request. Launch with it OFF; know where it is. |
| **System-level DDoS mitigation** | Enabled (Vercel-managed, no toggle) | Free tier; Vercel absorbs L3/L4 floods before they hit our origin. |
| **IP Blocking** | Empty | Fine at launch; populate reactively if we see specific abusers. |
| **Firewall Rules** *(Pro plan only)* | See below | Optional hardening. |

**If we're on Vercel Pro, recommended Firewall Rule to add pre-launch:**

- **Name:** `waitlist+contact abuse guard`
- **Condition:** Path matches `^/api/(waitlist|contact|subscribe)$` AND Method is `POST`
- **Action:** Rate limit — 20 requests per IP per 60 seconds
- **Why:** belt + suspenders over `lib/rate-limit.ts`. Vercel's rate limit is
  global across serverless instances (the app limiter is per-instance), closing
  the "hit a different instance" gap.

If we're on Hobby or Team plan (no Firewall Rules UI), the app-level limiter
is our only layer — acceptable for Beta-scale traffic.

**Panic button:** if we see a flood in the first 24 h post-launch, toggle
**Attack Challenge Mode → Enabled** in the Firewall tab. It drops legitimate
traffic for ~30 s while the challenge propagates, then traffic recovers with
bots filtered. Toggle off once the flood subsides.

---

## 3. Cloudflare is NOT in the path

agroyield.africa is served directly from Vercel (DNS `A`/`CNAME` → Vercel
edge). No Cloudflare proxy. All edge protection is Vercel-native. If we ever
add Cloudflare in front (for WAF, geo-block, or bot challenge), this runbook
needs a new section.

---

## 4. Known gaps (not launch-blocking)

**`lib/rate-limit.ts` is per-serverless-instance.** Vercel spins up N
isolated serverless functions; each keeps its own in-memory `rateMap`. An
attacker rotating through cold-start instances could theoretically get
N × 5 req/min. In practice: Vercel pins clients to warm instances by IP hash,
so the effective limit is close to 5 req/min for a single source.

**Cold-start resets the map.** Not a problem under sustained traffic (instance
stays warm); is a small problem during quiet periods (first request after
cold-start has a fresh budget).

**Post-launch upgrade path** (Week 2–3): swap `lib/rate-limit.ts` for
`@upstash/ratelimit` + Upstash Redis. Global state across all instances, per-IP
budget preserved across cold-starts. Adds ~$0–10/mo at Beta scale (10k req/day
is free tier).

---

## 5. Pre-launch sign-off

Tick when green:

- [ ] `/api/waitlist` preview-deploy loop returns 5 × 200 then 429s
- [ ] Vercel Firewall tab accessible; Attack Challenge Mode known-location
- [ ] Test rows cleaned from `waitlist_signups`
- [ ] Runbook link in `docs/runbooks/INDEX.md` (if that index exists)

Once ticked, rate-limiting posture is **green for launch**.

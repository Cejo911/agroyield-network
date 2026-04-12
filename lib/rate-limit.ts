// Simple in-memory rate limiter for API routes
// Works per serverless instance — not globally shared, but sufficient
// for blocking brute-force and casual abuse on Vercel

const rateMap = new Map<string, { count: number; resetTime: number }>()

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of rateMap) {
    if (now > val.resetTime) rateMap.delete(key)
  }
}, 5 * 60 * 1000)

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

export function rateLimit(
  ip: string,
  { limit = 10, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {}
): RateLimitResult {
  const now = Date.now()
  const key = ip
  const entry = rateMap.get(key)

  if (!entry || now > entry.resetTime) {
    rateMap.set(key, { count: 1, resetTime: now + windowMs })
    return { success: true, remaining: limit - 1, reset: now + windowMs }
  }

  entry.count++
  if (entry.count > limit) {
    return { success: false, remaining: 0, reset: entry.resetTime }
  }

  return { success: true, remaining: limit - entry.count, reset: entry.resetTime }
}

export function rateLimitResponse() {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    { status: 429, headers: { 'Content-Type': 'application/json' } }
  )
}
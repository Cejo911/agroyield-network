// lib/mentions/parser.ts
//
// @mention parser — tokenize/detokenize helpers for comment bodies.
//
// Companion to docs/features/mentions.md §4.3 (token format) and §5.2
// (integration points). This module is §4.1-INDEPENDENT: it operates on
// plain body strings and does not touch either comment table. Safe to
// land while the post_comments vs comments ambiguity stays open.
//
// Token format (§4.3)
// -------------------
// The stored body uses Slack-style UUID-anchored tokens so that a
// username change does not break historical mentions:
//
//   INPUT BODY   : "hey @okoli thanks for the review"
//   STORED BODY  : "hey <@11111111-2222-3333-4444-555555555555> thanks..."
//   RENDER PARTS : [text, mention, text] — the API layer builds the HTML.
//
// The render layer is deliberately split off: `detokenize` returns
// structured parts so callers decide whether to emit HTML, React nodes,
// or plaintext (e.g. email notification previews). No HTML is produced
// here — that keeps the parser safe from XSS responsibilities.
//
// Word-boundary semantics
// -----------------------
// We only recognise an @ that is NOT preceded by an alphanumeric or
// another @. That blocks:
//   - email addresses: "ping hello@okoli.com"        → no match
//   - double-@:        "@@okoli"                      → no match
//   - run-on:          "hi@okoli"                     → no match
// while allowing:
//   - start of body:     "@okoli ..."                 → match
//   - after whitespace:  "hey @okoli ..."             → match
//   - after punctuation: "(cc @okoli)"                → match
//
// Username shape mirrors what the product currently allows (profiles
// baseline has no strict CHECK, but the UI enforces 1-30 chars, alnum
// plus . _ -, must start and end alnum). The regex validates the shape
// at parse time so we don't emit candidates for garbage like "@..".
//
// Caps
// ----
// MAX_MENTIONS_PER_COMMENT enforces §5.2's "max 5 mentions per comment"
// abuse guard at the parser layer — callers get a typed `too_many_mentions`
// signal rather than a silent truncation.

export const MAX_MENTIONS_PER_COMMENT = 5

// Word-boundary mention trigger.
// Group 1 = username (without the leading @).
//
// Breakdown:
//   (?<![A-Za-z0-9@])           — not preceded by alnum or another @
//   @                           — literal @
//   ([A-Za-z0-9]                — username must start with alnum
//     (?:[A-Za-z0-9._-]{0,28}   — 0..28 middle chars (alnum + . _ -)
//       [A-Za-z0-9])?           — must end with alnum (if length > 1)
//   )
//
// This yields usernames 1..30 characters long, start+end alphanumeric.
const MENTION_RE =
  /(?<![A-Za-z0-9@])@([A-Za-z0-9](?:[A-Za-z0-9._-]{0,28}[A-Za-z0-9])?)/g

// Stored-body token shape: <@uuid>
// UUIDs are canonical lowercase with dashes. We accept any hex case on
// the read path (detokenize) for robustness but tokenize always writes
// whatever the caller's Map supplies.
const TOKEN_RE = /<@([0-9a-fA-F-]{36})>/g

export type MentionCandidate = {
  /** The raw username text as typed by the user, without the leading @. */
  username: string
  /** UTF-16 character offset of the @ sign in the original body. */
  positionStart: number
  /** UTF-16 character offset one past the last username char. */
  positionEnd: number
}

/**
 * Find @mention candidates in a raw comment body.
 *
 * Does NOT dedupe and does NOT cap — returns every match in order so
 * callers can report "too many" with an accurate count. Dedupe happens
 * in `resolveCandidates` (and again at the DB via the UNIQUE constraint).
 *
 * Usernames are returned as typed (case-preserved). Resolution against
 * `profiles.username` should be done case-insensitively by the caller.
 */
export function extractMentionCandidates(body: string): MentionCandidate[] {
  if (!body) return []
  const out: MentionCandidate[] = []
  // Reset state on the shared regex to be safe against stray lastIndex.
  MENTION_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = MENTION_RE.exec(body)) !== null) {
    const username = m[1]
    const positionStart = m.index
    const positionEnd = positionStart + m[0].length
    out.push({ username, positionStart, positionEnd })
  }
  return out
}

export type ResolveResult =
  | { ok: true; uuids: string[] }
  | { ok: false; reason: 'too_many_mentions'; count: number }

/**
 * Resolve a list of candidates against a caller-supplied username→uuid map
 * and apply the per-comment cap.
 *
 * Unknown usernames are silently dropped (they'll render as plain text).
 * Duplicates are deduped by UUID — if the same user is @-tagged twice in
 * one comment we still only fan out one notification. Cap is applied to
 * the UNIQUE UUID count, not the raw candidate count, so "hey @okoli cc
 * @okoli" counts as one mention.
 *
 * The caller is responsible for lowercasing both sides of the map lookup
 * if they want case-insensitive matching (profiles.username is currently
 * case-sensitive at the DB level).
 */
export function resolveCandidates(
  candidates: MentionCandidate[],
  usernameToUuid: Map<string, string>,
): ResolveResult {
  const seen = new Set<string>()
  const uuids: string[] = []
  for (const c of candidates) {
    const uuid = usernameToUuid.get(c.username)
    if (!uuid) continue
    if (seen.has(uuid)) continue
    seen.add(uuid)
    uuids.push(uuid)
  }
  if (uuids.length > MAX_MENTIONS_PER_COMMENT) {
    return {
      ok: false,
      reason: 'too_many_mentions',
      count: uuids.length,
    }
  }
  return { ok: true, uuids }
}

/**
 * Rewrite a body so that every resolved @username becomes a `<@uuid>` token.
 *
 * Unknown usernames are left as typed (e.g. "@ghostuser" stays as "@ghostuser"
 * in the stored body). This is intentional — users occasionally @-tag people
 * by habit who haven't signed up yet, and the comment should still read
 * naturally.
 *
 * Returns both the rewritten body and the list of UUIDs that were tokenized.
 * Callers wire the UUID list through to the `comment_mentions` fan-out.
 *
 * NOTE: This function does NOT enforce the 5-cap — that's `resolveCandidates`'
 * job. Callers should resolve first, reject if `ok: false`, and only then
 * tokenize with the accepted map.
 */
export function tokenize(
  body: string,
  usernameToUuid: Map<string, string>,
): { tokenized: string; mentionedUuids: string[] } {
  if (!body) return { tokenized: '', mentionedUuids: [] }

  const seen = new Set<string>()
  const mentionedUuids: string[] = []

  // We reconstruct the body in one pass using .replace so we don't have
  // to maintain offsets as they shift.
  MENTION_RE.lastIndex = 0
  const tokenized = body.replace(MENTION_RE, (whole, username: string) => {
    const uuid = usernameToUuid.get(username)
    if (!uuid) return whole
    if (!seen.has(uuid)) {
      seen.add(uuid)
      mentionedUuids.push(uuid)
    }
    return `<@${uuid}>`
  })

  return { tokenized, mentionedUuids }
}

export type RenderPart =
  | { type: 'text'; value: string }
  | {
      type: 'mention'
      uuid: string
      username: string
      displayName: string
    }
  // `mention-stale` is emitted when a stored token references a profile
  // that no longer exists in `profilesById` (deleted user, suspended, or
  // simply not included in the caller's fetch). The UI should render
  // this as something neutral like "@unknown user" or the raw token.
  | { type: 'mention-stale'; raw: string }

/**
 * Split a stored body into a sequence of render parts.
 *
 * The caller supplies a Map of `uuid → { username, displayName }` for
 * every profile referenced by the body. Typically the API layer does
 * this by scanning tokens first, then issuing one `.in('id', uuids)`
 * query against `profiles`.
 *
 * This function does NOT produce HTML — it returns structured parts so
 * the caller chooses the output format (React nodes, sanitised HTML,
 * plaintext preview for email, etc.). That keeps the parser out of the
 * escaping business.
 */
export function detokenize(
  stored: string,
  profilesById: Map<
    string,
    { username: string | null; displayName: string }
  >,
): RenderPart[] {
  const parts: RenderPart[] = []
  if (!stored) return parts

  TOKEN_RE.lastIndex = 0
  let cursor = 0
  let m: RegExpExecArray | null
  while ((m = TOKEN_RE.exec(stored)) !== null) {
    const [whole, rawUuid] = m
    const start = m.index
    const end = start + whole.length

    if (start > cursor) {
      parts.push({ type: 'text', value: stored.slice(cursor, start) })
    }

    const uuid = rawUuid.toLowerCase()
    const profile = profilesById.get(uuid)
    if (profile) {
      parts.push({
        type: 'mention',
        uuid,
        username: profile.username ?? '',
        displayName: profile.displayName,
      })
    } else {
      parts.push({ type: 'mention-stale', raw: whole })
    }

    cursor = end
  }

  if (cursor < stored.length) {
    parts.push({ type: 'text', value: stored.slice(cursor) })
  }

  return parts
}

/**
 * Extract the UUIDs referenced by `<@uuid>` tokens in a stored body.
 *
 * Lightweight helper for callers that want to pre-fetch profiles before
 * calling `detokenize` — avoids walking the body twice for common paths.
 * Dedupes and lowercases.
 */
export function extractTokenUuids(stored: string): string[] {
  if (!stored) return []
  const seen = new Set<string>()
  TOKEN_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = TOKEN_RE.exec(stored)) !== null) {
    seen.add(m[1].toLowerCase())
  }
  return Array.from(seen)
}

// __tests__/mentions/parser.test.ts
//
// Unit tests for lib/mentions/parser.ts.
//
// Uses Node's built-in test runner (node:test + node:assert) so we
// don't drag in Jest/Vitest for four helper functions. Run with:
//
//   node --test --experimental-strip-types --import=module \
//     __tests__/mentions/parser.test.ts
//
// The harness is self-contained; the typecheck gate (`tsc --noEmit`)
// is still the primary merge guard because these functions are pure
// and TypeScript can catch most regressions statically.
//
// Why an explicit `.ts` extension on the import below?
// ----------------------------------------------------
// Node's --experimental-strip-types uses strict ESM resolution, which
// requires explicit file extensions. We keep tsconfig.json happy by
// importing `../../lib/mentions/parser.ts` directly — Next and the
// TypeScript compiler (bundler resolution + noEmit) both tolerate this;
// production runtime goes through Next's bundler which rewrites the
// extension anyway.
//
// Coverage matrix (per docs/features/mentions.md §4.3 + §5.2):
//
//   extractMentionCandidates
//     ✓ empty body
//     ✓ single mention at start of body
//     ✓ mention preceded by whitespace
//     ✓ mention preceded by punctuation
//     ✓ mention at end of body
//     ✓ NO-match inside email address
//     ✓ NO-match on double-@
//     ✓ NO-match on run-on (no word-boundary)
//     ✓ NO-match on @.. (invalid start)
//     ✓ multi-character username with allowed symbols
//     ✓ multiple mentions in one body — order preserved
//     ✓ adjacent mentions separated by single space
//
//   resolveCandidates
//     ✓ unknown username dropped
//     ✓ duplicate mentions deduped by UUID
//     ✓ 5-mention cap — accept 5
//     ✓ 5-mention cap — reject 6 with too_many_mentions
//
//   tokenize
//     ✓ known username → <@uuid>
//     ✓ unknown username left unchanged
//     ✓ duplicate @okoli emits one UUID in mentionedUuids
//     ✓ no mentions → body unchanged
//
//   detokenize
//     ✓ known uuid → structured mention part
//     ✓ unknown uuid → mention-stale
//     ✓ text around tokens preserved
//     ✓ uppercase-hex UUID still resolves (case-insensitive)
//
//   extractTokenUuids
//     ✓ dedupes and lowercases

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  MAX_MENTIONS_PER_COMMENT,
  extractMentionCandidates,
  resolveCandidates,
  tokenize,
  detokenize,
  extractTokenUuids,
} from '../../lib/mentions/parser.ts'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const UUID = {
  okoli: '11111111-2222-3333-4444-555555555555',
  ada: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  kunle: '99999999-8888-7777-6666-555555555555',
  tunde: '33333333-4444-5555-6666-777777777777',
  emeka: '55555555-4444-3333-2222-111111111111',
  chijioke: 'cccccccc-dddd-eeee-ffff-000000000000',
}

// ---------------------------------------------------------------------------
// extractMentionCandidates
// ---------------------------------------------------------------------------
test('extractMentionCandidates: empty body returns empty array', () => {
  assert.deepEqual(extractMentionCandidates(''), [])
})

test('extractMentionCandidates: mention at start of body', () => {
  const out = extractMentionCandidates('@okoli thanks')
  assert.equal(out.length, 1)
  assert.equal(out[0].username, 'okoli')
  assert.equal(out[0].positionStart, 0)
  assert.equal(out[0].positionEnd, 6)
})

test('extractMentionCandidates: mention preceded by whitespace', () => {
  const out = extractMentionCandidates('hey @okoli thanks')
  assert.equal(out.length, 1)
  assert.equal(out[0].username, 'okoli')
})

test('extractMentionCandidates: mention preceded by punctuation', () => {
  const out = extractMentionCandidates('(cc @okoli)')
  assert.equal(out.length, 1)
  assert.equal(out[0].username, 'okoli')
})

test('extractMentionCandidates: mention at end of body', () => {
  const out = extractMentionCandidates('thanks @okoli')
  assert.equal(out.length, 1)
  assert.equal(out[0].username, 'okoli')
})

test('extractMentionCandidates: email address does not match', () => {
  const out = extractMentionCandidates('ping hello@okoli.com please')
  assert.equal(out.length, 0)
})

test('extractMentionCandidates: double-@ does not match', () => {
  const out = extractMentionCandidates('@@okoli')
  assert.equal(out.length, 0)
})

test('extractMentionCandidates: run-on (no word boundary) does not match', () => {
  const out = extractMentionCandidates('hi@okoli')
  assert.equal(out.length, 0)
})

test('extractMentionCandidates: @.. (non-alnum start) does not match', () => {
  const out = extractMentionCandidates('hey @.. cool')
  assert.equal(out.length, 0)
})

test('extractMentionCandidates: username with dots/underscores/hyphens', () => {
  const out = extractMentionCandidates('hey @ada_kunle.1-2 ok')
  assert.equal(out.length, 1)
  assert.equal(out[0].username, 'ada_kunle.1-2')
})

test('extractMentionCandidates: multiple mentions in one body, order preserved', () => {
  const out = extractMentionCandidates(
    'cc @ada and @kunle and also @tunde please',
  )
  assert.deepEqual(
    out.map((c) => c.username),
    ['ada', 'kunle', 'tunde'],
  )
})

test('extractMentionCandidates: adjacent mentions separated by one space', () => {
  const out = extractMentionCandidates('@ada @kunle')
  assert.deepEqual(
    out.map((c) => c.username),
    ['ada', 'kunle'],
  )
})

// ---------------------------------------------------------------------------
// resolveCandidates
// ---------------------------------------------------------------------------
test('resolveCandidates: unknown username dropped', () => {
  const map = new Map<string, string>([['okoli', UUID.okoli]])
  const candidates = extractMentionCandidates('@okoli and @ghostuser')
  const res = resolveCandidates(candidates, map)
  assert.equal(res.ok, true)
  if (res.ok) assert.deepEqual(res.uuids, [UUID.okoli])
})

test('resolveCandidates: duplicate mentions deduped by UUID', () => {
  const map = new Map<string, string>([['okoli', UUID.okoli]])
  const candidates = extractMentionCandidates('@okoli cc @okoli again')
  const res = resolveCandidates(candidates, map)
  assert.equal(res.ok, true)
  if (res.ok) assert.deepEqual(res.uuids, [UUID.okoli])
})

test('resolveCandidates: cap accepts exactly 5 mentions', () => {
  assert.equal(MAX_MENTIONS_PER_COMMENT, 5)
  const map = new Map<string, string>([
    ['a', UUID.okoli],
    ['b', UUID.ada],
    ['c', UUID.kunle],
    ['d', UUID.tunde],
    ['e', UUID.emeka],
  ])
  const candidates = extractMentionCandidates('@a @b @c @d @e')
  const res = resolveCandidates(candidates, map)
  assert.equal(res.ok, true)
  if (res.ok) assert.equal(res.uuids.length, 5)
})

test('resolveCandidates: cap rejects 6 with too_many_mentions', () => {
  const map = new Map<string, string>([
    ['a', UUID.okoli],
    ['b', UUID.ada],
    ['c', UUID.kunle],
    ['d', UUID.tunde],
    ['e', UUID.emeka],
    ['f', UUID.chijioke],
  ])
  const candidates = extractMentionCandidates('@a @b @c @d @e @f')
  const res = resolveCandidates(candidates, map)
  assert.equal(res.ok, false)
  if (!res.ok) {
    assert.equal(res.reason, 'too_many_mentions')
    assert.equal(res.count, 6)
  }
})

// ---------------------------------------------------------------------------
// tokenize
// ---------------------------------------------------------------------------
test('tokenize: known username rewritten to <@uuid> token', () => {
  const map = new Map<string, string>([['okoli', UUID.okoli]])
  const { tokenized, mentionedUuids } = tokenize('hey @okoli thanks', map)
  assert.equal(tokenized, `hey <@${UUID.okoli}> thanks`)
  assert.deepEqual(mentionedUuids, [UUID.okoli])
})

test('tokenize: unknown username left unchanged', () => {
  const map = new Map<string, string>([['okoli', UUID.okoli]])
  const { tokenized, mentionedUuids } = tokenize('hey @ghostuser', map)
  assert.equal(tokenized, 'hey @ghostuser')
  assert.deepEqual(mentionedUuids, [])
})

test('tokenize: duplicate @okoli emits single UUID in fan-out list', () => {
  const map = new Map<string, string>([['okoli', UUID.okoli]])
  const { tokenized, mentionedUuids } = tokenize('@okoli and @okoli', map)
  assert.equal(tokenized, `<@${UUID.okoli}> and <@${UUID.okoli}>`)
  assert.deepEqual(mentionedUuids, [UUID.okoli])
})

test('tokenize: body with no mentions unchanged', () => {
  const map = new Map<string, string>()
  const { tokenized, mentionedUuids } = tokenize('just a comment', map)
  assert.equal(tokenized, 'just a comment')
  assert.deepEqual(mentionedUuids, [])
})

// ---------------------------------------------------------------------------
// detokenize
// ---------------------------------------------------------------------------
test('detokenize: known uuid → mention render part', () => {
  const profiles = new Map([
    [UUID.okoli, { username: 'okoli', displayName: 'Okoli C.' }],
  ])
  const parts = detokenize(`hey <@${UUID.okoli}> thanks`, profiles)
  assert.deepEqual(parts, [
    { type: 'text', value: 'hey ' },
    {
      type: 'mention',
      uuid: UUID.okoli,
      username: 'okoli',
      displayName: 'Okoli C.',
    },
    { type: 'text', value: ' thanks' },
  ])
})

test('detokenize: unknown uuid → mention-stale', () => {
  const profiles = new Map<
    string,
    { username: string | null; displayName: string }
  >()
  const parts = detokenize(`<@${UUID.okoli}> bye`, profiles)
  assert.equal(parts.length, 2)
  assert.deepEqual(parts[0], {
    type: 'mention-stale',
    raw: `<@${UUID.okoli}>`,
  })
})

test('detokenize: text around tokens preserved', () => {
  const profiles = new Map([
    [UUID.okoli, { username: 'okoli', displayName: 'Okoli' }],
  ])
  const parts = detokenize(`start <@${UUID.okoli}> middle`, profiles)
  assert.equal(parts.length, 3)
  assert.deepEqual(parts[0], { type: 'text', value: 'start ' })
  assert.equal(parts[1].type, 'mention')
  assert.deepEqual(parts[2], { type: 'text', value: ' middle' })
})

test('detokenize: uppercase-hex UUID resolves case-insensitively', () => {
  const profiles = new Map([
    [UUID.okoli, { username: 'okoli', displayName: 'Okoli' }],
  ])
  // Stored body with uppercase hex chars — should still resolve.
  const uppercase = UUID.okoli.toUpperCase()
  const parts = detokenize(`hey <@${uppercase}>`, profiles)
  assert.equal(parts[1].type, 'mention')
})

// ---------------------------------------------------------------------------
// extractTokenUuids
// ---------------------------------------------------------------------------
test('extractTokenUuids: dedupes and lowercases', () => {
  const stored = `hi <@${UUID.okoli}> and <@${UUID.okoli.toUpperCase()}> plus <@${UUID.ada}>`
  const uuids = extractTokenUuids(stored)
  assert.equal(uuids.length, 2)
  assert.ok(uuids.includes(UUID.okoli))
  assert.ok(uuids.includes(UUID.ada))
})

test('extractTokenUuids: empty body returns empty array', () => {
  assert.deepEqual(extractTokenUuids(''), [])
})

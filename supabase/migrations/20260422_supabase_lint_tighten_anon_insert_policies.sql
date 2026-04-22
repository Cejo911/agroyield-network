-- 2026-04-22  Supabase lint: tighten anon INSERT policies on public forms
--
-- Supabase lint: rls_policy_always_true (WARN × 2)
--
-- Background
-- ----------
-- public.contact_messages and public.waitlist_signups both carry
-- INSERT policies with `WITH CHECK (true)`. The access patterns are
-- legitimate — anonymous visitors need to be able to submit contact
-- forms and join the waitlist — but the linter flags `true` on
-- INSERT/UPDATE/DELETE WITH CHECK because it's a trivial predicate
-- that effectively short-circuits RLS to "allow any well-formed row".
--
-- This migration does two things:
--
--   1. **Scope both policies explicitly to `TO anon`.**
--      - contact_messages was already `TO anon`; preserved.
--      - waitlist_signups had no TO-clause (defaulting to PUBLIC).
--        Tightening to `TO anon` aligns it with its sibling and rules
--        out accidental inserts from `authenticated` contexts — which
--        would be a refactoring bug anyway, because both endpoints
--        use the anon Supabase client on the server.
--
--   2. **Replace `WITH CHECK (true)` with a minimal, non-trivial
--      predicate** (basic shape guards on the submitted data). This
--      silences the lint and adds a small defense-in-depth layer
--      behind the API-route validation in /api/contact and /api/waitlist.
--
-- The check predicates intentionally stay minimal — validation logic
-- belongs in the API layer, not RLS. These are "obvious-garbage"
-- guards: the row must have a plausibly-shaped email address and a
-- non-empty body. Any attacker bypassing the API layer still gets
-- rejected for trivially malformed payloads.
--
-- Rollback
-- --------
-- Not recommended — reverts would re-introduce the lint findings and
-- let authenticated sessions insert into waitlist_signups.
--
--   DROP POLICY waitlist_signups_insert_anon  ON public.waitlist_signups;
--   CREATE POLICY "public can sign up to waitlist"
--     ON public.waitlist_signups FOR INSERT WITH CHECK (true);
--
--   DROP POLICY contact_messages_insert_anon  ON public.contact_messages;
--   CREATE POLICY "Anyone can insert contact messages"
--     ON public.contact_messages FOR INSERT TO anon WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 1. waitlist_signups — scope to anon + minimal email-shape guard
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "public can sign up to waitlist" ON public.waitlist_signups;

CREATE POLICY waitlist_signups_insert_anon
  ON public.waitlist_signups
  FOR INSERT
  TO anon
  WITH CHECK (
    email IS NOT NULL
    AND length(email) BETWEEN 3 AND 320
    AND email LIKE '%@%'
  );

-- ---------------------------------------------------------------------------
-- 2. contact_messages — preserve anon scope + email + message-body guard
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;

CREATE POLICY contact_messages_insert_anon
  ON public.contact_messages
  FOR INSERT
  TO anon
  WITH CHECK (
    email IS NOT NULL
    AND length(email) BETWEEN 3 AND 320
    AND email LIKE '%@%'
    AND message IS NOT NULL
    AND length(message) BETWEEN 1 AND 10000
  );

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- After applying, confirm:
--
--   1. Anon can still submit both forms (smoke-test via the preview deploy
--      or a localhost run, not prod — avoids junk rows).
--   2. `rls_policy_always_true` WARNs disappear from Security Advisor
--      for both tables on linter re-run.
--   3. A malformed payload (no @) is rejected by RLS:
--        set role anon;
--        insert into waitlist_signups (email, source)
--          values ('not-an-email', 'manual');
--        -- expect: new row violates row-level security policy
--        reset role;

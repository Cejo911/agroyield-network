-- ============================================================================
-- Migration: create public._applied_migrations tracking table
--
-- Purpose
-- -------
-- The H2.6 migration-paste GitHub Action needs a place to record which
-- supabase/migrations/*.sql files have been applied to production. We
-- can't reuse supabase_migrations.schema_migrations cleanly because
-- (a) its version column is parsed from filename prefix and our legacy
-- 8-digit prefixes collide on multi-migration days (e.g. four files
-- prefixed 20260416_), and (b) the Supabase CLI's lock-step assumptions
-- around that table would force a 46-file rename to land safely.
--
-- This table sidesteps all of that — keyed by filename, owned by the
-- Action's runner role, no relationship to Supabase's CLI tooling.
--
-- Schema
-- ------
-- filename       — supabase/migrations/<this>.sql (NO directory or .sql
--                  extension stripping needed; we store exactly what
--                  appears in `git ls-files`)
-- applied_at     — server-side timestamp of the apply
-- applied_by     — 'github_action' | 'mcp_apply_migration' | 'manual_sql_editor'
--                  | 'baseline_reconcile' (for the bulk-load below)
-- content_sha256 — sha256 of the .sql file content at the time of apply.
--                  Lets the Action detect "this file was modified after
--                  being applied" — a separate flavour of drift the
--                  filename-only check would miss.
--
-- Drift detection
-- ---------------
-- The Action computes sha256 of each repo file. If filename matches a
-- tracking row but sha256 differs, that's a CONTENT drift — the file
-- was edited after apply. Action posts a warning and refuses to apply
-- (would need a NEW migration to make the change, not an in-place edit).
--
-- Idempotency
-- -----------
-- CREATE TABLE IF NOT EXISTS so the Action can re-run this migration
-- safely. Restricted to service-role only (no RLS exposure for
-- authenticated/anon roles).
--
-- NOTE: This migration was already applied to production at
-- 2026-04-29 00:53:11 UTC via Supabase MCP apply_migration during
-- the H2.6 setup session. The tracking row for THIS file is also
-- pre-loaded so the Action's first run sees no pending migrations.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public._applied_migrations (
  filename       text        PRIMARY KEY,
  applied_at     timestamptz NOT NULL DEFAULT now(),
  applied_by     text        NOT NULL,
  content_sha256 text,
  CONSTRAINT applied_by_known
    CHECK (applied_by IN ('github_action','mcp_apply_migration','manual_sql_editor','baseline_reconcile'))
);

-- Lock down: no anon/authenticated access. Only service-role can read or write.
ALTER TABLE public._applied_migrations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public._applied_migrations FROM anon, authenticated, PUBLIC;

COMMENT ON TABLE public._applied_migrations IS
  'Tracking table for the H2.6 migration-paste GitHub Action. Records which supabase/migrations/*.sql files have been applied to production. Distinct from supabase_migrations.schema_migrations — see migration header for rationale.';

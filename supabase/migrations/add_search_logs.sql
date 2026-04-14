-- Search logging table for site-wide search analytics
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS search_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  query text NOT NULL,
  module text NOT NULL,           -- e.g. 'marketplace', 'opportunities', 'grants', etc.
  results_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_module ON search_logs (module);
CREATE INDEX IF NOT EXISTS idx_search_logs_query ON search_logs USING gin (to_tsvector('english', query));

-- RLS: users can insert their own logs, only service role can read all
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own search logs"
  ON search_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can read all search logs"
  ON search_logs FOR SELECT
  TO service_role
  USING (true);

-- Add last_seen_at to profiles for online presence tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Index for efficient "who's online" queries (only non-null values)
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen
  ON profiles (last_seen_at DESC)
  WHERE last_seen_at IS NOT NULL;

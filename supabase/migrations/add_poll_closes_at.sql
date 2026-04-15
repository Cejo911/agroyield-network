-- Add optional closing date for community polls
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS poll_closes_at timestamptz;

-- Index for efficient "open polls" queries
CREATE INDEX IF NOT EXISTS idx_community_posts_poll_closes
  ON community_posts (poll_closes_at)
  WHERE post_type = 'poll' AND poll_closes_at IS NOT NULL;

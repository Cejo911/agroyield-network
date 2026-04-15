-- Add subscription_tier column to profiles
-- Values: 'free' (default), 'pro', 'growth'
-- Keeps existing subscription_plan (monthly/annual) for billing cycle
-- Keeps is_verified for backward compat (true when tier != 'free')

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free';

-- Migrate existing verified users to 'pro' tier
UPDATE profiles
  SET subscription_tier = 'pro'
  WHERE is_verified = true
    AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW());

-- Add tier pricing settings (in Naira)
INSERT INTO settings (key, value) VALUES ('tier_pro_monthly', '2000') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('tier_pro_annual', '20000') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('tier_growth_monthly', '5000') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('tier_growth_annual', '50000') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('free_trial_days', '30') ON CONFLICT (key) DO NOTHING;

-- Index for efficient tier queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier
  ON profiles (subscription_tier);

-- ============================================================================
-- AgroYield Network -- Baseline Schema Migration
-- ============================================================================
--
-- Generated from Supabase public column metadata CSV export.
-- This is a BASELINE SNAPSHOT of all tables as they exist in production.
--
-- IMPORTANT NOTES:
--   1. All tables use CREATE TABLE IF NOT EXISTS (idempotent).
--   2. Foreign key constraints are NOT included -- the CSV metadata does not
--      contain FK information, and guessing would risk breaking migrations.
--   3. USER-DEFINED (enum) types are mapped to text with an inline comment
--      noting the original Supabase enum type name. Create the actual enum
--      types in a separate migration if needed.
--   4. ARRAY columns default to text[] (or uuid[] where applicable).
--   5. DEFAULT values are preserved exactly as exported from Supabase,
--      including type casts like 'INV'::text.
--   6. Views (e.g. connections_view) are included as tables here -- they may
--      need to be converted to CREATE VIEW statements manually.
--
-- Tables: 81
-- Generated: 2026-04-17
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: admin_audit_log
-- Columns: 7
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: admin_users
-- Columns: 12
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  -- NOTE: admin_role was originally admin_role (USER-DEFINED enum)
  admin_role text NOT NULL,
  can_manage_users boolean DEFAULT false NOT NULL,
  can_manage_content boolean DEFAULT false NOT NULL,
  can_manage_settings boolean DEFAULT false NOT NULL,
  can_view_logs boolean DEFAULT true NOT NULL,
  granted_by uuid,
  granted_at timestamptz DEFAULT now() NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  deactivated_at timestamptz,
  deactivated_by uuid
);

-- ----------------------------------------------------------------------------
-- Table: business_assets
-- Columns: 19
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text DEFAULT 'Equipment'::text NOT NULL,
  description text,
  serial_number text,
  tag_number text,
  purchase_date date,
  purchase_price numeric DEFAULT 0,
  current_value numeric DEFAULT 0,
  location text,
  condition text DEFAULT 'Good'::text,
  assigned_to text,
  photo_url text,
  status text DEFAULT 'active'::text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: business_expenses
-- Columns: 10
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid NOT NULL,
  date date NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  payment_method text DEFAULT 'cash'::text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: business_products
-- Columns: 13
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  unit text DEFAULT 'unit'::text,
  unit_price numeric DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  stock_quantity numeric DEFAULT 0,
  low_stock_threshold numeric DEFAULT 5,
  cost_price numeric DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- Table: business_team
-- Columns: 10
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  email text NOT NULL,
  role text DEFAULT 'staff'::text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  user_id uuid,
  invite_token uuid DEFAULT gen_random_uuid(),
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz
);

-- ----------------------------------------------------------------------------
-- Table: businesses
-- Columns: 21
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  address text,
  phone text,
  email text,
  logo_url text,
  bank_name text,
  account_name text,
  account_number text,
  invoice_prefix text DEFAULT 'INV'::text,
  invoice_counter integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  cac_number text,
  vat_tin text,
  alt_phone text,
  whatsapp text,
  sector text,
  state text,
  business_size text
);

-- ----------------------------------------------------------------------------
-- Table: change_log
-- Columns: 13
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  admin_email varchar(255),
  -- NOTE: action was originally change_action (USER-DEFINED enum)
  action text NOT NULL,
  target_type varchar(50) NOT NULL,
  target_id uuid,
  target_label text,
  old_value jsonb,
  new_value jsonb,
  notes text,
  ip_address inet,
  user_agent text,
  timestamp timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: citation_stats
-- Columns: 6
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS citation_stats (
  user_id uuid NOT NULL,
  h_index integer DEFAULT 0 NOT NULL,
  total_citations integer DEFAULT 0 NOT NULL,
  total_downloads integer DEFAULT 0 NOT NULL,
  paper_count integer DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: collaboration_applications
-- Columns: 10
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS collaboration_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_id uuid NOT NULL,
  applicant_id uuid NOT NULL,
  message text,
  relevant_skills text[],
  portfolio_link text,
  -- NOTE: status was originally collab_application_status (USER-DEFINED enum)
  status text DEFAULT 'pending'::collab_application_status NOT NULL,
  decision_note text,
  applied_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: collaborations
-- Columns: 18
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS collaborations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_id uuid NOT NULL,
  title varchar(255) NOT NULL,
  -- NOTE: field was originally research_field (USER-DEFINED enum)
  field text,
  description text,
  roles_needed text[] DEFAULT '{}'::text[] NOT NULL,
  skills_needed text[] DEFAULT '{}'::text[] NOT NULL,
  slots integer,
  slots_filled integer DEFAULT 0 NOT NULL,
  deadline date,
  start_date date,
  duration_months integer,
  region varchar(100),
  -- NOTE: status was originally collaboration_status (USER-DEFINED enum)
  status text DEFAULT 'open'::collaboration_status NOT NULL,
  featured boolean DEFAULT false NOT NULL,
  application_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: comment_likes
-- Columns: 3
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: comments
-- Columns: 10
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  post_type text NOT NULL,
  content text NOT NULL,
  user_name text,
  created_at timestamptz DEFAULT now() NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  parent_id uuid,
  is_hidden boolean DEFAULT false
);

-- ----------------------------------------------------------------------------
-- Table: commodities
-- Columns: 7
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commodities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  local_name varchar(100),
  unit varchar(50) NOT NULL,
  -- NOTE: category was originally commodity_category (USER-DEFINED enum)
  category text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: community_posts
-- Columns: 14
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_type text DEFAULT 'discussion'::text NOT NULL,
  content text NOT NULL,
  link_url text,
  poll_options jsonb,
  poll_votes jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  reposted_from uuid,
  image_url text,
  poll_closes_at timestamptz
);

-- ----------------------------------------------------------------------------
-- Table: connections
-- Columns: 7
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  -- NOTE: status was originally connection_status (USER-DEFINED enum)
  status text DEFAULT 'pending'::connection_status NOT NULL,
  note text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: connections_view
-- Columns: 7
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connections_view (
  id uuid PRIMARY KEY,
  user_id uuid,
  connected_to uuid,
  -- NOTE: status was originally connection_status (USER-DEFINED enum)
  status text,
  note text,
  created_at timestamptz,
  updated_at timestamptz
);

-- ----------------------------------------------------------------------------
-- Table: contact_messages
-- Columns: 6
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: conversations
-- Columns: 8
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a uuid NOT NULL,
  participant_b uuid NOT NULL,
  last_message_at timestamptz,
  last_message_preview text,
  archived_by_a boolean DEFAULT false NOT NULL,
  archived_by_b boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: customers
-- Columns: 10
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: event_registrations
-- Columns: 11
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  -- NOTE: status was originally registration_status (USER-DEFINED enum)
  status text DEFAULT 'registered'::registration_status NOT NULL,
  ticket_type varchar(20) DEFAULT 'general'::character varying NOT NULL,
  amount_paid numeric DEFAULT 0 NOT NULL,
  attended boolean DEFAULT false NOT NULL,
  feedback text,
  rating integer,
  registered_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: events
-- Columns: 26
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id uuid,
  title varchar(255) NOT NULL,
  description text,
  -- NOTE: event_type was originally event_type (USER-DEFINED enum)
  event_type text NOT NULL,
  -- NOTE: status was originally event_status (USER-DEFINED enum)
  status text DEFAULT 'upcoming'::event_status NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  timezone varchar(50) DEFAULT 'Africa/Lagos'::character varying NOT NULL,
  location text,
  location_url text,
  city varchar(100),
  state varchar(100),
  country varchar(100) DEFAULT 'Nigeria'::character varying NOT NULL,
  price_student numeric DEFAULT 0 NOT NULL,
  price_general numeric DEFAULT 0 NOT NULL,
  capacity integer,
  spots_remaining integer,
  cover_image_url text,
  register_link text,
  featured boolean DEFAULT false NOT NULL,
  tags text[],
  registration_count integer DEFAULT 0 NOT NULL,
  save_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: featured_listing_payments
-- Columns: 9
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS featured_listing_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  days integer NOT NULL,
  paystack_reference text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

-- ----------------------------------------------------------------------------
-- Table: follows
-- Columns: 4
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid,
  following_id uuid,
  created_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: grant_applications
-- Columns: 13
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grant_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  grant_id uuid NOT NULL,
  -- NOTE: status was originally application_status (USER-DEFINED enum)
  status text DEFAULT 'draft'::application_status NOT NULL,
  notes text,
  submitted_at timestamptz,
  awarded_at timestamptz,
  amount_awarded numeric,
  currency_awarded varchar(10) DEFAULT 'NGN'::character varying,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  documents jsonb DEFAULT '[]'::jsonb,
  reminder_at timestamptz
);

-- ----------------------------------------------------------------------------
-- Table: grants
-- Columns: 22
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  funder varchar(255) NOT NULL,
  description text,
  amount_min numeric,
  amount_max numeric,
  currency varchar(10) DEFAULT 'NGN'::character varying NOT NULL,
  -- NOTE: category was originally grant_category (USER-DEFINED enum)
  category text NOT NULL,
  -- NOTE: status was originally grant_status (USER-DEFINED enum)
  status text DEFAULT 'open'::grant_status NOT NULL,
  region varchar(100),
  stage varchar(50),
  eligibility text,
  deadline date,
  apply_link text,
  featured boolean DEFAULT false NOT NULL,
  verified boolean DEFAULT false NOT NULL,
  save_count integer DEFAULT 0 NOT NULL,
  apply_count integer DEFAULT 0 NOT NULL,
  posted_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  thumbnail_url text
);

-- ----------------------------------------------------------------------------
-- Table: invoice_items
-- Columns: 8
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  product_id uuid,
  description text NOT NULL,
  quantity numeric DEFAULT 1,
  unit_price numeric DEFAULT 0,
  line_total numeric DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: invoices
-- Columns: 22
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid NOT NULL,
  customer_id uuid,
  invoice_number text NOT NULL,
  document_type text DEFAULT 'invoice'::text,
  status text DEFAULT 'draft'::text,
  issue_date date DEFAULT CURRENT_DATE,
  due_date date,
  notes text,
  apply_vat boolean DEFAULT false,
  vat_rate numeric DEFAULT 7.5,
  subtotal numeric DEFAULT 0,
  vat_amount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  paid_at date,
  payment_method text,
  payment_reference text,
  payment_notes text
);

-- ----------------------------------------------------------------------------
-- Table: likes
-- Columns: 5
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_type text NOT NULL,
  post_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: login_history
-- Columns: 8
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip_hash text NOT NULL,
  ua_hash text NOT NULL,
  ip_label text,
  ua_label text,
  first_seen_at timestamptz DEFAULT now() NOT NULL,
  last_seen_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: marketplace_listings
-- Columns: 19
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  category text,
  type text,
  price numeric,
  price_negotiable boolean DEFAULT false,
  description text,
  state text,
  contact text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  is_pending_review boolean DEFAULT false,
  is_closed boolean DEFAULT false NOT NULL,
  image_urls text[] DEFAULT '{}'::text[],
  condition text,
  is_featured boolean DEFAULT false,
  featured_until timestamptz,
  featured_at timestamptz
);

-- ----------------------------------------------------------------------------
-- Table: mentor_profiles
-- Columns: 19
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mentor_profiles (
  user_id uuid NOT NULL,
  bio text,
  expertise text[] DEFAULT '{}'::text[] NOT NULL,
  session_format text[] DEFAULT '{}'::text[] NOT NULL,
  languages text[] DEFAULT ARRAY['English'::text] NOT NULL,
  -- NOTE: availability was originally mentor_availability (USER-DEFINED enum)
  availability text DEFAULT 'Open'::mentor_availability NOT NULL,
  max_mentees integer DEFAULT 3 NOT NULL,
  mentee_count integer DEFAULT 0 NOT NULL,
  sessions_completed integer DEFAULT 0 NOT NULL,
  rating numeric DEFAULT NULL::numeric,
  review_count integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT false NOT NULL,
  featured boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  headline text,
  years_experience integer DEFAULT 0,
  location text,
  linkedin_url text
);

-- ----------------------------------------------------------------------------
-- Table: mentor_reviews
-- Columns: 9
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mentor_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  mentee_id uuid NOT NULL,
  mentor_id uuid NOT NULL,
  rating integer NOT NULL,
  headline varchar(150),
  body text,
  published boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: mentorship_requests
-- Columns: 10
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mentorship_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id uuid NOT NULL,
  mentor_id uuid NOT NULL,
  topic varchar(150),
  message text,
  goals text,
  -- NOTE: status was originally mentorship_request_status (USER-DEFINED enum)
  status text DEFAULT 'pending'::mentorship_request_status NOT NULL,
  response_note text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: mentorship_reviews
-- Columns: 7
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mentorship_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  reviewee_id uuid NOT NULL,
  rating smallint NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: mentorship_sessions
-- Columns: 12
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mentorship_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_mins integer DEFAULT 60 NOT NULL,
  format varchar(50),
  meeting_link text,
  -- NOTE: status was originally session_status (USER-DEFINED enum)
  status text DEFAULT 'scheduled'::session_status NOT NULL,
  notes text,
  completed_at timestamptz,
  mentee_rating integer,
  mentee_feedback text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: message_reactions
-- Columns: 4
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS message_reactions (
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji varchar(10) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: messages
-- Columns: 10
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  body text,
  media_url text,
  -- NOTE: status was originally message_status (USER-DEFINED enum)
  status text DEFAULT 'sent'::message_status NOT NULL,
  delivered_at timestamptz,
  read_at timestamptz,
  deleted_by_sender boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: notification_digests
-- Columns: 9
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  digest_type varchar(20) DEFAULT 'daily'::character varying NOT NULL,
  status varchar(20) DEFAULT 'pending'::character varying NOT NULL,
  notification_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  item_count integer DEFAULT 0 NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: notification_preferences
-- Columns: 9
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid NOT NULL,
  -- NOTE: type was originally notification_type (USER-DEFINED enum)
  type text NOT NULL,
  in_app boolean DEFAULT true NOT NULL,
  email boolean DEFAULT true NOT NULL,
  push boolean DEFAULT false NOT NULL,
  sms boolean DEFAULT false NOT NULL,
  quiet_hours_start time,
  quiet_hours_end time,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: notifications
-- Columns: 16
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type varchar(50) NOT NULL,
  title text,
  body text,
  link text,
  actor_id uuid,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  -- NOTE: channel was originally notification_channel (USER-DEFINED enum)
  channel text DEFAULT 'in_app'::notification_channel NOT NULL,
  -- NOTE: priority was originally notification_priority (USER-DEFINED enum)
  priority text DEFAULT 'normal'::notification_priority NOT NULL,
  batch_key varchar(100),
  expires_at timestamptz,
  delivered_at timestamptz,
  clicked_at timestamptz
);

-- ----------------------------------------------------------------------------
-- Table: opportunities
-- Columns: 15
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  type text,
  organisation text,
  location text,
  description text,
  requirements text,
  deadline date,
  url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  is_pending_review boolean DEFAULT false,
  is_closed boolean DEFAULT false NOT NULL,
  thumbnail_url text
);

-- ----------------------------------------------------------------------------
-- Table: otp_codes
-- Columns: 10
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier varchar(255) NOT NULL,
  code_hash text NOT NULL,
  -- NOTE: type was originally otp_type (USER-DEFINED enum)
  type text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false NOT NULL,
  used_at timestamptz,
  attempts integer DEFAULT 0 NOT NULL,
  last_attempt timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: papers
-- Columns: 17
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  authors text[] DEFAULT '{}'::text[] NOT NULL,
  journal varchar(255),
  year integer,
  -- NOTE: field was originally research_field (USER-DEFINED enum)
  field text,
  abstract text,
  doi varchar(255),
  link text,
  citations integer DEFAULT 0 NOT NULL,
  downloads integer DEFAULT 0 NOT NULL,
  relevance_score integer DEFAULT 0 NOT NULL,
  featured boolean DEFAULT false NOT NULL,
  verified boolean DEFAULT false NOT NULL,
  submitted_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: platform_announcements
-- Columns: 13
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  title varchar(255) NOT NULL,
  body text NOT NULL,
  cta_label varchar(80),
  cta_url text,
  target_roles text[],
  -- NOTE: priority was originally notification_priority (USER-DEFINED enum)
  priority text DEFAULT 'normal'::notification_priority NOT NULL,
  publish_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz,
  published boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: platform_settings
-- Columns: 12
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_settings (
  key varchar(100) NOT NULL,
  value text NOT NULL,
  -- NOTE: type was originally setting_type (USER-DEFINED enum)
  type text DEFAULT 'string'::setting_type NOT NULL,
  -- NOTE: scope was originally setting_scope (USER-DEFINED enum)
  scope text DEFAULT 'internal'::setting_scope NOT NULL,
  label varchar(150),
  description text,
  category varchar(50),
  allowed_values text[],
  min_value numeric,
  max_value numeric,
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid
);

-- ----------------------------------------------------------------------------
-- Table: platform_stats
-- Columns: 32
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_date date NOT NULL,
  total_users integer DEFAULT 0 NOT NULL,
  new_users_today integer DEFAULT 0 NOT NULL,
  active_users_7d integer DEFAULT 0 NOT NULL,
  active_users_30d integer DEFAULT 0 NOT NULL,
  count_students integer DEFAULT 0 NOT NULL,
  count_researchers integer DEFAULT 0 NOT NULL,
  count_farmers integer DEFAULT 0 NOT NULL,
  count_agripreneurs integer DEFAULT 0 NOT NULL,
  count_institution_reps integer DEFAULT 0 NOT NULL,
  total_posts integer DEFAULT 0 NOT NULL,
  new_posts_today integer DEFAULT 0 NOT NULL,
  total_connections integer DEFAULT 0 NOT NULL,
  new_connections_today integer DEFAULT 0 NOT NULL,
  total_grants integer DEFAULT 0 NOT NULL,
  open_grants integer DEFAULT 0 NOT NULL,
  total_applications integer DEFAULT 0 NOT NULL,
  total_events integer DEFAULT 0 NOT NULL,
  upcoming_events integer DEFAULT 0 NOT NULL,
  total_registrations integer DEFAULT 0 NOT NULL,
  total_products integer DEFAULT 0 NOT NULL,
  active_products integer DEFAULT 0 NOT NULL,
  total_inquiries integer DEFAULT 0 NOT NULL,
  total_papers integer DEFAULT 0 NOT NULL,
  total_collaborations integer DEFAULT 0 NOT NULL,
  open_collaborations integer DEFAULT 0 NOT NULL,
  active_mentors integer DEFAULT 0 NOT NULL,
  active_mentorships integer DEFAULT 0 NOT NULL,
  price_entries_today integer DEFAULT 0 NOT NULL,
  active_alerts integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: poll_options
-- Columns: 5
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL,
  option_text text NOT NULL,
  vote_count integer DEFAULT 0 NOT NULL,
  display_order integer DEFAULT 0 NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: poll_votes
-- Columns: 4
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS poll_votes (
  poll_id uuid NOT NULL,
  option_id uuid NOT NULL,
  user_id uuid NOT NULL,
  voted_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: polls
-- Columns: 5
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  question text NOT NULL,
  closes_at timestamptz,
  total_votes integer DEFAULT 0 NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: post_comments
-- Columns: 9
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  author_id uuid NOT NULL,
  parent_id uuid,
  body text NOT NULL,
  like_count integer DEFAULT 0 NOT NULL,
  deleted boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: post_likes
-- Columns: 3
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_likes (
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: posts
-- Columns: 20
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  -- NOTE: type was originally post_type (USER-DEFINED enum)
  type text NOT NULL,
  -- NOTE: topic was originally post_topic (USER-DEFINED enum)
  topic text,
  title text,
  body text,
  media_url text,
  media_type varchar(20),
  link_url text,
  link_preview jsonb,
  pinned boolean DEFAULT false NOT NULL,
  is_digest boolean DEFAULT false NOT NULL,
  is_featured boolean DEFAULT false NOT NULL,
  like_count integer DEFAULT 0 NOT NULL,
  comment_count integer DEFAULT 0 NOT NULL,
  share_count integer DEFAULT 0 NOT NULL,
  save_count integer DEFAULT 0 NOT NULL,
  view_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: price_alerts
-- Columns: 9
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  commodity text NOT NULL,
  state text,
  condition text NOT NULL,
  target_price numeric NOT NULL,
  unit text DEFAULT 'kg'::text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: price_entries
-- Columns: 14
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS price_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_id uuid NOT NULL,
  price numeric NOT NULL,
  currency varchar(5) DEFAULT 'NGN'::character varying NOT NULL,
  market varchar(150) NOT NULL,
  state varchar(100),
  country varchar(100) DEFAULT 'Nigeria'::character varying NOT NULL,
  reported_by uuid,
  -- NOTE: source was originally price_source (USER-DEFINED enum)
  source text DEFAULT 'user_submitted'::price_source NOT NULL,
  verified boolean DEFAULT false NOT NULL,
  verified_by uuid,
  verified_at timestamptz,
  notes text,
  recorded_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: price_reports
-- Columns: 12
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS price_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  commodity text NOT NULL,
  category text,
  price numeric NOT NULL,
  unit text NOT NULL,
  market_name text,
  state text,
  reported_at timestamptz DEFAULT now(),
  notes text,
  price_per_unit numeric,
  is_active boolean DEFAULT true
);

-- ----------------------------------------------------------------------------
-- Table: product_inquiries
-- Columns: 9
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  message text NOT NULL,
  quantity varchar(50),
  -- NOTE: status was originally inquiry_status (USER-DEFINED enum)
  status text DEFAULT 'pending'::inquiry_status NOT NULL,
  replied_at timestamptz,
  conversation_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: product_reviews
-- Columns: 10
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  rating integer NOT NULL,
  headline varchar(150),
  body text,
  seller_reply text,
  replied_at timestamptz,
  published boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: profiles
-- Columns: 46
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  first_name text,
  last_name text,
  role text,
  bio text,
  location text,
  institution text,
  interests text[],
  linkedin text,
  twitter text,
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  avatar_url text,
  username text,
  phone text,
  whatsapp text,
  is_admin boolean DEFAULT false,
  is_suspended boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  subscription_plan text,
  subscription_expires_at timestamptz,
  is_elite boolean DEFAULT false,
  elite_granted_at timestamptz,
  admin_role text,
  has_onboarded boolean DEFAULT false,
  gender text,
  date_of_birth date,
  facebook text,
  tiktok text,
  institution_2 text,
  institution_3 text,
  notify_on_login boolean DEFAULT true NOT NULL,
  admin_permissions jsonb,
  email text,
  subscription_tier text DEFAULT 'free'::text NOT NULL,
  account_type text DEFAULT 'individual'::text,
  institution_type text,
  institution_display_name text,
  contact_person_name text,
  contact_person_role text,
  institution_website text,
  institution_cac text,
  is_institution_verified boolean DEFAULT false,
  last_seen_at timestamptz
);

-- ----------------------------------------------------------------------------
-- Table: push_subscriptions
-- Columns: 10
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh_key text NOT NULL,
  auth_secret text NOT NULL,
  device_name varchar(100),
  user_agent text,
  active boolean DEFAULT true NOT NULL,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: reading_list
-- Columns: 4
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reading_list (
  user_id uuid NOT NULL,
  paper_id uuid NOT NULL,
  added_at timestamptz DEFAULT now() NOT NULL,
  notes text
);

-- ----------------------------------------------------------------------------
-- Table: refresh_tokens
-- Columns: 10
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL,
  device_name varchar(100),
  ip_address inet,
  user_agent text,
  expires_at timestamptz NOT NULL,
  revoked boolean DEFAULT false NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: reports
-- Columns: 6
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_type text NOT NULL,
  post_id uuid NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: research_posts
-- Columns: 12
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS research_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  type text,
  content text NOT NULL,
  tags text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  is_locked boolean DEFAULT false NOT NULL,
  cover_image_url text,
  attachment_url text,
  attachment_name text
);

-- ----------------------------------------------------------------------------
-- Table: saved_events
-- Columns: 3
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_events (
  user_id uuid NOT NULL,
  event_id uuid NOT NULL,
  saved_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: saved_grants
-- Columns: 3
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_grants (
  user_id uuid NOT NULL,
  grant_id uuid NOT NULL,
  saved_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: saved_posts
-- Columns: 4
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_posts (
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  saved_at timestamptz DEFAULT now() NOT NULL,
  folder varchar(50)
);

-- ----------------------------------------------------------------------------
-- Table: saved_products
-- Columns: 3
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_products (
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  saved_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: search_logs
-- Columns: 6
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  query text NOT NULL,
  module text NOT NULL,
  results_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: settings
-- Columns: 3
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  key text NOT NULL,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: stock_movements
-- Columns: 11
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  type text NOT NULL,
  quantity numeric NOT NULL,
  cost_price numeric DEFAULT 0,
  reason text NOT NULL,
  note text,
  invoice_id uuid,
  created_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: support_ticket_events
-- Columns: 6
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  actor_id uuid,
  event_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: support_ticket_messages
-- Columns: 6
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  user_id uuid NOT NULL,
  message text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: support_tickets
-- Columns: 12
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  category text DEFAULT 'general'::text NOT NULL,
  priority text DEFAULT 'medium'::text NOT NULL,
  status text DEFAULT 'open'::text NOT NULL,
  assigned_to uuid,
  sla_deadline timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- ----------------------------------------------------------------------------
-- Table: support_tokens
-- Columns: 6
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: user_flags
-- Columns: 11
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type varchar(50) NOT NULL,
  target_id uuid NOT NULL,
  reason varchar(50) NOT NULL,
  details text,
  status varchar(20) DEFAULT 'pending'::character varying NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: user_papers
-- Columns: 12
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  paper_id uuid,
  title varchar(255),
  journal varchar(255),
  year integer,
  doi varchar(255),
  link text,
  co_authors text[],
  -- NOTE: status was originally paper_status (USER-DEFINED enum)
  status text DEFAULT 'published'::paper_status NOT NULL,
  progress integer DEFAULT 100 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: user_profiles
-- Columns: 19
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid NOT NULL,
  first_name varchar(100),
  last_name varchar(100),
  headline text,
  bio text,
  avatar_url text,
  initials varchar(4),
  institution varchar(255),
  department varchar(255),
  state varchar(100),
  country varchar(100) DEFAULT 'Nigeria'::character varying NOT NULL,
  field varchar(100),
  level varchar(50),
  open_to text[],
  profile_views integer DEFAULT 0 NOT NULL,
  profile_strength integer DEFAULT 0 NOT NULL,
  xp_points integer DEFAULT 0 NOT NULL,
  connection_level integer DEFAULT 1 NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: user_skills
-- Columns: 4
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  skill varchar(100) NOT NULL,
  endorsed_count integer DEFAULT 0 NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: users
-- Columns: 12
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  -- NOTE: email was originally citext (USER-DEFINED enum)
  email text,
  phone varchar(20),
  password_hash text,
  google_id varchar(255),
  linkedin_id varchar(255),
  -- NOTE: role was originally user_role (USER-DEFINED enum)
  role text NOT NULL,
  -- NOTE: status was originally user_status (USER-DEFINED enum)
  status text DEFAULT 'pending_verification'::user_status NOT NULL,
  email_verified boolean DEFAULT false NOT NULL,
  phone_verified boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  last_login_at timestamptz
);

-- ----------------------------------------------------------------------------
-- Table: waitlist_signups
-- Columns: 5
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text DEFAULT 'waitlist_page'::text,
  created_at timestamptz DEFAULT now(),
  ip_address text
);

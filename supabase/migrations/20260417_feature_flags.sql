-- Feature flags table — runtime-editable feature toggles
-- Supports global on/off, per-user targeting, per-business targeting,
-- and percentage-based rollout for gradual enablement.

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text,
  is_enabled boolean not null default false,
  enabled_for_users uuid[] not null default '{}',
  enabled_for_businesses uuid[] not null default '{}',
  rollout_percentage int not null default 0
    check (rollout_percentage >= 0 and rollout_percentage <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.feature_flags is
  'Runtime feature toggles. Supports global, per-user, per-business, and percentage rollout.';
comment on column public.feature_flags.key is
  'Stable identifier used in code (e.g., weekly_digest, ai_assistant).';
comment on column public.feature_flags.rollout_percentage is
  'If > 0, enables feature for this fraction of users via deterministic user-ID hash.';

-- Auto-update updated_at on row modification
create or replace function public.feature_flags_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists feature_flags_updated_at on public.feature_flags;
create trigger feature_flags_updated_at
  before update on public.feature_flags
  for each row
  execute function public.feature_flags_set_updated_at();

-- RLS: authenticated users can READ, only service role can WRITE
alter table public.feature_flags enable row level security;

drop policy if exists "feature_flags_select_authenticated" on public.feature_flags;
create policy "feature_flags_select_authenticated"
  on public.feature_flags
  for select
  to authenticated
  using (true);

-- No insert/update/delete policies = only service role can modify
-- You'll edit flags via Supabase dashboard or admin UI later

-- Seed the 8 differentiator flags (all disabled at launch)
insert into public.feature_flags (key, description, is_enabled) values
  ('weekly_digest',         'Automated weekly WhatsApp business summary',         false),
  ('public_business_pages', 'SEO-friendly public pages for each business',        false),
  ('whatsapp_delivery',     'Deliver invoices and reminders via WhatsApp',        false),
  ('recurring_invoices',    'Schedule recurring invoices on weekly/monthly',      false),
  ('expense_ocr',           'Scan receipts and extract data via Anthropic Vision',false),
  ('agri_credit_score',     'AgroYield credit score for SME lending',             false),
  ('ai_assistant',          'AI business assistant (Ada)',                        false),
  ('cooperatives',          'Cooperative and group management features',          false)
on conflict (key) do nothing;
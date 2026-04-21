-- ============================================================================
-- Migration: mentor application approval gate
-- ----------------------------------------------------------------------------
-- Mirrors the institution-verification pattern (is_institution_verified +
-- verify_institution admin action) but with an explicit three-state lifecycle
-- because mentor applications can be *rejected* with a reason, whereas
-- institutions are binary (verified / not).
--
-- Adds to public.mentor_profiles:
--   approval_status   varchar(20)   default 'pending'  (pending|approved|rejected)
--   approved_at       timestamptz
--   approved_by       uuid          (admin user who took the decision)
--   rejection_reason  text          (populated when approval_status='rejected')
--
-- Business rules enforced elsewhere (app layer + RLS):
--   • become-mentor page inserts with approval_status='pending' (never bypass)
--   • /mentorship and /mentorship/[id] show only approved mentors to mentees
--   • Own mentor profile remains visible to the applicant regardless of state
--   • Admin approve/reject is done via /api/admin/mentorship (service-role),
--     with email + Slack notification on decision (fire-and-forget)
--
-- Backfill: any mentor already flagged is_active=true before this migration
-- ran is grandfathered in as 'approved' — we do not want to suddenly hide
-- existing mentors from the public browser. Inactive rows are left pending
-- so they must be reviewed if/when they flip active.
--
-- Idempotent: all ADD COLUMN / CREATE INDEX / UPDATE statements use IF NOT
-- EXISTS or are guarded by the existing default, so re-runs are safe.
-- ============================================================================

alter table public.mentor_profiles
  add column if not exists approval_status varchar(20) not null default 'pending',
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists rejection_reason text;

-- Lock the status vocabulary so typos can't slip a row into limbo
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'mentor_profiles_approval_status_check'
  ) then
    alter table public.mentor_profiles
      add constraint mentor_profiles_approval_status_check
      check (approval_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

-- Partial index keeps the "Mentors → Pending" admin query fast — the pending
-- set is bounded (new applications) while approved grows unbounded, so a
-- partial index on pending alone is the right shape.
create index if not exists idx_mentor_profiles_pending
  on public.mentor_profiles(approval_status, updated_at desc)
  where approval_status = 'pending';

-- Backfill: grandfather existing active mentors as approved. We set
-- approved_at to the existing created_at so the admin audit trail roughly
-- reflects when the mentor first went live. approved_by stays null because
-- no admin actually clicked Approve for these rows.
update public.mentor_profiles
   set approval_status = 'approved',
       approved_at = coalesce(approved_at, created_at)
 where is_active = true
   and approval_status = 'pending';

comment on column public.mentor_profiles.approval_status is
  'Application lifecycle: pending (awaiting admin review), approved (publicly listed), rejected (hidden with reason).';
comment on column public.mentor_profiles.approved_at is
  'Timestamp of the most recent approval decision. Null while pending.';
comment on column public.mentor_profiles.approved_by is
  'Admin profile id who took the decision. Null for grandfathered rows.';
comment on column public.mentor_profiles.rejection_reason is
  'Human-readable reason shown to the applicant. Populated only when approval_status = rejected.';

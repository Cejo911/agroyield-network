-- 2026-04-21  Supabase lint: pin search_path on 54 public.* functions
--
-- Supabase lint: function_search_path_mutable (WARN × 54)
--
-- Background
-- ----------
-- Postgres resolves unqualified object references in a function body
-- through `search_path`. If a function doesn't pin search_path, an
-- attacker who can write into any schema earlier in the caller's
-- search_path (e.g. a schema they own, or a schema the DB owner created
-- with loose ACLs) can shadow objects the function references — e.g.
-- create a malicious `public.now()` that shims in first. This is
-- the classic "trojan source" vector Supabase's linter is defending
-- against.
--
-- Real-world exploitability for our 54 functions is low — they're
-- either trigger functions (only fired by the DB itself, no user-
-- controlled search_path) or admin/service-role helpers. But the fix
-- is one-line-per-function and eliminates a whole class of future
-- footguns, so there's no reason to carry the warnings.
--
-- Remediation
-- -----------
-- Pin each function's search_path to 'public, pg_catalog'. We include
-- pg_catalog explicitly (rather than relying on it being appended
-- implicitly) so the function resolves built-ins (now(), coalesce(),
-- etc.) against the canonical Postgres catalog regardless of what the
-- caller's search_path looks like.
--
-- Implementation note: this file originally used a DO block that
-- iterated pg_proc and emitted ALTER FUNCTION statements dynamically
-- via pg_get_function_identity_arguments — overload-safe and
-- future-proof. On 21 Apr 2026 that block appeared to execute cleanly
-- in Supabase Studio's SQL editor but left `proconfig` NULL on every
-- target function. Root cause not diagnosed (transaction-boundary
-- quirk / silent exception inside the editor's wrapper / Studio
-- rolling back a session variable). Rather than keep hunting, the
-- migration was rewritten as explicit, one-statement-per-function
-- form below, which applied successfully on the first paste.
--
-- Signatures were generated from the original DO block's SELECT query
-- (filtered to schema='public' AND name=ANY(target_names)); all 54
-- target names resolved to exactly one signature each — no overloads
-- in the current schema. If an overloaded version ever appears
-- (same name, different args), add the new signature as its own
-- ALTER FUNCTION line.
--
-- Statements are alphabetised to match the original audit list so
-- diffs against a re-lint remain readable.
--
-- Rollback
-- --------
-- Reset with: ALTER FUNCTION public.<name>(<args>) RESET search_path;
-- To mass-revert, swap 'SET search_path = public, pg_catalog' for
-- 'RESET search_path' in every line below.

ALTER FUNCTION public.admin_can_view_logs(p_user_id uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.award_xp(p_user_id uuid, p_points integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.award_xp_on_collab_posted() SET search_path = public, pg_catalog;
ALTER FUNCTION public.award_xp_on_paper_submitted() SET search_path = public, pg_catalog;
ALTER FUNCTION public.award_xp_on_post() SET search_path = public, pg_catalog;
ALTER FUNCTION public.award_xp_on_product_listed() SET search_path = public, pg_catalog;
ALTER FUNCTION public.businesses_auto_slug() SET search_path = public, pg_catalog;
ALTER FUNCTION public.calculate_profile_strength() SET search_path = public, pg_catalog;
ALTER FUNCTION public.capture_platform_stats() SET search_path = public, pg_catalog;
ALTER FUNCTION public.check_price_alerts() SET search_path = public, pg_catalog;
ALTER FUNCTION public.expire_old_notifications() SET search_path = public, pg_catalog;
ALTER FUNCTION public.feature_flags_set_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_admin_role(p_user_id uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.immutable_array_to_string(arr text[], sep text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.increment_otp_attempt(p_otp_id uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.is_active_admin(p_user_id uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_connection_request() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_post_commented() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_post_liked() SET search_path = public, pg_catalog;
ALTER FUNCTION public.on_admin_user_inserted() SET search_path = public, pg_catalog;
ALTER FUNCTION public.on_announcement_published() SET search_path = public, pg_catalog;
ALTER FUNCTION public.on_collab_application() SET search_path = public, pg_catalog;
ALTER FUNCTION public.on_event_registration() SET search_path = public, pg_catalog;
ALTER FUNCTION public.on_grant_application() SET search_path = public, pg_catalog;
ALTER FUNCTION public.on_mentorship_request() SET search_path = public, pg_catalog;
ALTER FUNCTION public.on_platform_setting_changed() SET search_path = public, pg_catalog;
ALTER FUNCTION public.on_product_inquiry() SET search_path = public, pg_catalog;
ALTER FUNCTION public.on_session_completed() SET search_path = public, pg_catalog;
ALTER FUNCTION public.process_notification_digests() SET search_path = public, pg_catalog;
ALTER FUNCTION public.recalculate_citation_stats(p_user_id uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.recalculate_mentor_rating() SET search_path = public, pg_catalog;
ALTER FUNCTION public.recalculate_product_rating() SET search_path = public, pg_catalog;
ALTER FUNCTION public.seed_default_notification_preferences(p_user_id uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.send_grant_deadline_reminders() SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_expense_receipts_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_recurring_invoices_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_usage_tracking_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.smart_notify(p_user_id uuid, p_type notification_type, p_title text, p_body text, p_link text, p_actor_id uuid, p_entity_id uuid, p_priority notification_priority, p_batch_key text, p_expires_at timestamp with time zone, p_dedup_window interval) SET search_path = public, pg_catalog;
ALTER FUNCTION public.sync_comment_like_count() SET search_path = public, pg_catalog;
ALTER FUNCTION public.sync_event_save_count() SET search_path = public, pg_catalog;
ALTER FUNCTION public.sync_grant_save_count() SET search_path = public, pg_catalog;
ALTER FUNCTION public.sync_paper_downloads() SET search_path = public, pg_catalog;
ALTER FUNCTION public.sync_poll_vote_count() SET search_path = public, pg_catalog;
ALTER FUNCTION public.sync_post_comment_count() SET search_path = public, pg_catalog;
ALTER FUNCTION public.sync_post_like_count() SET search_path = public, pg_catalog;
ALTER FUNCTION public.sync_post_save_count() SET search_path = public, pg_catalog;
ALTER FUNCTION public.sync_product_save_count() SET search_path = public, pg_catalog;
ALTER FUNCTION public.tg_profile_experience_touch_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.trg_fn_no_self_collab_application() SET search_path = public, pg_catalog;
ALTER FUNCTION public.trg_fn_papers_citation_sync() SET search_path = public, pg_catalog;
ALTER FUNCTION public.trg_fn_user_papers_citation_sync() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_conversation_on_message() SET search_path = public, pg_catalog;
ALTER FUNCTION public.user_has_business_access(biz_id uuid, usr_id uuid) SET search_path = public, pg_catalog;

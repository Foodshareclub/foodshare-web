-- ============================================================================
-- Drop policies that apply only to BYPASSRLS roles: rules the database
-- never applies.
--
-- A row-level-security policy is evaluated when — and only when — the
-- calling role is subject to RLS. A role with BYPASSRLS never is: every
-- query it runs skips the policy machinery entirely and sees every row,
-- whether or not a policy would have allowed it. A policy whose TO list
-- names only BYPASSRLS roles is therefore evaluated against nobody in
-- existence. It grants nothing — the named roles already see everything —
-- and it denies nothing — no other role can reach it. It is a rule the
-- database never applies, and it reads as access that does not exist.
--
-- The estate's own platform makes the point concrete: `platform.sql`
-- creates `service_role NOLOGIN NOINHERIT BYPASSRLS`, and
-- `20260927010000_enable_rls_on_internal_tables.sql` records the design
-- decision built on it — internal tables get RLS, `service_role` keeps
-- BYPASSRLS, and the job worker gets explicit per-table policies rather
-- than the blunt instrument the 20260927 migration describes. The 57
-- policies in this migration are the residue of the era before that
-- split: one per internal table, all `TO service_role`, all written when
-- the service key was the only backend role and a policy looked like a
-- sensible grant. The 20260927 split made the bypass permanent and the
-- policies silent; nothing has evaluated one of them since.
--
-- Measured, not assumed, before a single drop:
--
--   * All 57 are `TO service_role` alone. No dead policy names
--     `postgres` or a mixed role set, and the audit re-derives the set
--     from the catalog on every run.
--   * The `PUBLIC` pseudo-group is excluded: a policy written `TO PUBLIC`
--     (or with no TO clause) applies to every role — bypassing ones
--     included — and is live by definition. 219 of the catalog's 425
--     policies carry it; none is touched here.
--   * The worker's access is untouched: `job_worker` and `job_worker_app`
--     carry NOBYPASSRLS and rely on explicit USING (true) policies
--     (20260930000000 pins that a worker role must not carry BYPASSRLS).
--     Those 16 policies stay.
--
-- The drops are plain and idempotent. `DROP POLICY IF EXISTS` re-runs
-- quietly, and an in-transaction assertion re-derives the dead set after
-- the drops — any policy left that names only BYPASSRLS roles fails the
-- migration instead of shipping. (The assertion mirrors the permanent
-- audit in `__tests__/contract-drift.test.ts`; if the two ever disagree,
-- the catalog comparison in the oracle applier is the arbiter, because
-- both read the same database this migration runs against.)
--
-- One consequence, recorded so it is a decision and not a surprise: if a
-- future migration revokes BYPASSRLS from `service_role`, the service key
-- loses row-level access to these 57 tables and must be given evaluated
-- access — new policies, not the resurrected expectation that these old
-- ones were doing work. The correct response to a changed role is a
-- changed policy set, written for the role that is actually subject to
-- RLS.
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "Service role can manage config" ON app_config;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Service role can manage compressed_images" ON compressed_images;
DROP POLICY IF EXISTS "Service role can manage translations" ON content_translations;
DROP POLICY IF EXISTS daily_stats_all_service ON daily_stats;
DROP POLICY IF EXISTS "Service role can manage attestations" ON device_attestations;
DROP POLICY IF EXISTS "Service role full access" ON display_name_overrides;
DROP POLICY IF EXISTS "Service role has full access to translations" ON dynamic_content_translations;
DROP POLICY IF EXISTS "Service role full access" ON email_audit_log;
DROP POLICY IF EXISTS "Service role full access on bounce events" ON email_bounce_events;
DROP POLICY IF EXISTS "Service role can manage circuit breaker state" ON email_circuit_breaker_state;
DROP POLICY IF EXISTS "Service role full access to delivery logs" ON email_delivery_log;
DROP POLICY IF EXISTS "Service role can manage health events" ON email_health_events;
DROP POLICY IF EXISTS "Service role can insert email logs" ON email_logs;
DROP POLICY IF EXISTS "Service role can update email logs" ON email_logs;
DROP POLICY IF EXISTS "Service role can manage health history" ON email_provider_health_history;
DROP POLICY IF EXISTS "Service role full access to health metrics" ON email_provider_health_metrics;
DROP POLICY IF EXISTS "Service role can manage metrics" ON email_provider_metrics;
DROP POLICY IF EXISTS "Service role full access on monthly quota" ON email_provider_monthly_quota;
DROP POLICY IF EXISTS "Service role can manage quota data" ON email_provider_quota;
DROP POLICY IF EXISTS "Service role can manage email queue" ON email_queue;
DROP POLICY IF EXISTS "Service role full access on suppression list" ON email_suppression_list;
DROP POLICY IF EXISTS "Service role full access to experiment_assignments" ON experiment_assignments;
DROP POLICY IF EXISTS "Service role full access to experiments" ON experiments;
DROP POLICY IF EXISTS "Service role full access to feature_flag_overrides" ON feature_flag_overrides;
DROP POLICY IF EXISTS "Admins can manage feature flags" ON feature_flags;
DROP POLICY IF EXISTS "Service role can manage forum user stats" ON forum_user_stats;
DROP POLICY IF EXISTS service_role_all_geocoding_cache ON geocoding_cache;
DROP POLICY IF EXISTS "Service role full access on grok usage logs" ON grok_usage_logs;
DROP POLICY IF EXISTS service_role_all_household_waste_logs ON household_waste_logs;
DROP POLICY IF EXISTS "Service role can manage image_compressions" ON image_compressions;
DROP POLICY IF EXISTS "Service role can insert upload metrics" ON image_upload_metrics;
DROP POLICY IF EXISTS service_role_all_infoplist_translation_cache ON infoplist_translation_cache;
DROP POLICY IF EXISTS "Service role manages legal documents" ON legal_documents;
DROP POLICY IF EXISTS "Service role full access to location_update_queue" ON location_update_queue;
DROP POLICY IF EXISTS "Service role full access to digest queue" ON notification_digest_queue;
DROP POLICY IF EXISTS "Service role full access" ON notification_preferences;
DROP POLICY IF EXISTS "Service role full access to notification_queue" ON notification_queue;
DROP POLICY IF EXISTS "Service role full access to settings" ON notification_settings;
DROP POLICY IF EXISTS "Service role full access" ON notification_templates;
DROP POLICY IF EXISTS "Service role full access to pending_operations" ON pending_operations;
DROP POLICY IF EXISTS activity_logs_service_policy ON post_activity_logs;
DROP POLICY IF EXISTS feed_cells_all_service ON precomputed_feed_cells;
DROP POLICY IF EXISTS service_role_all_rate_limit_entries ON rate_limit_entries;
DROP POLICY IF EXISTS "Service role full access to sync_checkpoints" ON sync_checkpoints;
DROP POLICY IF EXISTS "Service role full access on telegram_link_tokens" ON telegram_link_tokens;
DROP POLICY IF EXISTS "Service role can insert translation_change_log" ON translation_change_log;
DROP POLICY IF EXISTS "Service role has full access to analytics" ON translation_usage_analytics;
DROP POLICY IF EXISTS "Service role can insert translation_versions" ON translation_versions;
DROP POLICY IF EXISTS "Service role can insert translations" ON translations;
DROP POLICY IF EXISTS "Service role can update translations" ON translations;
DROP POLICY IF EXISTS "Service role full access to user_activity_summary" ON user_activity_summary;
DROP POLICY IF EXISTS "Service role full access to user_events" ON user_events;
DROP POLICY IF EXISTS "Service role full access" ON user_events_2025_12;
DROP POLICY IF EXISTS "Service role full access" ON user_events_2026_01;
DROP POLICY IF EXISTS "Service role full access" ON user_events_2026_02;
DROP POLICY IF EXISTS "Service role can insert notifications" ON user_notifications;

-- Re-derive the dead set the way the audit does: any policy whose role
-- list is non-empty, names no public pseudo-group, and contains no role
-- that is subject to RLS. The cardinality guard keeps a hypothetical
-- TO-PUBLIC policy (empty role array) out of the test.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
  FROM pg_policies pol
  WHERE cardinality(pol.roles) > 0
    AND NOT ('public' = ANY(pol.roles))
    AND NOT EXISTS (
      SELECT 1 FROM pg_roles r
      WHERE r.rolname = ANY(pol.roles) AND NOT r.rolbypassrls
    );

  IF n > 0 THEN
    RAISE EXCEPTION 'expected 0 policies restricted to BYPASSRLS roles after the drop, found %', n;
  END IF;
END
$$;

COMMIT;

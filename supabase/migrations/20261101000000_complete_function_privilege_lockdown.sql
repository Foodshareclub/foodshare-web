-- Stage 2 of the function-privilege lockdown: invert the default.
--
-- Stage 1 (20260925000000) revoked nine confirmed-critical RPCs but left the
-- blanket grants from 20260812200000 in place. The catalog consequently showed
-- 404 distinct public functions still executable by `anon`. Every one of them
-- was reachable with the public anon key through PostgREST, including
-- `get_admin_users` (all users' email, nickname, last-seen and roles),
-- `get_pending_emails_for_processing`, `queue_email`, `moderate_remove_post`
-- and the billing wrappers.
--
-- This migration completes the inversion the Stage 1 comment described:
--
--   1. Revoke EXECUTE on every routine in `public`, `audit` and `billing` from
--      PUBLIC, anon and authenticated.
--   2. Grant service_role every routine. The edge functions use the service
--      client for privileged work, and service_role is the boundary at which
--      those calls are authorized.
--   3. Grant `authenticated` the public routines again, then revoke the
--      administrative, billing, email, CRM, analytics, secret and MFA surface.
--      The account is still the normal client role, but it no longer reaches
--      an operator function merely because it has a JWT.
--   4. Grant `anon` only the public read allowlist below, plus the two policy
--      helpers that RLS uses (`is_admin`, `is_admin_jsonb`) and the `public`
--      JWT shims the policies reference.
--
-- The allowlists were derived from the call sites in `supabase/functions` and
-- `foodshare-web/src`, and checked against the catalog. A function added later
-- is not granted to clients by default: Stage 1's ALTER DEFAULT PRIVILEGES
-- already revokes EXECUTE on new functions from PUBLIC/anon/authenticated and
-- grants it to service_role, and this migration repeats that for audit/billing.
--
-- Deliberate breakage (move these callers to the service client; do not
-- re-grant):
--
--   * admin analytics/CRM/email/billing panels that call privileged RPCs with
--     the browser client. They need a server route using the admin client.
--   * MFA backup-code and challenge helpers. Browser MFA is already replaced by
--     Supabase MFA; the old path was an AAL2 bypass (Stage 1).
--
-- `get_admin_users` is the clearest example: it has no internal authorization,
-- so the grant *is* the authorization. It is now service_role only.

BEGIN;

-- 1. Remove the inherited PUBLIC grant and every explicit client grant.
DO $$
DECLARE
  routine record;
BEGIN
  FOR routine IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'audit', 'billing')
  LOOP
    EXECUTE format(
      'REVOKE ALL ON ROUTINE %s FROM PUBLIC, anon, authenticated',
      routine.signature
    );
    EXECUTE format(
      'GRANT EXECUTE ON ROUTINE %s TO service_role',
      routine.signature
    );
  END LOOP;
END $$;

-- 2. Authenticated gets the public surface back, minus the privileged names
--    below. This is deliberately broad: the ordinary product API is large and
--    is expected to grow, and the sensitive surface is the part that must be
--    enumerated. `anon` gets an explicit allowlist instead, because it is the
--    unauthenticated internet.
DO $$
DECLARE
  routine record;
BEGIN
  FOR routine IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format(
      'GRANT EXECUTE ON ROUTINE %s TO authenticated',
      routine.signature
    );
  END LOOP;
END $$;

DO $$
DECLARE
  routine record;
BEGIN
  FOR routine IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (
        p.proname = ANY (ARRAY[
          -- administrative / operator
          'get_admin_users',
          'get_admin_reports_stats',
          'get_activity_dashboard_stats',
          'get_connection_pool_stats',
          'get_error_rate',
          'get_login_spike_stats',
          'get_p95_latency',
          'get_localization_analytics',
          'get_translation_usage',
          'get_web_vitals_by_page',
          'get_web_vitals_summary',
          'get_web_vitals_trend',
          'moderate_remove_post',
          'moderate_toggle_post_lock',
          'feature_forum_post',
          'toggle_automation_cron',
          'record_function_call',
          'log_audit_event',
          'update_circuit_status',
          -- secrets / arbitrary SQL / MFA / phone verification
          'get_vault_secret',
          'get_secrets',
          'get_secret_audited',
          'get_vault_failure_count',
          'execute_readonly_query',
          'create_mfa_challenge',
          'verify_mfa_challenge',
          'get_current_aal',
          'verify_phone_for_sms',
          'generate_backup_codes',
          -- transactional email and provider quota
          'get_pending_emails_for_processing',
          'queue_email',
          'queue_campaign_emails_batch',
          'release_email_claims',
          'mark_email_as_sent',
          'mark_email_as_failed',
          'record_email_send',
          'batch_record_email_metrics',
          'check_provider_quota',
          'increment_provider_quota',
          'is_email_suppressed',
          'get_comprehensive_quota_status',
          'get_segment_recipients',
          -- CRM
          'archive_crm_customer',
          'unarchive_crm_customer',
          'get_crm_customer_summary',
          'get_crm_dashboard_stats',
          'update_crm_customer_metrics'
        ])
        -- Every billing helper, including the ones added after this migration.
        OR p.proname LIKE 'billing\_%'
        -- The overload that answers "is this other account an admin?" has no
        -- product use; policies use is_admin(), which stays granted.
        OR (p.proname = 'is_admin' AND p.pronargs > 0)
      )
  LOOP
    EXECUTE format(
      'REVOKE ALL ON ROUTINE %s FROM authenticated',
      routine.signature
    );
  END LOOP;
END $$;

-- 3. Anonymous gets only the read-only public product surface and the policy
--    helpers RLS cannot evaluate without. A write helper is included only where
--    the public page performs it on view (a counter increment), never where it
--    changes ownership or content.
DO $$
DECLARE
  routine record;
BEGIN
  FOR routine IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        -- RLS helpers referenced by policies on public tables. Only the
        -- zero-argument form: policies call is_admin(), and the
        -- is_admin(uuid) overload would let an anonymous caller ask whether
        -- any given account is an administrator.
        'is_admin',
        'is_admin_jsonb',
        'jwt',
        'role',
        'uid',
        -- Pre-login checks.
        'check_client_compatibility',
        'check_lockout_status',
        'requires_mfa',
        -- Browse, search and detail.
        'detect_map_hotspots',
        'get_batch_engagement',
        'get_challenge_detail',
        'get_challenge_leaderboard',
        'get_challenges_screen_data',
        'get_experiment_variant',
        'get_forum_feed_data',
        'get_forum_post_detail',
        'get_home_screen_data',
        'get_listing_detail_data',
        'get_locations_in_viewport',
        'get_nearby_posts',
        'get_nearby_posts_count',
        'get_post_engagement_totals',
        'get_post_rating',
        'get_posts_in_bounds',
        'get_search_screen_data',
        'get_user_feature_flags',
        'match_posts',
        'search_food_items',
        'search_forum',
        -- Public view counters (no content or ownership change).
        'increment_forum_view',
        'increment_forum_views',
        'increment_post_view'
      ])
      AND (p.proname <> 'is_admin' OR p.pronargs = 0)
  LOOP
    EXECUTE format(
      'GRANT EXECUTE ON ROUTINE %s TO anon',
      routine.signature
    );
  END LOOP;
END $$;

-- 4. New routines in any client-visible schema are service-role only until an
--    author grants them explicitly.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA audit
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit
  GRANT EXECUTE ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA billing
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA billing
  GRANT EXECUTE ON FUNCTIONS TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

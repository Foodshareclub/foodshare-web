-- Stage 1 of the function-privilege lockdown: revoke the confirmed-critical
-- RPCs from client roles and stop granting new functions to clients by default.
--
-- Background
-- ----------
-- 20260812200000_grant_public_privileges.sql and
-- 20260812225000_fix_permissions_and_schema_cache.sql granted
--   GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, ...
-- With the public anon key, PostgREST therefore exposed every SECURITY DEFINER
-- helper in schema public, including the ones revoked below.
--
-- Revoked here (anon + authenticated lose EXECUTE; service_role keeps it)
-- ----------------------------------------------------------------------
--   get_vault_secret(text)                  -> returns any Vault secret by name
--                                               (JWT_SECRET, OpenAI, Resend,
--                                               Upstash, MotherDuck, ...)
--   get_secrets(...)                        -> same, batch variant
--   get_secret_audited(...)                 -> same; returns the value regardless
--                                               of the role it "audits" for
--   get_vault_failure_count()               -> internal counter, no client use
--   execute_readonly_query(text)            -> arbitrary read-only SQL
--   create_mfa_challenge(uuid, ...)         -> returns the plaintext MFA code
--   verify_mfa_challenge(uuid, text, uuid)  -> mints an 'aal2' session; neither
--                                               argument is bound to auth.uid()
--   get_current_aal(uuid)                   -> trusts a caller-supplied profile
--   verify_phone_for_sms(...)               -> marks a phone verified without
--                                               proving possession of a code
--
-- The MFA pair was a complete pre-authentication bypass: anon could call
-- create_mfa_challenge for any profile UUID, read the returned code, then call
-- verify_mfa_challenge to obtain an AAL2 session for that user.
--
-- Expected client-side breakage (intentional; these features are the vulnerable
-- ones and must move server-side or be replaced, not re-granted)
-- ----------------------------------------------------------------------
--   src/lib/security/mfa.ts            create/verify challenge, get_current_aal
--   src/app/admin/analytics/sync/page.tsx  get_vault_secret("MOTHERDUCK_TOKEN")
--
-- Stage 2 (not in this migration)
-- ---------------------------
-- Invert the model wholesale: revoke EXECUTE from PUBLIC/anon/authenticated on
-- every function in schema public, then re-grant a reviewed allowlist. The
-- allowlist was derived from real call sites (108 functions across
-- foodshare-web/src and foodshare-backend/supabase/functions) and needs these
-- web-side fixes first, because these call sites currently reach privileged
-- RPCs with the browser/anon client rather than the service role:
--
--   src/lib/email/providers/aws-ses.ts, src/lib/email/unified-service.ts
--       check_provider_quota, increment_provider_quota, is_email_suppressed,
--       get_comprehensive_quota_status, batch_record_email_metrics
--       -> transactional email breaks if revoked; move to the service client
--   src/app/actions/nearby-posts.ts
--       update_user_location -> fix the function to bind auth.uid() first
--   src/app/actions/newsletter.ts, src/app/actions/automations/*,
--   src/app/actions/post-activity.ts, src/lib/data/{crm,admin-reports,post-activity}.ts,
--   src/trigger/campaign-processor.ts, src/app/admin/performance/*
--       admin analytics/CRM/automation -> proxy server-side with the admin client
--   src/lib/security/mfa.ts, src/app/admin/analytics/sync/page.tsx
--       replace with Supabase MFA and a server-side analytics route
--
-- Table-level privileges from the same blanket grant are NOT narrowed here;
-- that needs a per-table inventory plus RLS verification.

BEGIN;

-- 1. Lock the client roles out of the critical functions. Names are resolved
--    from the catalog so missing/renamed functions are skipped instead of
--    aborting the migration, and every overload of a name is revoked.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname::text = ANY (ARRAY[
        'get_vault_secret',
        'get_secrets',
        'get_secret_audited',
        'get_vault_failure_count',
        'execute_readonly_query',
        'create_mfa_challenge',
        'verify_mfa_challenge',
        'get_current_aal',
        'verify_phone_for_sms'
      ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
  END LOOP;
END $$;

-- 2. Stop handing new functions to client roles. Functions created from here on
--    are non-executable by clients until their author grants it explicitly.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

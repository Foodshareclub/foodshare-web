-- Close the Vault-reading SECURITY DEFINER functions to the API roles.
--
-- Exposure: these functions run as supabase_admin and return, or act with, a
-- Vault secret. Production granted EXECUTE on most of them to `authenticated`
-- (and on invoke_listing_enrich_queue to PUBLIC), so any signed-in user could
-- call them through PostgREST (/rest/v1/rpc/<name>) and read, for example, the
-- Airtable API token (get_airtable_api_token, get_airtable_key), the Resend key
-- (get_resend_api_key), the Upstash credentials (get_upstash_redis_token,
-- get_upstash_redis_url), or any secret on get_worker_secret's allow list, which
-- includes SUPABASE_SERVICE_KEY and the AWS keys. get_worker_secret has no
-- caller check of its own.
--
-- Legitimate callers are service_role (edge functions through the admin client),
-- pg_cron (postgres / supabase_admin), the job worker roles (job_worker,
-- job_worker_app, which keep their own grants on get_worker_secret) and other
-- SECURITY DEFINER code, which runs as the owner. None is anon or authenticated.
--
-- Trigger functions that read the Vault (on_email_queued, trigger_translate_*)
-- are not listed: they return trigger and cannot be called directly.
--
-- Idempotent and reversible: REVOKE/GRANT again to undo. A function that does
-- not exist is skipped. Grants to postgres, supabase_admin, job_worker and
-- job_worker_app are not touched. Production already carries this change as a
-- hotfix (artifacts/airtable-fridges-2026-11-26/HOTFIX-revoke.md), so applying
-- this migration there changes nothing.
DO $$
DECLARE
  sig text;
BEGIN
  FOREACH sig IN ARRAY ARRAY[
    'public.check_vault_secret_exists(text)',
    'public.dispatch_notification_trigger(text, jsonb, text, text, text)',
    'public.get_airtable_api_token()',
    'public.get_airtable_key()',
    'public.get_resend_api_key()',
    'public.get_secret_audited(text, uuid, jsonb)',
    'public.get_secrets(text[])',
    'public.get_upstash_redis_token()',
    'public.get_upstash_redis_url()',
    'public.get_vault_secret(text)',
    'public.get_worker_secret(text)',
    'public.invoke_listing_enrich_queue()',
    'public.invoke_upstash_health_check()',
    'public.list_required_secrets()',
    'public.trigger_email_provider_sync()',
    'public.trigger_email_queue_processing()'
  ] LOOP
    IF to_regprocedure(sig) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', sig);
    END IF;
  END LOOP;
END $$;

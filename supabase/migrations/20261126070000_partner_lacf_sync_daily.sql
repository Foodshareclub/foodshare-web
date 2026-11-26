-- Migration: run the LACF partner sync once a day, live
--
-- Airtable is the source of truth, so the listings have to be refreshed
-- without anyone remembering to call the function. The job reads the internal
-- URL and the service-role key from the vault (the same pattern as
-- invoke_listing_enrich_queue) and calls the GET endpoint with `?mode=live`.
-- The endpoint itself refuses an empty Airtable, so a transient read failure
-- cannot hide every listing.
--
-- Scheduling is by jobid: cron.unschedule(text) only matches jobs owned by
-- current_user, and a swallowed failure would leave the old job running next
-- to the new one.

CREATE OR REPLACE FUNCTION public.invoke_partner_lacf_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'vault'
AS $$
DECLARE
  v_url text;
  v_service_key text;
  v_request_id bigint;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets
    WHERE name = 'automation_project_url'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_url := NULL;
  END;
  IF v_url IS NULL OR v_url = '' THEN
    v_url := 'http://kong:8000';
  END IF;

  BEGIN
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_service_key := NULL;
  END;
  IF v_service_key IS NULL OR v_service_key = '' THEN
    RAISE WARNING 'invoke_partner_lacf_sync: SUPABASE_SERVICE_ROLE_KEY not in vault; skipping';
    RETURN;
  END IF;

  BEGIN
    SELECT net.http_get(
      url := v_url || '/functions/v1/api-v1-partner-lacf-sync?mode=live',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      timeout_milliseconds := 120000
    ) INTO v_request_id;
    RAISE NOTICE 'partner-lacf-sync dispatched: request_id=%', v_request_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'net.http_get failed in invoke_partner_lacf_sync: %', SQLERRM;
  END;
END;
$$;

COMMENT ON FUNCTION public.invoke_partner_lacf_sync() IS 'Runs the LACF partner sync live, so their Airtable stays the source of truth for those listings.';

REVOKE ALL ON FUNCTION public.invoke_partner_lacf_sync() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_partner_lacf_sync() TO postgres, service_role;

DO $$
DECLARE
  r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      FOR r IN SELECT jobid FROM cron.job WHERE jobname = 'partner-lacf-sync-daily' LOOP
        PERFORM cron.unschedule(r.jobid);
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    PERFORM cron.schedule(
      'partner-lacf-sync-daily',
      '17 9 * * *',
      'SELECT public.invoke_partner_lacf_sync();'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END;
$$;

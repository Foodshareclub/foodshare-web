-- Migration: make the LACF partner sync fit Airtable Free's API allowance
--
-- Airtable Free includes 1,000 API calls per workspace per month. A run pages
-- through the base 100 records at a time, so a base at the Free record cap
-- (1,000 records) costs 10 calls. The previous */15 schedule was 96 runs/day:
-- about 2,880 calls/month even at one page per run, which exhausts the
-- allowance in days. Airtable then answers 403/429, the sync stops updating,
-- and nothing in the listing data says why.
--
-- Twice daily is the worst-case-safe cadence: 60 runs/month x 10 calls = 600,
-- leaving 400 calls for retries and deliberate manual runs. The endpoint also
-- refuses to exceed 10 calls in one run (retries included), so a bad page
-- cannot borrow from the next run's allowance. If the workspace moves to a
-- plan with more calls, raise the cadence deliberately; do not restore */15
-- on Free.
--
-- The dispatch also accepts the Vault name the deploy actually writes
-- (SERVICE_ROLE_KEY) and fails loudly when neither key is present, instead of
-- returning successfully and syncing nothing. The job is unscheduled by id:
-- cron.unschedule(text) only matches jobs owned by current_user, and a
-- swallowed failure would leave the old schedule running beside the new one.

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

  -- The deploy writes SERVICE_ROLE_KEY; older Vault rows use
  -- SUPABASE_SERVICE_ROLE_KEY. Accept both, preferring the documented name.
  BEGIN
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name IN ('SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE_KEY')
      AND decrypted_secret IS NOT NULL
      AND decrypted_secret <> ''
    ORDER BY CASE name WHEN 'SUPABASE_SERVICE_ROLE_KEY' THEN 0 ELSE 1 END
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_service_key := NULL;
  END;

  IF v_service_key IS NULL OR v_service_key = '' THEN
    RAISE EXCEPTION
      'invoke_partner_lacf_sync: no service-role key in vault (SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY)';
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
    -- A failed dispatch is a failed run, not a warning: pg_cron records the
    -- exception and the absence of a live sync stays visible.
    RAISE EXCEPTION 'net.http_get failed in invoke_partner_lacf_sync: %', SQLERRM;
  END;
END;
$$;

COMMENT ON FUNCTION public.invoke_partner_lacf_sync() IS
  'Runs the LACF partner sync live on a quota-safe twice-daily schedule; fails loudly when the service key or dispatch is unavailable.';

REVOKE ALL ON FUNCTION public.invoke_partner_lacf_sync() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_partner_lacf_sync() TO postgres, service_role;

DO $$
DECLARE
  r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    FOR r IN
      SELECT jobid FROM cron.job
      WHERE jobname IN ('partner-lacf-sync-daily', 'partner-lacf-sync')
    LOOP
      PERFORM cron.unschedule(r.jobid);
    END LOOP;

    -- 03:17 and 15:17 UTC: twice daily, twelve hours apart. Errors propagate:
    -- a schedule that silently failed to install is how the old job kept
    -- running unnoticed.
    PERFORM cron.schedule(
      'partner-lacf-sync',
      '17 3,15 * * *',
      'SELECT public.invoke_partner_lacf_sync();'
    );
  ELSE
    RAISE NOTICE 'pg_cron is not installed; the LACF partner sync is not scheduled';
  END IF;
END;
$$;

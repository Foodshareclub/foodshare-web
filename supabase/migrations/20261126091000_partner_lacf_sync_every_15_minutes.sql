-- Migration: refresh the LACF partner sync every 15 minutes
--
-- A daily run leaves a fridge marked Active for up to a day after it closes.
-- Fifteen minutes keeps the listings close to the source while staying far
-- below Airtable's 5 requests/second limit: one paginated GET per run, 96 runs
-- a day. Photo bytes are only fetched when the attachment changed.
--
-- The job is renamed from partner-lacf-sync-daily; both names are unscheduled
-- by jobid (cron.unschedule(text) only matches jobs owned by current_user, and
-- a swallowed failure would leave the old schedule running alongside).

DO $$
DECLARE
  r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      FOR r IN
        SELECT jobid FROM cron.job
        WHERE jobname IN ('partner-lacf-sync-daily', 'partner-lacf-sync')
      LOOP
        PERFORM cron.unschedule(r.jobid);
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    PERFORM cron.schedule(
      'partner-lacf-sync',
      '*/15 * * * *',
      'SELECT public.invoke_partner_lacf_sync();'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END;
$$;

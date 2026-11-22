-- Retire the hourly pg_cron Upstash health check.
--
-- `upstash-health-check-hourly` called invoke_upstash_health_check(), which
-- hits the api-v1-cache `?check=services` endpoint 24 times a day and spends
-- Upstash commands on each run. The free tier's 500,000 monthly commands were
-- 495,546 used on 2026-11-21. The keep-alive is now one daily `PING` sent from
-- the `upstash-keep-alive` job in .github/workflows/upstash-health-check.yml
-- straight to the Upstash REST API, so the hourly schedule only burns quota.
--
-- Looked up by name and removed by jobid, as in 20261118000002 (the by-name
-- `cron.unschedule(text)` only matches jobs owned by current_user): a no-op on
-- a database that has already been cleaned and on one without pg_cron. The
-- invoke_upstash_health_check() function is left in place.
DO $$
DECLARE
  r record;
BEGIN
  IF to_regclass('cron.job') IS NULL THEN
    RAISE NOTICE 'pg_cron is not installed; no schedules to remove';
    RETURN;
  END IF;
  FOR r IN SELECT jobid FROM cron.job WHERE jobname = 'upstash-health-check-hourly' LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;
END $$;

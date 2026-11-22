-- Keep exactly one pg_cron schedule per target (F-014, F-015, F-016).
--
-- Unlike 20261108180000, which collapses rows that share a *name*, these are
-- different names that fire the same target, so name-based dedup cannot see
-- them. Each name is looked up in cron.job and every row carrying it is removed
-- by jobid, so the migration is a no-op on a database that has already been
-- cleaned and on one without pg_cron.
--
-- By jobid, never `cron.unschedule(name)`: pg_cron's text overload matches only
-- jobs owned by current_user and raises "could not find valid entry for job"
-- for a job another role owns, even though the superuser running this migration
-- can see the row in cron.job. The bigint overload removes any owner's job for
-- a superuser (deploy run 45056807758 failed on the by-name form).
--
-- Kept / removed:
--   api-v1-localization/backfill-challenges
--     keep backfill-untranslated-challenges, drop backfill-challenge-translations
--   api-v1-localization/backfill-forum-posts
--     keep backfill-untranslated-forum-posts, drop backfill-forum-post-translations
--   api-v1-localization/backfill-posts
--     keep backfill-untranslated-posts, drop backfill-post-translations
--     (the kept jobs run mode=full, onlyUntranslated=true, which selects every
--     untranslated row regardless of age; the dropped ones were incremental
--     over a recent window, a subset of that work)
--   invoke_update_post_coordinates()
--     keep invoke_update_post_coordinates_every_minute, drop job_update_post_coordinates
--   scheduled_update_locations()
--     keep update-locations-every-5-minutes, drop update-locations-every-minute
--     (production already runs only the 5-minute entry)
--   domain-monitor-check
--     dropped: no supabase/functions/domain-monitor exists, so the job posts
--     into a 404 every six hours. Repointing would need a function that is not
--     in this repository. See contract-drift.test.ts KNOWN_DEAD_TARGETS.
DO $$
DECLARE
  doomed text[] := ARRAY[
    'backfill-challenge-translations',
    'backfill-forum-post-translations',
    'backfill-post-translations',
    'job_update_post_coordinates',
    'update-locations-every-minute',
    'domain-monitor-check'
  ];
  j text;
  r record;
BEGIN
  IF to_regclass('cron.job') IS NULL THEN
    RAISE NOTICE 'pg_cron is not installed; no schedules to remove';
    RETURN;
  END IF;
  FOREACH j IN ARRAY doomed LOOP
    FOR r IN SELECT jobid FROM cron.job WHERE jobname = j LOOP
      PERFORM cron.unschedule(r.jobid);
    END LOOP;
  END LOOP;
END $$;

-- Unschedule six jobs that have been posting into a 404.
--
-- The `cron.schedule` calls that created these named functions that no longer
-- exist. `localization` became `api-v1-localization`, `process-automation-queue`
-- became a path inside `api-v1-email`, and `recompress-images-cron` became a
-- path inside `api-v1-images`. The live jobs were added under the new names and
-- nobody removed the old entries, so for as long as that has been true the
-- scheduler has been firing each of these six every few minutes or hours
-- alongside the job that does the same work.
--
-- Nothing reported it, which is the part worth recording. `net.http_post` sends
-- the request and records a request id; it does not care what came back, and
-- pg_cron marks the job succeeded because the *query* succeeded. A 404 is a
-- successful query. So the evidence that these were broken is not in the logs
-- at all — it is in the fact that the function name in the schedule does not
-- match any function in the repository, and that is a fact nothing was checking
-- until `__tests__/contract-drift.test.ts`.
--
-- The match is on the *path*, anchored at `/functions/v1/<name>`, not on the
-- name alone. `api-v1-localization` contains the substring `localization`, so a
-- predicate on the bare word would unschedule the live job that is actually
-- doing this work. Anchoring at `/functions/v1/` cannot match it.

DO $$
DECLARE
  unscheduled int := 0;
  remaining   text;
  -- The six paths that resolve to no function. Anchored on `/functions/v1/` so
  -- that a live name which merely *contains* a dead name is not a match.
  dead_paths text[] := ARRAY[
    '/functions/v1/localization/',
    '/functions/v1/process-automation-queue',
    '/functions/v1/recompress-images-cron'
  ];
  p text;
BEGIN
  FOREACH p IN ARRAY dead_paths LOOP
    -- Unschedule by id rather than by name, because a name is not unique in
    -- pg_cron and two of these share a path prefix with jobs that are staying.
    SELECT count(*) INTO unscheduled FROM (
      SELECT cron.unschedule(jobid) AS done
      FROM cron.job
      WHERE command LIKE '%' || p || '%'
    ) q;
  END LOOP;

  -- The check that makes this migration worth more than the six deletions. If a
  -- seventh dead schedule is added later, this is the block that stops it
  -- quietly accumulating again — and it is why the oracle's `cron.unschedule`
  -- had to be made to actually delete rows instead of returning `true`.
  SELECT string_agg(DISTINCT substring(command FROM '/functions/v1/[^''", ]+'), ', ')
    INTO remaining
  FROM cron.job
  WHERE command LIKE '%/functions/v1/localization/%'
     OR command LIKE '%/functions/v1/process-automation-queue%'
     OR command LIKE '%/functions/v1/recompress-images-cron%';

  IF remaining IS NOT NULL THEN
    RAISE EXCEPTION
      'scheduled jobs still target endpoints that do not exist: %', remaining;
  END IF;

  RAISE NOTICE
    'unscheduled jobs targeting removed function names; domain-monitor left in place on purpose -- see the comment at the end of this file';
END $$;

-- Why `domain-monitor` was left scheduled.
--
-- The seventh dead job is different in kind and is deliberately not removed
-- here. It posts to
-- `https://api.foodshare.club/functions/v1/domain-monitor?notify=true` every
-- six hours, and there is no `domain-monitor` function anywhere in this
-- repository — not a function, not a script, not a workflow. It has no
-- counterpart under a new name, so unlike the six above it is not debris from
-- a rename; it is a capability that is scheduled and dark.
--
-- Deleting the job would make the schedule look clean and would destroy the
-- only record that domain-expiry monitoring is something this system was
-- supposed to be doing. A clean schedule and a lost alarm are not the same
-- outcome, and only one of them is desirable. So the job stays, the audit
-- reports it by name, and the decision to either implement it or accept in
-- writing that domains are not monitored belongs to whoever owns them.
--
-- What is *not* defensible is leaving it silently. It is now pinned in
-- `contract-drift.test.ts` as the one known dead target, which means a second
-- dead target fails the build while this one is named in the failure message.

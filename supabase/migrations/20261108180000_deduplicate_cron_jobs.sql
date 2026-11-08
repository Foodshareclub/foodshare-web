-- ============================================================================
-- Deduplicate cron jobs: a job name is one live job.
--
-- pg_cron does not make `jobname` unique: `cron.schedule` inserts a new row
-- whatever already carries the name, so the two rows fire on their own ticks.
-- No query in this estate joins `cron.job` to the work a job should be doing,
-- so a doubled schedule is a success that does the work twice and reports
-- nothing — a 404 is invisible to the same silence, and so is a job that
-- runs twice. 20261014000000 recorded the first half of this class (dead
-- targets) and notes, in passing, that "a name is not unique in pg_cron".
--
-- This is how the estate got here:
--
--   * 20260128195318 (the cloud baseline) snapshots 40 scheduled jobs, four
--     of them with `url := (SELECT decrypted_secret FROM vault.decrypted_secrets
--     ...)` — the URL lives in a secret.
--   * 20260209000001 ("Adapted from cloud baseline: vault.decrypted_secrets
--     → hardcoded internal URLs") re-schedules all 37 of the self-hosted
--     era on top of them. The 33 unchanged jobs arrive with identical
--     commands; the 4 vault-URL jobs arrive rewritten to kong URLs. None of
--     the 37 old entries is unscheduled.
--
-- So for as long as both migrations have been applied — which is every
-- database this corpus has ever produced, and production among them — 37
-- jobs have been running twice per tick, and 4 of them have been running
-- twice with a *different* call: the stale vault-URL copy alongside the
-- adapted kong-URL copy. (20261014000000 already removed the old copies of
-- the six dead-target jobs; this migration repairs the live ones.)
--
-- The repair keeps the newest row of each duplicated name and unschedules
-- the rest. Newest, not oldest: the self-hosted rewrite is the version
-- written deliberately for this environment, and the baseline snapshot is
-- the cloud-era copy it replaced — the same "the live job was added under
-- the new form, nobody removed the old entry" pattern 20261014 fixed for
-- the dead targets.
--
-- Two guards, because this class of mistake has twice been made by code
-- that looked like it only touched duplicates:
--
--   * The outer predicate requires the name to actually be duplicated.
--     `jobid NOT IN (SELECT max(jobid) ... GROUP BY jobname)` on its own is
--     not sufficient: the NOT IN list holds only the maxima of the
--     duplicated names, and `x NOT IN (a set that lacks x's name)` is true,
--     so a singleton row is selected and removed. The name has to be in the
--     duplicated set first.
--   * The loop's query must not reference the loop record (PL/pgSQL plans
--     it before the first fetch, and a correlated read of `extra` fails with
--     "record is not assigned yet"), so the keep-set is the non-correlated
--     NOT IN above, which is safe once the outer IN scopes it.
--   * The distinct-name count is asserted unchanged. A dedup that removes a
--     name entirely is not a dedup, it is an unschedule by another name —
--     and the record 20261014000000 went to lengths to keep (domain-monitor)
--     is a singleton, so a name-ignoring predicate would delete it.
--
-- Unschedule is by jobid, by id never by name, for the reason 20261014
-- states: a name is not unique in pg_cron, so an unschedule by name removes
-- one copy of a doubled job and the other keeps firing.
--
-- The block is idempotent: on a database that already holds one row per
-- name the predicates match nothing, and re-applying removes zero rows.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  extra record;
  removed int := 0;
  names_before int;
  names_after int;
BEGIN
  SELECT count(DISTINCT jobname)
    INTO names_before
    FROM cron.job
    WHERE active;

  FOR extra IN
    SELECT jobid, jobname
    FROM cron.job
    WHERE active
      AND jobname IN (
        SELECT jobname
        FROM cron.job
        WHERE active
        GROUP BY jobname
        HAVING count(*) > 1
      )
      AND jobid NOT IN (
        SELECT max(jobid)
        FROM cron.job
        WHERE active
          AND jobname IN (
            SELECT jobname
            FROM cron.job
            WHERE active
            GROUP BY jobname
            HAVING count(*) > 1
          )
        GROUP BY jobname
      )
  LOOP
    PERFORM cron.unschedule(extra.jobid);
    removed := removed + 1;
  END LOOP;

  SELECT count(DISTINCT jobname)
    INTO names_after
    FROM cron.job
    WHERE active;

  IF names_after <> names_before THEN
    RAISE EXCEPTION
      'cron dedup removed % job name(s) entirely — the predicate is not scoped to duplicated names',
      names_before - names_after;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE active
    GROUP BY jobname
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'cron job names still hold more than one live row: %',
      (
        SELECT string_agg(jobname, ', ')
        FROM cron.job
        WHERE active
        GROUP BY jobname
        HAVING count(*) > 1
      );
  END IF;

  RAISE NOTICE
    'deduplicated cron jobs: unscheduled % extra copies (newest row per name kept); % names remain',
    removed,
    names_after;
END $$;

COMMIT;

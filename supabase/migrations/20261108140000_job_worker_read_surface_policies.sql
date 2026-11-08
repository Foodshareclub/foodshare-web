-- Complete the worker's read surface: the grants were in place, the policies
-- were not.
--
-- `20260927000000_job_worker_role_and_claims.sql` designed the access model:
-- `job_worker` is `NOBYPASSRLS`, and every table it touches gets one explicit
-- policy so the bypass is visible in `pg_policies` rather than an invisible
-- property of the role. It created that policy for the four queue tables, and
-- `20260928000000_email_queue_claims.sql` added one more for
-- `email_delivery_log` — and then stopped. The rest of the worker's read
-- surface has RLS enabled and no `job_worker` policy, and it fails in two
-- different shapes:
--
-- 1. **Plan-time permission error.** `email_templates` and
--    `newsletter_campaigns` have a `PUBLIC` policy whose qual references
--    `public.user_roles` and `is_admin()`, which `job_worker` cannot read.
--    The planner resolves every applicable policy qual before a single row is
--    considered, so every content load the email and automation jobs run as
--    the worker fails with `permission denied` on its first query.
--
-- 2. **Silent zero rows.** `profiles`, `notification_preferences`,
--    `device_tokens` and `email_suppressions` have `PUBLIC` policies whose
--    qual resolves to false for the worker's bare connection (`auth.uid()`
--    is NULL). The queries succeed and return nothing: digest batches never
--    form because the `profiles` join matches no rows, suppression checks
--    find no suppressions, channel resolution finds no channels. No error is
--    ever raised, so the job appears healthy while doing nothing.
--
-- Two tables are missing the grant entirely, which is the older, louder
-- shape of the same gap:
--
-- * `forum` — the translation backfill reads the real table (the
--   `Source::table()` arm that `20260927000000` once pointed at the phantom
--   `forum_posts`), and no migration grants it to the worker.
-- * `email_automation_queue` — `preview_automation_queue()` reads it, and
--   that function is `SECURITY INVOKER`, so the `EXECUTE` grant in
--   `20261013000000` does not cover the table read behind it.
--
-- The integration suite cannot see any of this: it connects as the superuser,
-- which is exempt from both privilege checks and RLS.
-- `__tests__/worker-grants.test.ts` checks the grant half against the
-- catalog; this migration closes the policy half, and that test now checks
-- it too.
--
-- `USING (true)` matches the queue-table policies, and it has a second
-- effect that a narrower qual would not: it makes the policy union trivially
-- true, so the planner constant-folds the other `PUBLIC` quals away and
-- stops resolving `user_roles` and `is_admin()` at plan time. That is what
-- removes the shape-1 error rather than merely papering over it.
--
-- The queue-table and email-log policies are recreated when missing rather
-- than assumed present: on the databases where `20260927000000` was first
-- applied, the `forum_posts` grant failed the file and everything after it —
-- the sequence grants and this whole policy section — was skipped, and a
-- corrected file does not re-run. `CREATE POLICY` has no `IF NOT EXISTS`,
-- so each statement is guarded on the name in `pg_policies`.

BEGIN;

DO $$
DECLARE
  table_name text;
  policy_name text;
  command text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'job_worker') THEN
    RAISE NOTICE
      'job_worker is absent; the grants and policies in this migration have nowhere to go.';
    RETURN;
  END IF;

  -- The two tables the worker reads that no migration granted. A missing
  -- table here is a broken estate, not a stripped-down database: raise with
  -- the name rather than a raw `relation does not exist`.
  EXECUTE 'GRANT SELECT ON public.forum TO job_worker';
  EXECUTE 'GRANT SELECT ON public.email_automation_queue TO job_worker';

  -- (table, policy name, command) for the whole worker surface. The queue
  -- tables take FOR ALL because the worker claims and writes them back; the
  -- rest are read-only for the worker, so they take FOR SELECT.
  FOR table_name, policy_name, command IN SELECT * FROM (VALUES
    ('notification_digest_queue',    'job_worker_digest_queue',                'ALL'),
    ('translation_queue',            'job_worker_translation_queue',           'ALL'),
    ('dynamic_content_translations', 'job_worker_dynamic_content_translations','ALL'),
    ('notification_delivery_log',    'job_worker_notification_delivery_log',   'ALL'),
    ('email_delivery_log',           'job_worker_email_delivery_log',          'ALL'),
    ('profiles',                     'job_worker_profiles',                    'SELECT'),
    ('notification_preferences',     'job_worker_notification_preferences',    'SELECT'),
    ('device_tokens',                'job_worker_device_tokens',               'SELECT'),
    ('email_suppressions',           'job_worker_email_suppressions',          'SELECT'),
    ('forum',                        'job_worker_forum',                       'SELECT'),
    ('posts',                        'job_worker_posts',                       'SELECT'),
    ('challenges',                   'job_worker_challenges',                  'SELECT'),
    ('email_templates',              'job_worker_email_templates',             'SELECT'),
    ('newsletter_campaigns',         'job_worker_newsletter_campaigns',        'SELECT'),
    ('email_automation_queue',       'job_worker_email_automation_queue',      'SELECT')
  ) AS t(tbl, policy, cmd) LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = table_name
    ) THEN
      RAISE EXCEPTION
        'public.% does not exist, so the worker policy for it cannot be created.',
        table_name;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = table_name
        AND policyname = policy_name
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR %s TO job_worker USING (true)',
        policy_name, table_name, command
      );
    END IF;
  END LOOP;
END
$$;

COMMIT;

-- =============================================================================
-- Verification
-- =============================================================================
-- The assertion runs as the worker's actual principal, not as the applying
-- superuser: a query that succeeds for the superuser proves nothing here,
-- which is the lesson this file exists for. Every table the worker's SQL
-- touches is read through `SET ROLE job_worker`, and a failure on any of
-- them raises with the table named.
DO $$
DECLARE
  table_name text;
  probe    boolean;
  probe_missing_count integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'job_worker') THEN
    RETURN;
  END IF;

  FOR table_name IN SELECT * FROM (VALUES
    ('notification_digest_queue'),
    ('translation_queue'),
    ('dynamic_content_translations'),
    ('notification_delivery_log'),
    ('email_delivery_log'),
    ('profiles'),
    ('notification_preferences'),
    ('device_tokens'),
    ('email_suppressions'),
    ('forum'),
    ('posts'),
    ('challenges'),
    ('email_templates'),
    ('newsletter_campaigns'),
    ('email_automation_queue')
  ) AS t(tbl) LOOP
    BEGIN
      SET ROLE job_worker;
      EXECUTE format('SELECT true FROM public.%I LIMIT 1', table_name) INTO probe;
      RESET ROLE;
    EXCEPTION WHEN insufficient_privilege THEN
      RESET ROLE;
      RAISE EXCEPTION
        'job_worker still cannot read %. The job that touches it will fail on its first query.',
        table_name;
    END;
  END LOOP;

  SELECT count(*) INTO probe_missing_count
  FROM unnest(ARRAY[
    'job_worker_digest_queue',
    'job_worker_translation_queue',
    'job_worker_dynamic_content_translations',
    'job_worker_notification_delivery_log',
    'job_worker_email_delivery_log',
    'job_worker_profiles',
    'job_worker_notification_preferences',
    'job_worker_device_tokens',
    'job_worker_email_suppressions',
    'job_worker_forum',
    'job_worker_posts',
    'job_worker_challenges',
    'job_worker_email_templates',
    'job_worker_newsletter_campaigns',
    'job_worker_email_automation_queue'
  ]) AS expected(name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = expected.name
  );

  IF probe_missing_count > 0 THEN
    RAISE EXCEPTION
      '% of the expected job_worker policies are missing; the section above did not fully apply.',
      probe_missing_count;
  END IF;
END $$;

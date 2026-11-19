-- Grant the automation queue's SQL primitives to the Rust worker.
--
-- `20261001000000_automation_queue_claims.sql` creates five functions, revokes
-- EXECUTE from PUBLIC on four of them, and then grants EXECUTE to
-- `service_role` — a Supabase role the Deno edge functions use and the Rust
-- worker does not. The worker's own role was never named.
--
-- So the automation drip queue has never been runnable by the worker, and
-- neither has the shadow preview. That matters more than a single broken job,
-- because `docs/rust-migration.md` § 6 step 2 is the shadow run: the worker
-- reports what each job *would* do while the Deno handler still owns the
-- schedule, and the two implementations are compared before ownership moves.
-- The safety step is the thing that is blocked, and it is blocked silently —
-- a preview that cannot run reports nothing rather than failing.
--
-- `20261004000000_automation_preview.sql` has the same gap for
-- `preview_automation_queue`.
--
-- This is the second time a worker grant set has been found to be short. The
-- first, recorded in `docs/rust-migration.md` § 7, cost a backfill. Both were
-- invisible to the integration suite, which runs as a superuser and is
-- therefore exempt from privilege checks entirely — a superuser sees a missing
-- grant as a query that works. `__tests__/worker-grants.test.ts` is the check
-- that cannot be fooled that way: it reads the catalog for what the role holds
-- and the crate's SQL for what the role needs, and the two sit next to each
-- other.

BEGIN;

-- `job_worker` is absent against a bare schema, the same as `service_role` was
-- in the original. Guarding rather than assuming keeps this applicable to a
-- stripped-down database.
DO $$
DECLARE
  target text;
  sig    text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'job_worker') THEN
    RAISE NOTICE
      'job_worker is absent; the grants in this migration have nowhere to go.';
    RETURN;
  END IF;

  -- (name, argument types) taken from the definitions, not from the call sites.
  -- A grant naming a signature that does not exist is an error, not a no-op, so
  -- a typo here would fail the migration rather than silently grant nothing —
  -- which is what happened to `get_secret_audited` in 20260812200000.
  FOR target, sig IN SELECT * FROM (VALUES
    ('claim_automation_queue',    'integer, integer'),
    ('release_automation_claims', 'uuid[], text'),
    ('fail_automation_attempts',  'uuid[], text, boolean'),
    ('mark_automation_email_sent','uuid, text, text'),
    ('preview_automation_queue',  'integer')
  ) AS t(name, args) LOOP

    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = target
    ) THEN
      RAISE EXCEPTION
        'public.%() does not exist. The grant below would fail with a less '
        'readable message, and the worker would be left without it.', target;
    END IF;

    -- The signature is interpolated whole rather than spliced around a
    -- literal `(`: format() reads `%(name)` as a named argument, so a template
    -- containing `%(` is an "unrecognized format() type specifier", and
    -- escaping it to `%%(` fails in a second way. Building the argument as
    -- `name(args)` and passing one `%s` sidesteps the question entirely.
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%s TO job_worker',
      format('%s(%s)', target, sig)
    );
  END LOOP;
END
$$;

COMMIT;

-- =============================================================================
-- Verification
-- =============================================================================
-- Asserts the *outcome* rather than the statements, because a guarded GRANT
-- inside a DO block that silently does nothing is the failure mode. The
-- previous migration's own verification asserted the shape of the functions it
-- created; nothing ever asserted that the worker could reach them.
DO $$
DECLARE
  missing text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'job_worker') THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
      'claim_automation_queue',
      'release_automation_claims',
      'fail_automation_attempts',
      'mark_automation_email_sent',
      'preview_automation_queue'
    ]) AS required(name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = required.name
    )
  ) THEN
    RAISE EXCEPTION
      'one of the automation queue functions does not exist, so it could not '
      'have been granted. The worker''s automation job would fail on it.';
  END IF;

  SELECT string_agg(required.name, ', ') INTO missing
  FROM unnest(ARRAY[
    'claim_automation_queue',
    'release_automation_claims',
    'fail_automation_attempts',
    'mark_automation_email_sent',
    'preview_automation_queue'
  ]) AS required(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_roles r
    JOIN pg_proc p ON p.proname = required.name
    JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
    WHERE r.rolname = 'job_worker'
      AND has_function_privilege(r.oid, p.oid, 'EXECUTE')
  );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION
      'job_worker still lacks EXECUTE on: %. The automation job and its shadow '
      'preview would both fail with permission denied.', missing;
  END IF;
END $$;

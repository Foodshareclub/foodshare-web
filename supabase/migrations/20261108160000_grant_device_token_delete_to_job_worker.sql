-- The worker's write surface, completed.
--
-- 20260927000000 gave job_worker the queue claim functions (SECURITY
-- DEFINER) and SELECT policies on the tables the worker reads. The worker's
-- own SQL — the claim CTEs, the mark-sent / mark-failed write-backs, the
-- token cleanup — runs as job_worker directly, and every one of those writes
-- was verified against the catalog the same way the read surface was in
-- 20261108140000:
--
--   operation      table                       grant   policy
--   UPDATE         email_delivery_log          yes     ALL
--   INSERT         notification_delivery_log   yes     ALL
--   UPDATE         notification_digest_queue   yes     ALL
--   INSERT/UPDATE  translation_queue           yes     ALL
--   INSERT         dynamic_content_translations yes    ALL
--   DELETE         device_tokens               NO      NO  <- this file
--
-- delete_device_tokens (fs-db digest.rs) deletes the push tokens a provider
-- reported as permanently invalid. The Deno path did the same delete inside
-- the edge function, which runs as service_role; when the push step moves
-- into the worker, the statement runs as job_worker and fails with
-- `permission denied for table device_tokens` — checked against a real
-- cluster, not inferred: the statement is planned before any row is
-- considered, so it fails even when no token matches.
--
-- The RLS half is the same shape as the read half: without a job_worker
-- DELETE policy the grant alone is a silent no-op — the DELETE succeeds,
-- matches zero rows, and the invalid token is reported on the next pass,
-- forever. Both statements are name-guarded, so a database that already
-- carries them re-applies cleanly.

BEGIN;

DO $$
BEGIN
  IF NOT has_table_privilege('job_worker', 'public.device_tokens', 'DELETE') THEN
    GRANT DELETE ON public.device_tokens TO job_worker;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'device_tokens'
      AND policyname = 'job_worker_device_tokens_delete'
  ) THEN
    CREATE POLICY job_worker_device_tokens_delete
      ON public.device_tokens
      FOR DELETE TO job_worker
      USING (true);
  END IF;
END$$;

-- Functional probe, as the role that is going to run this in production.
-- A sentinel token catches the grant (planned before any row is considered);
-- a real probe row catches the policy (a grant without a policy is a
-- successful DELETE of zero rows, which the sentinel cannot see).
DO $$
DECLARE
  probe_profile uuid;
  probe_token   text := 'w14-probe-' || gen_random_uuid();
  visible       int;
BEGIN
  -- The sentinel: exercises the plan-time permission check only.
  SET LOCAL ROLE job_worker;
  DELETE FROM public.device_tokens
  WHERE token = 'no-such-w14-sentinel-token';
  RESET ROLE;

  -- The row probe: skip it where no profile exists to own the token
  -- (a fresh database before any seed), and the sentinel has already
  -- proven the grant.
  SELECT id INTO probe_profile FROM public.profiles LIMIT 1;
  IF probe_profile IS NOT NULL THEN
    INSERT INTO public.device_tokens (token, profile_id, platform)
    VALUES (probe_token, probe_profile, 'ios')
    ON CONFLICT DO NOTHING;

    SET LOCAL ROLE job_worker;
    DELETE FROM public.device_tokens
    WHERE token = probe_token;
    RESET ROLE;

    SELECT count(*) INTO visible
    FROM public.device_tokens
    WHERE token = probe_token;
    IF visible <> 0 THEN
      RAISE EXCEPTION
        'job_worker DELETE on device_tokens matched no rows: the grant is in, '
        'the job_worker DELETE policy is not (a DELETE with no policy is a '
        'success that deletes nothing)';
    END IF;
  END IF;
END$$;

COMMIT;

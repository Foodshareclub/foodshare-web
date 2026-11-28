-- P0-3: make the documented login lockout real.
--
-- api-v1-auth/lib/rate.ts has always called check_lockout_status and
-- record_login_attempt, but no migration defined either function. The handler
-- failed open, so the 5/10/20-attempt thresholds and the 100/hour IP block
-- existed only in comments. This creates the ledger those calls need, in the
-- `security` schema the dormant get_login_spike_stats() already reads.
--
-- The functions are SECURITY DEFINER and executable only by service_role:
-- clients must not be able to read the ledger or forge an attempt. Row-level
-- security with no policies keeps direct PostgREST access closed even if a
-- future grant is added by mistake.
BEGIN;

CREATE SCHEMA IF NOT EXISTS security;

CREATE TABLE IF NOT EXISTS security.login_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  ip_address text,
  user_agent text,
  app_platform text,
  app_version text,
  success boolean NOT NULL,
  failure_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_attempts_email_created_idx
  ON security.login_attempts (email, created_at DESC);
CREATE INDEX IF NOT EXISTS login_attempts_ip_created_idx
  ON security.login_attempts (ip_address, created_at DESC)
  WHERE ip_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS login_attempts_created_idx
  ON security.login_attempts (created_at);

ALTER TABLE security.login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON security.login_attempts FROM PUBLIC, anon, authenticated;

-- The thresholds are exactly the ones documented in rate.ts:
--   5 failures -> 5 minutes, 10 -> 30 minutes, 20 -> 24 hours,
--   100 attempts from one IP in an hour -> one-hour IP block.
CREATE OR REPLACE FUNCTION public.check_lockout_status(
  p_email text,
  p_ip_address text DEFAULT NULL
)
RETURNS TABLE(
  is_locked boolean,
  locked_until timestamptz,
  lockout_level integer,
  failed_attempts integer,
  ip_blocked boolean,
  ip_blocked_until timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_last_success timestamptz;
  v_window_start timestamptz;
  v_failed integer := 0;
  v_last_failure timestamptz;
  v_level integer := 0;
  v_locked_until timestamptz;
  v_ip_count integer := 0;
  v_ip_oldest timestamptz;
  v_ip_until timestamptz;
BEGIN
  IF v_email <> '' THEN
    SELECT max(la.created_at) INTO v_last_success
      FROM security.login_attempts la
     WHERE la.email = v_email AND la.success;

    -- Failures since the last successful login, but never older than 24 hours:
    -- a success resets the count, and an old failure cannot lock an account
    -- forever.
    v_window_start := greatest(
      coalesce(v_last_success, now() - interval '24 hours'),
      now() - interval '24 hours'
    );

    SELECT count(*), max(la.created_at)
      INTO v_failed, v_last_failure
      FROM security.login_attempts la
     WHERE la.email = v_email
       AND NOT la.success
       AND la.created_at > v_window_start;

    v_level := CASE
      WHEN v_failed >= 20 THEN 3
      WHEN v_failed >= 10 THEN 2
      WHEN v_failed >= 5 THEN 1
      ELSE 0
    END;

    IF v_level > 0 THEN
      v_locked_until := v_last_failure + CASE v_level
        WHEN 1 THEN interval '5 minutes'
        WHEN 2 THEN interval '30 minutes'
        ELSE interval '24 hours'
      END;
    END IF;
  END IF;

  IF p_ip_address IS NOT NULL AND p_ip_address <> '' THEN
    SELECT count(*), min(la.created_at)
      INTO v_ip_count, v_ip_oldest
      FROM security.login_attempts la
     WHERE la.ip_address = p_ip_address
       AND la.created_at > now() - interval '1 hour';

    IF v_ip_count >= 100 THEN
      v_ip_until := v_ip_oldest + interval '1 hour';
    END IF;
  END IF;

  RETURN QUERY SELECT
    (v_locked_until IS NOT NULL AND v_locked_until > now()),
    CASE WHEN v_locked_until > now() THEN v_locked_until ELSE NULL END,
    v_level,
    v_failed,
    (v_ip_until IS NOT NULL AND v_ip_until > now()),
    CASE WHEN v_ip_until > now() THEN v_ip_until ELSE NULL END;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_email text,
  p_ip_address text,
  p_user_agent text,
  p_app_platform text,
  p_app_version text,
  p_success boolean,
  p_failure_reason text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  is_locked boolean,
  locked_until timestamptz,
  failed_count integer,
  ip_blocked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
BEGIN
  IF v_email = '' THEN
    RAISE EXCEPTION 'p_email is required';
  END IF;

  -- Serialize attempts for one account so two concurrent failures cannot both
  -- read the same count and skip a threshold.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_email, 0));

  INSERT INTO security.login_attempts (
    email, ip_address, user_agent, app_platform, app_version,
    success, failure_reason, metadata
  ) VALUES (
    v_email, p_ip_address, p_user_agent, p_app_platform, p_app_version,
    p_success, p_failure_reason, coalesce(p_metadata, '{}'::jsonb)
  );

  RETURN QUERY
    SELECT c.is_locked, c.locked_until, c.failed_attempts, c.ip_blocked
      FROM public.check_lockout_status(v_email, p_ip_address) c;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_login_attempts(
  p_retain_days integer DEFAULT 30
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_deleted integer;
BEGIN
  IF p_retain_days < 1 THEN
    RAISE EXCEPTION 'p_retain_days must be at least 1';
  END IF;

  DELETE FROM security.login_attempts
   WHERE created_at < now() - make_interval(days => p_retain_days);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.check_lockout_status(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_login_attempt(text, text, text, text, text, boolean, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_login_attempts(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_lockout_status(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, text, text, text, text, boolean, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_login_attempts(integer) TO service_role;

COMMENT ON TABLE security.login_attempts IS
  'Login attempt ledger for lockout and IP-block decisions. Service-role only; no client policies.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-login-attempts') THEN
      PERFORM cron.unschedule('cleanup-login-attempts');
    END IF;
    PERFORM cron.schedule(
      'cleanup-login-attempts',
      '23 4 * * *',
      'SELECT public.cleanup_login_attempts()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'login-attempt cleanup scheduling skipped: %', SQLERRM;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';

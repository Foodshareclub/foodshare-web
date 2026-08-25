-- Migration: Implement invoke_upstash_health_check and ensure pg_cron schedule
-- Purpose: Keep Upstash Redis, Vector, QStash, and Search databases active by periodically invoking api-v1-cache?check=services

-- 1. Create or replace the invoke_upstash_health_check function
CREATE OR REPLACE FUNCTION public.invoke_upstash_health_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'vault'
AS $$
DECLARE
  v_url text;
  v_anon_key text;
  v_headers jsonb;
  v_request_id bigint;
BEGIN
  -- 1. Try to read internal/automation URL from vault
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

  -- 2. Try to read anon key from vault or app settings
  BEGIN
    SELECT decrypted_secret INTO v_anon_key
    FROM vault.decrypted_secrets
    WHERE name = 'anon_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_anon_key := NULL;
  END;

  IF v_anon_key IS NULL OR v_anon_key = '' THEN
    BEGIN
      v_anon_key := current_setting('app.settings.anon_key', true);
    EXCEPTION WHEN OTHERS THEN
      v_anon_key := NULL;
    END;
  END IF;

  IF v_anon_key IS NOT NULL AND v_anon_key <> '' THEN
    v_headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key,
      'x-supabase-cron', 'true'
    );
  ELSE
    v_headers := '{"Content-Type": "application/json", "x-supabase-cron": "true"}'::jsonb;
  END IF;

  -- 3. Trigger HTTP GET request to api-v1-cache?check=services using pg_net
  BEGIN
    SELECT net.http_get(
      url := v_url || '/functions/v1/api-v1-cache?check=services',
      headers := v_headers,
      timeout_milliseconds := 30000
    ) INTO v_request_id;
    
    RAISE NOTICE 'Upstash health check dispatched: request_id=%', v_request_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'net.http_get failed in invoke_upstash_health_check: %', SQLERRM;
  END;
END;
$$;

COMMENT ON FUNCTION public.invoke_upstash_health_check() IS 'Invokes the api-v1-cache edge function with check=services to ping Upstash Redis and maintain database activity.';

GRANT EXECUTE ON FUNCTION public.invoke_upstash_health_check() TO postgres, anon, authenticated, service_role;

-- 2. Ensure pg_cron schedule is active
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('upstash-health-check-hourly');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    PERFORM cron.schedule(
      'upstash-health-check-hourly',
      '0 * * * *',
      'SELECT public.invoke_upstash_health_check();'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END;
$$;

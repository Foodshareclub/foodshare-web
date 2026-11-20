-- Migration: pg_cron job that drains the listing_enrich_queue (create-path hook
-- + backfill). Periodically calls the api-v1-ai enrichListingQueue endpoint to
-- claim and process pending rows via the enrichListing pipeline.
--
-- This is the worker trigger for t_5e01973c (create-path hook) and the sweep
-- leg of t_3c89d4d1 (backfill sweep + pg_cron). The queue table + DB trigger are
-- in 20261120000000_listing_enrich_queue.sql.
--
-- Pacing: the enrichListing pipeline is rate-limited to 30/min (service-path).
-- A batch of 5 every 5 min = 1/min, comfortably under the limit and leaving head
-- room for user-gated cover generation. Each enrichListing call can take up to
-- 2 min (crawl→verify→fetch→place), so a small batch keeps the cron call bounded.
--
-- Auth: the endpoint requires service auth (verifyServiceAuth). The cron job
-- reads the service-role key from the vault and presents it as a Bearer token
-- (timing-safe compared server-side).

CREATE OR REPLACE FUNCTION public.invoke_listing_enrich_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'vault'
AS $$
DECLARE
  v_url text;
  v_service_key text;
  v_headers jsonb;
  v_request_id bigint;
BEGIN
  -- 1. Internal URL (podman network) from vault, fallback to the kong gateway.
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

  -- 2. Service-role key from the vault (for the Bearer auth).
  BEGIN
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_service_key := NULL;
  END;

  IF v_service_key IS NULL OR v_service_key = '' THEN
    RAISE WARNING 'invoke_listing_enrich_queue: SUPABASE_SERVICE_ROLE_KEY not in vault; skipping';
    RETURN;
  END IF;

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || v_service_key
  );

  -- 3. Drain the queue (batch of 5, not dry-run). net.http_post is async
  -- (fire-and-forget); the response is logged to net._http_response for
  -- observability but not blocked on here.
  BEGIN
    SELECT net.http_post(
      url := v_url || '/functions/v1/api-v1-ai/inference/enrichListingQueue',
      body := jsonb_build_object('batch_size', 5),
      headers := v_headers,
      timeout_milliseconds := 300000
    ) INTO v_request_id;
    RAISE NOTICE 'listing-enrich-queue drain dispatched: request_id=%', v_request_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'net.http_post failed in invoke_listing_enrich_queue: %', SQLERRM;
  END;
END;
$$;

COMMENT ON FUNCTION public.invoke_listing_enrich_queue() IS 'Drains the listing_enrich_queue by calling the api-v1-ai enrichListingQueue endpoint (create-path hook + backfill worker).';

GRANT EXECUTE ON FUNCTION public.invoke_listing_enrich_queue() TO postgres, service_role;

-- Ensure pg_cron schedule is active (every 5 min).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('listing-enrich-queue-drain');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    PERFORM cron.schedule(
      'listing-enrich-queue-drain',
      '*/5 * * * *',
      'SELECT public.invoke_listing_enrich_queue();'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END;
$$;

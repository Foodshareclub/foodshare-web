-- Accept the deployed Vault key name and authenticate through the internal gateway.
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
    WHERE name IN ('SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE_KEY')
      AND decrypted_secret IS NOT NULL AND decrypted_secret <> ''
    ORDER BY CASE name WHEN 'SUPABASE_SERVICE_ROLE_KEY' THEN 0 ELSE 1 END
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
    'Host', 'api.foodshare.club',
    'apikey', v_service_key,
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


-- Migration: Comprehensive Geocoding System
-- Date: 2025-12-15
-- Purpose: Create a robust, queue-based geocoding system for automatic address-to-coordinate conversion
--
-- This migration implements:
-- 1. location_update_queue table for tracking geocoding requests
-- 2. Updated posts.location column to be nullable (not POINT(0 0))
-- 3. Database triggers for automatic queue population
-- 4. Helper functions for queue management
-- 5. pg_cron job for automatic batch processing

-- ============================================================================
-- STEP 1: Create location_update_queue table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.location_update_queue (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL,
  post_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure we don't queue the same post multiple times for pending/processing
  CONSTRAINT unique_pending_post UNIQUE (post_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_location_queue_status ON public.location_update_queue(status);
CREATE INDEX IF NOT EXISTS idx_location_queue_post_id ON public.location_update_queue(post_id);
CREATE INDEX IF NOT EXISTS idx_location_queue_created_at ON public.location_update_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_location_queue_retry ON public.location_update_queue(status, retry_count) WHERE status = 'failed' AND retry_count < max_retries;

-- Enable RLS (allow service role full access)
ALTER TABLE public.location_update_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to location_update_queue"
  ON public.location_update_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.location_update_queue IS 'Queue for managing geocoding requests with retry logic';
COMMENT ON COLUMN public.location_update_queue.status IS 'pending: awaiting processing, processing: currently being geocoded, completed: successfully geocoded, failed: exceeded retry attempts';
COMMENT ON COLUMN public.location_update_queue.retry_count IS 'Number of geocoding attempts made';
COMMENT ON COLUMN public.location_update_queue.max_retries IS 'Maximum number of retry attempts before marking as permanently failed';

-- ============================================================================
-- STEP 2: Fix posts.location column to be properly nullable
-- ============================================================================

-- Remove any default value on posts.location (this makes it nullable by default)
-- Note: This assumes the column already exists as geography(Point, 4326)
ALTER TABLE public.posts
  ALTER COLUMN location DROP DEFAULT;

-- Update any existing POINT(0 0) to NULL (0,0 is in the Gulf of Guinea, unlikely to be real)
UPDATE public.posts
SET location = NULL
WHERE location IS NOT NULL
  AND ST_X(location::geometry) = 0
  AND ST_Y(location::geometry) = 0;

COMMENT ON COLUMN public.posts.location IS 'PostGIS geography point (SRID 4326). NULL until geocoded. Automatically populated via location_update_queue system.';

-- ============================================================================
-- STEP 3: Helper function to update timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_location_queue_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_location_queue_updated_at
  BEFORE UPDATE ON public.location_update_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_location_queue_updated_at();

-- ============================================================================
-- STEP 4: Queue location update function (called by trigger)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.queue_location_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
  v_address TEXT;
BEGIN
  -- Only queue if we have an address
  v_address := TRIM(COALESCE(NEW.post_address, ''));

  IF v_address = '' THEN
    -- No address, set location to NULL and skip queue
    NEW.location := NULL;
    RETURN NEW;
  END IF;

  -- Check if location needs geocoding
  -- Queue if:
  --   1. INSERT with NULL location, OR
  --   2. UPDATE where address changed
  IF (TG_OP = 'INSERT' AND NEW.location IS NULL) THEN
    -- New post with address but no location - queue it
    INSERT INTO public.location_update_queue (post_id, post_address, status)
    VALUES (NEW.id, NEW.post_address, 'pending')
    ON CONFLICT (post_id, status)
    WHERE status IN ('pending', 'processing')
    DO NOTHING; -- Don't create duplicates if already queued

    RAISE LOG 'Queued geocoding for new post %: %', NEW.id, NEW.post_address;

  ELSIF (TG_OP = 'UPDATE' AND
         OLD.post_address IS DISTINCT FROM NEW.post_address AND
         NEW.post_address IS NOT NULL AND
         TRIM(NEW.post_address) != '') THEN
    -- Address changed - clear location and queue new geocoding
    NEW.location := NULL;

    -- Mark any existing queue entries as completed (superseded)
    UPDATE public.location_update_queue
    SET status = 'completed',
        completed_at = NOW(),
        error_message = 'Superseded by address change'
    WHERE post_id = NEW.id
      AND status IN ('pending', 'processing', 'failed');

    -- Queue new geocoding request
    INSERT INTO public.location_update_queue (post_id, post_address, status)
    VALUES (NEW.id, NEW.post_address, 'pending')
    ON CONFLICT (post_id, status)
    WHERE status IN ('pending', 'processing')
    DO NOTHING;

    RAISE LOG 'Address changed for post %, re-queued geocoding: %', NEW.id, NEW.post_address;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.queue_location_update() IS 'Trigger function to automatically queue posts for geocoding when created or address updated';

-- ============================================================================
-- STEP 5: Create trigger on posts table
-- ============================================================================

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS trigger_queue_location_update ON public.posts;

-- Create trigger - BEFORE INSERT/UPDATE
-- This runs BEFORE the row is written, allowing us to modify NEW.location if needed
CREATE TRIGGER trigger_queue_location_update
  BEFORE INSERT OR UPDATE OF post_address ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_location_update();

COMMENT ON TRIGGER trigger_queue_location_update ON public.posts IS 'Automatically queues posts for geocoding when created or address changes';

-- ============================================================================
-- STEP 6: Queue management functions
-- ============================================================================

-- Function to get next batch of pending items
CREATE OR REPLACE FUNCTION public.get_pending_geocode_queue(batch_size INTEGER DEFAULT 10)
RETURNS TABLE (
  id BIGINT,
  post_id BIGINT,
  post_address TEXT,
  retry_count INTEGER
)
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.post_id,
    q.post_address,
    q.retry_count
  FROM public.location_update_queue q
  WHERE q.status = 'pending'
    OR (q.status = 'failed' AND q.retry_count < q.max_retries)
  ORDER BY
    -- Prioritize: new requests, then failed with fewer retries
    CASE WHEN q.status = 'pending' THEN 0 ELSE 1 END,
    q.retry_count ASC,
    q.created_at ASC
  LIMIT batch_size
  FOR UPDATE SKIP LOCKED; -- Prevent concurrent processing of same items
END;
$$;

COMMENT ON FUNCTION public.get_pending_geocode_queue(INTEGER) IS 'Get next batch of posts needing geocoding, with row-level locking to prevent concurrent processing';

-- Function to mark queue item as processing
CREATE OR REPLACE FUNCTION public.mark_geocode_processing(queue_id BIGINT)
RETURNS VOID
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.location_update_queue
  SET
    status = 'processing',
    last_attempt_at = NOW(),
    retry_count = retry_count + 1
  WHERE id = queue_id;
END;
$$;

-- Function to mark queue item as completed
CREATE OR REPLACE FUNCTION public.mark_geocode_completed(queue_id BIGINT)
RETURNS VOID
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.location_update_queue
  SET
    status = 'completed',
    completed_at = NOW(),
    error_message = NULL
  WHERE id = queue_id;
END;
$$;

-- Function to mark queue item as failed
CREATE OR REPLACE FUNCTION public.mark_geocode_failed(
  queue_id BIGINT,
  error_msg TEXT
)
RETURNS VOID
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
  v_retry_count INTEGER;
  v_max_retries INTEGER;
BEGIN
  -- Get current retry info
  SELECT retry_count, max_retries
  INTO v_retry_count, v_max_retries
  FROM public.location_update_queue
  WHERE id = queue_id;

  -- Update status based on retry count
  UPDATE public.location_update_queue
  SET
    status = CASE
      WHEN v_retry_count >= v_max_retries THEN 'failed'
      ELSE 'pending' -- Will be retried
    END,
    error_message = error_msg,
    last_attempt_at = NOW()
  WHERE id = queue_id;
END;
$$;

COMMENT ON FUNCTION public.mark_geocode_failed(BIGINT, TEXT) IS 'Mark geocoding attempt as failed. Automatically retries if under max_retries, otherwise marks as permanently failed';

-- Function to clean up old completed queue entries
CREATE OR REPLACE FUNCTION public.cleanup_old_geocode_queue(days_old INTEGER DEFAULT 30)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.location_update_queue
  WHERE status = 'completed'
    AND completed_at < NOW() - (days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE LOG 'Cleaned up % old geocode queue entries', deleted_count;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_geocode_queue(INTEGER) IS 'Delete completed geocode queue entries older than specified days (default 30)';

-- ============================================================================
-- STEP 7: Create pg_cron job for automatic batch geocoding
-- ============================================================================

-- Note: pg_cron extension must be enabled on your Supabase project
-- This can be done via Supabase Dashboard > Database > Extensions

-- Check if pg_cron is available, if so create the job
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Schedule geocoding to run every 5 minutes
    -- This will invoke the Edge Function via HTTP request
    PERFORM cron.schedule(
      'geocode-posts-batch',
      '*/5 * * * *', -- Every 5 minutes
      $$
      SELECT
        net.http_post(
          url := 'https://***REMOVED***.supabase.co/functions/v1/update-post-coordinates',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := jsonb_build_object('operation', 'BATCH_UPDATE')
        );
      $$
    );

    RAISE NOTICE 'pg_cron job "geocode-posts-batch" created successfully';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Geocoding will need to be triggered manually or via external scheduler.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create pg_cron job (this is normal if pg_cron is not enabled): %', SQLERRM;
END;
$$;

-- ============================================================================
-- STEP 8: Backfill existing posts without location
-- ============================================================================

-- Queue all existing posts that have an address but no location
-- This is a one-time backfill operation
INSERT INTO public.location_update_queue (post_id, post_address, status)
SELECT
  id,
  post_address,
  'pending'
FROM public.posts
WHERE post_address IS NOT NULL
  AND TRIM(post_address) != ''
  AND (
    location IS NULL
    OR (ST_X(location::geometry) = 0 AND ST_Y(location::geometry) = 0)
  )
  AND NOT EXISTS (
    -- Don't re-queue if already in queue
    SELECT 1 FROM public.location_update_queue q
    WHERE q.post_id = posts.id
      AND q.status IN ('pending', 'processing')
  )
ON CONFLICT (post_id, status)
WHERE status IN ('pending', 'processing')
DO NOTHING;

-- ============================================================================
-- STEP 9: Grant permissions
-- ============================================================================

-- Grant execute permissions on functions to service_role
GRANT EXECUTE ON FUNCTION public.get_pending_geocode_queue(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_geocode_processing(BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_geocode_completed(BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_geocode_failed(BIGINT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_geocode_queue(INTEGER) TO service_role;

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON SCHEMA public IS 'Geocoding queue system deployed - 2025-12-15';

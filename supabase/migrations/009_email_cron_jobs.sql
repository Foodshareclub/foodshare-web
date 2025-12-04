-- Email System Cron Jobs
-- Automated health monitoring and queue processing

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- =============================================================================
-- CRON JOB 1: Email Provider Health Monitoring
-- Runs every 5 minutes to snapshot provider health metrics
-- =============================================================================
SELECT cron.schedule(
  'email-health-monitoring',           -- Job name
  '*/5 * * * *',                       -- Every 5 minutes
  $$
    SELECT snapshot_provider_health();
  $$
);

-- =============================================================================
-- CRON JOB 2: Email Queue Processing
-- Runs every 15 minutes to process pending emails with retry logic
-- =============================================================================
SELECT cron.schedule(
  'email-queue-processing',            -- Job name
  '*/15 * * * *',                      -- Every 15 minutes
  $$
    -- This will be handled by the Edge Function via HTTP request
    -- We can't directly call Edge Functions from SQL, so we'll use pg_net extension
    SELECT NULL; -- Placeholder - actual processing done by Edge Function
  $$
);

-- =============================================================================
-- CRON JOB 3: Daily Provider Quota Reset
-- Runs at midnight UTC to prepare for next day's quota tracking
-- =============================================================================
SELECT cron.schedule(
  'email-quota-daily-reset',           -- Job name
  '0 0 * * *',                         -- Daily at midnight UTC
  $$
    -- Initialize quota records for tomorrow if they don't exist
    INSERT INTO email_provider_quota (provider, date, emails_sent)
    SELECT
      provider,
      CURRENT_DATE + INTERVAL '1 day' as date,
      0 as emails_sent
    FROM UNNEST(ARRAY['resend', 'brevo', 'aws_ses']) as provider
    WHERE NOT EXISTS (
      SELECT 1 FROM email_provider_quota
      WHERE email_provider_quota.provider = provider
        AND email_provider_quota.date = CURRENT_DATE + INTERVAL '1 day'
    );
  $$
);

-- =============================================================================
-- CRON JOB 4: Circuit Breaker Cleanup
-- Runs hourly to clean up stale circuit breaker states
-- =============================================================================
SELECT cron.schedule(
  'email-circuit-breaker-cleanup',     -- Job name
  '0 * * * *',                         -- Every hour
  $$
    -- Reset circuit breakers that have passed their retry time
    UPDATE email_circuit_breaker_state
    SET
      state = 'closed',
      failures = 0,
      next_retry_time = NULL,
      updated_at = NOW()
    WHERE state = 'open'
      AND next_retry_time IS NOT NULL
      AND next_retry_time < NOW();

    -- Log the cleanup
    INSERT INTO email_health_events (provider, event_type, severity, message)
    SELECT
      provider,
      'circuit_breaker_auto_reset' as event_type,
      'info' as severity,
      'Circuit breaker automatically reset after retry timeout' as message
    FROM email_circuit_breaker_state
    WHERE state = 'closed'
      AND updated_at > NOW() - INTERVAL '5 minutes';
  $$
);

-- =============================================================================
-- CRON JOB 5: Health Events Cleanup (Weekly)
-- Runs weekly to archive old health events
-- =============================================================================
SELECT cron.schedule(
  'email-health-events-cleanup',       -- Job name
  '0 2 * * 0',                         -- Every Sunday at 2 AM UTC
  $$
    -- Delete health events older than 30 days
    DELETE FROM email_health_events
    WHERE created_at < NOW() - INTERVAL '30 days';

    -- Delete old email logs (keep last 90 days)
    DELETE FROM email_logs
    WHERE created_at < NOW() - INTERVAL '90 days';

    -- Delete old provider metrics (keep last 90 days for aggregation)
    DELETE FROM email_provider_metrics
    WHERE date < CURRENT_DATE - INTERVAL '90 days';
  $$
);

-- =============================================================================
-- CRON JOB 6: Dead Letter Queue Review Alert
-- Runs daily to check for emails stuck in DLQ
-- =============================================================================
SELECT cron.schedule(
  'email-dlq-review-alert',            -- Job name
  '0 9 * * *',                         -- Daily at 9 AM UTC
  $$
    -- Log alert if DLQ has unreviewed items
    INSERT INTO email_health_events (event_type, severity, message, metadata)
    SELECT
      'dlq_review_needed' as event_type,
      'warning' as severity,
      'Dead letter queue has ' || COUNT(*) || ' unreviewed emails' as message,
      jsonb_build_object(
        'count', COUNT(*),
        'oldest_email', MIN(created_at),
        'providers_failed', jsonb_agg(DISTINCT providers_tried)
      ) as metadata
    FROM email_dead_letter_queue
    WHERE reviewed_at IS NULL
    HAVING COUNT(*) > 0;
  $$
);

-- =============================================================================
-- View Cron Job Status
-- =============================================================================
COMMENT ON EXTENSION pg_cron IS 'Email system cron jobs configured:
1. Health Monitoring (every 5 min)
2. Queue Processing (every 15 min)
3. Daily Quota Reset (midnight UTC)
4. Circuit Breaker Cleanup (hourly)
5. Health Events Cleanup (weekly)
6. DLQ Review Alert (daily 9 AM UTC)';

-- =============================================================================
-- Utility: View all email cron jobs
-- =============================================================================
CREATE OR REPLACE FUNCTION get_email_cron_jobs()
RETURNS TABLE (
  job_name text,
  schedule text,
  active boolean,
  last_run timestamp with time zone,
  next_run timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    jobname::text as job_name,
    cron.schedule::text as schedule,
    active,
    last_run_time as last_run,
    NULL::timestamp with time zone as next_run  -- pg_cron doesn't track next run
  FROM cron.job
  WHERE jobname LIKE 'email-%'
  ORDER BY jobname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_email_cron_jobs() TO authenticated;

COMMENT ON FUNCTION get_email_cron_jobs IS 'Returns status of all email system cron jobs for admin monitoring';

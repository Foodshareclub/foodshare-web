-- Migration 006: Email Health Monitoring and Circuit Breaker
-- Creates tables and functions for provider health monitoring, circuit breaker state,
-- and performance metrics tracking

-- ============================================================================
-- 1. Circuit Breaker State Table
-- ============================================================================
-- Stores the current state of circuit breakers for each email provider
CREATE TABLE IF NOT EXISTS email_circuit_breaker_state (
  provider TEXT PRIMARY KEY CHECK (provider IN ('resend', 'brevo', 'aws_ses')),
  state TEXT NOT NULL DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half-open')),
  failures INTEGER NOT NULL DEFAULT 0,
  consecutive_successes INTEGER NOT NULL DEFAULT 0,
  last_failure_time TIMESTAMPTZ,
  next_retry_time TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE email_circuit_breaker_state IS
  'Stores circuit breaker state for email providers to prevent cascading failures';

-- Initialize circuit breaker state for all providers
INSERT INTO email_circuit_breaker_state (provider, state, failures, consecutive_successes)
VALUES
  ('resend', 'closed', 0, 0),
  ('brevo', 'closed', 0, 0),
  ('aws_ses', 'closed', 0, 0)
ON CONFLICT (provider) DO NOTHING;

-- Create index for state queries
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_state
  ON email_circuit_breaker_state(state);

-- ============================================================================
-- 2. Provider Performance Metrics Table
-- ============================================================================
-- Tracks daily performance metrics for each provider
CREATE TABLE IF NOT EXISTS email_provider_metrics (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('resend', 'brevo', 'aws_ses')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_requests INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  total_latency_ms BIGINT NOT NULL DEFAULT 0, -- Sum of all latencies for averaging
  average_latency_ms NUMERIC(10, 2) GENERATED ALWAYS AS (
    CASE
      WHEN total_requests > 0 THEN total_latency_ms::NUMERIC / total_requests
      ELSE 0
    END
  ) STORED,
  success_rate NUMERIC(5, 4) GENERATED ALWAYS AS (
    CASE
      WHEN total_requests > 0 THEN success_count::NUMERIC / total_requests
      ELSE 0
    END
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, date)
);

-- Add comment
COMMENT ON TABLE email_provider_metrics IS
  'Daily performance metrics for email providers including success rate and latency';

-- Create indexes for performance queries
CREATE INDEX IF NOT EXISTS idx_provider_metrics_provider_date
  ON email_provider_metrics(provider, date DESC);
CREATE INDEX IF NOT EXISTS idx_provider_metrics_date
  ON email_provider_metrics(date DESC);

-- ============================================================================
-- 3. Health Events Table
-- ============================================================================
-- Logs important health-related events for monitoring and debugging
CREATE TABLE IF NOT EXISTS email_health_events (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT CHECK (provider IN ('resend', 'brevo', 'aws_ses')),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'circuit_opened',
    'circuit_half_opened',
    'circuit_closed',
    'manual_reset',
    'manual_disable',
    'quota_warning',
    'quota_exhausted',
    'provider_failure',
    'all_providers_exhausted'
  )),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE email_health_events IS
  'Audit log of email provider health events for monitoring and debugging';

-- Create indexes for event queries
CREATE INDEX IF NOT EXISTS idx_health_events_provider
  ON email_health_events(provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_events_type
  ON email_health_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_events_severity
  ON email_health_events(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_events_created
  ON email_health_events(created_at DESC);

-- ============================================================================
-- 4. Functions for Circuit Breaker Management
-- ============================================================================

-- Function to update circuit breaker state
CREATE OR REPLACE FUNCTION update_circuit_breaker_state(
  p_provider TEXT,
  p_state TEXT,
  p_failures INTEGER DEFAULT NULL,
  p_consecutive_successes INTEGER DEFAULT NULL,
  p_last_failure_time TIMESTAMPTZ DEFAULT NULL,
  p_next_retry_time TIMESTAMPTZ DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE email_circuit_breaker_state
  SET
    state = p_state,
    failures = COALESCE(p_failures, failures),
    consecutive_successes = COALESCE(p_consecutive_successes, consecutive_successes),
    last_failure_time = COALESCE(p_last_failure_time, last_failure_time),
    next_retry_time = COALESCE(p_next_retry_time, next_retry_time),
    updated_at = NOW()
  WHERE provider = p_provider;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record circuit breaker event
CREATE OR REPLACE FUNCTION record_circuit_event(
  p_provider TEXT,
  p_event_type TEXT,
  p_message TEXT,
  p_severity TEXT DEFAULT 'info',
  p_metadata JSONB DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO email_health_events (provider, event_type, severity, message, metadata)
  VALUES (p_provider, p_event_type, p_severity, p_message, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record provider failure
CREATE OR REPLACE FUNCTION record_provider_failure(
  p_provider TEXT,
  p_error_message TEXT,
  p_metadata JSONB DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_current_state TEXT;
  v_failures INTEGER;
BEGIN
  -- Get current circuit state
  SELECT state, failures INTO v_current_state, v_failures
  FROM email_circuit_breaker_state
  WHERE provider = p_provider;

  -- Increment failure count
  UPDATE email_circuit_breaker_state
  SET
    failures = failures + 1,
    last_failure_time = NOW(),
    consecutive_successes = 0,
    updated_at = NOW()
  WHERE provider = p_provider;

  -- Log the failure event
  PERFORM record_circuit_event(
    p_provider,
    'provider_failure',
    p_error_message,
    'warning',
    p_metadata
  );

  -- Check if circuit should open (5 failures threshold)
  IF v_failures + 1 >= 5 AND v_current_state = 'closed' THEN
    PERFORM update_circuit_breaker_state(
      p_provider,
      'open',
      NULL, -- Keep current failures
      0,    -- Reset consecutive successes
      NOW(),
      NOW() + INTERVAL '1 minute' -- Next retry in 1 minute
    );

    PERFORM record_circuit_event(
      p_provider,
      'circuit_opened',
      format('Circuit breaker opened for %s after %s failures', p_provider, v_failures + 1),
      'error',
      jsonb_build_object('failures', v_failures + 1)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record provider success
CREATE OR REPLACE FUNCTION record_provider_success(
  p_provider TEXT
) RETURNS void AS $$
DECLARE
  v_current_state TEXT;
  v_consecutive_successes INTEGER;
BEGIN
  -- Get current circuit state
  SELECT state, consecutive_successes INTO v_current_state, v_consecutive_successes
  FROM email_circuit_breaker_state
  WHERE provider = p_provider;

  -- Update state
  UPDATE email_circuit_breaker_state
  SET
    failures = 0,
    consecutive_successes = consecutive_successes + 1,
    updated_at = NOW()
  WHERE provider = p_provider;

  -- If in half-open and enough successes, close the circuit
  IF v_current_state = 'half-open' AND v_consecutive_successes + 1 >= 3 THEN
    PERFORM update_circuit_breaker_state(
      p_provider,
      'closed',
      0,    -- Reset failures
      0,    -- Reset consecutive successes
      NULL, -- Clear last failure time
      NULL  -- Clear next retry time
    );

    PERFORM record_circuit_event(
      p_provider,
      'circuit_closed',
      format('Circuit breaker closed for %s after successful recovery', p_provider),
      'info',
      jsonb_build_object('consecutive_successes', v_consecutive_successes + 1)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset circuit breaker (admin action)
CREATE OR REPLACE FUNCTION reset_circuit_breaker(
  p_provider TEXT
) RETURNS void AS $$
BEGIN
  PERFORM update_circuit_breaker_state(
    p_provider,
    'closed',
    0,    -- Reset failures
    0,    -- Reset consecutive successes
    NULL, -- Clear last failure time
    NULL  -- Clear next retry time
  );

  PERFORM record_circuit_event(
    p_provider,
    'manual_reset',
    format('Circuit breaker manually reset for %s', p_provider),
    'info',
    jsonb_build_object('reset_by', current_user)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Functions for Performance Metrics
-- ============================================================================

-- Function to record email metrics
CREATE OR REPLACE FUNCTION record_email_metrics(
  p_provider TEXT,
  p_success BOOLEAN,
  p_latency_ms INTEGER
) RETURNS void AS $$
BEGIN
  INSERT INTO email_provider_metrics (
    provider,
    date,
    total_requests,
    success_count,
    failure_count,
    total_latency_ms
  ) VALUES (
    p_provider,
    CURRENT_DATE,
    1,
    CASE WHEN p_success THEN 1 ELSE 0 END,
    CASE WHEN p_success THEN 0 ELSE 1 END,
    p_latency_ms
  )
  ON CONFLICT (provider, date) DO UPDATE SET
    total_requests = email_provider_metrics.total_requests + 1,
    success_count = email_provider_metrics.success_count + CASE WHEN p_success THEN 1 ELSE 0 END,
    failure_count = email_provider_metrics.failure_count + CASE WHEN p_success THEN 0 ELSE 1 END,
    total_latency_ms = email_provider_metrics.total_latency_ms + p_latency_ms,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get provider health summary
CREATE OR REPLACE FUNCTION get_provider_health_summary()
RETURNS TABLE (
  provider TEXT,
  circuit_state TEXT,
  recent_failures INTEGER,
  is_healthy BOOLEAN,
  today_success_rate NUMERIC,
  today_avg_latency_ms NUMERIC,
  quota_used INTEGER,
  quota_limit INTEGER,
  quota_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cb.provider,
    cb.state AS circuit_state,
    cb.failures AS recent_failures,
    (cb.state = 'closed') AS is_healthy,
    COALESCE(pm.success_rate, 0) AS today_success_rate,
    COALESCE(pm.average_latency_ms, 0) AS today_avg_latency_ms,
    COALESCE(q.emails_sent, 0) AS quota_used,
    q.daily_limit AS quota_limit,
    GREATEST(0, q.daily_limit - COALESCE(q.emails_sent, 0)) AS quota_remaining
  FROM email_circuit_breaker_state cb
  LEFT JOIN email_provider_metrics pm
    ON cb.provider = pm.provider AND pm.date = CURRENT_DATE
  LEFT JOIN email_provider_quota q
    ON cb.provider = q.provider AND q.date = CURRENT_DATE
  ORDER BY cb.provider;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Automatic Cleanup Triggers
-- ============================================================================

-- Function to clean up old health events (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_health_events() RETURNS void AS $$
BEGIN
  DELETE FROM email_health_events
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old metrics (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_metrics() RETURNS void AS $$
BEGIN
  DELETE FROM email_provider_metrics
  WHERE date < CURRENT_DATE - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Enable Row Level Security
-- ============================================================================

ALTER TABLE email_circuit_breaker_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_provider_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_health_events ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to manage circuit breaker state
CREATE POLICY "Service role can manage circuit breaker state"
  ON email_circuit_breaker_state
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow service role to manage metrics
CREATE POLICY "Service role can manage metrics"
  ON email_provider_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow service role to manage health events
CREATE POLICY "Service role can manage health events"
  ON email_health_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to read health summary (for admin dashboard)
CREATE POLICY "Authenticated users can read circuit breaker state"
  ON email_circuit_breaker_state
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read metrics"
  ON email_provider_metrics
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read health events"
  ON email_health_events
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 8. Grant Permissions
-- ============================================================================

GRANT SELECT ON email_circuit_breaker_state TO authenticated;
GRANT SELECT ON email_provider_metrics TO authenticated;
GRANT SELECT ON email_health_events TO authenticated;

GRANT ALL ON email_circuit_breaker_state TO service_role;
GRANT ALL ON email_provider_metrics TO service_role;
GRANT ALL ON email_health_events TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION update_circuit_breaker_state TO service_role;
GRANT EXECUTE ON FUNCTION record_circuit_event TO service_role;
GRANT EXECUTE ON FUNCTION record_provider_failure TO service_role;
GRANT EXECUTE ON FUNCTION record_provider_success TO service_role;
GRANT EXECUTE ON FUNCTION reset_circuit_breaker TO service_role;
GRANT EXECUTE ON FUNCTION record_email_metrics TO service_role;
GRANT EXECUTE ON FUNCTION get_provider_health_summary TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_health_events TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_metrics TO service_role;

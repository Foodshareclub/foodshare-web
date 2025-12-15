-- Add MailerSend provider support to email system
-- Migration: 20251215_add_mailersend_provider.sql

-- =============================================================================
-- 1. Update email_provider_quota table to support MailerSend
-- =============================================================================

-- Drop the existing CHECK constraint
ALTER TABLE public.email_provider_quota
  DROP CONSTRAINT IF EXISTS email_provider_quota_provider_check;

-- Add new CHECK constraint with MailerSend included
ALTER TABLE public.email_provider_quota
  ADD CONSTRAINT email_provider_quota_provider_check
  CHECK (provider IN ('resend', 'brevo', 'mailersend', 'aws_ses'));

-- =============================================================================
-- 2. Update increment_provider_quota function to include MailerSend
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_provider_quota(
  p_provider TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_emails_sent INTEGER;
  v_daily_limit INTEGER;
BEGIN
  -- Get the daily limit for the provider
  v_daily_limit := CASE p_provider
    WHEN 'resend' THEN 100
    WHEN 'brevo' THEN 300
    WHEN 'mailersend' THEN 400
    WHEN 'aws_ses' THEN 100
    ELSE 0
  END;

  -- Insert or update the quota record
  INSERT INTO public.email_provider_quota (provider, date, emails_sent, daily_limit)
  VALUES (p_provider, p_date, 1, v_daily_limit)
  ON CONFLICT (provider, date)
  DO UPDATE SET
    emails_sent = public.email_provider_quota.emails_sent + 1,
    updated_at = now()
  RETURNING emails_sent INTO v_emails_sent;

  RETURN v_emails_sent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 3. Seed MailerSend quota record for today
-- =============================================================================

INSERT INTO public.email_provider_quota (provider, date, emails_sent, daily_limit)
VALUES ('mailersend', CURRENT_DATE, 0, 400)
ON CONFLICT (provider, date) DO NOTHING;

-- =============================================================================
-- 4. Update email_logs table provider constraint (if exists)
-- =============================================================================

-- Drop existing constraint if it exists
ALTER TABLE public.email_logs
  DROP CONSTRAINT IF EXISTS email_logs_provider_check;

-- Add new constraint with MailerSend
ALTER TABLE public.email_logs
  ADD CONSTRAINT email_logs_provider_check
  CHECK (provider IN ('resend', 'brevo', 'mailersend', 'aws_ses'));

-- =============================================================================
-- 5. Update email_health_monitoring table provider constraint (if exists)
-- =============================================================================

-- Drop existing constraint if it exists
ALTER TABLE public.email_health_monitoring
  DROP CONSTRAINT IF EXISTS email_health_monitoring_provider_check;

-- Add new constraint with MailerSend
ALTER TABLE public.email_health_monitoring
  ADD CONSTRAINT email_health_monitoring_provider_check
  CHECK (provider IN ('resend', 'brevo', 'mailersend', 'aws_ses'));

-- =============================================================================
-- 6. Seed initial health monitoring record for MailerSend
-- =============================================================================

INSERT INTO public.email_health_monitoring (provider, total_sent, total_delivered, total_failed, last_success_at, last_failure_at, is_healthy)
VALUES ('mailersend', 0, 0, 0, NULL, NULL, true)
ON CONFLICT (provider) DO NOTHING;

-- Add comment
COMMENT ON CONSTRAINT email_provider_quota_provider_check ON public.email_provider_quota
  IS 'Ensures provider is one of: resend, brevo, mailersend, aws_ses';

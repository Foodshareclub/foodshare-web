-- Add monthly_limit column to email_provider_quota table
-- This enables proper tracking of both daily AND monthly quota limits

ALTER TABLE public.email_provider_quota
ADD COLUMN IF NOT EXISTS monthly_limit INTEGER NOT NULL DEFAULT 3000 CHECK (monthly_limit > 0);

-- Update existing rows with proper monthly limits based on provider
UPDATE public.email_provider_quota
SET monthly_limit = CASE provider
  WHEN 'resend' THEN 3000
  WHEN 'brevo' THEN 9000
  WHEN 'mailersend' THEN 12000
  WHEN 'aws_ses' THEN 62000
  ELSE 3000
END;

-- Update the increment_provider_quota function to include monthly_limit
CREATE OR REPLACE FUNCTION increment_provider_quota(
  p_provider TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_emails_sent INTEGER;
  v_daily_limit INTEGER;
  v_monthly_limit INTEGER;
BEGIN
  -- Get the daily and monthly limits for the provider
  SELECT
    CASE p_provider
      WHEN 'resend' THEN 100
      WHEN 'brevo' THEN 300
      WHEN 'mailersend' THEN 400
      WHEN 'aws_ses' THEN 100
      ELSE 0
    END,
    CASE p_provider
      WHEN 'resend' THEN 3000
      WHEN 'brevo' THEN 9000
      WHEN 'mailersend' THEN 12000
      WHEN 'aws_ses' THEN 62000
      ELSE 0
    END
  INTO v_daily_limit, v_monthly_limit;

  -- Insert or update the quota record
  INSERT INTO public.email_provider_quota (provider, date, emails_sent, daily_limit, monthly_limit)
  VALUES (p_provider, p_date, 1, v_daily_limit, v_monthly_limit)
  ON CONFLICT (provider, date)
  DO UPDATE SET
    emails_sent = public.email_provider_quota.emails_sent + 1,
    updated_at = now()
  RETURNING emails_sent INTO v_emails_sent;

  RETURN v_emails_sent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON COLUMN public.email_provider_quota.monthly_limit IS 'Monthly email sending limit for the provider';

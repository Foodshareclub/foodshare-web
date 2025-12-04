-- Create email_provider_quota table for tracking daily email quotas
CREATE TABLE IF NOT EXISTS public.email_provider_quota (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT CHECK (provider IN ('resend', 'brevo', 'aws_ses')) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  emails_sent INTEGER DEFAULT 0 CHECK (emails_sent >= 0),
  daily_limit INTEGER NOT NULL CHECK (daily_limit > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(provider, date)
);

-- Create index on provider for quick lookups
CREATE INDEX IF NOT EXISTS idx_email_provider_quota_provider ON public.email_provider_quota(provider);

-- Create index on date for time-based queries
CREATE INDEX IF NOT EXISTS idx_email_provider_quota_date ON public.email_provider_quota(date DESC);

-- Create composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_email_provider_quota_provider_date ON public.email_provider_quota(provider, date DESC);

-- Enable Row Level Security
ALTER TABLE public.email_provider_quota ENABLE ROW LEVEL SECURITY;

-- Allow admins to read quota data
CREATE POLICY "Admins can read quota data"
  ON public.email_provider_quota
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      -- Add your admin check here, e.g., AND is_admin = true
    )
  );

-- Allow service role to manage quota data
CREATE POLICY "Service role can manage quota data"
  ON public.email_provider_quota
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_provider_quota_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_email_provider_quota_timestamp
  BEFORE UPDATE ON public.email_provider_quota
  FOR EACH ROW
  EXECUTE FUNCTION update_email_provider_quota_updated_at();

-- Function to increment email count for a provider
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

-- Function to check if provider has quota available
CREATE OR REPLACE FUNCTION check_provider_quota(
  p_provider TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_emails_sent INTEGER;
  v_daily_limit INTEGER;
BEGIN
  -- Get current quota or return true if no record exists (meaning 0 sent)
  SELECT emails_sent, daily_limit
  INTO v_emails_sent, v_daily_limit
  FROM public.email_provider_quota
  WHERE provider = p_provider AND date = p_date;

  -- If no record exists, quota is available
  IF NOT FOUND THEN
    RETURN true;
  END IF;

  -- Check if under quota
  RETURN v_emails_sent < v_daily_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed initial quota records for today
INSERT INTO public.email_provider_quota (provider, date, emails_sent, daily_limit)
VALUES
  ('resend', CURRENT_DATE, 0, 100),
  ('brevo', CURRENT_DATE, 0, 300),
  ('aws_ses', CURRENT_DATE, 0, 100)
ON CONFLICT (provider, date) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE public.email_provider_quota IS 'Daily email quota tracking for all email providers';

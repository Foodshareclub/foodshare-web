-- Create email_logs table for tracking all email delivery attempts
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  email_type TEXT CHECK (email_type IN ('auth', 'chat', 'food_listing', 'feedback', 'review_reminder')) NOT NULL,
  subject TEXT NOT NULL,
  provider TEXT CHECK (provider IN ('resend', 'brevo', 'aws_ses')) NOT NULL,
  provider_message_id TEXT,
  status TEXT CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')) DEFAULT 'pending',
  error_message TEXT,
  template_data JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index on recipient_id for user-specific queries
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_id ON public.email_logs(recipient_id);

-- Create index on email_type for filtering
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON public.email_logs(email_type);

-- Create index on provider for analytics
CREATE INDEX IF NOT EXISTS idx_email_logs_provider ON public.email_logs(provider);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);

-- Create index on sent_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);

-- Create composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_sent_at ON public.email_logs(recipient_id, sent_at DESC);

-- Enable Row Level Security
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own email logs
CREATE POLICY "Users can read their own email logs"
  ON public.email_logs
  FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

-- Allow admins to read all email logs
CREATE POLICY "Admins can read all email logs"
  ON public.email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      -- Add your admin check here, e.g., AND is_admin = true
    )
  );

-- Allow service role to insert email logs
CREATE POLICY "Service role can insert email logs"
  ON public.email_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow service role to update email logs (for status updates)
CREATE POLICY "Service role can update email logs"
  ON public.email_logs
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE public.email_logs IS 'Log of all email sending attempts for debugging and analytics';

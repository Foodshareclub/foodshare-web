-- Create email_queue table for failed/retryable emails
CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  email_type TEXT CHECK (email_type IN ('auth', 'chat', 'food_listing', 'feedback', 'review_reminder')) NOT NULL,
  template_name TEXT NOT NULL,
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER DEFAULT 3 CHECK (max_attempts > 0),
  status TEXT CHECK (status IN ('queued', 'processing', 'failed', 'completed')) DEFAULT 'queued',
  last_error TEXT,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index on status for filtering ready-to-process items
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);

-- Create index on next_retry_at for finding items ready to retry
CREATE INDEX IF NOT EXISTS idx_email_queue_next_retry_at ON public.email_queue(next_retry_at)
  WHERE status = 'queued';

-- Create index on recipient_id for user-specific queries
CREATE INDEX IF NOT EXISTS idx_email_queue_recipient_id ON public.email_queue(recipient_id);

-- Create composite index for common query patterns (finding ready items)
CREATE INDEX IF NOT EXISTS idx_email_queue_ready ON public.email_queue(status, next_retry_at)
  WHERE status = 'queued' AND (next_retry_at IS NULL OR next_retry_at <= now());

-- Create index on created_at for cleanup of old items
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON public.email_queue(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage queue
CREATE POLICY "Service role can manage email queue"
  ON public.email_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow admins to view queue
CREATE POLICY "Admins can view email queue"
  ON public.email_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      -- Add your admin check here, e.g., AND is_admin = true
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_email_queue_timestamp
  BEFORE UPDATE ON public.email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_email_queue_updated_at();

-- Function to add email to queue
CREATE OR REPLACE FUNCTION queue_email(
  p_recipient_id UUID,
  p_recipient_email TEXT,
  p_email_type TEXT,
  p_template_name TEXT,
  p_template_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_queue_id UUID;
BEGIN
  INSERT INTO public.email_queue (
    recipient_id,
    recipient_email,
    email_type,
    template_name,
    template_data,
    status,
    next_retry_at
  )
  VALUES (
    p_recipient_id,
    p_recipient_email,
    p_email_type,
    p_template_name,
    p_template_data,
    'queued',
    now() -- Ready for immediate processing
  )
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark email as failed and schedule retry
CREATE OR REPLACE FUNCTION retry_queued_email(
  p_queue_id UUID,
  p_error_message TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_attempts INTEGER;
  v_max_attempts INTEGER;
  v_next_retry TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current attempts
  SELECT attempts, max_attempts
  INTO v_attempts, v_max_attempts
  FROM public.email_queue
  WHERE id = p_queue_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Increment attempts
  v_attempts := v_attempts + 1;

  -- Calculate next retry time with exponential backoff
  IF v_attempts = 1 THEN
    v_next_retry := now() + INTERVAL '15 minutes';
  ELSIF v_attempts = 2 THEN
    v_next_retry := now() + INTERVAL '30 minutes';
  ELSE
    v_next_retry := now() + INTERVAL '1 hour';
  END IF;

  -- Update the queue item
  IF v_attempts >= v_max_attempts THEN
    -- Max attempts reached, mark as failed
    UPDATE public.email_queue
    SET
      attempts = v_attempts,
      status = 'failed',
      last_error = p_error_message,
      next_retry_at = NULL,
      updated_at = now()
    WHERE id = p_queue_id;
  ELSE
    -- Schedule retry
    UPDATE public.email_queue
    SET
      attempts = v_attempts,
      status = 'queued',
      last_error = p_error_message,
      next_retry_at = v_next_retry,
      updated_at = now()
    WHERE id = p_queue_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get emails ready for processing
CREATE OR REPLACE FUNCTION get_ready_emails(p_limit INTEGER DEFAULT 10)
RETURNS SETOF public.email_queue AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.email_queue
  WHERE status = 'queued'
    AND (next_retry_at IS NULL OR next_retry_at <= now())
  ORDER BY created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old completed/failed queue items (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_queue_items()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.email_queue
  WHERE status IN ('completed', 'failed')
    AND created_at < now() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to table
COMMENT ON TABLE public.email_queue IS 'Queue for failed emails with retry logic and exponential backoff';

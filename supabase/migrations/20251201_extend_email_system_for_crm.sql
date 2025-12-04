-- ============================================================================
-- Extend Email System for CRM Campaigns
-- ============================================================================
-- This migration extends the existing email system to support CRM campaigns
-- by adding new email types and campaign tracking integration.
--
-- This migration is IDEMPOTENT - safe to re-run without duplicates
-- ============================================================================

-- ============================================================================
-- 1. Extend email_type enum with CRM campaign types
-- ============================================================================

-- Drop existing constraint
ALTER TABLE public.email_queue
  DROP CONSTRAINT IF EXISTS email_queue_email_type_check;

-- Add new constraint with CRM types
ALTER TABLE public.email_queue
  ADD CONSTRAINT email_queue_email_type_check
  CHECK (email_type IN (
    -- Existing types
    'auth',
    'chat',
    'food_listing',
    'feedback',
    'review_reminder',
    -- NEW CRM Campaign types
    'crm_welcome',              -- Welcome series emails
    'crm_engagement',           -- Engagement and activation
    'crm_reengagement',         -- Re-engagement campaigns
    'crm_winback',              -- Win-back dormant users
    'crm_milestone',            -- Milestone celebrations
    'crm_champion_recognition', -- Champion status recognition
    'crm_at_risk_intervention', -- At-risk user intervention
    'crm_feedback_request',     -- Feedback and survey requests
    'crm_newsletter'            -- Regular newsletters
  ));

-- ============================================================================
-- 2. Add campaign tracking columns to email_logs
-- ============================================================================

-- Add campaign tracking columns if they don't exist
DO $$
BEGIN
  -- Check and add campaign_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'email_logs'
      AND column_name = 'campaign_id'
  ) THEN
    ALTER TABLE public.email_logs
      ADD COLUMN campaign_id UUID REFERENCES public.crm_campaigns(id) ON DELETE SET NULL;
  END IF;

  -- Check and add campaign_send_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'email_logs'
      AND column_name = 'campaign_send_id'
  ) THEN
    ALTER TABLE public.email_logs
      ADD COLUMN campaign_send_id UUID REFERENCES public.crm_campaign_sends(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for campaign tracking
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_id
  ON public.email_logs(campaign_id)
  WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_send_id
  ON public.email_logs(campaign_send_id)
  WHERE campaign_send_id IS NOT NULL;

-- ============================================================================
-- 3. Add campaign tracking to email_queue
-- ============================================================================

-- Add campaign tracking columns to email_queue if they don't exist
DO $$
BEGIN
  -- Check and add campaign_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'email_queue'
      AND column_name = 'campaign_id'
  ) THEN
    ALTER TABLE public.email_queue
      ADD COLUMN campaign_id UUID REFERENCES public.crm_campaigns(id) ON DELETE SET NULL;
  END IF;

  -- Check and add campaign_send_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'email_queue'
      AND column_name = 'campaign_send_id'
  ) THEN
    ALTER TABLE public.email_queue
      ADD COLUMN campaign_send_id UUID REFERENCES public.crm_campaign_sends(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for campaign tracking on email_queue
CREATE INDEX IF NOT EXISTS idx_email_queue_campaign_id
  ON public.email_queue(campaign_id)
  WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_queue_campaign_send_id
  ON public.email_queue(campaign_send_id)
  WHERE campaign_send_id IS NOT NULL;

-- ============================================================================
-- 4. Function to queue campaign emails
-- ============================================================================

CREATE OR REPLACE FUNCTION queue_campaign_email(
  p_campaign_id UUID,
  p_campaign_send_id UUID,
  p_recipient_id UUID,
  p_recipient_email TEXT,
  p_template_name TEXT,
  p_template_data JSONB,
  p_respect_preferences BOOLEAN DEFAULT true
)
RETURNS UUID AS $$
DECLARE
  v_queue_id UUID;
  v_email_prefs RECORD;
  v_email_type TEXT;
BEGIN
  -- Determine email type from campaign
  SELECT
    CASE campaign_type
      WHEN 'email' THEN 'crm_newsletter'
      ELSE 'crm_newsletter'
    END INTO v_email_type
  FROM public.crm_campaigns
  WHERE id = p_campaign_id;

  -- Check email preferences if requested
  IF p_respect_preferences THEN
    SELECT * INTO v_email_prefs
    FROM public.email_preferences
    WHERE profile_id = p_recipient_id;

    -- If user has unsubscribed from all notifications, don't queue
    IF v_email_prefs.notification_frequency IS NULL THEN
      RAISE NOTICE 'User % has unsubscribed from all emails', p_recipient_email;
      RETURN NULL;
    END IF;

    -- Check quiet hours
    IF v_email_prefs.quiet_hours_start IS NOT NULL
       AND v_email_prefs.quiet_hours_end IS NOT NULL THEN
      -- Schedule for after quiet hours if currently in quiet period
      -- (Simplified - actual implementation would be more sophisticated)
      NULL; -- Placeholder for quiet hours logic
    END IF;
  END IF;

  -- Insert into email_queue
  INSERT INTO public.email_queue (
    recipient_id,
    recipient_email,
    email_type,
    template_name,
    template_data,
    campaign_id,
    campaign_send_id,
    status,
    created_at
  )
  VALUES (
    p_recipient_id,
    p_recipient_email,
    v_email_type,
    p_template_name,
    p_template_data,
    p_campaign_id,
    p_campaign_send_id,
    'queued',
    now()
  )
  RETURNING id INTO v_queue_id;

  -- Update campaign_send status
  UPDATE public.crm_campaign_sends
  SET
    status = 'sent',
    sent_at = now(),
    email_queue_id = v_queue_id
  WHERE id = p_campaign_send_id;

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Function to track campaign email events
-- ============================================================================

-- Track email open
CREATE OR REPLACE FUNCTION track_campaign_email_open(
  p_email_log_id BIGINT,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_campaign_send_id UUID;
BEGIN
  -- Get campaign_send_id from email_logs
  SELECT campaign_send_id INTO v_campaign_send_id
  FROM public.email_logs
  WHERE id = p_email_log_id
    AND campaign_send_id IS NOT NULL;

  IF v_campaign_send_id IS NOT NULL THEN
    -- Update campaign_send
    UPDATE public.crm_campaign_sends
    SET
      status = 'opened',
      opened_at = COALESCE(opened_at, now()),
      user_agent = COALESCE(user_agent, p_user_agent),
      ip_address = COALESCE(ip_address, p_ip_address),
      updated_at = now()
    WHERE id = v_campaign_send_id;

    -- Update campaign totals
    UPDATE public.crm_campaigns
    SET
      total_opened = total_opened + 1,
      updated_at = now()
    WHERE id = (
      SELECT campaign_id FROM public.crm_campaign_sends WHERE id = v_campaign_send_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track email click
CREATE OR REPLACE FUNCTION track_campaign_email_click(
  p_email_log_id BIGINT,
  p_link_url TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_campaign_send_id UUID;
BEGIN
  -- Get campaign_send_id from email_logs
  SELECT campaign_send_id INTO v_campaign_send_id
  FROM public.email_logs
  WHERE id = p_email_log_id
    AND campaign_send_id IS NOT NULL;

  IF v_campaign_send_id IS NOT NULL THEN
    -- Update campaign_send
    UPDATE public.crm_campaign_sends
    SET
      status = 'clicked',
      clicked_at = COALESCE(clicked_at, now()),
      metadata = jsonb_set(
        COALESCE(metadata, '{}'),
        '{last_clicked_link}',
        to_jsonb(p_link_url)
      ),
      updated_at = now()
    WHERE id = v_campaign_send_id;

    -- Update campaign totals
    UPDATE public.crm_campaigns
    SET
      total_clicked = total_clicked + 1,
      updated_at = now()
    WHERE id = (
      SELECT campaign_id FROM public.crm_campaign_sends WHERE id = v_campaign_send_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track conversion
CREATE OR REPLACE FUNCTION track_campaign_conversion(
  p_campaign_send_id UUID,
  p_conversion_type TEXT DEFAULT 'general'
)
RETURNS VOID AS $$
BEGIN
  -- Update campaign_send
  UPDATE public.crm_campaign_sends
  SET
    status = 'converted',
    converted_at = COALESCE(converted_at, now()),
    metadata = jsonb_set(
      COALESCE(metadata, '{}'),
      '{conversion_type}',
      to_jsonb(p_conversion_type)
    ),
    updated_at = now()
  WHERE id = p_campaign_send_id;

  -- Update campaign totals
  UPDATE public.crm_campaigns
  SET
    total_converted = total_converted + 1,
    updated_at = now()
  WHERE id = (
    SELECT campaign_id FROM public.crm_campaign_sends WHERE id = p_campaign_send_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Function to batch queue campaign emails
-- ============================================================================

CREATE OR REPLACE FUNCTION queue_campaign_emails_batch(
  p_campaign_id UUID,
  p_batch_size INTEGER DEFAULT 1000
)
RETURNS TABLE (
  queued_count INTEGER,
  skipped_count INTEGER,
  error_count INTEGER
) AS $$
DECLARE
  v_campaign RECORD;
  v_customer RECORD;
  v_queued INTEGER := 0;
  v_skipped INTEGER := 0;
  v_errors INTEGER := 0;
  v_campaign_send_id UUID;
  v_queue_id UUID;
BEGIN
  -- Get campaign details
  SELECT * INTO v_campaign
  FROM public.crm_campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign % not found', p_campaign_id;
  END IF;

  -- Loop through target customers (limited by batch size)
  FOR v_customer IN
    SELECT
      cc.id AS customer_id,
      p.id AS profile_id,
      p.email AS email,
      p.full_name
    FROM public.crm_customers cc
    JOIN public.profiles p ON p.id = cc.profile_id
    WHERE
      -- Apply audience filters (simplified - real implementation would parse audience_filters JSONB)
      cc.is_archived = false
      AND NOT EXISTS (
        SELECT 1 FROM public.crm_campaign_sends
        WHERE campaign_id = p_campaign_id
          AND customer_id = cc.id
      )
    LIMIT p_batch_size
  LOOP
    BEGIN
      -- Create campaign_send record
      INSERT INTO public.crm_campaign_sends (
        campaign_id,
        customer_id,
        status
      )
      VALUES (
        p_campaign_id,
        v_customer.customer_id,
        'queued'
      )
      RETURNING id INTO v_campaign_send_id;

      -- Queue email
      SELECT queue_campaign_email(
        p_campaign_id,
        v_campaign_send_id,
        v_customer.profile_id,
        v_customer.email,
        v_campaign.email_subject,
        v_campaign.email_content,
        v_campaign.respect_digest_preferences
      ) INTO v_queue_id;

      IF v_queue_id IS NOT NULL THEN
        v_queued := v_queued + 1;
      ELSE
        v_skipped := v_skipped + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE NOTICE 'Error queuing email for customer %: %', v_customer.customer_id, SQLERRM;
    END;
  END LOOP;

  -- Update campaign totals
  UPDATE public.crm_campaigns
  SET
    total_sent = total_sent + v_queued,
    updated_at = now()
  WHERE id = p_campaign_id;

  RETURN QUERY SELECT v_queued, v_skipped, v_errors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION queue_campaign_email IS 'Queue a single campaign email respecting user preferences';
COMMENT ON FUNCTION track_campaign_email_open IS 'Track when a campaign email is opened';
COMMENT ON FUNCTION track_campaign_email_click IS 'Track when a link in a campaign email is clicked';
COMMENT ON FUNCTION track_campaign_conversion IS 'Track when a campaign results in a conversion';
COMMENT ON FUNCTION queue_campaign_emails_batch IS 'Queue campaign emails in batches for performance';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify email_type constraint includes CRM types
DO $$
DECLARE
  v_constraint_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_constraint_def
  FROM pg_constraint
  WHERE conname = 'email_queue_email_type_check'
    AND conrelid = 'public.email_queue'::regclass;

  IF v_constraint_def LIKE '%crm_welcome%' THEN
    RAISE NOTICE '✅ Email system successfully extended with CRM campaign types';
  ELSE
    RAISE WARNING '⚠️  CRM email types may not be properly configured';
  END IF;
END $$;

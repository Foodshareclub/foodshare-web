-- Email notification triggers for automatic email sending

-- Helper function to check if user has email notifications enabled for a specific type
CREATE OR REPLACE FUNCTION should_send_email_notification(
  p_recipient_id UUID,
  p_notification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_enabled BOOLEAN;
  v_frequency TEXT;
  v_quiet_start TIME;
  v_quiet_end TIME;
  v_current_time TIME;
BEGIN
  -- Get user preferences
  SELECT
    CASE p_notification_type
      WHEN 'chat' THEN chat_notifications
      WHEN 'food_listing' THEN food_listings_notifications
      WHEN 'feedback' THEN feedback_notifications
      WHEN 'review_reminder' THEN review_reminders
      ELSE false
    END,
    notification_frequency,
    quiet_hours_start,
    quiet_hours_end
  INTO v_enabled, v_frequency, v_quiet_start, v_quiet_end
  FROM public.email_preferences
  WHERE profile_id = p_recipient_id;

  -- If no preferences found, assume notifications enabled
  IF NOT FOUND THEN
    RETURN true;
  END IF;

  -- Check if notification is disabled
  IF NOT v_enabled THEN
    RETURN false;
  END IF;

  -- For digest modes, don't send instant notifications (will be handled by cron job)
  IF v_frequency IN ('daily_digest', 'weekly_digest') THEN
    RETURN false;
  END IF;

  -- Check quiet hours
  IF v_quiet_start IS NOT NULL AND v_quiet_end IS NOT NULL THEN
    v_current_time := CURRENT_TIME;

    -- Handle quiet hours that cross midnight
    IF v_quiet_start <= v_quiet_end THEN
      -- Normal case: quiet hours within same day
      IF v_current_time >= v_quiet_start AND v_current_time < v_quiet_end THEN
        RETURN false;
      END IF;
    ELSE
      -- Quiet hours cross midnight
      IF v_current_time >= v_quiet_start OR v_current_time < v_quiet_end THEN
        RETURN false;
      END IF;
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for new chat messages
CREATE OR REPLACE FUNCTION notify_new_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_id UUID;
  v_recipient_id UUID;
  v_sender_name TEXT;
  v_room_id UUID;
BEGIN
  -- Get room and sender information
  SELECT rp.profile_id INTO v_sender_id
  FROM public.room_participants rp
  WHERE rp.id = NEW.id;

  -- Get the other participant (recipient) in the room
  SELECT rp.profile_id, r.id INTO v_recipient_id, v_room_id
  FROM public.room_participants rp
  JOIN public.rooms r ON rp.room_id = r.id
  WHERE rp.room_id = (SELECT room_id FROM public.room_participants WHERE id = NEW.id)
    AND rp.profile_id != v_sender_id
  LIMIT 1;

  -- If recipient found and should receive notification
  IF v_recipient_id IS NOT NULL AND should_send_email_notification(v_recipient_id, 'chat') THEN
    -- Get sender name
    SELECT COALESCE(full_name, email) INTO v_sender_name
    FROM public.profiles
    WHERE id = v_sender_id;

    -- Queue the email notification
    PERFORM queue_email(
      v_recipient_id,
      (SELECT email FROM public.profiles WHERE id = v_recipient_id),
      'chat',
      'chat-notification',
      jsonb_build_object(
        'sender_name', v_sender_name,
        'sender_id', v_sender_id,
        'message_preview', LEFT(NEW.message, 100),
        'room_id', v_room_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new feedback submissions (notify admins)
CREATE OR REPLACE FUNCTION notify_new_feedback()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_record RECORD;
BEGIN
  -- Loop through all admin users
  FOR v_admin_record IN
    SELECT id, email
    FROM public.profiles
    WHERE is_admin = true  -- Assumes you have an is_admin column
  LOOP
    -- Check if admin wants feedback notifications
    IF should_send_email_notification(v_admin_record.id, 'feedback') THEN
      -- Queue email notification to admin
      PERFORM queue_email(
        v_admin_record.id,
        v_admin_record.email,
        'feedback',
        'feedback-alert',
        jsonb_build_object(
          'feedback_id', NEW.id,
          'feedback_type', NEW.feedback_type,
          'subject', NEW.subject,
          'submitter_name', NEW.name,
          'submitter_email', NEW.email,
          'message_preview', LEFT(NEW.message, 200)
        )
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new chat messages
CREATE TRIGGER trigger_notify_new_chat_message
  AFTER INSERT ON public.room_participants
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_chat_message();

-- Create trigger for new feedback
CREATE TRIGGER trigger_notify_new_feedback
  AFTER INSERT ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_feedback();

-- Function to manually trigger review reminder (called from application code)
CREATE OR REPLACE FUNCTION send_review_reminder(
  p_recipient_id UUID,
  p_transaction_id UUID,
  p_other_user_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_recipient_email TEXT;
BEGIN
  -- Check if user wants review reminders
  IF NOT should_send_email_notification(p_recipient_id, 'review_reminder') THEN
    RETURN false;
  END IF;

  -- Get recipient email
  SELECT email INTO v_recipient_email
  FROM public.profiles
  WHERE id = p_recipient_id;

  IF v_recipient_email IS NULL THEN
    RETURN false;
  END IF;

  -- Queue the review reminder email
  PERFORM queue_email(
    p_recipient_id,
    v_recipient_email,
    'review_reminder',
    'review-reminder',
    jsonb_build_object(
      'transaction_id', p_transaction_id,
      'other_user_name', p_other_user_name
    )
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send food listing notification (called from application code)
CREATE OR REPLACE FUNCTION send_food_listing_notification(
  p_recipient_id UUID,
  p_food_item_id UUID,
  p_food_name TEXT,
  p_distance_km NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
  v_recipient_email TEXT;
BEGIN
  -- Check if user wants food listing notifications
  IF NOT should_send_email_notification(p_recipient_id, 'food_listing') THEN
    RETURN false;
  END IF;

  -- Get recipient email
  SELECT email INTO v_recipient_email
  FROM public.profiles
  WHERE id = p_recipient_id;

  IF v_recipient_email IS NULL THEN
    RETURN false;
  END IF;

  -- Queue the food listing notification
  PERFORM queue_email(
    p_recipient_id,
    v_recipient_email,
    'food_listing',
    'food-listing',
    jsonb_build_object(
      'food_item_id', p_food_item_id,
      'food_name', p_food_name,
      'distance_km', p_distance_km
    )
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION should_send_email_notification IS 'Checks if user should receive email notification based on preferences and quiet hours';
COMMENT ON FUNCTION notify_new_chat_message IS 'Automatically queues email notification when new chat message is received';
COMMENT ON FUNCTION notify_new_feedback IS 'Automatically queues email notification to admins when new feedback is submitted';
COMMENT ON FUNCTION send_review_reminder IS 'Manually sends review reminder email to user';
COMMENT ON FUNCTION send_food_listing_notification IS 'Manually sends food listing notification to nearby users';

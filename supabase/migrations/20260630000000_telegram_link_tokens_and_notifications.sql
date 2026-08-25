-- =============================================================================
-- Migration: Telegram 1-Click Link Tokens, Single-Source-of-Truth Notifications & Auth
-- Date: 2026-06-30
-- Description:
--   1. Safely extends notification_channel enum with 'telegram' and 'in_app'.
--   2. Adds telegram_username to public.profiles.
--   3. Adds telegram_enabled to public.notification_settings.
--   4. Upgrades init_notification_preferences, get_notification_preferences, update_notification_settings.
--   5. Implements update_notification_preference_channel RPC.
--   6. Creates public.telegram_link_tokens for cryptographic 1-click account binding.
--   7. Implements create_telegram_link_token, claim_telegram_link_token, unlink_telegram_account.
-- =============================================================================

-- 0. Ensure pgcrypto extension is present for cryptographic tokens
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- 1. Safely add 'telegram' and 'in_app' to notification_channel enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'notification_channel' AND pg_enum.enumlabel = 'telegram'
  ) THEN
    ALTER TYPE public.notification_channel ADD VALUE 'telegram';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'notification_channel' AND pg_enum.enumlabel = 'in_app'
  ) THEN
    ALTER TYPE public.notification_channel ADD VALUE 'in_app';
  END IF;
END $$;

-- 2. Add telegram_username to profiles if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'telegram_username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN telegram_username TEXT;
    COMMENT ON COLUMN public.profiles.telegram_username IS 'Telegram handle/username for linked account';
  END IF;
END $$;

-- 3. Add telegram_enabled to notification_settings if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notification_settings' AND column_name = 'telegram_enabled'
  ) THEN
    ALTER TABLE public.notification_settings ADD COLUMN telegram_enabled BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- 4. Create telegram_link_tokens table for secure 1-click linking
CREATE TABLE IF NOT EXISTS public.telegram_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_user ON public.telegram_link_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_token ON public.telegram_link_tokens(token) WHERE used_at IS NULL;

-- Enable RLS on telegram_link_tokens
ALTER TABLE public.telegram_link_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only read/insert their own tokens
DROP POLICY IF EXISTS "Users can manage own telegram link tokens" ON public.telegram_link_tokens;
CREATE POLICY "Users can manage own telegram link tokens"
  ON public.telegram_link_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access on telegram_link_tokens" ON public.telegram_link_tokens;
CREATE POLICY "Service role full access on telegram_link_tokens"
  ON public.telegram_link_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Upgraded init_notification_preferences with Telegram channel defaults
CREATE OR REPLACE FUNCTION public.init_notification_preferences(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create global settings if not exists
  INSERT INTO notification_settings (user_id, telegram_enabled)
  VALUES (p_user_id, true)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create default preferences for each category/channel
  INSERT INTO notification_preferences (user_id, category, channel, enabled, frequency)
  VALUES
    -- Posts
    (p_user_id, 'posts', 'push', true, 'instant'),
    (p_user_id, 'posts', 'email', true, 'daily'),
    (p_user_id, 'posts', 'telegram', true, 'instant'),
    (p_user_id, 'posts', 'sms', false, 'never'),
    -- Forum
    (p_user_id, 'forum', 'push', true, 'instant'),
    (p_user_id, 'forum', 'email', true, 'daily'),
    (p_user_id, 'forum', 'telegram', true, 'instant'),
    (p_user_id, 'forum', 'sms', false, 'never'),
    -- Challenges
    (p_user_id, 'challenges', 'push', true, 'instant'),
    (p_user_id, 'challenges', 'email', true, 'instant'),
    (p_user_id, 'challenges', 'telegram', true, 'instant'),
    (p_user_id, 'challenges', 'sms', false, 'never'),
    -- Comments
    (p_user_id, 'comments', 'push', true, 'instant'),
    (p_user_id, 'comments', 'email', true, 'hourly'),
    (p_user_id, 'comments', 'telegram', true, 'instant'),
    (p_user_id, 'comments', 'sms', false, 'never'),
    -- Chats
    (p_user_id, 'chats', 'push', true, 'instant'),
    (p_user_id, 'chats', 'email', false, 'never'),
    (p_user_id, 'chats', 'telegram', true, 'instant'),
    (p_user_id, 'chats', 'sms', false, 'never'),
    -- Social
    (p_user_id, 'social', 'push', true, 'instant'),
    (p_user_id, 'social', 'email', true, 'daily'),
    (p_user_id, 'social', 'telegram', true, 'instant'),
    (p_user_id, 'social', 'sms', false, 'never'),
    -- System
    (p_user_id, 'system', 'push', true, 'instant'),
    (p_user_id, 'system', 'email', true, 'instant'),
    (p_user_id, 'system', 'telegram', true, 'instant'),
    (p_user_id, 'system', 'sms', false, 'never'),
    -- Marketing
    (p_user_id, 'marketing', 'push', false, 'never'),
    (p_user_id, 'marketing', 'email', false, 'weekly'),
    (p_user_id, 'marketing', 'telegram', false, 'never'),
    (p_user_id, 'marketing', 'sms', false, 'never')
  ON CONFLICT (user_id, category, channel) DO NOTHING;
END;
$$;

-- 6. Upgraded get_notification_preferences with Telegram state
CREATE OR REPLACE FUNCTION public.get_notification_preferences(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_settings jsonb;
  v_preferences jsonb;
  v_profile RECORD;
BEGIN
  -- Initialize if needed
  PERFORM init_notification_preferences(p_user_id);

  -- Get profile info for telegram identity
  SELECT telegram_id, telegram_username INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  -- Get global settings
  SELECT jsonb_build_object(
    'push_enabled', push_enabled,
    'email_enabled', email_enabled,
    'sms_enabled', sms_enabled,
    'telegram_enabled', COALESCE(telegram_enabled, true),
    'telegram_linked', (v_profile.telegram_id IS NOT NULL),
    'telegram_id', v_profile.telegram_id,
    'telegram_username', v_profile.telegram_username,
    'phone_number', phone_number,
    'phone_verified', phone_verified,
    'quiet_hours', jsonb_build_object(
      'enabled', quiet_hours_enabled,
      'start', quiet_hours_start,
      'end', quiet_hours_end,
      'timezone', timezone
    ),
    'digest', jsonb_build_object(
      'daily_enabled', daily_digest_enabled,
      'daily_time', daily_digest_time,
      'weekly_enabled', weekly_digest_enabled,
      'weekly_day', weekly_digest_day
    ),
    'dnd', jsonb_build_object(
      'enabled', dnd_enabled,
      'until', dnd_until
    )
  ) INTO v_settings
  FROM notification_settings
  WHERE user_id = p_user_id;

  -- Get category preferences grouped by category
  SELECT jsonb_object_agg(
    category::text,
    channels
  ) INTO v_preferences
  FROM (
    SELECT
      category,
      jsonb_object_agg(
        channel::text,
        jsonb_build_object(
          'enabled', enabled,
          'frequency', frequency
        )
      ) as channels
    FROM notification_preferences
    WHERE user_id = p_user_id
    GROUP BY category
  ) grouped;

  RETURN jsonb_build_object(
    'settings', v_settings,
    'preferences', COALESCE(v_preferences, '{}'::jsonb)
  );
END;
$$;

-- 7. Upgraded update_notification_settings
CREATE OR REPLACE FUNCTION public.update_notification_settings(p_user_id uuid, p_settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Initialize if needed
  PERFORM init_notification_preferences(p_user_id);

  -- Update settings
  UPDATE notification_settings
  SET
    push_enabled = COALESCE((p_settings->>'push_enabled')::boolean, push_enabled),
    email_enabled = COALESCE((p_settings->>'email_enabled')::boolean, email_enabled),
    sms_enabled = COALESCE((p_settings->>'sms_enabled')::boolean, sms_enabled),
    telegram_enabled = COALESCE((p_settings->>'telegram_enabled')::boolean, telegram_enabled),
    phone_number = COALESCE(p_settings->>'phone_number', phone_number),
    quiet_hours_enabled = COALESCE((p_settings->'quiet_hours'->>'enabled')::boolean, quiet_hours_enabled),
    quiet_hours_start = COALESCE((p_settings->'quiet_hours'->>'start')::time, quiet_hours_start),
    quiet_hours_end = COALESCE((p_settings->'quiet_hours'->>'end')::time, quiet_hours_end),
    timezone = COALESCE(p_settings->'quiet_hours'->>'timezone', timezone),
    daily_digest_enabled = COALESCE((p_settings->'digest'->>'daily_enabled')::boolean, daily_digest_enabled),
    daily_digest_time = COALESCE((p_settings->'digest'->>'daily_time')::time, daily_digest_time),
    weekly_digest_enabled = COALESCE((p_settings->'digest'->>'weekly_enabled')::boolean, weekly_digest_enabled),
    weekly_digest_day = COALESCE((p_settings->'digest'->>'weekly_day')::int, weekly_digest_day),
    dnd_enabled = COALESCE((p_settings->'dnd'->>'enabled')::boolean, dnd_enabled),
    dnd_until = COALESCE((p_settings->'dnd'->>'until')::timestamptz, dnd_until),
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 8. Atomic Channel/Category Preference Updater
CREATE OR REPLACE FUNCTION public.update_notification_preference_channel(
  p_user_id uuid,
  p_category text,
  p_channel text,
  p_enabled boolean,
  p_frequency text DEFAULT 'instant'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id, category, channel, enabled, frequency, updated_at)
  VALUES (
    p_user_id,
    p_category::public.notification_category,
    p_channel::public.notification_channel,
    p_enabled,
    p_frequency::public.notification_frequency,
    now()
  )
  ON CONFLICT (user_id, category, channel) DO UPDATE
  SET enabled = p_enabled,
      frequency = COALESCE(p_frequency::public.notification_frequency, notification_preferences.frequency),
      updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 9. Function: Create a new Telegram link token for authenticated user
CREATE OR REPLACE FUNCTION public.create_telegram_link_token(
  p_ttl_minutes INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
  v_clean_ttl INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_clean_ttl := LEAST(GREATEST(p_ttl_minutes, 1), 60);
  v_expires_at := now() + (v_clean_ttl || ' minutes')::INTERVAL;
  
  -- High entropy random token (24 bytes hex = 48 chars)
  v_token := encode(gen_random_bytes(24), 'hex');

  -- Invalidate previous unused tokens for this user
  UPDATE public.telegram_link_tokens
  SET used_at = now()
  WHERE user_id = v_user_id AND used_at IS NULL;

  -- Insert new token
  INSERT INTO public.telegram_link_tokens (user_id, token, expires_at)
  VALUES (v_user_id, v_token, v_expires_at);

  RETURN jsonb_build_object(
    'token', v_token,
    'expires_at', v_expires_at,
    'ttl_minutes', v_clean_ttl
  );
END;
$$;

-- 10. Function: Claim a Telegram link token
CREATE OR REPLACE FUNCTION public.claim_telegram_link_token(
  p_token TEXT,
  p_telegram_id BIGINT,
  p_username TEXT DEFAULT NULL,
  p_first_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_token_record RECORD;
  v_profile RECORD;
  v_existing_profile_id UUID;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token is required');
  END IF;

  IF p_telegram_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Telegram ID is required');
  END IF;

  -- Find valid, non-expired, unused token
  SELECT * INTO v_token_record
  FROM public.telegram_link_tokens
  WHERE token = trim(p_token)
    AND used_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired link token');
  END IF;

  -- Check if this Telegram ID is already linked to another profile
  SELECT id INTO v_existing_profile_id
  FROM public.profiles
  WHERE telegram_id = p_telegram_id AND id <> v_token_record.user_id;

  IF FOUND THEN
    UPDATE public.profiles
    SET telegram_id = NULL, telegram_username = NULL
    WHERE id = v_existing_profile_id;
  END IF;

  -- Update target profile: bind Telegram ID, mark verified
  UPDATE public.profiles
  SET telegram_id = p_telegram_id,
      telegram_username = COALESCE(p_username, telegram_username),
      first_name = COALESCE(first_name, p_first_name),
      email_verified = true,
      verification_attempts = 0,
      verification_locked_until = NULL,
      updated_at = now()
  WHERE id = v_token_record.user_id
  RETURNING * INTO v_profile;

  -- Mark token as used
  UPDATE public.telegram_link_tokens
  SET used_at = now()
  WHERE id = v_token_record.id;

  -- Ensure telegram notification channel & global settings are enabled
  UPDATE public.notification_settings
  SET telegram_enabled = true, updated_at = now()
  WHERE user_id = v_token_record.user_id;

  INSERT INTO public.notification_preferences (user_id, category, channel, enabled, frequency)
  SELECT v_token_record.user_id, cat::public.notification_category, 'telegram'::public.notification_channel, true, 'instant'
  FROM unnest(enum_range(NULL::public.notification_category)) AS cat
  ON CONFLICT (user_id, category, channel) DO UPDATE
  SET enabled = true, updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_profile.id,
    'email', v_profile.email,
    'first_name', v_profile.first_name,
    'telegram_id', v_profile.telegram_id,
    'telegram_username', v_profile.telegram_username
  );
END;
$$;

-- 11. Function: Unlink Telegram Account
CREATE OR REPLACE FUNCTION public.unlink_telegram_account(
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_target_id UUID;
  v_old_telegram_id BIGINT;
BEGIN
  v_target_id := COALESCE(p_user_id, auth.uid());
  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_id IS NOT NULL AND p_user_id <> auth.uid() THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  END IF;

  SELECT telegram_id INTO v_old_telegram_id
  FROM public.profiles
  WHERE id = v_target_id;

  -- Disconnect Telegram
  UPDATE public.profiles
  SET telegram_id = NULL,
      telegram_username = NULL,
      updated_at = now()
  WHERE id = v_target_id;

  -- Disable telegram channel in preferences and settings
  UPDATE public.notification_settings
  SET telegram_enabled = false, updated_at = now()
  WHERE user_id = v_target_id;

  UPDATE public.notification_preferences
  SET enabled = false, updated_at = now()
  WHERE user_id = v_target_id AND channel = 'telegram'::public.notification_channel;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_target_id,
    'unlinked_telegram_id', v_old_telegram_id
  );
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.get_notification_preferences(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_notification_settings(UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_notification_preference_channel(UUID, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_telegram_link_token(INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_telegram_link_token(TEXT, BIGINT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.unlink_telegram_account(UUID) TO authenticated, service_role;

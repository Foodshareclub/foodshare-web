-- Database Functions for Edge Functions
-- Run these in your Supabase SQL editor

-- ============================================================================
-- Telegram User Activity Upsert Function
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_user_activity(
  p_user_id BIGINT,
  p_username TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_date DATE,
  p_message_count INT DEFAULT 1,
  p_characters INT DEFAULT 0,
  p_media_count INT DEFAULT 0,
  p_reply_count INT DEFAULT 0,
  p_emoji_usage JSONB DEFAULT '{}'::jsonb,
  p_word_usage JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO telegram_user_activity (
    user_id,
    username,
    first_name,
    last_name,
    message_count,
    first_message_date,
    last_message_date,
    total_characters,
    media_count,
    reply_count,
    active_days,
    emoji_usage,
    most_used_words
  )
  VALUES (
    p_user_id,
    p_username,
    p_first_name,
    p_last_name,
    p_message_count,
    p_date,
    p_date,
    p_characters,
    p_media_count,
    p_reply_count,
    ARRAY[p_date::TEXT],
    p_emoji_usage,
    p_word_usage
  )
  ON CONFLICT (user_id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, telegram_user_activity.username),
    first_name = COALESCE(EXCLUDED.first_name, telegram_user_activity.first_name),
    last_name = COALESCE(EXCLUDED.last_name, telegram_user_activity.last_name),
    message_count = telegram_user_activity.message_count + EXCLUDED.message_count,
    last_message_date = GREATEST(telegram_user_activity.last_message_date, EXCLUDED.last_message_date),
    total_characters = telegram_user_activity.total_characters + EXCLUDED.total_characters,
    media_count = telegram_user_activity.media_count + EXCLUDED.media_count,
    reply_count = telegram_user_activity.reply_count + EXCLUDED.reply_count,
    active_days = array_append(
      telegram_user_activity.active_days,
      p_date::TEXT
    ),
    emoji_usage = telegram_user_activity.emoji_usage || EXCLUDED.emoji_usage,
    most_used_words = telegram_user_activity.most_used_words || EXCLUDED.most_used_words;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Email Provider Health Function (if not exists)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_healthiest_provider(
  p_email_type TEXT
)
RETURNS TABLE (
  provider TEXT,
  health_score INT,
  quota_remaining INT,
  recommendation_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.provider,
    h.health_score,
    COALESCE(q.daily_limit - q.emails_sent, 0) AS quota_remaining,
    CASE
      WHEN h.health_score >= 90 THEN 'Excellent health and availability'
      WHEN h.health_score >= 70 THEN 'Good health and availability'
      WHEN h.health_score >= 50 THEN 'Moderate health, monitoring recommended'
      ELSE 'Poor health, use with caution'
    END AS recommendation_reason
  FROM email_provider_health_metrics h
  LEFT JOIN email_provider_quota q ON h.provider = q.provider
    AND q.date = CURRENT_DATE
  WHERE h.health_score > 0
    AND COALESCE(q.daily_limit - q.emails_sent, 0) > 0
  ORDER BY h.health_score DESC, quota_remaining DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Telegram user activity
CREATE INDEX IF NOT EXISTS idx_telegram_user_activity_user_id 
  ON telegram_user_activity(user_id);

CREATE INDEX IF NOT EXISTS idx_telegram_user_activity_last_message 
  ON telegram_user_activity(last_message_date DESC);

-- Email provider quota
CREATE INDEX IF NOT EXISTS idx_email_provider_quota_date 
  ON email_provider_quota(date DESC);

CREATE INDEX IF NOT EXISTS idx_email_provider_quota_provider 
  ON email_provider_quota(provider);

-- Email provider health
CREATE INDEX IF NOT EXISTS idx_email_provider_health_score 
  ON email_provider_health_metrics(health_score DESC);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION upsert_user_activity IS 
  'Efficiently upsert telegram user activity with atomic operations';

COMMENT ON FUNCTION get_healthiest_provider IS 
  'Select the healthiest email provider with available quota';

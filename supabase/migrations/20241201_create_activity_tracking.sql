-- Create telegram_user_activity table if it doesn't exist
CREATE TABLE IF NOT EXISTS telegram_user_activity (
  user_id BIGINT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  message_count INTEGER DEFAULT 0,
  first_message_date DATE,
  last_message_date DATE,
  total_characters INTEGER DEFAULT 0,
  media_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  active_days TEXT[] DEFAULT '{}',
  emoji_usage JSONB DEFAULT '{}',
  most_used_words JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create or replace the record_activity function
CREATE OR REPLACE FUNCTION record_activity(
  p_user_id BIGINT,
  p_username TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_date DATE,
  p_message_count INTEGER,
  p_characters INTEGER,
  p_media_count INTEGER,
  p_reply_count INTEGER,
  p_emoji_usage JSONB,
  p_word_usage JSONB
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
    most_used_words,
    updated_at
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
    p_word_usage,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    username = COALESCE(p_username, telegram_user_activity.username),
    first_name = COALESCE(p_first_name, telegram_user_activity.first_name),
    last_name = COALESCE(p_last_name, telegram_user_activity.last_name),
    message_count = telegram_user_activity.message_count + p_message_count,
    last_message_date = p_date,
    total_characters = telegram_user_activity.total_characters + p_characters,
    media_count = telegram_user_activity.media_count + p_media_count,
    reply_count = telegram_user_activity.reply_count + p_reply_count,
    active_days = CASE
      WHEN p_date::TEXT = ANY(telegram_user_activity.active_days) THEN telegram_user_activity.active_days
      ELSE array_append(telegram_user_activity.active_days, p_date::TEXT)
    END,
    emoji_usage = telegram_user_activity.emoji_usage || p_emoji_usage,
    most_used_words = telegram_user_activity.most_used_words || p_word_usage,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_telegram_user_activity_user_id ON telegram_user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_user_activity_message_count ON telegram_user_activity(message_count DESC);

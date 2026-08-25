-- Create the table to track group messages that need deletion
CREATE TABLE IF NOT EXISTS public.group_message_deletions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id BIGINT NOT NULL,
    message_id BIGINT NOT NULL,
    delete_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Service Role only needs access)
ALTER TABLE public.group_message_deletions ENABLE ROW LEVEL SECURITY;

-- Index for efficient polling (no CONCURRENTLY needed: new empty table, runs inside migration transaction)
CREATE INDEX IF NOT EXISTS idx_group_message_deletions_delete_at 
ON public.group_message_deletions (delete_at);

-- Schedule the cron job to call the edge function every minute
SELECT cron.schedule('telegram-message-cleanup', '* * * * *', $$
  SELECT net.http_post(
    url := 'http://kong:8000/functions/v1/telegram-bot-foodshare/_internal/delete-messages',
    headers := '{"Content-Type": "application/json", "x-supabase-cron": "true"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  ) AS request_id;
$$);

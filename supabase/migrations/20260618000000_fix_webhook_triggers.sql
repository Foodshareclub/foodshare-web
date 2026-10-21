-- Fix: Make webhook triggers for notifications more robust using Supabase native webhooks.
-- 
-- Changes:
-- 1. Replace manual pg_net functions with native supabase_functions.http_request.
-- 2. Drop the redundant trigger_notify_new_post function and trigger.
-- 3. Add conditions to the triggers directly where applicable (e.g., WHEN NEW.is_active = true).

-- Drop custom trigger functions
DROP TRIGGER IF EXISTS on_new_user_notify ON public.profiles;
DROP FUNCTION IF EXISTS public.notify_new_user() CASCADE;

DROP TRIGGER IF EXISTS on_new_post_notify ON public.posts;
DROP FUNCTION IF EXISTS public.notify_new_post() CASCADE;

DROP TRIGGER IF EXISTS on_post_report_created ON public.post_reports;
DROP TRIGGER IF EXISTS on_report_created ON public.reports;
DROP TRIGGER IF EXISTS on_forum_report_created ON public.forum_reports;
DROP FUNCTION IF EXISTS public.notify_new_report() CASCADE;

DROP TRIGGER IF EXISTS forum_post_telegram_notification ON public.forum;
DROP FUNCTION IF EXISTS public.notify_forum_post_telegram() CASCADE;

-- Drop duplicate workaround
DROP TRIGGER IF EXISTS trigger_notify_new_post_on_insert ON public.posts;
DROP FUNCTION IF EXISTS public.trigger_notify_new_post() CASCADE;

-- Recreate triggers using supabase_functions.http_request

CREATE TRIGGER "on_new_user_notify" 
AFTER INSERT ON public.profiles 
FOR EACH ROW 
EXECUTE FUNCTION supabase_functions.http_request(
  'http://kong:8000/functions/v1/api-v1-notifications/trigger/new-user', 
  'POST', 
  '{"Content-type":"application/json"}', 
  '{}', 
  '1000'
);

CREATE TRIGGER "on_new_post_notify" 
AFTER INSERT ON public.posts 
FOR EACH ROW 
WHEN (NEW.is_active = true)
EXECUTE FUNCTION supabase_functions.http_request(
  'http://kong:8000/functions/v1/api-v1-notifications/trigger/new-post', 
  'POST', 
  '{"Content-type":"application/json"}', 
  '{}', 
  '1000'
);

CREATE TRIGGER "on_post_report_created" 
AFTER INSERT ON public.post_reports 
FOR EACH ROW 
EXECUTE FUNCTION supabase_functions.http_request(
  'http://kong:8000/functions/v1/api-v1-notifications/trigger/new-report', 
  'POST', 
  '{"Content-type":"application/json"}', 
  '{}', 
  '1000'
);

CREATE TRIGGER "on_report_created" 
AFTER INSERT ON public.reports 
FOR EACH ROW 
EXECUTE FUNCTION supabase_functions.http_request(
  'http://kong:8000/functions/v1/api-v1-notifications/trigger/new-report', 
  'POST', 
  '{"Content-type":"application/json"}', 
  '{}', 
  '1000'
);

CREATE TRIGGER "on_forum_report_created" 
AFTER INSERT ON public.forum_reports 
FOR EACH ROW 
EXECUTE FUNCTION supabase_functions.http_request(
  'http://kong:8000/functions/v1/api-v1-notifications/trigger/new-report', 
  'POST', 
  '{"Content-type":"application/json"}', 
  '{}', 
  '1000'
);

CREATE TRIGGER "forum_post_telegram_notification" 
AFTER INSERT ON public.forum 
FOR EACH ROW 
WHEN (NEW.forum_published = true)
EXECUTE FUNCTION supabase_functions.http_request(
  'http://kong:8000/functions/v1/api-v1-notifications/trigger/forum-post', 
  'POST', 
  '{"Content-type":"application/json"}', 
  '{}', 
  '1000'
);

-- Migration: Notify Telegram admins when user email verification succeeds
-- 
-- Triggers an HTTP request to api-v1-notifications/trigger/user-verified
-- whenever email_verified changes from false to true on public.profiles.

DROP TRIGGER IF EXISTS on_user_verified_notify ON public.profiles;

CREATE TRIGGER "on_user_verified_notify" 
AFTER UPDATE OF email_verified ON public.profiles 
FOR EACH ROW 
WHEN (OLD.email_verified = false AND NEW.email_verified = true)
EXECUTE FUNCTION supabase_functions.http_request(
  'http://kong:8000/functions/v1/api-v1-notifications/trigger/user-verified', 
  'POST', 
  '{"Content-type":"application/json"}', 
  '{}', 
  '1000'
);

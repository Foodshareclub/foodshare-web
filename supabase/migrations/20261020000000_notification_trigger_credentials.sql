-- Fix: database webhook triggers must authenticate to the notification API.
--
-- The triggers created by 20260618000000_fix_webhook_triggers.sql call
-- supabase_functions.http_request with no credentials at all — only a
-- content-type header. api-v1-notifications runs those routes in service-auth
-- mode, which accepts a request only when it carries the service-role key or
-- the internal service secret, so every one of those requests was answered
-- with 401 "Missing Authorization or API key header" and no notification was
-- ever delivered. The old trigger functions sent `Authorization: Bearer
-- <anon_key>`; that credential stopped being accepted when the anon key was
-- removed from service auth, and nothing replaced it.
--
-- The credential is read from the Vault at call time, never from this
-- migration, and the request goes out through pg_net exactly the way
-- public.trigger_email_provider_sync() does in the baseline.
--
-- The six affected routes: new-user, new-post, new-report (post_reports,
-- reports, forum_reports), forum-post, user-verified.

-- =============================================================================
-- Shared dispatcher
-- =============================================================================

CREATE OR REPLACE FUNCTION public.dispatch_notification_trigger(
    p_path text,
    p_record jsonb,
    p_type text,
    p_table text,
    p_schema text
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'net', 'vault'
AS $$
DECLARE
    v_secret text;
    v_request_id bigint;
BEGIN
    SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets
    WHERE name = 'INTERNAL_SERVICE_SECRET'
    LIMIT 1;

    IF v_secret IS NULL THEN
        RAISE WARNING
            'INTERNAL_SERVICE_SECRET is not readable in the Vault; notification trigger % not dispatched',
            p_path;
        RETURN NULL;
    END IF;

    SELECT net.http_post(
        url := 'http://kong:8000/functions/v1/api-v1-notifications/trigger/' || p_path,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_secret
        ),
        body := jsonb_build_object(
            'type', p_type,
            'table', p_table,
            'schema', p_schema,
            'record', p_record
        ),
        timeout_milliseconds := 10000
    ) INTO v_request_id;

    RETURN v_request_id;
END;
$$;

COMMENT ON FUNCTION public.dispatch_notification_trigger(text, jsonb, text, text, text) IS
    'Posts a database event to api-v1-notifications/trigger/<path> with the internal service secret.';

-- =============================================================================
-- Per-event trigger functions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public', 'net', 'vault'
AS $$
BEGIN
    PERFORM public.dispatch_notification_trigger(
        'new-user', to_jsonb(NEW), TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_post() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public', 'net', 'vault'
AS $$
BEGIN
    PERFORM public.dispatch_notification_trigger(
        'new-post', to_jsonb(NEW), TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_report() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public', 'net', 'vault'
AS $$
BEGIN
    PERFORM public.dispatch_notification_trigger(
        'new-report', to_jsonb(NEW), TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_forum_post_telegram() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public', 'net', 'vault'
AS $$
BEGIN
    PERFORM public.dispatch_notification_trigger(
        'forum-post', to_jsonb(NEW), TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_user_verified() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public', 'net', 'vault'
AS $$
BEGIN
    PERFORM public.dispatch_notification_trigger(
        'user-verified', to_jsonb(NEW), TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA
    );
    RETURN NEW;
END;
$$;

-- =============================================================================
-- Triggers
-- =============================================================================

DROP TRIGGER IF EXISTS on_new_user_notify ON public.profiles;
CREATE TRIGGER on_new_user_notify
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_new_user();

DROP TRIGGER IF EXISTS on_new_post_notify ON public.posts;
CREATE TRIGGER on_new_post_notify
AFTER INSERT ON public.posts
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION public.notify_new_post();

DROP TRIGGER IF EXISTS on_post_report_created ON public.post_reports;
CREATE TRIGGER on_post_report_created
AFTER INSERT ON public.post_reports
FOR EACH ROW EXECUTE FUNCTION public.notify_new_report();

DROP TRIGGER IF EXISTS on_report_created ON public.reports;
CREATE TRIGGER on_report_created
AFTER INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.notify_new_report();

DROP TRIGGER IF EXISTS on_forum_report_created ON public.forum_reports;
CREATE TRIGGER on_forum_report_created
AFTER INSERT ON public.forum_reports
FOR EACH ROW EXECUTE FUNCTION public.notify_new_report();

DROP TRIGGER IF EXISTS forum_post_telegram_notification ON public.forum;
CREATE TRIGGER forum_post_telegram_notification
AFTER INSERT ON public.forum
FOR EACH ROW
WHEN (NEW.forum_published = true)
EXECUTE FUNCTION public.notify_forum_post_telegram();

DROP TRIGGER IF EXISTS on_user_verified_notify ON public.profiles;
CREATE TRIGGER on_user_verified_notify
AFTER UPDATE OF email_verified ON public.profiles
FOR EACH ROW
WHEN (OLD.email_verified = false AND NEW.email_verified = true)
EXECUTE FUNCTION public.notify_user_verified();

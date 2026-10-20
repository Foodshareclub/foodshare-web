-- Close the remaining "readable by anyone with the anon key" policies, and bind
-- the two RPCs that accept a caller-supplied user id.
--
-- Same root cause as the profiles fix in the previous migration: the baseline
-- shipped several `USING (true)` SELECT policies, and 20260812225000 then granted
-- ALL on every table to `anon`. Whatever those policies name is public.
--
--   public.views                      per-user browsing history — who looked at
--                                     what, and when, for every view ever
--   public.telegram_user_activity     behavioural profile of every Telegram
--                                     user: name, most-used words, sentiment
--                                     score, topics, emoji usage, active hours
--   public.forum_post_history         previous title/description/image and the
--                                     edit reason for every forum post
--   public.forum_comment_history      the same for every comment
--
-- The two history tables are a moderation bypass rather than a privacy leak:
-- content a moderator required to be removed survives verbatim in the history
-- table and is retrievable forever with the public key.
--
-- Two SECURITY DEFINER functions also take the caller's word for whose data to
-- return:
--
--   log_audit_event(p_user_id uuid, …)      writes into audit_logs, whose only
--                                           reader is an admin. anon could
--                                           forge entries an admin would then
--                                           read as genuine — an integrity
--                                           break in the one table whose purpose
--                                           is to be trustworthy. It also
--                                           checks no caller at all, unlike its
--                                           sibling log_moderator_action, which
--                                           does.
--   get_user_post_activity_summary(p_user_id uuid, …)
--                                           returns any user's activity counts
--                                           and last-activity timestamps.
--
-- Wrapped rather than redefined: each is renamed to an *_internal twin that only
-- service_role can execute, and a thin wrapper re-exposes the original name
-- behind a caller check. Renaming avoids re-emitting the original body, so there
-- is no chance of a behavioural difference. The pattern is the one
-- 20260925010000/20260925020000 established for get_user_settings and
-- get_bff_messages_data.
--
-- The app is already correct on both counts: all seven `log_audit_event` call
-- sites in foodshare-web pass the caller's own id, and the web app always passes
-- its own id to get_user_post_activity_summary. So binding cannot break a
-- working path — it removes the ability to ask for someone else's.

BEGIN;

-- ── 1. views: your own browsing history ─────────────────────────────────────

DROP POLICY IF EXISTS "Enable read access for all users" ON public.views;

CREATE POLICY "Users can read own view history"
    ON public.views
    FOR SELECT
    TO authenticated
    USING (profile_id = (SELECT auth.uid()));

-- ── 2. telegram_user_activity ───────────────────────────────────────────────

DROP POLICY IF EXISTS "Enable read access for all users" ON public.telegram_user_activity;

CREATE POLICY "Users can read own telegram activity"
    ON public.telegram_user_activity
    FOR SELECT
    TO authenticated
    USING (profile_id = (SELECT auth.uid()));

-- ── 3. forum history: moderation surface, admin-only ───────────────────────

DROP POLICY IF EXISTS "Anyone can view post history" ON public.forum_post_history;

CREATE POLICY "Admins can read forum post history"
    ON public.forum_post_history
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view comment history" ON public.forum_comment_history;

CREATE POLICY "Admins can read forum comment history"
    ON public.forum_comment_history
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- ── 4. translation_analytics: internal operational data ────────────────────

-- Request counts, response times and cache-hit rates per locale, keyed to a
-- user id. Not a secret, but it is internal telemetry, and the admin
-- performance page reads it through the *browser* client — so the only thing
-- standing between it and any logged-in member is this policy.
DROP POLICY IF EXISTS "Analytics readable by authenticated users" ON public.translation_analytics;

CREATE POLICY "Admins can read translation analytics"
    ON public.translation_analytics
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- ── 5. log_audit_event: bind to the caller ─────────────────────────────────

ALTER FUNCTION public.log_audit_event(uuid, text, text, text, jsonb)
    RENAME TO log_audit_event_internal;
REVOKE ALL ON FUNCTION public.log_audit_event_internal(uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit_event_internal(uuid, text, text, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_user_id       uuid,
    p_action        text,
    p_resource_type text,
    p_resource_id   text,
    p_metadata      jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path TO ''
AS $$
DECLARE
    v_role   TEXT;
    v_caller UUID;
BEGIN
    v_role := COALESCE(current_setting('request.jwt.claim.role', true), '');
    v_caller := auth.uid();

    -- service_role writes audit entries on behalf of other actors (the edge
    -- functions log for the user they are acting for), so it is exempt. Every
    -- other role may only ever write its own.
    IF v_role <> 'service_role' THEN
        IF v_caller IS NULL THEN
            RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
        END IF;

        IF p_user_id IS DISTINCT FROM v_caller THEN
            RAISE EXCEPTION
                'log_audit_event: p_user_id must be the authenticated user' USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN public.log_audit_event_internal(
        p_user_id, p_action, p_resource_type, p_resource_id, COALESCE(p_metadata, '{}'::jsonb)
    );
END
$$;

GRANT EXECUTE ON FUNCTION public.log_audit_event(uuid, text, text, text, jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.log_audit_event(uuid, text, text, text, jsonb) IS
  'Appends to audit_logs. Wraps log_audit_event_internal behind a caller check: '
  'p_user_id must be auth.uid() for anyone who is not service_role. Before this, '
  'anon could append fabricated audit entries that an admin then read as genuine.';

-- ── 6. get_user_post_activity_summary: bind to the caller ───────────────────

ALTER FUNCTION public.get_user_post_activity_summary(uuid, integer)
    RENAME TO get_user_post_activity_summary_internal;
REVOKE ALL ON FUNCTION public.get_user_post_activity_summary_internal(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_post_activity_summary_internal(uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.get_user_post_activity_summary(
    p_user_id uuid,
    p_days    integer DEFAULT 30
) RETURNS TABLE(
    activity_type public.post_activity_type,
    count         bigint,
    last_activity timestamp with time zone
)
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path TO ''
AS $$
DECLARE
    v_role   TEXT;
    v_caller UUID;
BEGIN
    v_role := COALESCE(current_setting('request.jwt.claim.role', true), '');
    v_caller := auth.uid();

    IF v_role <> 'service_role' THEN
        IF v_caller IS NULL THEN
            RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
        END IF;

        -- Admins legitimately read another member's activity (the reports
        -- surface), so they are allowed to; everyone else is not.
        IF p_user_id IS DISTINCT FROM v_caller AND NOT public.is_admin() THEN
            RAISE EXCEPTION
                'get_user_post_activity_summary: not permitted to read another '
                'user''s activity' USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN QUERY
        SELECT * FROM public.get_user_post_activity_summary_internal(p_user_id, p_days);
END
$$;

GRANT EXECUTE ON FUNCTION public.get_user_post_activity_summary(uuid, integer) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_user_post_activity_summary(uuid, integer) IS
  'Per-activity-type counts for a member. Wraps the *_internal twin behind a '
  'caller check: own id only, unless the caller is an admin or service_role.';

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────
-- Verify the outcome
-- ----------------------------------------------------------------------
--
-- The property: no SELECT policy on these tables is reachable by anon, and
-- neither bound RPC can be called by anon at all. Read from the catalog, not
-- by policy name — a policy recreated with a friendly name and `USING (true)`
-- is the same hole.
DO $$
DECLARE
    leaked   text;
    callable text;
BEGIN
    SELECT string_agg(format('%s [%s]', tablename, policyname), E'\n  ')
      INTO leaked
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('views', 'telegram_user_activity', 'forum_post_history',
                         'forum_comment_history', 'translation_analytics')
       AND cmd IN ('SELECT', 'ALL')
       AND (roles IS NULL OR roles && ARRAY['anon']::name[]);

    IF leaked IS NOT NULL THEN
        RAISE EXCEPTION 'a SELECT policy is still reachable by anon:%', leaked;
    END IF;

    SELECT string_agg(p.proname, ', ')
      INTO callable
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('log_audit_event', 'log_audit_event_internal',
                         'get_user_post_activity_summary', 'get_user_post_activity_summary_internal')
       AND has_function_privilege('anon', p.oid, 'EXECUTE');

    IF callable IS NOT NULL THEN
        RAISE EXCEPTION 'anon can still EXECUTE: %', callable;
    END IF;
END
$$;

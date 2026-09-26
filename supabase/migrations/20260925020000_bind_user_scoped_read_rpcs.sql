-- Bind user-scoped read RPCs to the authenticated user.
--
-- 20260812200000 granted EXECUTE on every public function to anon and
-- authenticated, so these SECURITY DEFINER helpers accepted any caller's UUID
-- and returned that user's private rows:
--
--   get_user_settings(p_user_id uuid)
--   get_bff_messages_data(p_user_id uuid, ...)
--
-- The bodies are left untouched: each is renamed to an *_internal twin that
-- only service_role can execute, and a thin wrapper re-exposes the original
-- name, checking ownership first. Renaming avoids re-emitting the original
-- definitions, so there is no chance of a behavioural difference.
--
-- get_delta_sync is deliberately left alone: the only definition in this tree
-- takes (p_user_id uuid, p_tables text[]) while
-- api-v1-sync/lib/handlers/delta-sync.ts calls it with a p_checkpoints
-- argument. The deployed signature needs confirming before it is wrapped.
--
-- get_bff_messages_data has no caller in foodshare-web (chat reads through
-- lib/data/chat.ts) and get_user_settings has no caller in this tree, so
-- binding them cannot break an existing path. Mobile clients pass their own id.

BEGIN;

-- get_user_settings
ALTER FUNCTION public.get_user_settings(uuid) RENAME TO get_user_settings_internal;
REVOKE ALL ON FUNCTION public.get_user_settings_internal(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_settings_internal(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_user_settings(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
    v_caller_id UUID;
    v_role TEXT;
BEGIN
    v_role := COALESCE(current_setting('request.jwt.claim.role', true), '');
    v_caller_id := auth.uid();

    IF v_role <> 'service_role' THEN
        IF v_caller_id IS NULL THEN
            RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
        END IF;

        IF p_user_id IS DISTINCT FROM v_caller_id THEN
            RAISE EXCEPTION 'Not authorized to read this user''s settings' USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN public.get_user_settings_internal(p_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_settings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_settings(uuid) TO authenticated, service_role;

-- get_bff_messages_data
ALTER FUNCTION public.get_bff_messages_data(uuid, integer, timestamp with time zone, boolean)
    RENAME TO get_bff_messages_data_internal;
REVOKE ALL ON FUNCTION public.get_bff_messages_data_internal(uuid, integer, timestamp with time zone, boolean)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_bff_messages_data_internal(uuid, integer, timestamp with time zone, boolean)
    TO service_role;

CREATE OR REPLACE FUNCTION public.get_bff_messages_data(
    p_user_id uuid,
    p_limit integer DEFAULT 20,
    p_cursor timestamp with time zone DEFAULT NULL::timestamp with time zone,
    p_include_archived boolean DEFAULT false
) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
    v_caller_id UUID;
    v_role TEXT;
BEGIN
    v_role := COALESCE(current_setting('request.jwt.claim.role', true), '');
    v_caller_id := auth.uid();

    IF v_role <> 'service_role' THEN
        IF v_caller_id IS NULL THEN
            RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
        END IF;

        IF p_user_id IS DISTINCT FROM v_caller_id THEN
            RAISE EXCEPTION 'Not authorized to read this user''s messages' USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN public.get_bff_messages_data_internal(p_user_id, p_limit, p_cursor, p_include_archived);
END;
$$;

REVOKE ALL ON FUNCTION public.get_bff_messages_data(uuid, integer, timestamp with time zone, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_bff_messages_data(uuid, integer, timestamp with time zone, boolean)
    TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

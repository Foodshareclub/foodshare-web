-- Bind caller-supplied user/post ids to the authenticated user.
--
-- Three functions are SECURITY DEFINER and reachable with the public anon key
-- (20260812200000 granted ALL on all public functions), and each could be
-- driven with someone else's id:
--
--   update_user_location(user_id, lat, lng)
--       No authorization check at all. Any caller could rewrite the location
--       stored on any profile, which feeds "listings near you" matching.
--
--   deactivate_post(p_post_id) / cancel_arrangement(p_post_id)
--       Guarded by `v_caller_id != v_post.profile_id`, where v_caller_id is
--       auth.uid(). For an anonymous request auth.uid() is NULL, NULL <> uuid
--       evaluates to NULL, `IF NULL THEN` is false, so the guard never fired and
--       an anonymous caller could deactivate or cancel any listing.
--
-- Ownership is enforced with an explicit NULL check plus IS DISTINCT FROM, and
-- service_role stays unrestricted so Edge Functions keep working. Clients are
-- identified by the JWT role claim, so direct database access from the SQL
-- editor (no request context) is unaffected.
--
-- Only the authorization logic and the NULL-unsafe comparisons change; the
-- remaining body, return shapes and notification lists are reproduced as-is.
--
-- get_user_settings, get_delta_sync and get_bff_messages_data take a
-- caller-supplied user id and return that user's private rows. They are not
-- changed here because current callers pass their own id and the web client has
-- to be migrated first; they are the next item in this series.

BEGIN;

CREATE OR REPLACE FUNCTION public.update_user_location(user_id uuid, lat double precision, lng double precision) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
    v_caller_id UUID;
    v_role TEXT;
BEGIN
    v_role := COALESCE(current_setting('request.jwt.claim.role', true), '');
    v_caller_id := auth.uid();

    IF v_role IN ('anon', 'authenticated') THEN
        IF v_caller_id IS NULL THEN
            RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
        END IF;

        IF user_id IS DISTINCT FROM v_caller_id THEN
            RAISE EXCEPTION 'Not authorized to update this user''s location' USING ERRCODE = '42501';
        END IF;
    END IF;

    UPDATE profiles
    SET
        location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.deactivate_post(p_post_id integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
    v_post RECORD;
    v_caller_id UUID;
    v_role TEXT;
BEGIN
    v_role := COALESCE(current_setting('request.jwt.claim.role', true), '');
    v_caller_id := auth.uid();

    SELECT * INTO v_post FROM public.posts WHERE id = p_post_id;

    IF v_post IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', jsonb_build_object('code', 'RESOURCE_NOT_FOUND', 'message', 'Post not found'));
    END IF;

    IF v_role <> 'service_role' THEN
        IF v_caller_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', jsonb_build_object('code', 'AUTH_REQUIRED', 'message', 'Authentication required'));
        END IF;

        IF v_caller_id IS DISTINCT FROM v_post.profile_id AND v_caller_id IS DISTINCT FROM v_post.post_arranged_to THEN
            RETURN jsonb_build_object('success', false, 'error', jsonb_build_object('code', 'AUTH_FORBIDDEN', 'message', 'Only the owner or arranged user can deactivate'));
        END IF;
    END IF;

    UPDATE public.posts SET is_active = false, updated_at = now() WHERE id = p_post_id;

    INSERT INTO public.post_activity_logs (post_id, actor_id, activity_type, metadata)
    VALUES (p_post_id, v_caller_id, 'deactivated', jsonb_build_object('deactivated_by', v_caller_id, 'was_arranged', v_post.is_arranged, 'deactivated_at', now()));

    RETURN jsonb_build_object('success', true, 'error', NULL, 'postId', p_post_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_arrangement(p_post_id integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
    v_post RECORD;
    v_caller_id UUID;
    v_role TEXT;
    v_notify_users UUID[];
BEGIN
    v_role := COALESCE(current_setting('request.jwt.claim.role', true), '');
    v_caller_id := auth.uid();

    SELECT * INTO v_post FROM public.posts WHERE id = p_post_id FOR UPDATE;

    IF v_post IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', jsonb_build_object('code', 'RESOURCE_NOT_FOUND', 'message', 'Post not found'), 'notifyUserIds', NULL);
    END IF;

    IF NOT v_post.is_arranged THEN
        RETURN jsonb_build_object('success', false, 'error', jsonb_build_object('code', 'RESOURCE_CONFLICT', 'message', 'This post is not currently arranged'), 'notifyUserIds', NULL);
    END IF;

    IF v_role <> 'service_role' THEN
        IF v_caller_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', jsonb_build_object('code', 'AUTH_REQUIRED', 'message', 'Authentication required'), 'notifyUserIds', NULL);
        END IF;

        IF v_caller_id IS DISTINCT FROM v_post.profile_id AND v_caller_id IS DISTINCT FROM v_post.post_arranged_to THEN
            RETURN jsonb_build_object('success', false, 'error', jsonb_build_object('code', 'AUTH_FORBIDDEN', 'message', 'Only the owner or arranged user can cancel'), 'notifyUserIds', NULL);
        END IF;
    END IF;

    v_notify_users := ARRAY[]::UUID[];
    IF v_post.profile_id IS DISTINCT FROM v_caller_id THEN v_notify_users := array_append(v_notify_users, v_post.profile_id); END IF;
    IF v_post.post_arranged_to IS NOT NULL AND v_post.post_arranged_to IS DISTINCT FROM v_caller_id THEN v_notify_users := array_append(v_notify_users, v_post.post_arranged_to); END IF;

    INSERT INTO public.post_activity_logs (post_id, actor_id, activity_type, metadata)
    VALUES (p_post_id, v_caller_id, 'arrangement_cancelled', jsonb_build_object('cancelled_by', v_caller_id, 'previous_sharer', v_post.profile_id, 'previous_requester', v_post.post_arranged_to, 'cancelled_at', now()));

    UPDATE public.posts SET is_arranged = false, post_arranged_to = NULL, post_arranged_at = NULL, updated_at = now() WHERE id = p_post_id;

    RETURN jsonb_build_object('success', true, 'error', NULL, 'postId', p_post_id, 'postName', v_post.post_name, 'notifyUserIds', v_notify_users);
END;
$$;

COMMIT;

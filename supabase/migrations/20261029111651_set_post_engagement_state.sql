-- Desired-state writes are safe to repeat after a lost response. Share the
-- advisory lock namespace with legacy toggles so both APIs serialize together.
CREATE SCHEMA engagement_private;
REVOKE ALL ON SCHEMA engagement_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA engagement_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION engagement_private.set_post_engagement(
  p_post_id bigint, p_user_id uuid, p_kind text, p_active boolean
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE total bigint; affected bigint;
BEGIN
  IF p_user_id IS NULL OR (p_user_id IS DISTINCT FROM auth.uid()
      AND COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') <> 'service_role') THEN
    RAISE EXCEPTION 'Engagement identity is not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_post_id IS NULL OR p_post_id < 1 OR p_kind IS NULL
      OR p_kind NOT IN ('like', 'bookmark') OR p_active IS NULL THEN
    RAISE EXCEPTION 'Invalid post engagement request' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'foodshare:post-engagement:' || p_kind || ':' || p_user_id::text || ':' || p_post_id::text, 0));
  PERFORM 1 FROM public.posts p WHERE p.id = p_post_id
    AND (p.is_active OR p.profile_id = p_user_id) FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post is not available' USING ERRCODE = '42501';
  END IF;
  IF p_kind = 'like' THEN
    IF p_active THEN
      INSERT INTO public.likes (post_id, profile_id, forum_id, challenge_id, comment_id)
        VALUES (p_post_id, p_user_id, 0, 0, 0) ON CONFLICT DO NOTHING;
    ELSE
      DELETE FROM public.likes WHERE post_id = p_post_id AND profile_id = p_user_id
        AND forum_id = 0 AND challenge_id = 0 AND comment_id = 0;
    END IF;
    GET DIAGNOSTICS affected = ROW_COUNT;
    SELECT count(*) INTO total FROM public.likes WHERE post_id = p_post_id
      AND forum_id = 0 AND challenge_id = 0 AND comment_id = 0;
    UPDATE public.posts SET post_like_counter = total
      WHERE id = p_post_id AND post_like_counter IS DISTINCT FROM total;
  ELSE
    IF p_active THEN
      INSERT INTO public.bookmarks (post_id, profile_id, forum_id)
        VALUES (p_post_id, p_user_id, 0) ON CONFLICT DO NOTHING;
    ELSE
      DELETE FROM public.bookmarks WHERE post_id = p_post_id AND profile_id = p_user_id AND forum_id = 0;
    END IF;
    GET DIAGNOSTICS affected = ROW_COUNT;
    SELECT count(*) INTO total FROM public.likes WHERE post_id = p_post_id
      AND forum_id = 0 AND challenge_id = 0 AND comment_id = 0;
  END IF;
  RETURN jsonb_build_object('active', p_active, 'likeCount', total, 'changed', affected > 0);
END;
$$;
REVOKE ALL ON FUNCTION engagement_private.set_post_engagement(bigint, uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION engagement_private.set_post_engagement(bigint, uuid, text, boolean) TO authenticated, service_role;

-- Expose only an invoker wrapper. The privileged implementation is outside
-- the Data API's exposed schemas and still enforces caller identity itself.
CREATE OR REPLACE FUNCTION public.set_post_engagement(
  p_post_id bigint, p_user_id uuid, p_kind text, p_active boolean
) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT engagement_private.set_post_engagement(p_post_id, p_user_id, p_kind, p_active);
$$;
REVOKE ALL ON FUNCTION public.set_post_engagement(bigint, uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_post_engagement(bigint, uuid, text, boolean) TO authenticated, service_role;

-- Post engagement uses the consolidated tables, not the retired post_* tables.
-- Narrow RPCs enforce caller identity and post visibility explicitly. No new
-- base-table grants expose private columns or bypass owner checks at the API.
CREATE OR REPLACE FUNCTION public.toggle_post_engagement(
  p_post_id bigint, p_user_id uuid, p_kind text
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE active boolean; total bigint;
BEGIN
  IF p_user_id IS NULL OR (p_user_id IS DISTINCT FROM auth.uid()
      AND COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') <> 'service_role') THEN
    RAISE EXCEPTION 'Engagement identity is not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_post_id IS NULL OR p_post_id < 1 OR p_kind IS NULL OR p_kind NOT IN ('like', 'bookmark') THEN
    RAISE EXCEPTION 'Invalid post engagement request' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.posts p WHERE p.id = p_post_id
      AND (p.is_active OR p.profile_id = p_user_id)) THEN
    RAISE EXCEPTION 'Post is not available' USING ERRCODE = '42501';
  END IF;
  -- Serialize the same account/entity/kind, including the first insert when
  -- no row exists to lock. Different users and engagement kinds are independent.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'foodshare:post-engagement:' || p_kind || ':' || p_user_id::text || ':' || p_post_id::text, 0));
  IF p_kind = 'like' THEN
    -- All post-like writers through this RPC serialize the counter with the
    -- row mutation, including different accounts liking the same post.
    PERFORM 1 FROM public.posts p WHERE p.id = p_post_id
      AND (p.is_active OR p.profile_id = p_user_id) FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Post is not available' USING ERRCODE = '42501';
    END IF;
    DELETE FROM public.likes WHERE post_id = p_post_id AND profile_id = p_user_id
      AND forum_id = 0 AND challenge_id = 0 AND comment_id = 0;
    IF FOUND THEN active := false;
    ELSE
      INSERT INTO public.likes (post_id, profile_id, forum_id, challenge_id, comment_id)
        VALUES (p_post_id, p_user_id, 0, 0, 0);
      active := true;
    END IF;
    SELECT count(*) INTO total FROM public.likes WHERE post_id = p_post_id
      AND forum_id = 0 AND challenge_id = 0 AND comment_id = 0;
    UPDATE public.posts SET post_like_counter = total
      WHERE id = p_post_id AND post_like_counter IS DISTINCT FROM total;
  ELSE
    DELETE FROM public.bookmarks WHERE post_id = p_post_id AND profile_id = p_user_id AND forum_id = 0;
    IF FOUND THEN active := false;
    ELSE
      INSERT INTO public.bookmarks (post_id, profile_id, forum_id) VALUES (p_post_id, p_user_id, 0);
      active := true;
    END IF;
  END IF;
  RETURN jsonb_build_object('active', active, 'likeCount',
    (SELECT count(*) FROM public.likes WHERE post_id = p_post_id
      AND forum_id = 0 AND challenge_id = 0 AND comment_id = 0));
END;
$$;
REVOKE ALL ON FUNCTION public.toggle_post_engagement(bigint, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_post_engagement(bigint, uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_batch_engagement(p_post_ids bigint[], p_user_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE result jsonb; v_post_id bigint; visible boolean; liked boolean; bookmarked boolean; total bigint;
BEGIN
  IF p_post_ids IS NULL OR cardinality(p_post_ids) NOT BETWEEN 1 AND 100
      OR EXISTS (SELECT 1 FROM unnest(p_post_ids) id WHERE id IS NULL OR id < 1) THEN
    RAISE EXCEPTION 'Invalid post IDs' USING ERRCODE = '22023';
  END IF;
  IF p_user_id IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid()
      AND COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'Engagement identity is not authorized' USING ERRCODE = '42501';
  END IF;
  result := '{}'::jsonb;
  FOR v_post_id IN SELECT DISTINCT unnest(p_post_ids) LOOP
    SELECT EXISTS (SELECT 1 FROM public.posts p WHERE p.id = v_post_id
      AND (p.is_active OR p.profile_id = p_user_id)) INTO visible;
    total := 0; liked := false; bookmarked := false;
    IF visible THEN
      SELECT count(*) INTO total FROM public.likes l WHERE l.post_id = v_post_id
        AND l.forum_id = 0 AND l.challenge_id = 0 AND l.comment_id = 0;
      IF p_user_id IS NOT NULL THEN
        SELECT EXISTS (SELECT 1 FROM public.likes l WHERE l.post_id = v_post_id AND l.profile_id = p_user_id
          AND l.forum_id = 0 AND l.challenge_id = 0 AND l.comment_id = 0) INTO liked;
        SELECT EXISTS (SELECT 1 FROM public.bookmarks b WHERE b.post_id = v_post_id
          AND b.profile_id = p_user_id AND b.forum_id = 0) INTO bookmarked;
      END IF;
    END IF;
    result := result || jsonb_build_object(v_post_id::text,
      jsonb_build_object('likeCount', total, 'isLiked', liked, 'isBookmarked', bookmarked));
  END LOOP;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_batch_engagement(bigint[], uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_batch_engagement(bigint[], uuid) TO anon, authenticated, service_role;

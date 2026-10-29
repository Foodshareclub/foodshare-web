-- Repair stale RPC references after bookmark and notification consolidation.
-- CREATE OR REPLACE preserves the function signature, owner and grants.
CREATE OR REPLACE FUNCTION public.get_forum_feed_data(p_user_id uuid DEFAULT NULL::uuid, p_category_id integer DEFAULT NULL::integer, p_post_type text DEFAULT NULL::text, p_sort_by text DEFAULT 'recent'::text, p_page_limit integer DEFAULT 20, p_page_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
  v_posts JSONB;
  v_categories JSONB;
  v_featured JSONB;
  v_user_stats JSONB;
BEGIN
  -- A caller may request only its own bookmark/notification state. Trusted
  -- service-role callers supply the verified identity from the API handler.
  IF p_user_id IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid()
     AND COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'Cannot request another users forum state' USING ERRCODE = '42501';
  END IF;
  -- Get forum posts with author info and engagement
  WITH post_data AS (
    SELECT 
      f.id,
      f.forum_post_name,
      f.forum_post_description,
      f.forum_post_image,
      f.forum_comments_counter,
      f.forum_likes_counter,
      f.views_count,
      f.post_type,
      f.is_pinned,
      f.is_locked,
      f.is_featured,
      f.slug,
      f.category_id,
      f.reactions_count,
      f.forum_post_created_at,
      f.last_activity_at,
      p.id AS author_id,
      COALESCE(p.nickname, p.first_name, 'User') AS author_name,
      p.avatar_url AS author_avatar,
      p.is_verified AS author_verified,
      fc.name AS category_name,
      fc.color AS category_color,
      CASE WHEN p_user_id IS NOT NULL THEN
        EXISTS(SELECT 1 FROM forum_reactions fr WHERE fr.forum_id = f.id AND fr.profile_id = p_user_id)
      ELSE FALSE END AS user_has_reacted,
      CASE WHEN p_user_id IS NOT NULL THEN
        EXISTS(SELECT 1 FROM public.bookmarks fb WHERE fb.forum_id = f.id AND fb.profile_id = p_user_id)
      ELSE FALSE END AS user_has_bookmarked
    FROM forum f
    JOIN profiles p ON f.profile_id = p.id
    LEFT JOIN forum_categories fc ON f.category_id = fc.id
    WHERE f.forum_published = TRUE
      AND (p_category_id IS NULL OR f.category_id = p_category_id)
      AND (p_post_type IS NULL OR f.post_type = p_post_type)
    ORDER BY 
      f.is_pinned DESC,
      CASE p_sort_by
        WHEN 'recent' THEN f.forum_post_created_at
        WHEN 'activity' THEN f.last_activity_at
        WHEN 'popular' THEN f.forum_post_created_at
      END DESC,
      CASE WHEN p_sort_by = 'popular' THEN COALESCE(f.hot_score, 0) ELSE 0 END DESC
    LIMIT p_page_limit
    OFFSET p_page_offset
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'title', forum_post_name,
      'description', forum_post_description,
      'image', forum_post_image,
      'commentsCount', COALESCE(forum_comments_counter, 0),
      'likesCount', forum_likes_counter,
      'viewsCount', COALESCE(views_count, 0),
      'postType', post_type,
      'isPinned', COALESCE(is_pinned, FALSE),
      'isLocked', COALESCE(is_locked, FALSE),
      'isFeatured', COALESCE(is_featured, FALSE),
      'slug', slug,
      'categoryId', category_id,
      'categoryName', category_name,
      'categoryColor', category_color,
      'reactions', COALESCE(reactions_count, '{}'::jsonb),
      'createdAt', forum_post_created_at,
      'lastActivityAt', last_activity_at,
      'author', jsonb_build_object(
        'id', author_id,
        'name', author_name,
        'avatar', author_avatar,
        'isVerified', COALESCE(author_verified, FALSE)
      ),
      'userInteraction', jsonb_build_object(
        'hasReacted', user_has_reacted,
        'hasBookmarked', user_has_bookmarked
      )
    )
  ), '[]'::jsonb) INTO v_posts FROM post_data;

  -- Get categories with post counts (using icon_name instead of icon)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', fc.id,
      'name', fc.name,
      'description', fc.description,
      'color', fc.color,
      'icon', fc.icon_name,
      'slug', fc.slug,
      'postCount', COALESCE(fc.posts_count, 0)
    ) ORDER BY fc.sort_order
  ), '[]'::jsonb) INTO v_categories
  FROM forum_categories fc
  WHERE fc.is_active = TRUE;

  -- Get featured posts
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', f.id,
      'title', f.forum_post_name,
      'image', f.forum_post_image,
      'slug', f.slug,
      'authorName', COALESCE(p.nickname, p.first_name, 'User'),
      'featuredAt', f.featured_at
    ) ORDER BY f.featured_at DESC
  ), '[]'::jsonb) INTO v_featured
  FROM forum f
  JOIN profiles p ON f.profile_id = p.id
  WHERE f.is_featured = TRUE 
    AND f.forum_published = TRUE
    AND (f.featured_until IS NULL OR f.featured_until > NOW())
  LIMIT 5;

  -- Get user stats if logged in
  IF p_user_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'postsCount', (SELECT COUNT(*) FROM forum WHERE profile_id = p_user_id),
      'commentsCount', (SELECT COUNT(*) FROM comments WHERE user_id = p_user_id),
      'bookmarksCount', (SELECT COUNT(*) FROM public.bookmarks WHERE profile_id = p_user_id AND forum_id > 0),
      'unreadNotifications', (SELECT COUNT(*) FROM user_notifications WHERE recipient_id = p_user_id AND is_read = FALSE AND type LIKE 'forum%')
    ) INTO v_user_stats;
  ELSE
    v_user_stats := '{}'::jsonb;
  END IF;

  v_result := jsonb_build_object(
    'success', TRUE,
    'posts', v_posts,
    'categories', v_categories,
    'featured', v_featured,
    'userStats', v_user_stats,
    'pagination', jsonb_build_object(
      'limit', p_page_limit,
      'offset', p_page_offset,
      'hasMore', jsonb_array_length(v_posts) = p_page_limit
    )
  );

  RETURN v_result;
END;
$function$;

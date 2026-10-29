-- Keep post detail aligned with the consolidated bookmarks table.
CREATE OR REPLACE FUNCTION public.get_forum_post_detail(p_post_id bigint, p_user_id uuid DEFAULT NULL::uuid, p_comments_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
  v_post JSONB;
  v_comments JSONB;
  v_related JSONB;
BEGIN
  -- A caller may request only its own bookmark/notification state. Trusted
  -- service-role callers supply the verified identity from the API handler.
  IF p_user_id IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid()
     AND COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'Cannot request another users forum state' USING ERRCODE = '42501';
  END IF;
  -- Increment view count
  UPDATE forum SET views_count = COALESCE(views_count, 0) + 1 WHERE id = p_post_id;

  -- Get post with full details
  SELECT jsonb_build_object(
    'id', f.id,
    'title', f.forum_post_name,
    'description', f.forum_post_description,
    'image', f.forum_post_image,
    'richContent', f.rich_content,
    'commentsCount', COALESCE(f.forum_comments_counter, 0),
    'likesCount', f.forum_likes_counter,
    'viewsCount', COALESCE(f.views_count, 0),
    'postType', f.post_type,
    'isPinned', COALESCE(f.is_pinned, FALSE),
    'isLocked', COALESCE(f.is_locked, FALSE),
    'isFeatured', COALESCE(f.is_featured, FALSE),
    'isEdited', COALESCE(f.is_edited, FALSE),
    'slug', f.slug,
    'categoryId', f.category_id,
    'reactions', COALESCE(f.reactions_count, '{}'::jsonb),
    'createdAt', f.forum_post_created_at,
    'updatedAt', f.forum_post_updated_at,
    'lastActivityAt', f.last_activity_at,
    'bestAnswerId', f.best_answer_id,
    'author', jsonb_build_object(
      'id', p.id,
      'name', COALESCE(p.nickname, p.first_name, 'User'),
      'avatar', p.avatar_url,
      'isVerified', COALESCE(p.is_verified, FALSE),
      'bio', p.bio,
      'postsCount', (SELECT COUNT(*) FROM forum WHERE profile_id = p.id)
    ),
    'category', CASE WHEN fc.id IS NOT NULL THEN jsonb_build_object(
      'id', fc.id,
      'name', fc.name,
      'color', fc.color
    ) ELSE NULL END,
    'userInteraction', CASE WHEN p_user_id IS NOT NULL THEN jsonb_build_object(
      'hasReacted', EXISTS(SELECT 1 FROM forum_reactions fr WHERE fr.forum_id = f.id AND fr.profile_id = p_user_id),
      'hasBookmarked', EXISTS(SELECT 1 FROM public.bookmarks fb WHERE fb.forum_id = f.id AND fb.profile_id = p_user_id),
      'hasSubscribed', EXISTS(SELECT 1 FROM forum_subscriptions fs WHERE fs.forum_id = f.id AND fs.profile_id = p_user_id),
      'userReaction', (SELECT reaction_type_id FROM forum_reactions WHERE forum_id = f.id AND profile_id = p_user_id LIMIT 1),
      'isAuthor', f.profile_id = p_user_id
    ) ELSE NULL END
  ) INTO v_post
  FROM forum f
  JOIN profiles p ON f.profile_id = p.id
  LEFT JOIN forum_categories fc ON f.category_id = fc.id
  WHERE f.id = p_post_id AND f.forum_published = TRUE;

  IF v_post IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Post not found');
  END IF;

  -- Get comments with threading
  WITH RECURSIVE comment_tree AS (
    SELECT 
      c.id, c.comment, c.user_id, c.parent_id, c.depth,
      c.likes_count, c.replies_count, c.is_best_answer, c.is_pinned,
      c.reactions_count, c.comment_created_at, c.is_edited,
      COALESCE(p.nickname, p.first_name, 'User') AS author_name, 
      p.avatar_url AS author_avatar, 
      p.is_verified AS author_verified,
      0 AS tree_depth,
      ARRAY[c.id] AS path
    FROM comments c
    JOIN profiles p ON c.user_id = p.id
    WHERE c.forum_id = p_post_id AND c.parent_id IS NULL
    
    UNION ALL
    
    SELECT 
      c.id, c.comment, c.user_id, c.parent_id, c.depth,
      c.likes_count, c.replies_count, c.is_best_answer, c.is_pinned,
      c.reactions_count, c.comment_created_at, c.is_edited,
      COALESCE(p.nickname, p.first_name, 'User'), 
      p.avatar_url, 
      p.is_verified,
      ct.tree_depth + 1,
      ct.path || c.id
    FROM comments c
    JOIN profiles p ON c.user_id = p.id
    JOIN comment_tree ct ON c.parent_id = ct.id
    WHERE ct.tree_depth < 3
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'content', comment,
      'authorId', user_id,
      'authorName', author_name,
      'authorAvatar', author_avatar,
      'authorVerified', COALESCE(author_verified, FALSE),
      'parentId', parent_id,
      'depth', COALESCE(depth, tree_depth),
      'likesCount', COALESCE(likes_count, 0),
      'repliesCount', COALESCE(replies_count, 0),
      'isBestAnswer', COALESCE(is_best_answer, FALSE),
      'isPinned', COALESCE(is_pinned, FALSE),
      'reactions', COALESCE(reactions_count, '{}'::jsonb),
      'createdAt', comment_created_at,
      'isEdited', COALESCE(is_edited, FALSE)
    ) ORDER BY is_pinned DESC, is_best_answer DESC, path
  ), '[]'::jsonb) INTO v_comments
  FROM comment_tree
  LIMIT p_comments_limit;

  -- Get related posts
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', f.id,
      'title', f.forum_post_name,
      'image', f.forum_post_image,
      'commentsCount', COALESCE(f.forum_comments_counter, 0),
      'slug', f.slug
    ) ORDER BY f.hot_score DESC NULLS LAST, f.id DESC
  ), '[]'::jsonb) INTO v_related
  FROM (
    SELECT f.* FROM public.forum f
    WHERE f.id != p_post_id
      AND f.forum_published = TRUE
      AND f.category_id = (SELECT category_id FROM public.forum WHERE id = p_post_id)
    ORDER BY f.hot_score DESC NULLS LAST, f.id DESC
    LIMIT 5
  ) f;

  v_result := jsonb_build_object(
    'success', TRUE,
    'post', v_post,
    'comments', v_comments,
    'relatedPosts', v_related
  );

  RETURN v_result;
END;
$function$;

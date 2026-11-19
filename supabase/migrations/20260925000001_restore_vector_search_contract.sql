BEGIN;

DROP FUNCTION IF EXISTS public.match_posts(vector, float, int);

CREATE FUNCTION public.match_posts(
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  post_name text,
  post_description text,
  post_type text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT
    posts.id,
    posts.post_name,
    posts.post_description,
    posts.post_type,
    1 - (posts.embedding <=> query_embedding) AS similarity
  FROM public.posts
  WHERE posts.embedding IS NOT NULL
    AND 1 - (posts.embedding <=> query_embedding) > match_threshold
    AND posts.is_active = true
  ORDER BY posts.embedding <=> query_embedding
  LIMIT GREATEST(0, LEAST(COALESCE(match_count, 50), 50));
$$;

REVOKE ALL ON FUNCTION public.match_posts(vector, float, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_posts(vector, float, int) TO service_role;
COMMENT ON FUNCTION public.match_posts(vector, float, int) IS 'Vector similarity search for active listings, capped at 50 results';
NOTIFY pgrst, 'reload schema';

COMMIT;

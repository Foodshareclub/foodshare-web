-- Atomic post view counter.
--
-- The web app implemented this as read-modify-write:
--
--   SELECT post_views FROM posts WHERE id = $1
--   UPDATE posts SET post_views = <that value> + 1 WHERE id = $1
--
-- (src/app/actions/post-views.ts, with a comment claiming it was atomic). Two
-- concurrent views both read N and both write N+1, so one is lost. Every view
-- hits this path.
--
-- A single UPDATE ... SET post_views = post_views + 1 takes a row lock, so
-- concurrent callers serialise and no update is lost. `RETURNING` gives the
-- caller the authoritative post-write value without a second round-trip.
--
-- SECURITY: search_path is pinned to '' (the most restrictive form) and every
-- object is schema-qualified, so this cannot be hijacked via a search_path or
-- object-shadowing attack. EXECUTE is granted to anon/authenticated because
-- views are recorded for anonymous visitors; the function only touches
-- `public.posts` and cannot read or return anything else.

BEGIN;

CREATE OR REPLACE FUNCTION public.increment_post_view(p_post_id bigint)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  UPDATE public.posts
  SET post_views = COALESCE(post_views, 0) + 1,
      post_viewed_at = now()
  WHERE id = p_post_id
  RETURNING post_views;
$$;

REVOKE ALL ON FUNCTION public.increment_post_view(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_post_view(bigint) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.increment_post_view(bigint) IS
  'Atomically increments posts.post_views and returns the new value. Replaces a '
  'read-modify-write in the web app that lost updates under concurrency.';

COMMIT;

NOTIFY pgrst, 'reload schema';

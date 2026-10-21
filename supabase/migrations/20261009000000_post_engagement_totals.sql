-- Add get_post_engagement_totals: the platform-wide view/like totals.
--
-- `getAnalyticsSummary` summed `post_views` and `post_like_counter` by
-- pulling every row of `public.posts` into the Node process and reducing it
-- there:
--
--   supabase.from("posts").select("post_views,post_like_counter")   // no filter
--
-- On every admin dashboard load. That is a full table scan over the largest
-- table in the schema, transferred over PostgREST, to add up two columns.
--
-- Same treatment as get_post_rating in the previous migration: aggregate in
-- the database, return one row.
--
-- SECURITY INVOKER, matching the read the aggregate replaces: `posts` is
-- publicly readable for active listings, and this only sums columns on rows
-- the caller could already have counted. search_path is pinned.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_post_engagement_totals()
    RETURNS TABLE (
        total_views bigint,
        total_likes bigint,
        listings_counted bigint
    )
    LANGUAGE sql
    STABLE
    SECURITY INVOKER
    SET search_path TO ''
AS $$
    SELECT
        coalesce(sum(p.post_views), 0)      AS total_views,
        coalesce(sum(p.post_like_counter), 0) AS total_likes,
        count(*)                             AS listings_counted
      FROM public.posts p;
$$;

COMMENT ON FUNCTION public.get_post_engagement_totals() IS
  'Summed post_views / post_like_counter across all listings. Replaces a '
  'full-table transfer of both columns into the app process. INVOKER: sums '
  'columns the caller can already read.';

GRANT EXECUTE ON FUNCTION public.get_post_engagement_totals() TO anon, authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────
-- Verify the outcome
-- ----------------------------------------------------------------------
--
-- A one-row result is the property that matters: the previous code shape
-- (`data.length` of a per-post projection) is what the caller was written
-- against, so an aggregate that can return no rows would be silently
-- reported as zero totals again.
DO $$
DECLARE
    v_rows  bigint;
    v_views bigint;
BEGIN
    SELECT count(*), coalesce(max(total_views), 0)
      INTO v_rows, v_views
      FROM public.get_post_engagement_totals();

    IF v_rows <> 1 THEN
        RAISE EXCEPTION
            'get_post_engagement_totals returned % rows, expected exactly 1 — a '
            'caller checking `data.length === 0` will read this as zero totals', v_rows;
    END IF;

    IF v_views < 0 THEN
        RAISE EXCEPTION 'get_post_engagement_totals returned a negative total (% )', v_views;
    END IF;
END
$$;

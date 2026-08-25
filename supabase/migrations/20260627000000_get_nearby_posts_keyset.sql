-- Migration: Consolidate get_nearby_posts into a single keyset-paginated function
-- Purpose:
--   1. Replace OFFSET pagination (unstable under concurrent writes: skips/dupes)
--      with keyset ("seek method") pagination keyed on (distance_meters, id).
--   2. Compute distance_meters exactly once via a CTE (previously recomputed in
--      both SELECT and ORDER BY, ~2x the geography work per row).
--   3. Collapse the two divergent overloads into ONE signature. Only the web
--      client calls this RPC (confirmed: no references in foodshare-app outside
--      vendored supabase-swift), so there is no mobile consumer to break.
--   4. Add blocked_users filtering using auth.uid() so blocked accounts never
--      surface in the feed. The legacy overload the web was using queried the
--      raw posts table and skipped this entirely.
--
-- Auth context: callers use a cookie-bound Supabase client (createClient()),
-- so auth.uid() resolves to the requesting user (NULL when anonymous).
--
-- Pagination contract:
--   ORDER BY distance_meters ASC, id DESC
--   Keyset resume: (cursor_distance IS NULL)
--                  OR distance_meters > cursor_distance
--                  OR (distance_meters = cursor_distance AND id < cursor_id)
--   This makes page boundaries immune to INSERTs/DELETEs between fetches.
--
-- NOTE: id DESC as the tie-breaker means within the same distance, newer posts
-- appear first; the seek predicate uses id < cursor_id to continue past them.

-- Drop every existing overload so the canonical name resolves unambiguously.
DROP FUNCTION IF EXISTS public.get_nearby_posts(double precision, double precision, double precision, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_nearby_posts(double precision, double precision, integer, uuid, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_nearby_posts(double precision, double precision, integer, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_nearby_posts(
    user_lat double precision,
    user_lng double precision,
    radius_meters double precision DEFAULT 5000,
    post_type_filter text DEFAULT NULL,
    cursor_distance double precision DEFAULT NULL,
    cursor_id bigint DEFAULT NULL,
    page_limit integer DEFAULT 20
) RETURNS TABLE(
    id bigint,
    profile_id uuid,
    post_name text,
    post_description text,
    post_type text,
    post_address text,
    post_stripped_address text,
    location_json jsonb,
    images text[],
    available_hours text,
    is_active boolean,
    is_arranged boolean,
    post_views integer,
    post_like_counter integer,
    condition character varying,
    transportation text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    distance_meters double precision
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
    v_requester uuid := auth.uid();
    v_user_point extensions.geography;
BEGIN
    -- Clamp inputs defensively. The web layer validates coordinates too, but a
    -- database function is a public boundary: never trust callers to validate.
    IF user_lat IS NULL OR user_lng IS NULL
       OR user_lat < -90 OR user_lat > 90
       OR user_lng < -180 OR user_lng > 180 THEN
        RAISE EXCEPTION 'Invalid coordinates: lat=%, lng=%', user_lat, user_lng
            USING ERRCODE = '23401';  -- invalid_parameter_value
    END IF;

    IF radius_meters IS NULL OR radius_meters <= 0 OR radius_meters > 100000 THEN
        radius_meters := 5000;
    END IF;

    IF page_limit IS NULL OR page_limit <= 0 OR page_limit > 100 THEN
        page_limit := 20;
    END IF;

    v_user_point := extensions.ST_SetSRID(
        extensions.ST_MakePoint(user_lng, user_lat), 4326
    )::extensions.geography;

    RETURN QUERY
    WITH candidates AS (
        SELECT
            p.id, p.profile_id, p.post_name, p.post_description, p.post_type,
            p.post_address, p.post_stripped_address, p.location_json, p.images,
            p.available_hours, p.is_active, p.is_arranged,
            p.post_views, p.post_like_counter, p.condition, p.transportation,
            p.created_at, p.updated_at,
            extensions.ST_Distance(p.location, v_user_point) AS distance_meters
        FROM public.posts p
        WHERE p.is_active = true
          AND p.is_arranged = false
          AND p.location IS NOT NULL
          AND extensions.ST_DWithin(p.location, v_user_point, radius_meters)
          AND (post_type_filter IS NULL OR p.post_type = post_type_filter)
          -- Exclude posts from accounts the requester has blocked.
          AND (
              v_requester IS NULL
              OR NOT EXISTS (
                  SELECT 1
                  FROM public.blocked_users bu
                  WHERE bu.user_id = v_requester
                    AND bu.blocked_user_id = p.profile_id
              )
          )
    )
    SELECT
        c.id, c.profile_id, c.post_name, c.post_description, c.post_type,
        c.post_address, c.post_stripped_address, c.location_json, c.images,
        c.available_hours, c.is_active, c.is_arranged,
        c.post_views, c.post_like_counter, c.condition, c.transportation,
        c.created_at, c.updated_at, c.distance_meters
    FROM candidates c
    WHERE
        -- Keyset resume predicate. On the first page both cursor_* are NULL.
        (cursor_distance IS NULL AND cursor_id IS NULL)
        OR c.distance_meters > cursor_distance
        OR (c.distance_meters = cursor_distance AND c.id < cursor_id)
    ORDER BY c.distance_meters ASC, c.id DESC
    LIMIT page_limit;
END;
$$;

-- Helpful when developing against this function: surface distance column docs.
COMMENT ON FUNCTION public.get_nearby_posts(double precision, double precision, double precision, text, double precision, bigint, integer)
IS 'Keyset-paginated nearby-posts feed. Returns active, un-arranged posts within radius_meters of (user_lat,user_lng), nearest first, excluding posts by blocked accounts. Resume paging with the (distance_meters, id) of the last row returned.';

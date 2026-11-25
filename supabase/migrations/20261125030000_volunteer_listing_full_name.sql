-- Migration: volunteer listings show the role as the title and the author's full name
--
-- 1. Listing 11590 carried the person's name and a job description in post_name
--    ("Denis Yarmoshko - FoodShare Founder"). The title becomes the role
--    ("IT Teammate"); the name is read from the author's profile at render time,
--    never baked into post_name. The UPDATE is keyed on the old value, so a second
--    run (or a row an admin has since edited) matches nothing.
--
-- 2. posts_with_location and get_nearby_posts computed author_name as the first
--    name only (20261124010000). For post_type = 'volunteer' they now return the
--    full name (first_name + second_name, trimmed), falling back to the nickname,
--    then 'Community Member'. Every other post_type keeps the first-name rule.
--
-- Privacy: volunteer listings are the deliberate public team cards, the person
-- chose to be listed by role and name. No new data is exposed: both expressions
-- read profiles_public, which already publishes first_name and second_name for
-- profiles with profile_visibility = 'public' that are active, and the LEFT JOIN
-- yields no name for any other profile. The rule keys on the listing's type, not
-- on the profile, so a person's surname stays out of their food listings.
--
-- Signatures, return types and grants are unchanged, so both objects are replaced
-- in place (no DROP, no privilege re-grant).

UPDATE public.posts
   SET post_name = 'IT Teammate'
 WHERE id = 11590
   AND post_type = 'volunteer'
   AND post_name = 'Denis Yarmoshko - FoodShare Founder';

CREATE OR REPLACE VIEW public.posts_with_location WITH (security_invoker='true') AS
 SELECT p.id,
    p.post_name,
    p.post_description,
    p.post_type,
    p.post_stripped_address AS post_address,
    p.post_stripped_address,
    p.quantity,
    p.pickup_time,
    p.is_active,
    p.is_arranged,
    p.created_at,
    p.updated_at,
    p.profile_id,
    p.images,
    p.post_views,
    NULL::extensions.geography(Point,4326) AS location,
    CASE
      WHEN f.latitude IS NULL THEN NULL
      ELSE jsonb_build_object(
        'type', 'Point',
        'coordinates', jsonb_build_array(f.longitude, f.latitude)
      )
    END AS location_json,
    f.latitude,
    f.longitude,
    p.category_id,
    p.tags,
    p.metadata,
    p.fridge_id,
    p.has_pantry,
    p.available_hours,
    p.location_type,
    p.condition,
    p.post_slug,
    p.post_slug AS slug,
    concat(p.id::text, '-', p.post_slug) AS canonical_slug,
    p.sync_version,
    p.expires_at,
    p.version,
    p.post_arranged_at,
    p.post_like_counter,
    true AS coordinates_approximate,
    CASE
      WHEN p.post_type = 'volunteer' THEN COALESCE(
        NULLIF(concat_ws(' ', NULLIF(TRIM(pr.first_name), ''), NULLIF(TRIM(pr.second_name), '')), ''),
        NULLIF(TRIM(pr.nickname), ''),
        'Community Member'
      )
      ELSE COALESCE(
        NULLIF(TRIM(split_part(pr.first_name, ' ', 1)), ''),
        NULLIF(TRIM(pr.nickname), ''),
        'Community Member'
      )
    END AS author_name,
    pr.avatar_url AS author_avatar_url
   FROM public.posts p
   LEFT JOIN LATERAL public.fuzzed_post_point(p.id) f ON true
   LEFT JOIN public.profiles_public pr ON pr.id = p.profile_id
  WHERE (p.is_active = true);

COMMENT ON VIEW public.posts_with_location IS
  'Public view of posts with fuzzed coordinates and author attribution: first name or nickname, or the full name for volunteer listings.';

GRANT SELECT ON public.posts_with_location TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_nearby_posts(
    user_lat double precision,
    user_lng double precision,
    radius_meters double precision DEFAULT 64374,
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
    distance_meters double precision,
    author_name text,
    author_avatar_url text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
    v_requester uuid := auth.uid();
    v_user_point extensions.geography;
BEGIN
    IF user_lat IS NULL OR user_lng IS NULL
       OR user_lat < -90 OR user_lat > 90
       OR user_lng < -180 OR user_lng > 180 THEN
        RAISE EXCEPTION 'Invalid coordinates: lat=%, lng=%', user_lat, user_lng
            USING ERRCODE = '23401';
    END IF;

    -- Clamp inputs: allow up to 805,000 meters (approx 500 miles, matching profiles constraint)
    IF radius_meters IS NULL OR radius_meters <= 0 OR radius_meters > 805000 THEN
        radius_meters := 64374; -- 40 miles fallback
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
            extensions.ST_Distance(p.location, v_user_point) AS distance_meters,
            CASE
              WHEN p.post_type = 'volunteer' THEN COALESCE(
                NULLIF(concat_ws(' ', NULLIF(TRIM(pr.first_name), ''), NULLIF(TRIM(pr.second_name), '')), ''),
                NULLIF(TRIM(pr.nickname), ''),
                'Community Member'
              )
              ELSE COALESCE(
                NULLIF(TRIM(split_part(pr.first_name, ' ', 1)), ''),
                NULLIF(TRIM(pr.nickname), ''),
                'Community Member'
              )
            END::text AS author_name,
            pr.avatar_url::text AS author_avatar_url
        FROM public.posts p
        LEFT JOIN public.profiles_public pr ON pr.id = p.profile_id
        WHERE p.is_active = true
          AND p.is_arranged = false
          AND p.location IS NOT NULL
          AND extensions.ST_DWithin(p.location, v_user_point, radius_meters)
          AND (post_type_filter IS NULL OR p.post_type = post_type_filter)
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
        c.created_at, c.updated_at, c.distance_meters,
        c.author_name, c.author_avatar_url
    FROM candidates c
    WHERE (
        cursor_distance IS NULL
        OR (
            c.distance_meters > cursor_distance
            OR (c.distance_meters = cursor_distance AND c.id < cursor_id)
        )
    )
    ORDER BY c.distance_meters ASC, c.id DESC
    LIMIT page_limit;
END;
$$;

COMMENT ON FUNCTION public.get_nearby_posts(double precision, double precision, double precision, text, double precision, bigint, integer)
IS 'Fetch posts near a location with keyset pagination, fuzzed distance, user blocking filter, and author attribution (full name for volunteer listings).';

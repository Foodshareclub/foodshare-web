-- Phase 0 location containment, path completion.
--
-- The 20261127230000 migration removed exact-location columns from the
-- authenticated posts table grant. That closed the base table but not the
-- SECURITY DEFINER RPCs: several client-executable feed/map functions still
-- returned p.post_address or p.location_json directly, bypassing the table
-- grant entirely. This migration keeps the four RPCs current clients call,
-- rewrites them over the fuzzed posts_with_location view, and revokes client
-- execute from the rest. Edge functions use service_role, so serving paths
-- continue to work.
--
-- Owner exact location remains public.get_post_exact_location(), which checks
-- auth.uid() = posts.profile_id.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_locations_in_viewport(
  p_north double precision,
  p_south double precision,
  p_east double precision,
  p_west double precision,
  p_post_type text DEFAULT NULL::text
)
RETURNS TABLE(id bigint, post_name text, post_type text, images text[], location_json jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT
    v.id,
    v.post_name,
    v.post_type,
    v.images,
    v.location_json
  FROM public.posts_with_location v
  WHERE v.latitude IS NOT NULL
    AND v.longitude IS NOT NULL
    AND v.latitude BETWEEN p_south AND p_north
    AND v.longitude BETWEEN p_west AND p_east
    AND (p_post_type IS NULL OR v.post_type = p_post_type);
$$;

CREATE OR REPLACE FUNCTION public.get_posts_in_bounds(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  post_type_filter text DEFAULT NULL::text,
  page_limit integer DEFAULT 100
)
RETURNS TABLE(id bigint, post_name text, post_type text, location_json json, images text[], is_arranged boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT
    v.id,
    v.post_name,
    v.post_type,
    v.location_json::json,
    v.images,
    v.is_arranged
  FROM public.posts_with_location v
  WHERE v.latitude IS NOT NULL
    AND v.longitude IS NOT NULL
    AND v.latitude BETWEEN min_lat AND max_lat
    AND v.longitude BETWEEN min_lng AND max_lng
    AND (post_type_filter IS NULL OR v.post_type = post_type_filter)
  LIMIT LEAST(GREATEST(COALESCE(page_limit, 100), 1), 500);
$$;

CREATE OR REPLACE FUNCTION public.get_nearby_posts(
  user_lat double precision,
  user_lng double precision,
  radius_meters double precision DEFAULT 64374,
  post_type_filter text DEFAULT NULL::text,
  cursor_distance double precision DEFAULT NULL::double precision,
  cursor_id bigint DEFAULT NULL::bigint,
  page_limit integer DEFAULT 20
)
RETURNS TABLE(
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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

  IF radius_meters IS NULL OR radius_meters <= 0 OR radius_meters > 805000 THEN
    radius_meters := 64374;
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
      v.id, v.profile_id, v.post_name, v.post_description, v.post_type,
      v.post_address, v.post_stripped_address, v.location_json, v.images,
      v.available_hours, v.is_active, v.is_arranged,
      v.post_views, v.post_like_counter, v.condition, p.transportation,
      v.created_at, v.updated_at,
      extensions.ST_Distance(
        extensions.ST_SetSRID(
          extensions.ST_MakePoint(v.longitude, v.latitude), 4326
        )::extensions.geography,
        v_user_point
      ) AS distance_meters,
      v.author_name,
      v.author_avatar_url
    FROM public.posts_with_location v
    LEFT JOIN public.posts p ON p.id = v.id
    WHERE v.is_active = true
      AND v.is_arranged = false
      AND v.latitude IS NOT NULL
      AND v.longitude IS NOT NULL
      AND extensions.ST_DWithin(
        extensions.ST_SetSRID(
          extensions.ST_MakePoint(v.longitude, v.latitude), 4326
        )::extensions.geography,
        v_user_point,
        radius_meters
      )
      AND (post_type_filter IS NULL OR v.post_type = post_type_filter)
      AND (
        v_requester IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM public.blocked_users bu
          WHERE bu.user_id = v_requester
            AND bu.blocked_user_id = v.profile_id
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

CREATE OR REPLACE FUNCTION public.get_trending_posts(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_hours_window integer DEFAULT 24,
  p_latitude double precision DEFAULT NULL::double precision,
  p_longitude double precision DEFAULT NULL::double precision,
  p_radius_km double precision DEFAULT NULL::double precision
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  p_limit := LEAST(p_limit, 100);

  WITH trending_scores AS (
    SELECT
      p.id,
      p.post_name,
      p.post_description,
      p.images,
      p.post_type,
      v.latitude,
      v.longitude,
      v.post_address,
      p.profile_id,
      p.created_at,
      COALESCE(p.post_views, 0) AS view_count,
      COALESCE(p.post_like_counter, 0) AS like_count,
      COALESCE((
        SELECT COUNT(*)
        FROM post_views pv
        WHERE pv.post_id = p.id
          AND pv.created_at > NOW() - (p_hours_window || ' hours')::interval
      ), 0) AS recent_views_score,
      COALESCE((
        SELECT COUNT(*) * 2
        FROM likes l
        WHERE l.post_id = p.id
          AND l.challenge_id = 0
          AND l.forum_id = 0
          AND l.created_at > NOW() - (p_hours_window || ' hours')::interval
      ), 0) AS recent_likes_score,
      GREATEST(0, 1 - EXTRACT(EPOCH FROM (NOW() - p.created_at)) / (p_hours_window * 3600 * 7)) AS freshness_score,
      CASE
        WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL
             AND v.latitude IS NOT NULL AND v.longitude IS NOT NULL THEN
          extensions.ST_Distance(
            extensions.ST_SetSRID(
              extensions.ST_MakePoint(v.longitude, v.latitude), 4326
            )::extensions.geography,
            extensions.ST_SetSRID(
              extensions.ST_MakePoint(p_longitude, p_latitude), 4326
            )::extensions.geography
          ) / 1000
        ELSE NULL
      END AS distance_km
    FROM public.posts p
    LEFT JOIN public.posts_with_location v ON v.id = p.id
    WHERE p.is_active = true
      AND p.is_arranged = false
      AND (
        p_latitude IS NULL
        OR p_longitude IS NULL
        OR p_radius_km IS NULL
        OR v.latitude IS NULL
        OR v.longitude IS NULL
        OR extensions.ST_DWithin(
          extensions.ST_SetSRID(
            extensions.ST_MakePoint(v.longitude, v.latitude), 4326
          )::extensions.geography,
          extensions.ST_SetSRID(
            extensions.ST_MakePoint(p_longitude, p_latitude), 4326
          )::extensions.geography,
          p_radius_km * 1000
        )
      )
  ),
  ranked_posts AS (
    SELECT
      ts.*,
      (
        ts.recent_views_score +
        ts.recent_likes_score * 2.0 +
        ts.freshness_score * 3.0 +
        CASE WHEN ts.view_count > 0
          THEN (ts.like_count::float / ts.view_count) * 5.0
          ELSE 0
        END
      ) AS trending_score
    FROM trending_scores ts
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', rp.id,
      'post_name', rp.post_name,
      'post_description', rp.post_description,
      'images', rp.images,
      'post_type', rp.post_type,
      'latitude', rp.latitude,
      'longitude', rp.longitude,
      'post_address', rp.post_address,
      'profile_id', rp.profile_id,
      'created_at', rp.created_at,
      'view_count', rp.view_count,
      'like_count', rp.like_count,
      'trending_score', ROUND(rp.trending_score::numeric, 2),
      'distance_km', ROUND(rp.distance_km::numeric, 2)
    )
    ORDER BY rp.trending_score DESC
  )
  INTO v_result
  FROM (
    SELECT * FROM ranked_posts
    ORDER BY trending_score DESC
    LIMIT p_limit OFFSET p_offset
  ) rp;

  RETURN jsonb_build_object(
    'success', true,
    'posts', COALESCE(v_result, '[]'::jsonb),
    'window_hours', p_hours_window
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', jsonb_build_object(
      'code', 'SERVER_ERROR',
      'message', SQLERRM
    )
  );
END;
$$;

-- These legacy feed/detail RPCs returned exact location but have no current
-- client call site. Edge functions still call them as service_role.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'get_listing_detail_data',
        'get_home_screen_data',
        'get_bff_feed_data',
        'get_feed_initial_data',
        'get_filtered_feed',
        'get_mobile_home_data',
        'get_personalized_feed',
        'get_search_screen_data',
        'get_trending_items',
        'search_food_items',
        'get_delta_sync',
        'get_user_dashboard',
        'find_nearby_posts_geography',
        'nearby_posts_full',
        'nearby_posts',
        'nearby_address',
        'posts_location_json',
        'posts_within_radius',
        'posts_in_view',
        'compute_feed_for_cell',
        'get_pending_geocode_queue'
      ])
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      r.oid::regprocedure
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO service_role',
      r.oid::regprocedure
    );
  END LOOP;
END;
$$;

-- The four rewritten RPCs and the owner-gated/helper functions keep their
-- client grants explicitly; the corpus has revoked function EXECUTE globally
-- in places, and CREATE OR REPLACE does not restore a missing grant.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'get_nearby_posts',
        'get_posts_in_bounds',
        'get_locations_in_viewport',
        'get_trending_posts',
        'get_nearby_posts_count',
        'fuzzed_post_point'
      ])
  LOOP
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role',
      r.oid::regprocedure
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_post_exact_location'
  LOOP
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role',
      r.oid::regprocedure
    );
  END LOOP;
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';

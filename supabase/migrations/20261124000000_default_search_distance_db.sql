-- Migration: Single source of truth for default distance (40 miles / 40 km)
-- Configures public.app_config, adds get_default_search_radius RPC,
-- expands get_nearby_posts radius clamp bounds, and updates get_app_settings.

-- 1. Upsert database configuration into public.app_config
INSERT INTO public.app_config (key, value, platform, category, description)
VALUES 
    ('default_search_radius_miles', '40'::jsonb, 'all', 'location', 'Default search distance in miles for imperial regions (US, GB, MM, LR)'),
    ('default_search_radius_km', '40'::jsonb, 'all', 'location', 'Default search distance in kilometers for metric regions'),
    ('max_search_radius_km', '160'::jsonb, 'all', 'location', 'Maximum allowed search radius in kilometers (approx 100 miles)'),
    ('max_search_radius_meters', '160934'::jsonb, 'all', 'location', 'Maximum allowed search radius in meters')
ON CONFLICT (key, platform) DO UPDATE SET 
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- 2. Dedicated RPC: get_default_search_radius
-- Resolves the authoritative default search radius based on country code or explicit unit.
CREATE OR REPLACE FUNCTION public.get_default_search_radius(
    p_country_code text DEFAULT NULL,
    p_unit text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_is_miles boolean := false;
    v_miles_val numeric := 40;
    v_km_val numeric := 40;
    v_cfg_miles jsonb;
    v_cfg_km jsonb;
BEGIN
    -- Read dynamic configuration from app_config if present
    SELECT value INTO v_cfg_miles 
    FROM public.app_config 
    WHERE key = 'default_search_radius_miles' 
      AND (platform = 'all' OR platform = 'web') 
    ORDER BY (platform = 'web') DESC 
    LIMIT 1;

    IF v_cfg_miles IS NOT NULL AND jsonb_typeof(v_cfg_miles) = 'number' THEN
        v_miles_val := (v_cfg_miles)::numeric;
    END IF;

    SELECT value INTO v_cfg_km 
    FROM public.app_config 
    WHERE key = 'default_search_radius_km' 
      AND (platform = 'all' OR platform = 'web') 
    ORDER BY (platform = 'web') DESC 
    LIMIT 1;

    IF v_cfg_km IS NOT NULL AND jsonb_typeof(v_cfg_km) = 'number' THEN
        v_km_val := (v_cfg_km)::numeric;
    END IF;

    -- Determine unit preference:
    -- 1. Explicit unit parameter
    -- 2. Country code (US, GB, MM, LR use miles)
    -- 3. Default to kilometers
    IF lower(trim(coalesce(p_unit, ''))) IN ('miles', 'mi', 'mile') THEN
        v_is_miles := true;
    ELSIF lower(trim(coalesce(p_unit, ''))) IN ('km', 'kilometers', 'kilometer') THEN
        v_is_miles := false;
    ELSIF upper(trim(coalesce(p_country_code, ''))) IN ('US', 'GB', 'MM', 'LR') THEN
        v_is_miles := true;
    ELSE
        v_is_miles := false;
    END IF;

    IF v_is_miles THEN
        RETURN jsonb_build_object(
            'unit', 'miles',
            'distance', v_miles_val,
            'radius_meters', round(v_miles_val * 1609.344),
            'radius_km', round(v_miles_val * 1.609344, 3)
        );
    ELSE
        RETURN jsonb_build_object(
            'unit', 'km',
            'distance', v_km_val,
            'radius_meters', round(v_km_val * 1000),
            'radius_km', v_km_val
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_default_search_radius(text, text) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.get_default_search_radius(text, text)
IS 'Returns the authoritative default feed search distance and radius in meters from database config (40 miles for US/imperial regions, 40 km for metric regions).';

-- 3. Expand get_nearby_posts radius clamp bounds
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
    distance_meters double precision
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
            extensions.ST_Distance(p.location, v_user_point) AS distance_meters
        FROM public.posts p
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
        c.created_at, c.updated_at, c.distance_meters
    FROM candidates c
    WHERE
        (cursor_distance IS NULL AND cursor_id IS NULL)
        OR c.distance_meters > cursor_distance
        OR (c.distance_meters = cursor_distance AND c.id < cursor_id)
    ORDER BY c.distance_meters ASC, c.id DESC
    LIMIT page_limit;
END;
$$;

-- 4. Update get_app_settings defaults
CREATE OR REPLACE FUNCTION public.get_app_settings() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN jsonb_build_object(
    'success', true,
    'app', jsonb_build_object(
      'name', 'FoodShare',
      'version', '1.0.0',
      'minSupportedVersion', '0.9.0'
    ),
    'features', jsonb_build_object(
      'pushNotifications', true,
      'emailNotifications', true,
      'locationServices', true,
      'messaging', true,
      'ratings', true,
      'challenges', true
    ),
    'defaults', jsonb_build_object(
      'searchRadiusKm', 40,
      'maxSearchRadiusKm', 160,
      'maxImagesPerListing', 5,
      'maxDescriptionLength', 2000,
      'listingExpiryDays', 7
    ),
    'support', jsonb_build_object(
      'email', 'support@foodshare.app',
      'helpUrl', 'https://help.foodshare.app',
      'termsUrl', 'https://foodshare.app/terms',
      'privacyUrl', 'https://foodshare.app/privacy'
    ),
    'legal', jsonb_build_object(
      'termsVersion', '2024-01-01',
      'privacyVersion', '2024-01-01'
    ),
    'meta', jsonb_build_object(
      'timestamp', NOW(),
      'cacheTTL', 3600
    )
  );
END;
$$;

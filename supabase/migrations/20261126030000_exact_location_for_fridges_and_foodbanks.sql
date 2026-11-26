-- Migration: fridges and food banks show their exact address and location
--
-- User decision 2026-11-26: "Every fridge and Foodbank must show the exact
-- address." Fridges and food banks are public places, not someone's home, so
-- the privacy blur that protects sharers does not apply to them.
--
-- 1. public.is_public_place_post_type(text) is the single rule: 'fridge' and
--    'foodbank'. Every other post_type keeps the existing privacy behaviour.
-- 2. fuzzed_post_point() returns the exact point for those types and the
--    deterministic 100-200 m offset for everything else (20261101001000).
-- 3. strip_address() keeps the full address in post_stripped_address for those
--    types. The public view and every list RPC read post_stripped_address, so
--    this one column carries the exact address everywhere. Other types are
--    still stripped of house and unit numbers.
-- 4. Backfill: fridge and food bank rows whose stripped address differs from
--    the full one are re-saved so the new trigger recomputes it.
-- 5. posts_with_location reports coordinates_approximate = false for them.
--
-- Signatures, return types and grants are unchanged (CREATE OR REPLACE).
-- Idempotent: a second run changes no rows.

CREATE OR REPLACE FUNCTION public.is_public_place_post_type(p_post_type text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO ''
AS $$
  SELECT coalesce(p_post_type IN ('fridge', 'foodbank'), false);
$$;

COMMENT ON FUNCTION public.is_public_place_post_type(text)
IS 'Post types that are public places (fridges, food banks): shown with their exact address and location.';

GRANT EXECUTE ON FUNCTION public.is_public_place_post_type(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fuzzed_post_point(p_post_id bigint)
RETURNS TABLE(latitude double precision, longitude double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_lat double precision;
  v_lng double precision;
  v_type text;
  v_angle double precision;
  v_distance double precision;
  v_cos_lat double precision;
BEGIN
  SELECT extensions.st_y(p.location::extensions.geometry),
         extensions.st_x(p.location::extensions.geometry),
         p.post_type
    INTO v_lat, v_lng, v_type
    FROM public.posts p
   WHERE p.id = p_post_id
     AND p.is_active = true;
  IF v_lat IS NULL OR v_lng IS NULL THEN
    RETURN;
  END IF;
  -- Public places (fridges, food banks) are shown where they are.
  IF public.is_public_place_post_type(v_type) THEN
    latitude := v_lat;
    longitude := v_lng;
    RETURN NEXT;
    RETURN;
  END IF;
  -- Deterministic per post: the same listing always has the same approximate
  -- point, so a caller cannot average repeated requests back to the exact one.
  v_angle := ((hashtextextended(p_post_id::text, 0) & 4294967295)::double precision
              / 4294967296.0) * 2 * pi();
  v_distance := 100 + (((hashtextextended(p_post_id::text, 1) & 4294967295)::double precision
                        / 4294967296.0) * 100);
  v_cos_lat := GREATEST(cos(radians(v_lat)), 0.000001);
  latitude := v_lat + (v_distance * cos(v_angle)) / 111320.0;
  longitude := v_lng + (v_distance * sin(v_angle)) / (111320.0 * v_cos_lat);
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.strip_address()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
    stripped_address TEXT;
BEGIN
    -- Public places (fridges, food banks) keep their full address.
    IF public.is_public_place_post_type(NEW.post_type) THEN
        NEW.post_stripped_address := btrim(COALESCE(NEW.post_address, ''));
        RETURN NEW;
    END IF;
    -- Strip house number at the start
    stripped_address := regexp_replace(COALESCE(NEW.post_address, ''), '^\d+\s+', '', 'gi');
    -- Strip apartment/unit info but NOT from "United" (use word boundary)
    -- Match "apt", "apartment", "unit" only when followed by optional digits/letters (not "ed")
    stripped_address := regexp_replace(stripped_address, '\s*((?:apt\.?|apartment)\s*[0-9a-zA-Z]*\s*,?\s*)', '', 'gi');
    stripped_address := regexp_replace(stripped_address, '\s*(unit\s+[0-9a-zA-Z]+\s*,?\s*)', '', 'gi');
    stripped_address := regexp_replace(stripped_address, '\s*(#\s*[0-9a-zA-Z]+\s*,?\s*)', '', 'gi');
    -- Correct comma spacing: ensure there's exactly one space after each comma
    stripped_address := regexp_replace(stripped_address, ',\s*', ', ', 'g');
    -- Remove any leading or trailing commas and spaces
    stripped_address := trim(both ', ' from stripped_address);
    -- Assign the stripped and corrected address to the new column
    NEW.post_stripped_address := stripped_address;
    RETURN NEW;
END;
$$;

-- Backfill. The BEFORE trigger recomputes post_stripped_address on update.
UPDATE public.posts
   SET post_stripped_address = btrim(COALESCE(post_address, ''))
 WHERE public.is_public_place_post_type(post_type)
   AND post_stripped_address IS DISTINCT FROM btrim(COALESCE(post_address, ''));

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
    (NOT public.is_public_place_post_type(p.post_type)) AS coordinates_approximate,
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


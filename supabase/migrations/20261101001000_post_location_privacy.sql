-- Make the public listing read path approximate by construction.
--
-- The product API already fuzzed coordinates in TypeScript, but the view it
-- read from exposed `posts.location`, `posts.location_json` and the exact
-- `posts.post_address` to every `anon`/`authenticated` caller. The fuzzer was
-- therefore a property of one client, not of the data boundary: a direct
-- PostgREST query on `posts_with_location` returned the exact pickup point.
--
-- This migration moves the guarantee into the view:
--
--   * `latitude`/`longitude` come from `fuzzed_post_point(id)`, a
--     SECURITY DEFINER function that returns a deterministic 100-200m offset
--     and nothing else.
--   * `location` is NULL and `location_json` is the fuzzed point.
--   * `post_address` is the stripped address, never the exact one.
--   * `coordinates_approximate` is true, so the API can tell a pre-fuzzed row
--     from a raw one and stop double-fuzzing it.
--
-- The owner still needs the exact point to edit a listing and to describe
-- pickup. `get_post_exact_location(post_id)` returns it only when
-- `auth.uid()` owns the post (or the caller is service_role); everyone else
-- gets no row. The API calls it for the owner detail path.
--
-- This does not revoke direct `posts` column access. That requires moving the
-- remaining `select *` consumers to explicit safe column lists or a private
-- location table, and is deliberately a separate, client-coordinated change;
-- see the note in docs/SECURITY_REMEDIATION_2026-10-28.md.

BEGIN;

CREATE OR REPLACE FUNCTION public.fuzzed_post_point(p_post_id bigint)
RETURNS TABLE(latitude double precision, longitude double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_lat double precision;
  v_lng double precision;
  v_angle double precision;
  v_distance double precision;
  v_cos_lat double precision;
BEGIN
  SELECT extensions.st_y(p.location::extensions.geometry),
         extensions.st_x(p.location::extensions.geometry)
    INTO v_lat, v_lng
    FROM public.posts p
   WHERE p.id = p_post_id
     AND p.is_active = true;

  IF v_lat IS NULL OR v_lng IS NULL THEN
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

REVOKE ALL ON FUNCTION public.fuzzed_post_point(bigint) FROM PUBLIC, anon, authenticated;
-- The view is security_invoker, so each reader needs EXECUTE on the function
-- it calls. The function returns only the approximate point.
GRANT EXECUTE ON FUNCTION public.fuzzed_post_point(bigint) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_post_exact_location(p_post_id bigint)
RETURNS TABLE(
  latitude double precision,
  longitude double precision,
  location_json jsonb,
  post_address text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND NOT EXISTS (
       SELECT 1
         FROM public.posts p
        WHERE p.id = p_post_id
          AND p.profile_id = auth.uid()
     ) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT extensions.st_y(p.location::extensions.geometry),
           extensions.st_x(p.location::extensions.geometry),
           p.location_json,
           p.post_address
      FROM public.posts p
     WHERE p.id = p_post_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_post_exact_location(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_post_exact_location(bigint) TO authenticated, service_role;

CREATE OR REPLACE VIEW public.posts_with_location WITH (security_invoker='true') AS
 SELECT p.id,
    p.post_name,
    p.post_description,
    p.post_type,
    -- The exact street address is owner-only (get_post_exact_location).
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
    NULL::extensions.geography AS location,
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
    true AS coordinates_approximate
   FROM public.posts p
   LEFT JOIN LATERAL public.fuzzed_post_point(p.id) f ON true
  WHERE (p.is_active = true);

GRANT SELECT ON public.posts_with_location TO anon, authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

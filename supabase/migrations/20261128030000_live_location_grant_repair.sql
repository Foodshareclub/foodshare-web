-- Phase 0 live containment repair.
--
-- The deployed database accepted the 20261128020000 migration, including the
-- function revokes, but the anon role could still read exact location through
-- public.posts and analytics_full_listings. The client grants were reachable
-- through PUBLIC (or survived as table-level grants), not through the column
-- grants the earlier migrations assumed. This migration removes the grants
-- explicitly and re-establishes the safe column projection for both client
-- roles.
--
-- It also fixes legacy rows whose post_stripped_address still contained a
-- house number. The public view is security_invoker and cannot read the
-- ungranted post_address column, so it projects the safe stored column through
-- a deterministic mask. New writes use the same mask in the trigger.

BEGIN;

REVOKE SELECT ON public.posts FROM PUBLIC, anon, authenticated;
REVOKE SELECT ON public.analytics_full_listings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.analytics_full_listings TO service_role;

GRANT SELECT (
  admin_notes,
  available_hours,
  category_id,
  condition,
  contact_preferences,
  created_at,
  deleted_at,
  donation,
  donation_rules,
  embedding,
  expires_at,
  food_in_fridge,
  fridge_id,
  has_pantry,
  id,
  images,
  is_active,
  is_arranged,
  label,
  linktree,
  local_map,
  location_type,
  metadata,
  network,
  network_key,
  news_articles,
  opening_hours,
  partner_status,
  pickup_time,
  post_arranged_at,
  post_arranged_to,
  post_description,
  post_like_counter,
  post_name,
  post_slug,
  post_stripped_address,
  post_type,
  post_viewed_at,
  post_views,
  prefill_form,
  profile_id,
  quantity,
  sync_version,
  synced_to_motherduck,
  tags,
  timezone,
  transportation,
  updated_at,
  version,
  website
) ON public.posts TO anon, authenticated;

-- Remove a house number from a non-public address. Public-place post types
-- (fridges and food banks) intentionally keep their full address.
CREATE OR REPLACE FUNCTION public.strip_post_address_text(p_address text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path TO ''
AS $$
DECLARE
  v_address text;
BEGIN
  v_address := trim(COALESCE(p_address, ''));

  -- Leading house number: "123 Main St" -> "Main St".
  v_address := regexp_replace(v_address, '^\d+\s+', '', 'gi');

  -- Unit and apartment details.
  v_address := regexp_replace(v_address, '\s*((?:apt\.?|apartment)\s*[0-9a-zA-Z]*\s*,?\s*)', '', 'gi');
  v_address := regexp_replace(v_address, '\s*(unit\s+[0-9a-zA-Z]+\s*,?\s*)', '', 'gi');
  v_address := regexp_replace(v_address, '\s*(#\s*[0-9a-zA-Z]+\s*,?\s*)', '', 'gi');

  -- Trailing house number before a comma or the end: "Polyarnikov 6,
  -- Saint Petersburg" -> "Polyarnikov, Saint Petersburg".
  v_address := regexp_replace(v_address, '\s+\d+[0-9a-zA-Zа-яА-Я]?(?=\s*,|$)', '', 'g');

  v_address := regexp_replace(v_address, ',\s*', ', ', 'g');
  RETURN trim(both ', ' from v_address);
END;
$$;

CREATE OR REPLACE FUNCTION public.public_post_address(p_post_type text, p_address text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO ''
AS $$
  SELECT CASE
    WHEN public.is_public_place_post_type(p_post_type)
      THEN btrim(COALESCE(p_address, ''))
    ELSE public.strip_post_address_text(p_address)
  END;
$$;

GRANT EXECUTE ON FUNCTION public.strip_post_address_text(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_post_address(text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.strip_address()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  NEW.post_stripped_address := public.public_post_address(NEW.post_type, NEW.post_address);
  RETURN NEW;
END;
$$;

-- Repair legacy rows without firing the posts update triggers. Those
-- triggers call an external Airtable webhook and the revision/audit log on
-- every row; a data repair should not generate either. The value is computed
-- explicitly because the strip trigger is disabled for this statement.
ALTER TABLE public.posts DISABLE TRIGGER USER;
UPDATE public.posts p
   SET post_stripped_address = public.public_post_address(p.post_type, p.post_address)
 WHERE NOT public.is_public_place_post_type(p.post_type)
   AND p.post_stripped_address IS DISTINCT FROM public.public_post_address(p.post_type, p.post_address);
ALTER TABLE public.posts ENABLE TRIGGER USER;

CREATE OR REPLACE VIEW public.posts_with_location WITH (security_invoker='true') AS
 SELECT p.id,
    p.post_name,
    p.post_description,
    p.post_type,
    public.public_post_address(p.post_type, p.post_stripped_address) AS post_address,
    public.public_post_address(p.post_type, p.post_stripped_address) AS post_stripped_address,
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
    pr.avatar_url AS author_avatar_url,
    p.partner_status,
    p.network_key,
    p.opening_hours,
    p.timezone
   FROM public.posts p
   LEFT JOIN LATERAL public.fuzzed_post_point(p.id) f ON true
   LEFT JOIN public.profiles_public pr ON pr.id = p.profile_id
  WHERE (p.is_active = true);

GRANT SELECT ON public.posts_with_location TO anon, authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Migration: machine-readable opening hours for partner listings
--
-- The partner's Hours field is free text. The sync parses it into a per-weekday
-- schedule and stores the listing's IANA timezone alongside it, so the browser
-- can answer "is this open now?" in the listing's own zone. A value that cannot
-- be parsed with confidence is stored as NULL and renders "Hours unavailable";
-- it is never treated as open or closed.
--
-- Shape: {"mon":[{"start":"09:00","end":"17:00"}], ..., "sun":[]}. An empty day
-- means closed that day; an end before the start crosses midnight. The columns
-- are generic so a future non-partner listing can use them too.
--
-- The view appends the two columns at the end (PostgreSQL allows adding view
-- columns there) and the apply function writes them on insert and update.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS opening_hours jsonb,
  ADD COLUMN IF NOT EXISTS timezone text;

COMMENT ON COLUMN public.posts.opening_hours IS
  'Per-weekday schedule (mon..sun) of start/end wall-clock times; NULL when the source text could not be parsed.';
COMMENT ON COLUMN public.posts.timezone IS
  'IANA timezone the schedule is evaluated in, e.g. America/Los_Angeles.';

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
    pr.avatar_url AS author_avatar_url,
    p.partner_status,
    p.network_key,
    p.opening_hours,
    p.timezone
   FROM public.posts p
   LEFT JOIN LATERAL public.fuzzed_post_point(p.id) f ON true
   LEFT JOIN public.profiles_public pr ON pr.id = p.profile_id
  WHERE (p.is_active = true);

CREATE OR REPLACE FUNCTION public.apply_partner_sync(
  p_network_key text,
  p_records jsonb,
  p_rows jsonb,
  p_live boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'extensions'
AS $$
DECLARE
  v_row jsonb;
  v_counts jsonb;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_hidden integer := 0;
  v_foreign integer := 0;
  v_ids text[];
  v_lat double precision;
  v_lng double precision;
  v_images text[];
  v_metadata jsonb;
  v_active boolean;
  v_skipped integer := 0;
  v_existing_id bigint;
  v_outcome text := 'ok';
BEGIN
  IF p_live IS NULL THEN
    RAISE EXCEPTION 'p_live is required';
  END IF;
  IF coalesce(btrim(p_network_key), '') = '' THEN
    RAISE EXCEPTION 'p_network_key is required';
  END IF;
  IF p_records IS NULL OR jsonb_typeof(p_records) <> 'array' THEN
    RAISE EXCEPTION 'p_records must be a JSON array';
  END IF;
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_rows must be a JSON array';
  END IF;

  -- One run at a time per network. The lock is transaction-scoped.
  IF NOT pg_try_advisory_xact_lock(hashtext('partner_sync:' || p_network_key)) THEN
    RETURN jsonb_build_object('outcome', 'locked');
  END IF;

  SELECT coalesce(array_agg(r->>'fridge_id'), ARRAY[]::text[])
    INTO v_ids
    FROM jsonb_array_elements(p_rows) r;

  -- Never adopt a listing another network (or the old import) already owns.
  SELECT count(*) INTO v_foreign
    FROM public.posts p
   WHERE p.fridge_id = ANY (v_ids)
     AND p.network_key IS DISTINCT FROM p_network_key;
  IF v_foreign > 0 THEN
    RETURN jsonb_build_object('outcome', 'refused_foreign_rows', 'foreign_rows', v_foreign);
  END IF;

  -- Complete field mirror, written in both modes.
  INSERT INTO private.airtable_fridge_records AS r
    (network_key, record_id, fields, content_hash, fetched_at, last_seen_at)
  SELECT p_network_key,
         x->>'record_id',
         x->'fields',
         md5((x->'fields')::text),
         now(),
         now()
    FROM jsonb_array_elements(p_records) x
  ON CONFLICT (network_key, record_id) DO UPDATE
    SET fields = excluded.fields,
        content_hash = excluded.content_hash,
        fetched_at = excluded.fetched_at,
        last_seen_at = excluded.last_seen_at;

  -- Count without writing when this is a dry run.
  IF NOT p_live THEN
    SELECT count(*) FILTER (WHERE p.id IS NULL AND lower(coalesce(r->>'partner_status', '')) = 'active'),
           count(*) FILTER (WHERE p.id IS NOT NULL),
           count(*) FILTER (WHERE p.id IS NULL AND lower(coalesce(r->>'partner_status', '')) <> 'active')
      INTO v_inserted, v_updated, v_skipped
      FROM jsonb_array_elements(p_rows) r
      LEFT JOIN public.posts p
        ON p.fridge_id = r->>'fridge_id'
       AND p.network_key = p_network_key;
    SELECT count(*) INTO v_hidden
      FROM public.posts p
     WHERE p.network_key = p_network_key
       AND p.fridge_id IS NOT NULL
       AND NOT (p.fridge_id = ANY (v_ids));
    v_outcome := 'dry_run';
    v_counts := jsonb_build_object(
      'would_insert', v_inserted,
      'would_update', v_updated,
      'would_hide', v_hidden,
      'would_skip_inactive', v_skipped,
      'records', jsonb_array_length(p_records)
    );
    INSERT INTO private.airtable_sync_runs (network_key, mode, outcome, counts)
    VALUES (p_network_key, 'dry_run', v_outcome, v_counts);
    RETURN v_counts || jsonb_build_object('outcome', v_outcome);
  END IF;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    v_metadata := coalesce(v_row->'metadata', '{}'::jsonb);
    v_active := lower(coalesce(v_row->>'partner_status', '')) = 'active';
    v_lat := nullif(v_row->>'latitude', '')::double precision;
    v_lng := nullif(v_row->>'longitude', '')::double precision;
    v_images := CASE
      WHEN v_row ? 'images' AND jsonb_typeof(v_row->'images') = 'array' AND jsonb_array_length(v_row->'images') > 0
        THEN ARRAY(SELECT jsonb_array_elements_text(v_row->'images'))
      ELSE NULL
    END;

    SELECT p.id INTO v_existing_id
      FROM public.posts p
     WHERE p.fridge_id = v_row->>'fridge_id'
       AND p.network_key = p_network_key;

    IF v_existing_id IS NULL THEN
      IF NOT v_active THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;
      INSERT INTO public.posts (
        profile_id, post_name, post_type, post_address, available_hours,
        has_pantry, location_type, is_active, fridge_id, network_key,
        partner_status, metadata, images, opening_hours, timezone, location
      ) VALUES (
        '00000000-0000-0000-0000-000000000001'::uuid,
        v_row->>'post_name',
        'fridge',
        coalesce(nullif(v_row->>'post_address', ''), '-'),
        coalesce(nullif(v_row->>'available_hours', ''), '-'),
        coalesce((v_row->>'has_pantry')::boolean, false),
        coalesce(nullif(v_row->>'location_type', ''), '-'),
        true,
        v_row->>'fridge_id',
        p_network_key,
        nullif(v_row->>'partner_status', ''),
        v_metadata,
        coalesce(v_images, ARRAY[]::text[]),
        v_row->'opening_hours',
        nullif(v_row->>'timezone', ''),
        CASE WHEN v_lat IS NOT NULL AND v_lng IS NOT NULL
          THEN extensions.ST_SetSRID(extensions.ST_MakePoint(v_lng, v_lat), 4326)::extensions.geography
          ELSE NULL END
      );
      v_inserted := v_inserted + 1;
    ELSE
      -- Airtable is the source of truth for this network: every mapped field
      -- takes the record's value, including a cleared one. A local edit to a
      -- synced field does not survive the next run.
      UPDATE public.posts p
         SET post_name = v_row->>'post_name',
             post_address = coalesce(nullif(v_row->>'post_address', ''), '-'),
             available_hours = coalesce(nullif(v_row->>'available_hours', ''), '-'),
             has_pantry = coalesce((v_row->>'has_pantry')::boolean, false),
             location_type = coalesce(nullif(v_row->>'location_type', ''), '-'),
             is_active = v_active,
             partner_status = nullif(v_row->>'partner_status', ''),
             metadata = CASE
               WHEN coalesce(cardinality(v_images), 0) > 0 AND p.images IS NOT DISTINCT FROM v_images
                 THEN coalesce(p.metadata, '{}'::jsonb) || v_metadata
               ELSE v_metadata
             END,
             images = coalesce(v_images, ARRAY[]::text[]),
             opening_hours = v_row->'opening_hours',
             timezone = nullif(v_row->>'timezone', ''),
             location = CASE WHEN v_lat IS NOT NULL AND v_lng IS NOT NULL
               THEN extensions.ST_SetSRID(extensions.ST_MakePoint(v_lng, v_lat), 4326)::extensions.geography
               ELSE NULL END,
             updated_at = now()
       WHERE p.id = v_existing_id;
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  -- A record that disappeared from their Airtable is hidden, never deleted.
  UPDATE public.posts p
     SET is_active = false,
         updated_at = now()
   WHERE p.network_key = p_network_key
     AND p.fridge_id IS NOT NULL
     AND NOT (p.fridge_id = ANY (v_ids));
  GET DIAGNOSTICS v_hidden = ROW_COUNT;

  v_counts := jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'hidden', v_hidden,
    'skipped_inactive', v_skipped,
    'records', jsonb_array_length(p_records)
  );
  INSERT INTO private.airtable_sync_runs (network_key, mode, outcome, counts)
  VALUES (p_network_key, 'live', v_outcome, v_counts);
  RETURN v_counts || jsonb_build_object('outcome', v_outcome);
END;
$$;

COMMENT ON FUNCTION public.apply_partner_sync(text, jsonb, jsonb, boolean) IS
  'Applies one partner-network sync: mirrors raw records, posts Active records, overwrites every synced field, photo set and opening hours from the partner''s Airtable; never deletes listings.';

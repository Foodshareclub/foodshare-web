-- Migration: partner sync posts Active records only, and adopts existing listings
--
-- User decision 2026-11-26: keep every fridge in the database, post the Active
-- ones, and stay in sync with each one's status. This replaces the function
-- from 20261126040000 (which posted every record) and adopts the listings that
-- already exist, so the first live run updates them instead of duplicating
-- them. 040000 is left byte-for-byte as shipped, because a queued deployment
-- may already have applied it.
--
-- Active means the partner status, case-insensitive, is exactly 'Active'. A
-- posted record that turns Inactive, On hold, Setting up or blank is hidden on
-- the next run; a record that was never Active is never posted. Nothing is
-- deleted, and every record stays in private.airtable_fridge_records.
--
-- Re-runnable: the adoption touches only rows with no fridge_id and no network
-- key, and CREATE OR REPLACE keeps the grants.

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
        partner_status, metadata, images, location
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
        CASE WHEN v_lat IS NOT NULL AND v_lng IS NOT NULL
          THEN extensions.ST_SetSRID(extensions.ST_MakePoint(v_lng, v_lat), 4326)::extensions.geography
          ELSE NULL END
      );
      v_inserted := v_inserted + 1;
    ELSE
      UPDATE public.posts p
         SET post_name = v_row->>'post_name',
             post_address = coalesce(nullif(v_row->>'post_address', ''), p.post_address),
             available_hours = coalesce(nullif(v_row->>'available_hours', ''), p.available_hours),
             has_pantry = coalesce((v_row->>'has_pantry')::boolean, p.has_pantry),
             location_type = coalesce(nullif(v_row->>'location_type', ''), p.location_type),
             is_active = v_active,
             partner_status = nullif(v_row->>'partner_status', ''),
             metadata = v_metadata,
             images = coalesce(v_images, p.images),
             location = CASE WHEN v_lat IS NOT NULL AND v_lng IS NOT NULL
               THEN extensions.ST_SetSRID(extensions.ST_MakePoint(v_lng, v_lat), 4326)::extensions.geography
               ELSE p.location END,
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
  'Applies one partner-network sync: mirrors raw records, posts Active records, updates or hides the network''s own listings, and never deletes.';

-- One-time adoption of the existing listings into the sync. Each pair was
-- checked by hand: the same street address, or the same site within a block
-- with the name identical. Highland Park is deliberately not adopted (the
-- partner is on a different street), nor Pico Union's second old row, nor the
-- six records with no counterpart. Those are posted as new listings.
WITH map(record_id, post_id, label) AS (
  VALUES
    ('rec0YNv8LOVlFvgJW', 11592, 'Van Nuys'),
    ('rec2bqRn18WXBOkjo', 11593, 'El Sereno'),
    ('rec8YBh7JACNDYHg1', 11600, 'Glassell Park'),
    ('recF1sBD5pMbzAQru',  8575, 'Pomona (LA Community Fridge)'),
    ('recJ5NKHFkHCh9sQe', 11611, 'West Athens'),
    ('recLKsHBOKosIOG7h', 11613, 'West Adams'),
    ('recQf8SLjzJQzgl1h', 11617, 'Westlake'),
    ('recUQVegWZG4t7RXB', 11621, 'South Western & W 56th'),
    ('recZlfyUDA3hGEN5D', 11625, 'Koreatown Solar'),
    ('recoIXVzvNpa5qjZn', 11631, 'Watts'),
    ('recsaaDn3Ci3vqQPw', 11635, 'East Palmdale'),
    ('recuZuqYshrvT5DMS', 11615, 'Pico Union')
)
UPDATE public.posts p
   SET fridge_id = m.record_id,
       network_key = 'lacf',
       partner_status = 'Active',
       is_active = true,
       updated_at = now()
  FROM map m
 WHERE p.id = m.post_id
   AND p.post_type = 'fridge'
   AND p.fridge_id IS NULL
   AND p.network_key IS NULL
   AND NOT EXISTS (SELECT 1 FROM public.posts q WHERE q.fridge_id = m.record_id);

-- F1, phase 1: anon column-level access to public.posts
--
-- Wave spec (2026-11-06, security/verifier/architect consensus):
-- REVOKE the table-level SELECT from anon, then — same migration —
-- GRANT SELECT on every posts column EXCEPT the exact-location trio
-- (location, location_json, post_address).
--
-- Why REVOKE-then-GRANT in one migration: posts_with_location is
-- SECURITY INVOKER, so when anon queries the public view the invoker's
-- (anon's) column privileges are checked against this table. A bare
-- REVOKE would break public browse at restore step 4 and trip the §6
-- triple's leg 2 (anon view read → 200). The GRANT restores every
-- column the view touches; the trio is the complete exact-coordinate
-- surface (location_json is GENERATED ALWAYS AS st_asgeojson(location),
-- there are no denormalized lat/lng columns).
--
-- Companion code (same wave, foodshare-web C1): the 7 mapped phase-1
-- client sites no longer reference the excluded columns as anon
-- (6 count-only select("*") → select("id"); getUserProducts drops
-- post_address and moves to the user-scoped client).
--
-- Phase 2 (later wave, gated on re-pointed app builds) applies the
-- same shape to the authenticated role and lands the app/web re-points
-- (mapping: docs/F1_POSTS_READER_MAPPING_2026-11-06.md).
BEGIN;

REVOKE SELECT ON public.posts FROM anon;
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
  news_articles,
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
  transportation,
  updated_at,
  version,
  website
) ON public.posts TO anon;

COMMIT;

NOTIFY pgrst, 'reload schema';

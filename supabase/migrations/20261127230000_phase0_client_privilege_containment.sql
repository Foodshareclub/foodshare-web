-- Phase 0 containment: client roles cannot destroy or reshape schema objects,
-- and authenticated cannot read the exact pickup point from public.posts.
--
-- The baseline granted ALL on every table in public to anon and authenticated.
-- That includes TRUNCATE, which bypasses RLS: any authenticated user could
-- empty a table regardless of policy. It also includes REFERENCES, TRIGGER and
-- (PostgreSQL 17) MAINTAIN, none of which any client path uses. Revoking the
-- four changes no read or write the API performs.
--
-- public.posts still had table-level SELECT for authenticated, so a direct
-- PostgREST query could read location, location_json and post_address for any
-- active listing. Revoke it and grant only the safe columns. The owner path
-- keeps exact coordinates through get_post_exact_location(); the public
-- posts_with_location view selects only granted columns and returns the
-- fuzzed point and stripped address.
--
-- anon already has column-level SELECT from 20261106000000_f1; it is left as
-- is so this migration does not widen what the public key can read.
--
-- Reversal is a GRANT: no data is rewritten and no object is dropped.
BEGIN;

REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

REVOKE SELECT ON public.posts FROM authenticated;
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
) ON public.posts TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

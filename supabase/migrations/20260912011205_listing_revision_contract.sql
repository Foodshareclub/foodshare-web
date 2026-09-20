-- Edit revisions are independent of sync tracking: views, likes, and search
-- indexing must not invalidate an open edit. Apply before the matching clients.
BEGIN;

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS expires_at timestamptz;
COMMENT ON COLUMN public.posts.expires_at IS 'Optional expiry supplied by the listing author';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 1;
COMMENT ON COLUMN public.posts.version IS 'Optimistic edit revision; excludes analytics and sync bookkeeping';

CREATE OR REPLACE FUNCTION public.update_listing_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.version := 1;
  ELSIF ROW(
    NEW.profile_id, NEW.post_name, NEW.post_description, NEW.post_type,
    NEW.post_address, NEW.post_stripped_address, NEW.images, NEW.location::text,
    NEW.pickup_time, NEW.available_hours, NEW.transportation, NEW.condition,
    NEW.category_id, NEW.is_active, NEW.is_arranged, NEW.post_arranged_to,
    NEW.post_arranged_at, NEW.quantity, NEW.contact_preferences, NEW.expires_at,
    NEW.metadata, NEW.has_pantry, NEW.fridge_id, NEW.network, NEW.website,
    NEW.donation, NEW.donation_rules, NEW.location_type, NEW.tags, NEW.label,
    NEW.food_in_fridge, NEW.local_map, NEW.linktree, NEW.news_articles,
    NEW.prefill_form, NEW.admin_notes, NEW.post_slug
  ) IS DISTINCT FROM ROW(
    OLD.profile_id, OLD.post_name, OLD.post_description, OLD.post_type,
    OLD.post_address, OLD.post_stripped_address, OLD.images, OLD.location::text,
    OLD.pickup_time, OLD.available_hours, OLD.transportation, OLD.condition,
    OLD.category_id, OLD.is_active, OLD.is_arranged, OLD.post_arranged_to,
    OLD.post_arranged_at, OLD.quantity, OLD.contact_preferences, OLD.expires_at,
    OLD.metadata, OLD.has_pantry, OLD.fridge_id, OLD.network, OLD.website,
    OLD.donation, OLD.donation_rules, OLD.location_type, OLD.tags, OLD.label,
    OLD.food_in_fridge, OLD.local_map, OLD.linktree, OLD.news_articles,
    OLD.prefill_form, OLD.admin_notes, OLD.post_slug
  ) THEN
    NEW.version := OLD.version + 1;
  ELSE
    NEW.version := OLD.version;
  END IF;
  RETURN NEW;
END;
$$;

-- Only the trigger invokes this function; it is not a public RPC.
REVOKE ALL ON FUNCTION public.update_listing_version() FROM PUBLIC;
DROP TRIGGER IF EXISTS posts_version_trg ON public.posts;
CREATE TRIGGER posts_version_trg BEFORE INSERT OR UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.update_listing_version();

CREATE OR REPLACE VIEW public.posts_with_location WITH (security_invoker='true') AS
 SELECT p.id,
    p.post_name,
    p.post_description,
    p.post_type,
    p.post_address,
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
    p.location,
    p.location_json,
    extensions.st_y((p.location)::extensions.geometry) AS latitude,
    extensions.st_x((p.location)::extensions.geometry) AS longitude,
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
    p.version
   FROM public.posts p
  WHERE (p.is_active = true);

GRANT SELECT ON public.posts_with_location TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;

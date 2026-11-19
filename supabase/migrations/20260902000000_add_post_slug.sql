-- Migration: Agnostic product canonical slug for 10x SEO
-- Adds post_slug to posts, backfills, trigger, indexes, and exposes via posts_with_location view

-- 1. Column
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS post_slug TEXT;

-- 2. Backfill existing rows (slugify post_name, fallback to id-based)
UPDATE public.posts
SET post_slug = regexp_replace(
  lower(trim(coalesce(post_name, ''))),
  '[^a-z0-9]+', '-', 'g'
)
WHERE post_slug IS NULL AND coalesce(post_name,'') <> '';
-- Fallback for empty names
UPDATE public.posts
SET post_slug = 'item-' || id::text
WHERE post_slug IS NULL OR post_slug = '' OR post_slug = '-';

-- Trim leading/trailing dashes and limit to 60 chars
UPDATE public.posts
SET post_slug = substring(trim(both '-' from post_slug) from 1 for 60)
WHERE post_slug IS NOT NULL;

-- Ensure no empty after trim
UPDATE public.posts
SET post_slug = 'item-' || id::text
WHERE post_slug IS NULL OR post_slug = '';

-- 3. Trigger to keep slug in sync with post_name (only generate when not yet set)
CREATE OR REPLACE FUNCTION public.set_post_slug()
RETURNS trigger AS $$
BEGIN
  -- Only generate post_slug if it has never been set (IS NULL).
  -- Do NOT overwrite an already-computed slug when post_name changes.
  IF NEW.post_slug IS NULL THEN
    NEW.post_slug := substring(
      trim(both '-' from regexp_replace(lower(trim(coalesce(NEW.post_name, ''))), '[^a-z0-9]+', '-', 'g'))
      from 1 for 60
    );
    IF NEW.post_slug IS NULL OR NEW.post_slug = '' OR NEW.post_slug = '-' THEN
      NEW.post_slug := 'item-' || coalesce(NEW.id::text, 'item');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posts_slug_trg ON public.posts;
CREATE TRIGGER posts_slug_trg
BEFORE INSERT OR UPDATE OF post_name ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.set_post_slug();

-- 4. Indexes CONCURRENTLY (allow cheap lookups + sitemap ordering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_slug ON public.posts (post_slug);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_active_slug ON public.posts (post_slug) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_slug_lookup ON public.posts (id, post_slug);
-- 5. Partial unique constraint: one slug per active post (prevents URL conflicts)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uc_posts_active_slug ON public.posts (post_slug) WHERE is_active = true;

-- 5. Expose via posts_with_location view (add post_slug)
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
    concat(p.id::text, '-', p.post_slug) AS canonical_slug
   FROM public.posts p
  WHERE (p.is_active = true);

GRANT SELECT ON public.posts_with_location TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';

COMMENT ON COLUMN public.posts.post_slug IS 'SEO slug for agnostic /product/[id]-[slug] canonical (10x pro)';

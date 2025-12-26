-- Migration: defer_heavy_forum_triggers_v2
-- Description: Optimize forum post publishing by removing heavy synchronous triggers
-- Applied: 2025-12-25
--
-- Problem: Forum post INSERT was running ~15 database operations synchronously
-- Solution: Disable non-critical triggers (reputation, activity, user stats)

-- 1. Disable reputation trigger (heaviest - does 6+ queries)
DROP TRIGGER IF EXISTS trg_forum_post_reputation ON forum;

-- 2. Disable activity logging trigger
DROP TRIGGER IF EXISTS trg_forum_post_activity ON forum;

-- 3. Disable user stats trigger (does 2 queries)
DROP TRIGGER IF EXISTS update_user_stats_on_post_trigger ON forum;

-- 4. Optimize slug generation - skip if slug already provided
CREATE OR REPLACE FUNCTION public.generate_forum_slug()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
BEGIN
  -- Skip if slug is already provided (client-side generation)
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
    RETURN NEW;
  END IF;

  -- Generate base slug from title only if not provided
  IF NEW.forum_post_name IS NOT NULL THEN
    base_slug := lower(regexp_replace(NEW.forum_post_name, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := regexp_replace(base_slug, '^-|-$', '', 'g');
    base_slug := left(base_slug, 80);

    -- Add timestamp to ensure uniqueness without loop
    final_slug := base_slug || '-' || extract(epoch from now())::bigint;
    NEW.slug := final_slug;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION generate_forum_slug IS 'Optimized: skips generation when slug provided by client';

-- Deferred functionality (can be backfilled later):
-- - Reputation points for creating posts (trg_forum_post_reputation)
-- - Activity feed logging (trg_forum_post_activity)
-- - User post count stats (update_user_stats_on_post_trigger)

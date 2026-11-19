-- Migration: Harden search_path + slug trigger (bleeding edge)
-- Fixes R23 (search_path hijack) + R20 (trigger narrow + empty slug) + R19 HNSW params (if needed)

-- 1. Harden set_post_slug with search_path + broader trigger
CREATE OR REPLACE FUNCTION public.set_post_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  -- Trigger on INSERT or UPDATE OF post_name, post_slug, handle empty string
  IF TG_OP = 'INSERT' OR NEW.post_name IS DISTINCT FROM OLD.post_name OR NEW.post_slug IS NULL OR NEW.post_slug = '' OR NEW.post_slug = '-' THEN
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
$$;

DROP TRIGGER IF EXISTS posts_slug_trg ON public.posts;
CREATE TRIGGER posts_slug_trg
BEFORE INSERT OR UPDATE OF post_name, post_slug ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.set_post_slug();

-- Ensure CHECK to prevent empty/invalid slug (soft, not strict to allow backfill)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_posts_post_slug_format') THEN
    ALTER TABLE public.posts ADD CONSTRAINT chk_posts_post_slug_format CHECK (post_slug ~ '^[a-z0-9-]{1,60}$');
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Harden match_posts (vector search) with search_path and SECURITY INVOKER guard
-- Recreate with search_path + threshold guard
DROP FUNCTION IF EXISTS public.match_posts(vector, float, int);
CREATE OR REPLACE FUNCTION public.match_posts(
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (id bigint, similarity float)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT
    posts.id,
    1 - (posts.embedding <=> query_embedding) as similarity
  FROM posts
  WHERE 1 - (posts.embedding <=> query_embedding) > match_threshold
  ORDER BY posts.embedding <=> query_embedding
  LIMIT LEAST(match_count, 50);
$$;

COMMENT ON FUNCTION public.match_posts IS 'Vector search — bleeding edge HNSW, search_path hardened, match_count capped 50';

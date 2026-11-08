-- infoplist_translation_cache: LLM translation cache for the infoplist
-- localization generator.
--
-- WHY THIS FILE EXISTS: api-v1-localization's generate-infoplist-strings
-- handler (already deployed) reads and writes this table on every run. No
-- migration ever created it, so in production every read failed
-- (relation does not exist), the handler's error path returned "no cache",
-- and every run re-sent all 20 non-English locales to the LLM — paying
-- translation cost and latency for work that was supposed to be cached.
-- The failure was silent: the handler catches everything and degrades to
-- "no cache", which is exactly what a missing table looks like.
--
-- SAFETY PROPERTIES:
-- • CREATE TABLE IF NOT EXISTS: pure no-op where the table already exists
--   (it exists on no database this file knows of, but a manual creation in
--   any environment is respected, not dropped and rebuilt).
-- • the columns and primary key are exactly what the deployed handler
--   reads/writes: .select("translations").eq("content_hash", ...)
--   .eq("locale", ...) and upsert(..., { onConflict: "content_hash,locale" }).
-- • RLS enabled, service_role-only policy: this is a service cache, not
--   user data. Same fail-closed shape as geocoding_cache (20260908000000):
--   a table this file cannot set up has no access at all.

CREATE TABLE IF NOT EXISTS public.infoplist_translation_cache (
  content_hash TEXT NOT NULL,
  locale TEXT NOT NULL,
  translations JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (content_hash, locale)
);

-- Plain index only (the transactional runner wraps this file in
-- BEGIN/COMMIT; this table needs none beyond the primary key).

ALTER TABLE IF EXISTS public.infoplist_translation_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_infoplist_translation_cache') THEN
    CREATE POLICY service_role_all_infoplist_translation_cache
      ON public.infoplist_translation_cache
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  RAISE NOTICE '20261108000000 complete: infoplist_translation_cache ensured (table, RLS, service_role policy)';
END $$;

-- Enable RLS on tables that shipped without it.
-- Service role bypasses RLS, so existing edge functions keep working;
-- user-scoped access is denied by default until per-feature policies land.

ALTER TABLE IF EXISTS public.geocoding_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rate_limit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.household_waste_logs ENABLE ROW LEVEL SECURITY;

-- Service-role full access (edge functions using SERVICE_ROLE_KEY are unaffected).
-- Table-guard (2026-09-08): same prod-drift rationale as 20260907 — skip with
-- NOTICE instead of aborting the deploy when a table is absent. Safe to add
-- to an applied file: on databases where it ran, every branch is a no-op.
DO $$ BEGIN
  IF to_regclass('public.geocoding_cache') IS NULL THEN
    RAISE NOTICE 'skip: public.geocoding_cache missing, service_role policy left to repair migration (see 20260908000000)';
  ELSIF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_geocoding_cache') THEN
    CREATE POLICY service_role_all_geocoding_cache ON public.geocoding_cache
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF to_regclass('public.rate_limit_entries') IS NULL THEN
    RAISE NOTICE 'skip: public.rate_limit_entries missing, service_role policy left to repair migration (see 20260908000000)';
  ELSIF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_rate_limit_entries') THEN
    CREATE POLICY service_role_all_rate_limit_entries ON public.rate_limit_entries
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF to_regclass('public.household_waste_logs') IS NULL THEN
    RAISE NOTICE 'skip: public.household_waste_logs missing, service_role policy left to repair migration (see 20260908000000)';
  ELSIF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_household_waste_logs') THEN
    CREATE POLICY service_role_all_household_waste_logs ON public.household_waste_logs
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

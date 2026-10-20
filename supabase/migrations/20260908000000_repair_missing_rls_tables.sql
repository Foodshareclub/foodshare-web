-- Repair: re-create RLS-table set missing from prod.
--
-- WHY THIS FILE EXISTS: 20260906000000 applied when public.geocoding_cache
-- (and possibly siblings) existed; the table vanished from prod afterwards
-- (no DROP in migration history — manual drop or partial restore), so
-- 20260907000000 aborts on CREATE POLICY against a missing table and blocks
-- every deploy behind it. This file restores the full desired end-state for
-- all three tables; 20260906/20260907 carry skip-guards for the same drift.
--
-- SAFETY PROPERTIES (all hold on healthy, drifted, and fresh databases):
-- • every object is IF NOT EXISTS / CREATE OR REPLACE → pure no-op when
--   present; exact definitions copied verbatim from the canonical files
--   (20260215120003, 20260215120004, 20260823120000, 20260824000000).
-- • indexes are PLAIN ( transactional runner wraps this file in BEGIN/COMMIT;
--   the other index flavor cannot run inside a transaction — that is the
--   suspected original sin, and this filename must never gain that keyword).
-- • creation order respects FKs (households before household_waste_logs).
-- • fail-closed: a table this file cannot create still has no access at all.

-- ── households (canonical: 20260823120000) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  -- Deliberately no FK to the Supabase auth user table (dump/restore
  -- ordering coupling); ownership tracking only.
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.households IS 'Household units scoping foodlytics data (waste_logs)';

-- ── household_waste_logs (canonical: 20260824000000) ─────────────────────
CREATE TABLE IF NOT EXISTS public.household_waste_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  waste_weight_kg DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_household_waste_logs_household_id
ON public.household_waste_logs(household_id);

CREATE INDEX IF NOT EXISTS idx_household_waste_logs_date
ON public.household_waste_logs(date);

COMMENT ON TABLE public.household_waste_logs IS 'Stores per-household waste log entries for foodlytics analytics';

-- ── geocoding_cache (canonical: 20260215120003) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.geocoding_cache (
  address TEXT PRIMARY KEY,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  display_name TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plain index (see file header: the transactional runner cannot run the
-- other index flavor; on an existing table this is a no-op anyway).
CREATE INDEX IF NOT EXISTS idx_geocoding_cached_at
  ON public.geocoding_cache(cached_at);

CREATE OR REPLACE FUNCTION public.cleanup_geocoding_cache(p_max_age_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.geocoding_cache
  WHERE cached_at < NOW() - (p_max_age_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ── rate_limit_entries (canonical: 20260215120004) ────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limit_entries (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_key_created
  ON public.rate_limit_entries(key, created_at);

CREATE INDEX IF NOT EXISTS idx_rate_limit_cleanup
  ON public.rate_limit_entries(created_at);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_ms BIGINT
) RETURNS JSONB AS $$
DECLARE
  v_now BIGINT := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
  v_window_start BIGINT := v_now - p_window_ms;
  v_count INTEGER;
  v_reset_at BIGINT;
BEGIN
  DELETE FROM public.rate_limit_entries
  WHERE key = p_key AND created_at < v_window_start;

  SELECT COUNT(*) INTO v_count
  FROM public.rate_limit_entries
  WHERE key = p_key AND created_at >= v_window_start;

  IF v_count >= p_limit THEN
    SELECT MIN(created_at) + p_window_ms INTO v_reset_at
    FROM public.rate_limit_entries
    WHERE key = p_key AND created_at >= v_window_start;

    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_at', v_reset_at,
      'retry_after_ms', v_reset_at - v_now
    );
  END IF;

  INSERT INTO public.rate_limit_entries (key, created_at)
  VALUES (p_key, v_now);

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', p_limit - v_count - 1,
    'reset_at', v_now + p_window_ms,
    'retry_after_ms', 0
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_entries(p_max_age_ms BIGINT DEFAULT 3600000)
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.rate_limit_entries
  WHERE created_at < (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT - p_max_age_ms;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ── RLS + service-role policies (mirror 20260906; no-op when present) ─────
ALTER TABLE IF EXISTS public.geocoding_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rate_limit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.household_waste_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_geocoding_cache') THEN
    CREATE POLICY service_role_all_geocoding_cache ON public.geocoding_cache
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_rate_limit_entries') THEN
    CREATE POLICY service_role_all_rate_limit_entries ON public.rate_limit_entries
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_household_waste_logs') THEN
    CREATE POLICY service_role_all_household_waste_logs ON public.household_waste_logs
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Authenticated-user policies (mirror 20260907; no-op when present) ─────
-- Tables are guaranteed present by the ensures above, so no skip-guards here.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'geocoding_cache'
      AND policyname = 'Authenticated users can read geocoding_cache'
  ) THEN
    CREATE POLICY "Authenticated users can read geocoding_cache"
      ON public.geocoding_cache
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'household_waste_logs'
      AND policyname = 'Users can view own household_waste_logs'
  ) THEN
    CREATE POLICY "Users can view own household_waste_logs"
      ON public.household_waste_logs
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.households h
          WHERE h.id = household_waste_logs.household_id
            AND h.created_by = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'household_waste_logs'
      AND policyname = 'Users can insert own household_waste_logs'
  ) THEN
    CREATE POLICY "Users can insert own household_waste_logs"
      ON public.household_waste_logs
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.households h
          WHERE h.id = household_waste_logs.household_id
            AND h.created_by = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'household_waste_logs'
      AND policyname = 'Users can update own household_waste_logs'
  ) THEN
    CREATE POLICY "Users can update own household_waste_logs"
      ON public.household_waste_logs
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.households h
          WHERE h.id = household_waste_logs.household_id
            AND h.created_by = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.households h
          WHERE h.id = household_waste_logs.household_id
            AND h.created_by = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'household_waste_logs'
      AND policyname = 'Users can delete own household_waste_logs'
  ) THEN
    CREATE POLICY "Users can delete own household_waste_logs"
      ON public.household_waste_logs
      FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.households h
          WHERE h.id = household_waste_logs.household_id
            AND h.created_by = (SELECT auth.uid())
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  RAISE NOTICE 'repair 20260908 complete: RLS table set ensured (tables, plain indexes, RLS, service_role + user policies)';
END $$;

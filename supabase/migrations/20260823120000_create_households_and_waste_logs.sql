-- Migration: Create households and waste_logs (prerequisite schema)
--
-- These tables were previously created out-of-band in production and are
-- required by 20260824000000 (households FK) and the foodlytics feature.
-- Fully idempotent: CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS
-- converge any partial/out-of-band shape to the canonical one.

-- ── households ────────────────────────────────────────────────────────────
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

-- ── waste_logs ─────────────────────────────────────────────────────────────
-- Shape mirrors src/app/foodlytics/page.tsx insert payload.
CREATE TABLE IF NOT EXISTS public.waste_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid,
  food_name text NOT NULL,
  category text,
  weight_lbs numeric(10, 2) NOT NULL DEFAULT 0,
  cost_usd numeric(10, 2),
  discard_date date NOT NULL DEFAULT current_date,
  reason text,
  co2_impact_lbs numeric(10, 2),
  water_impact_gal numeric(10, 2),
  household_id uuid REFERENCES public.households (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.waste_logs IS 'Per-household food waste entries for Foodlytics analytics';

-- Converge pre-existing out-of-band tables to the canonical shape.
ALTER TABLE public.waste_logs ADD COLUMN IF NOT EXISTS profile_id uuid;
ALTER TABLE public.waste_logs ADD COLUMN IF NOT EXISTS food_name text;
ALTER TABLE public.waste_logs ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.waste_logs ADD COLUMN IF NOT EXISTS weight_lbs numeric(10, 2) DEFAULT 0;
ALTER TABLE public.waste_logs ADD COLUMN IF NOT EXISTS cost_usd numeric(10, 2);
ALTER TABLE public.waste_logs ADD COLUMN IF NOT EXISTS discard_date date DEFAULT current_date;
ALTER TABLE public.waste_logs ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE public.waste_logs ADD COLUMN IF NOT EXISTS co2_impact_lbs numeric(10, 2);
ALTER TABLE public.waste_logs ADD COLUMN IF NOT EXISTS water_impact_gal numeric(10, 2);
ALTER TABLE public.waste_logs ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES public.households (id) ON DELETE CASCADE;

-- ── indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_waste_logs_household_id ON public.waste_logs (household_id);
CREATE INDEX IF NOT EXISTS idx_waste_logs_discard_date ON public.waste_logs (discard_date);
CREATE INDEX IF NOT EXISTS idx_waste_logs_profile_id ON public.waste_logs (profile_id);

-- ── row level security ─────────────────────────────────────────────────────
-- Scoped by the household_id JWT claim populated during onboarding; users may
-- additionally see rows tied to their own profile_id. Service role bypasses
-- RLS via BYPASSRLS, so no explicit service-role policy is needed.

ALTER TABLE public.waste_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'waste_logs' AND policyname = 'Users can view own household waste_logs'
  ) THEN
    CREATE POLICY "Users can view own household waste_logs" ON public.waste_logs
      FOR SELECT
      USING (
        household_id::text = auth.jwt() ->> 'household_id'
        OR (auth.uid() IS NOT NULL AND profile_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'waste_logs' AND policyname = 'Users can insert own household waste_logs'
  ) THEN
    CREATE POLICY "Users can insert own household waste_logs" ON public.waste_logs
      FOR INSERT
      WITH CHECK (
        household_id::text = auth.jwt() ->> 'household_id'
        OR (auth.uid() IS NOT NULL AND profile_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'households' AND policyname = 'Users can view own households'
  ) THEN
    CREATE POLICY "Users can view own households" ON public.households
      FOR SELECT
      USING (created_by = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'households' AND policyname = 'Users can create own households'
  ) THEN
    CREATE POLICY "Users can create own households" ON public.households
      FOR INSERT
      WITH CHECK (created_by = auth.uid());
  END IF;
END $$;

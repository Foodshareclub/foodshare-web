-- Migration: Add household_id to waste_logs for household partitioning
-- Makes waste_logs the single source of truth with household isolation
--
-- RLS policies for this table are provisioned by
-- 20260823120000_create_households_and_waste_logs.sql.
-- household_id must be populated in user metadata during onboarding
-- or via an edge function.

-- 1. Add household_id column with FK to households table
ALTER TABLE public.waste_logs ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE CASCADE;

-- 2. Create index for household-based queries
CREATE INDEX IF NOT EXISTS idx_waste_logs_household_id ON public.waste_logs(household_id);

-- 3. Comment on column
COMMENT ON COLUMN public.waste_logs.household_id IS 'Reference to the household — enables per-household RLS and metrics. Populated via Supabase auth user_metadata during onboarding or via edge function.';

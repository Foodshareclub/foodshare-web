-- Migration: Create household_waste_logs table
-- Stores per-household waste log entries for foodlytics analytics

CREATE TABLE IF NOT EXISTS public.household_waste_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  waste_weight_kg DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for household-based queries
CREATE INDEX IF NOT EXISTS idx_household_waste_logs_household_id
ON public.household_waste_logs(household_id);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_household_waste_logs_date
ON public.household_waste_logs(date);

-- Comment on table
COMMENT ON TABLE public.household_waste_logs IS 'Stores per-household waste log entries for foodlytics analytics';

-- Comment on columns
COMMENT ON COLUMN public.household_waste_logs.id IS 'Primary key';
COMMENT ON COLUMN public.household_waste_logs.household_id IS 'Reference to the household';
COMMENT ON COLUMN public.household_waste_logs.date IS 'Date of the waste log entry';
COMMENT ON COLUMN public.household_waste_logs.waste_weight_kg IS 'Total waste weight in kilograms';
COMMENT ON COLUMN public.household_waste_logs.created_at IS 'Timestamp when the log was created';
COMMENT ON COLUMN public.household_waste_logs.updated_at IS 'Timestamp when the log was last updated';
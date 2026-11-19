-- us_foodwaste_categories (2026-08-26)
--
-- Foodlytics "US Waste Tracker" reads macro stats from
-- public.us_foodwaste_categories. The table existed only in the legacy
-- Supabase Cloud project and was never part of the self-hosted baseline,
-- so PostgREST returned 404 on /rest/v1/us_foodwaste_categories.
--
-- Figures are national-scale estimates (USDA/ReFED, ~2023 reference year).
CREATE TABLE IF NOT EXISTS public.us_foodwaste_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL UNIQUE,
  waste_tonnes numeric NOT NULL CHECK (waste_tonnes >= 0),
  waste_pct numeric NOT NULL CHECK (waste_pct >= 0 AND waste_pct <= 100),
  cost_usd_billions numeric NOT NULL CHECK (cost_usd_billions >= 0),
  co2_impact_million_tonnes numeric NOT NULL CHECK (co2_impact_million_tonnes >= 0),
  source text NOT NULL DEFAULT 'USDA ERS / ReFED 2023',
  last_updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.us_foodwaste_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.us_foodwaste_categories;
CREATE POLICY "Public read access" ON public.us_foodwaste_categories
  FOR SELECT USING (true);

INSERT INTO public.us_foodwaste_categories
  (category, waste_tonnes, waste_pct, cost_usd_billions, co2_impact_million_tonnes, source)
VALUES
  ('Produce',            22000000, 22.0,  75.0, 28.5, 'USDA ERS / ReFED 2023'),
  ('Dairy & Eggs',        7800000,  8.0,  21.0, 14.2, 'USDA ERS / ReFED 2023'),
  ('Meat & Poultry',      6900000,  7.0,  30.5, 24.8, 'USDA ERS / ReFED 2023'),
  ('Grains & Baked',      8500000,  8.5,  16.0,  6.1, 'USDA ERS / ReFED 2023'),
  ('Beverages',           5600000,  5.5,  12.5,  4.9, 'USDA ERS / ReFED 2023'),
  ('Prepared Foods',      7200000,  7.5,  19.0,  7.8, 'USDA ERS / ReFED 2023'),
  ('Seafood',             2100000,  2.0,   9.5,  5.6, 'USDA ERS / ReFED 2023'),
  ('Condiments & Oils',   3400000,  3.5,   7.0,  2.1, 'USDA ERS / ReFED 2023'),
  ('Snacks & Sweets',     4300000,  4.5,   9.0,  3.2, 'USDA ERS / ReFED 2023'),
  ('Frozen Foods',        3800000,  4.0,   8.5,  3.0, 'USDA ERS / ReFED 2023')
ON CONFLICT (category) DO NOTHING;

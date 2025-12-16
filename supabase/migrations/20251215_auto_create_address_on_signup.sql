-- Migration: Auto-create address record on profile signup
-- This ensures every profile has a corresponding address record (even if empty)
-- for consistent 1:1 relationship between profiles and address tables

-- ============================================================================
-- STEP 1: Create trigger function to auto-create address on profile insert
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_default_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- Security best practice: pin to empty search_path
AS $$
BEGIN
  -- Insert empty address record for the new profile
  -- Using fully qualified table reference (public.address)
  -- ON CONFLICT ensures idempotency (won't fail if address already exists)
  INSERT INTO public.address (profile_id)
  VALUES (NEW.id)
  ON CONFLICT (profile_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Add comment to function
COMMENT ON FUNCTION public.create_default_address() IS 'Automatically creates an empty address record when a new profile is created. Uses SECURITY DEFINER with pinned search_path for security.';

-- ============================================================================
-- STEP 2: Create trigger on profiles table
-- ============================================================================

-- Drop trigger if it already exists (for idempotency)
DROP TRIGGER IF EXISTS create_address_on_profile_creation ON public.profiles;

-- Create trigger to fire after profile insert
CREATE TRIGGER create_address_on_profile_creation
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_address();

-- Add comment to trigger
COMMENT ON TRIGGER create_address_on_profile_creation ON public.profiles IS
  'Automatically creates an empty address record for each new user signup';

-- ============================================================================
-- STEP 3: Backfill existing profiles that don't have address records
-- ============================================================================

-- Insert empty address records for all profiles that don't have one
INSERT INTO public.address (profile_id)
SELECT p.id
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.address a WHERE a.profile_id = p.id
)
ON CONFLICT (profile_id) DO NOTHING;

-- ============================================================================
-- STEP 4: Verify the migration
-- ============================================================================

-- This should return 0 (all profiles now have addresses)
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM public.profiles p
  WHERE NOT EXISTS (SELECT 1 FROM public.address a WHERE a.profile_id = p.id);

  IF missing_count > 0 THEN
    RAISE WARNING 'Migration incomplete: % profiles still missing address records', missing_count;
  ELSE
    RAISE NOTICE 'Migration successful: All profiles now have address records';
  END IF;
END $$;

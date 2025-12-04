-- Create system user profile for foodbank imports
-- This user owns all imported foodbank records

DO $$
BEGIN
  -- Insert system user profile if it doesn't exist
  INSERT INTO profiles (
    id,
    email,
    full_name,
    is_admin,
    created_at,
    updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000001',
    'foodbanks@foodshare.system',
    'FoodShare Data Import',
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = now();

  RAISE NOTICE 'Foodbank system user created/updated successfully';
END $$;

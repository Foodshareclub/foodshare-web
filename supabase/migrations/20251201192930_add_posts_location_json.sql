-- Migration: Add GeoJSON location support for posts
-- This ensures location data is returned in a parseable format for the frontend

-- Create a function to convert PostGIS geography to GeoJSON
CREATE OR REPLACE FUNCTION posts_location_json(posts)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  SELECT ST_AsGeoJSON($1.location)::json;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION posts_location_json IS
'Converts PostGIS geography location to GeoJSON format for frontend consumption.
Used by Supabase PostgREST to automatically include location_json in API responses.';

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION posts_location_json TO authenticated, anon;

-- Test the function works correctly
DO $$
DECLARE
  test_result json;
BEGIN
  SELECT posts_location_json(posts.*) INTO test_result
  FROM posts
  WHERE location IS NOT NULL
  LIMIT 1;

  IF test_result IS NULL THEN
    RAISE NOTICE 'Function test: No posts with location found, but function is created successfully';
  ELSE
    RAISE NOTICE 'Function test passed: %', test_result;
  END IF;
END $$;

-- Migration: Make the handle_new_user trigger map profile fields
-- This ensures cross-platform registration robustness by removing the need for 
-- apps to manually POST to /rest/v1/profiles right after signing up.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  signup_lat double precision;
  signup_lon double precision;
  user_location extensions.geography;
  meta_first_name text;
  meta_last_name text;
  meta_name text;
  meta_avatar text;
BEGIN
  -- Extract signup location from user_metadata if available
  signup_lat := (new.raw_user_meta_data->'signup_location'->>'latitude')::double precision;
  signup_lon := (new.raw_user_meta_data->'signup_location'->>'longitude')::double precision;
  
  -- Extract name fields
  meta_first_name := new.raw_user_meta_data->>'first_name';
  meta_last_name := new.raw_user_meta_data->>'last_name';
  meta_name := new.raw_user_meta_data->>'name';
  meta_avatar := new.raw_user_meta_data->>'avatar_url';

  -- Fallback logic for full name
  IF meta_first_name IS NULL AND meta_name IS NOT NULL THEN
    IF position(' ' in meta_name) > 0 THEN
      meta_first_name := split_part(meta_name, ' ', 1);
      meta_last_name := right(meta_name, length(meta_name) - length(meta_first_name) - 1);
    ELSE
      meta_first_name := meta_name;
      meta_last_name := NULL;
    END IF;
  END IF;

  -- Create PostGIS point if coordinates are valid
  IF signup_lat IS NOT NULL AND signup_lon IS NOT NULL 
     AND signup_lat >= -90 AND signup_lat <= 90 
     AND signup_lon >= -180 AND signup_lon <= 180 THEN
    user_location := extensions.ST_SetSRID(extensions.ST_MakePoint(signup_lon, signup_lat), 4326)::extensions.geography;
  ELSE
    user_location := NULL;
  END IF;

  -- Insert profile with location and metadata
  INSERT INTO public.profiles (
    id, email, location, first_name, second_name, nickname, avatar_url, is_active, is_verified, created_time
  )
  VALUES (
    new.id, 
    new.email, 
    user_location, 
    meta_first_name, 
    meta_last_name, 
    COALESCE(meta_name, new.raw_user_meta_data->>'full_name'), 
    meta_avatar, 
    true, 
    false, 
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    location = COALESCE(profiles.location, EXCLUDED.location),
    first_name = COALESCE(profiles.first_name, EXCLUDED.first_name),
    second_name = COALESCE(profiles.second_name, EXCLUDED.second_name),
    nickname = COALESCE(profiles.nickname, EXCLUDED.nickname),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url);
  
  RETURN new;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates or updates a profile when a user signs up or updates their metadata. Maps user_metadata natively to avoid duplicate inserts from clients.';

-- Ensure the trigger runs on INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure the trigger also runs on UPDATE of raw_user_meta_data (Crucial for Apple Sign In & SSO Sync)
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
  EXECUTE FUNCTION public.handle_new_user();

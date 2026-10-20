-- Fix: a signup must not be rejected because the client sent no display name
-- and no avatar.
--
-- public.handle_new_user() copies the signup metadata into the profile row,
-- and it inserted NULL for nickname and avatar_url whenever the metadata did
-- not carry them. Both columns are NOT NULL, and a column default only
-- applies to a column that is not named in the INSERT — so the insert failed
-- with 23502, GoTrue answered 500 "Database error saving new user", and the
-- signup did not happen at all. A signup only worked when the client
-- happened to send both a name and an avatar URL.
--
-- The values inserted are now the column defaults, which is exactly what a
-- plain INSERT into public.profiles would have produced. The defaults are
-- spelled out because an INSERT that names a column does not get them; they
-- must be kept in step with the column defaults of public.profiles.

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

  -- Insert profile with location and metadata.
  --
  -- The COALESCE calls are the column defaults of public.profiles for the
  -- columns this INSERT names: '' for first_name, second_name and nickname,
  -- and the default avatar for avatar_url.
  INSERT INTO public.profiles (
    id, email, location, first_name, second_name, nickname, avatar_url, is_active, is_verified, created_time
  )
  VALUES (
    new.id,
    new.email,
    user_location,
    COALESCE(meta_first_name, ''),
    COALESCE(meta_last_name, ''),
    COALESCE(meta_name, new.raw_user_meta_data->>'full_name', ''),
    COALESCE(
      meta_avatar,
      'https://iazmjdjwnkilycbjwpzp.supabase.co/storage/v1/object/public/profiles/avatar.png'
    ),
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

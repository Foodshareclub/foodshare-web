-- Backfill missing profiles for legacy users
-- This ensures the backend is completely robust and all auth.users have a corresponding public.profiles entry

DO $$
DECLARE
  rec RECORD;
  meta_first_name TEXT;
  meta_last_name TEXT;
  meta_name TEXT;
  meta_avatar TEXT;
  computed_nickname TEXT;
BEGIN
  FOR rec IN
    SELECT id, email, created_at, raw_user_meta_data
    FROM auth.users
    WHERE NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.users.id
    )
  LOOP
    -- Extract metadata from GoTrue raw_user_meta_data
    meta_first_name := rec.raw_user_meta_data->>'first_name';
    meta_last_name := rec.raw_user_meta_data->>'last_name';
    meta_name := rec.raw_user_meta_data->>'name';
    meta_avatar := rec.raw_user_meta_data->>'avatar_url';

    -- Compute nickname
    computed_nickname := COALESCE(
      meta_name,
      TRIM(CONCAT_WS(' ', meta_first_name, meta_last_name)),
      SPLIT_PART(rec.email, '@', 1),
      'User'
    );

    IF computed_nickname = '' THEN
      computed_nickname := 'User';
    END IF;

    -- Insert profile
    INSERT INTO public.profiles (
      id,
      email,
      first_name,
      second_name,
      nickname,
      avatar_url,
      is_active,
      is_verified,
      created_time
    ) VALUES (
      rec.id,
      rec.email,
      COALESCE(meta_first_name, SPLIT_PART(rec.email, '@', 1), 'User'),
      COALESCE(meta_last_name, ''),
      computed_nickname,
      meta_avatar,
      TRUE,
      FALSE,
      rec.created_at
    );
  END LOOP;
END
$$;


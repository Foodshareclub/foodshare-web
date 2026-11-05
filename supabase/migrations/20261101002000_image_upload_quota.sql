-- Atomic image-upload quota.
--
-- `api-v1-images` used to read `user_rate_limits`, compare `count`, and write
-- `count + 1` in separate statements. N concurrent uploads all read the same
-- value and each wrote the same increment, so the 100/day limit could be
-- exceeded by the size of the burst. The first version of the replacement
-- called `check_rate_limit(text, int, int)`, but that function is
-- SECURITY INVOKER with `search_path = ''` and unqualified table names, so it
-- fails as a normal caller.
--
-- This function performs one INSERT ... ON CONFLICT DO UPDATE, which takes a
-- row lock and returns the post-increment count. The reset is evaluated under
-- the same lock. It is SECURITY DEFINER so the caller needs no direct access to
-- `user_rate_limits`; EXECUTE is granted only to authenticated and service_role.

BEGIN;

CREATE OR REPLACE FUNCTION public.consume_image_upload_quota(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_rate_limits (user_id, key, count, reset_at)
  VALUES (p_user_id, 'image_upload_count', 1, now() + interval '24 hours')
  ON CONFLICT (user_id, key) DO UPDATE
    SET count = CASE
          WHEN public.user_rate_limits.reset_at <= now() THEN 1
          ELSE public.user_rate_limits.count + 1
        END,
        reset_at = CASE
          WHEN public.user_rate_limits.reset_at <= now() THEN now() + interval '24 hours'
          ELSE public.user_rate_limits.reset_at
        END
  RETURNING count INTO v_count;

  RETURN v_count <= 100;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_image_upload_quota(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_image_upload_quota(uuid) TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Update volunteer listing 11590 (2026-11-25)
--
-- Sets post_name to 'IT Teammate' (role/headline only; full name 'Denis Yarmoshko'
-- is fetched from profiles_public) and clears the 'room for more' column default
-- from condition when still unset.
--
-- Idempotent: only updates when values differ.

DO $$
DECLARE
  affected bigint := 0;
BEGIN
  UPDATE public.posts
  SET
    post_name = 'IT Teammate',
    condition = CASE WHEN condition = 'room for more' THEN '' ELSE condition END,
    updated_at = NOW()
  WHERE id = 11590
    AND post_type = 'volunteer'
    AND (
      post_name IS DISTINCT FROM 'IT Teammate'
      OR condition = 'room for more'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  RAISE NOTICE 'posts (id=11590): % row(s) updated', affected;
END $$;

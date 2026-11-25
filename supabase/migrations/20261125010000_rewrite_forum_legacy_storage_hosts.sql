-- Rewrite retired Supabase Cloud storage hosts in public.forum (2026-11-24)
--
-- The legacy hosted project (`iazmjdjwnkilycbjwpzp.supabase.co`) returns 402.
-- 20260826000000_rewrite_legacy_storage_hosts.sql covered forum_drafts,
-- forum_scheduled_posts, and forum_series, leaving public.forum.forum_post_image
-- unmigrated for early forum posts (e.g. ids 424, 425, 426).
--
-- Idempotent: rewritten rows no longer match the guard.

DO $$
DECLARE
  affected bigint := 0;
BEGIN
  UPDATE public.forum f
  SET forum_post_image = replace(
        f.forum_post_image,
        'https://iazmjdjwnkilycbjwpzp.supabase.co',
        'https://api.foodshare.club'
      )
  WHERE f.forum_post_image LIKE '%iazmjdjwnkilycbjwpzp.supabase.co%';

  GET DIAGNOSTICS affected = ROW_COUNT;
  RAISE NOTICE 'forum.forum_post_image: % rows rewritten', affected;
END $$;

-- rewrite_legacy_storage_hosts (2026-08-26)
--
-- Promotes scripts/sql/rewrite-legacy-storage-hosts.sql into the migration
-- chain: the legacy Supabase Cloud project now returns 402 (paused), so any
-- row still pointing at it renders broken images. Objects were already
-- copied to self-hosted storage by scripts/migrate-legacy-storage.ts --apply
-- (see docs/legacy-storage-migration.md), so rewriting hosts is safe.
--
-- Idempotent: rewritten rows no longer match the guard.

DO $$
DECLARE
  n bigint;
  affected bigint := 0;
BEGIN
  -- posts.images (text[]) -------------------------------------------------------
  UPDATE public.posts p
  SET images = array_replace(p.images,
        'https://iazmjdjwnkilycbjwpzp.supabase.co', 'https://api.foodshare.club')
  WHERE EXISTS (
    SELECT 1 FROM unnest(p.images) img
    WHERE img LIKE '%iazmjdjwnkilycbjwpzp.supabase.co%'
  );
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected + n;
  RAISE NOTICE 'posts.images            : % rows', n;

  -- profiles.avatar_url ---------------------------------------------------------
  UPDATE public.profiles pr
  SET avatar_url = replace(pr.avatar_url,
        'https://iazmjdjwnkilycbjwpzp.supabase.co', 'https://api.foodshare.club')
  WHERE pr.avatar_url LIKE '%iazmjdjwnkilycbjwpzp.supabase.co%';
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected + n;
  RAISE NOTICE 'profiles.avatar_url     : % rows', n;

  -- analytics_staging_users.avatar_url ------------------------------------------
  UPDATE public.analytics_staging_users u
  SET avatar_url = replace(u.avatar_url,
        'https://iazmjdjwnkilycbjwpzp.supabase.co', 'https://api.foodshare.club')
  WHERE u.avatar_url LIKE '%iazmjdjwnkilycbjwpzp.supabase.co%';
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected + n;
  RAISE NOTICE 'analytics_staging_users : % rows', n;

  -- categories.icon_url ---------------------------------------------------------
  UPDATE public.categories c
  SET icon_url = replace(c.icon_url,
        'https://iazmjdjwnkilycbjwpzp.supabase.co', 'https://api.foodshare.club')
  WHERE c.icon_url LIKE '%iazmjdjwnkilycbjwpzp.supabase.co%';
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected + n;
  RAISE NOTICE 'categories.icon_url     : % rows', n;

  -- community_fridges.photo_url ---------------------------------------------------
  UPDATE public.community_fridges f
  SET photo_url = replace(f.photo_url,
        'https://iazmjdjwnkilycbjwpzp.supabase.co', 'https://api.foodshare.club')
  WHERE f.photo_url LIKE '%iazmjdjwnkilycbjwpzp.supabase.co%';
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected + n;
  RAISE NOTICE 'community_fridges       : % rows', n;

  -- challenges.challenge_image ------------------------------------------------------
  UPDATE public.challenges ch
  SET challenge_image = replace(ch.challenge_image,
        'https://iazmjdjwnkilycbjwpzp.supabase.co', 'https://api.foodshare.club')
  WHERE ch.challenge_image LIKE '%iazmjdjwnkilycbjwpzp.supabase.co%';
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected + n;
  RAISE NOTICE 'challenges              : % rows', n;

  -- forum_drafts.image_url ------------------------------------------------------------
  UPDATE public.forum_drafts fd
  SET image_url = replace(fd.image_url,
        'https://iazmjdjwnkilycbjwpzp.supabase.co', 'https://api.foodshare.club')
  WHERE fd.image_url LIKE '%iazmjdjwnkilycbjwpzp.supabase.co%';
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected + n;
  RAISE NOTICE 'forum_drafts            : % rows', n;

  -- forum_scheduled_posts.image_url -----------------------------------------------------
  UPDATE public.forum_scheduled_posts fs
  SET image_url = replace(fs.image_url,
        'https://iazmjdjwnkilycbjwpzp.supabase.co', 'https://api.foodshare.club')
  WHERE fs.image_url LIKE '%iazmjdjwnkilycbjwpzp.supabase.co%';
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected + n;
  RAISE NOTICE 'forum_scheduled_posts   : % rows', n;

  -- forum_series.cover_image -------------------------------------------------------------
  UPDATE public.forum_series s
  SET cover_image = replace(s.cover_image,
        'https://iazmjdjwnkilycbjwpzp.supabase.co', 'https://api.foodshare.club')
  WHERE s.cover_image LIKE '%iazmjdjwnkilycbjwpzp.supabase.co%';
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected + n;
  RAISE NOTICE 'forum_series            : % rows', n;

  -- in_app_notifications.image_url ----------------------------------------------------------
  UPDATE public.in_app_notifications i
  SET image_url = replace(i.image_url,
        'https://iazmjdjwnkilycbjwpzp.supabase.co', 'https://api.foodshare.club')
  WHERE i.image_url LIKE '%iazmjdjwnkilycbjwpzp.supabase.co%';
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected + n;
  RAISE NOTICE 'in_app_notifications    : % rows', n;

  -- room_participants.image --------------------------------------------------------------------
  UPDATE public.room_participants rp
  SET image = replace(rp.image,
        'https://iazmjdjwnkilycbjwpzp.supabase.co', 'https://api.foodshare.club')
  WHERE rp.image LIKE '%iazmjdjwnkilycbjwpzp.supabase.co%';
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected + n;
  RAISE NOTICE 'room_participants.image : % rows', n;

  RAISE NOTICE '──────────────────────────────────────';
  RAISE NOTICE 'TOTAL rows updated: %', affected;
END $$;

-- Verification: every line must report 0 after migration.
SELECT 'posts' AS tbl, count(*) AS remaining FROM public.posts
         WHERE EXISTS (SELECT 1 FROM unnest(images) img WHERE img LIKE '%iazmjdjwnkilycbjwpzp%')
UNION ALL SELECT 'profiles', count(*) FROM public.profiles WHERE avatar_url LIKE '%iazmjdjwnkilycbjwpzp%'
UNION ALL SELECT 'analytics_staging_users', count(*) FROM public.analytics_staging_users WHERE avatar_url LIKE '%iazmjdjwnkilycbjwpzp%'
UNION ALL SELECT 'categories', count(*) FROM public.categories WHERE icon_url LIKE '%iazmjdjwnkilycbjwpzp%'
UNION ALL SELECT 'community_fridges', count(*) FROM public.community_fridges WHERE photo_url LIKE '%iazmjdjwnkilycbjwpzp%'
UNION ALL SELECT 'challenges', count(*) FROM public.challenges WHERE challenge_image LIKE '%iazmjdjwnkilycbjwpzp%'
UNION ALL SELECT 'forum_drafts', count(*) FROM public.forum_drafts WHERE image_url LIKE '%iazmjdjwnkilycbjwpzp%'
UNION ALL SELECT 'forum_scheduled_posts', count(*) FROM public.forum_scheduled_posts WHERE image_url LIKE '%iazmjdjwnkilycbjwpzp%'
UNION ALL SELECT 'forum_series', count(*) FROM public.forum_series WHERE cover_image LIKE '%iazmjdjwnkilycbjwpzp%'
UNION ALL SELECT 'in_app_notifications', count(*) FROM public.in_app_notifications WHERE image_url LIKE '%iazmjdjwnkilycbjwpzp%'
UNION ALL SELECT 'room_participants', count(*) FROM public.room_participants WHERE image LIKE '%iazmjdjwnkilycbjwpzp%';

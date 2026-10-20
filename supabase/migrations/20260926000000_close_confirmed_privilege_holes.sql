-- Stage 2a of the privilege lockdown started in
-- 20260925000000_lock_down_function_execute_privileges.sql: close the specific
-- holes that are exploitable today, without the blast radius of a full
-- allowlist inversion.
--
-- Every change below is scoped to something with **zero client call sites** in
-- foodshare-web (verified by ripgrep across src/) or is strictly a narrowing
-- of a policy whose name already documents the intended audience. Nothing here
-- grants or removes a privilege that live web code depends on.
--
-- ── 1. public.address is world-readable ─────────────────────────────────────
--
--   CREATE POLICY "Enable read access for all users" ON public.address
--     FOR SELECT USING (true);
--
-- `address` holds address_line_1..3, city, state_province, postal_code, lat,
-- long, radius_meters and a geography `location`. With the public anon key
-- (shipped in the browser bundle as NEXT_PUBLIC_SUPABASE_ANON_KEY) plus
-- `GRANT ALL ON ALL TABLES ... TO anon` from 20260812225000, that is
-- `GET /rest/v1/address?select=*` returning every user's home address and exact
-- coordinates. Physical-safety and GDPR exposure.
--
-- `address` is a legacy table: it has no INSERT/UPDATE policy at all, so
-- nothing can write to it. The live table is `user_addresses`, which already
-- has correct own-row CRUD policies. The only web reads of `address` are
-- self-scoped after getUser():
--
--   src/lib/data/profiles.ts:322   getUserAddress()   .eq("profile_id", user.id)
--   src/app/actions/profile.ts:557  updateAddressDirect() .eq("profile_id", user.id)
--
-- So: replace the world-readable policy with an own-row read. Authenticated
-- users keep working; the anon key stops being able to enumerate anyone.
--
-- ── 2. Policies named "Service role" that were not scoped to service_role ───
--
-- These read as `USING (true) WITH CHECK (true)` with **no `TO` clause**, which
-- means `TO PUBLIC` for **all** commands. The names say the intent; the DDL did
-- not implement it. Combined with the blanket anon table grant, anon had full
-- DML on:
--
--   email_suppression_list        read every bounced/complained/unsubscribed
--                                  address; DELETE re-enables mailing opted-out
--                                  and hard-bounced users (CAN-SPAM / GDPR)
--   email_bounce_events           forge bounce and complaint events
--   email_provider_monthly_quota  falsify deliverability counters
--   grok_usage_logs               forge usage accounting
--
-- Fixed by adding the `TO service_role` the name already promised.
--
-- ── 3. forum_user_stats is fully user-writable ─────────────────────────────
--
--   CREATE POLICY "System can manage forum user stats" ON public.forum_user_stats
--     TO authenticated USING (true) WITH CHECK (true);
--
-- No `FOR` clause, so all commands. Columns include reputation_score,
-- trust_level, trust_level_locked, was_warned, was_silenced, silenced_until.
-- Any authenticated user could set themselves to maximum reputation and
-- un-silence themselves. The web app only ever *reads* it (crm.ts:83 join,
-- forumAPI.ts:622). Narrowed to self-read plus service_role writes.
--
-- ── 4. user_notifications INSERT was open to any authenticated user ─────────
--
--   CREATE POLICY "Service role can insert notifications" ON public.user_notifications
--     FOR INSERT TO authenticated WITH CHECK (true);
--
-- Named "Service role" but granted to `authenticated` with no check, so any user
-- could insert a notification for any recipient with any actor_id — in-app
-- notification spoofing ("your account was compromised, verify here"). It
-- existed to serve the `createNotification` server action, which had no auth
-- check and has now been deleted (it had zero callers). Notification writes go
-- through SECURITY DEFINER triggers and the service role, both of which bypass
-- RLS, so nothing legitimate depends on this policy.
--
-- ── 5. Unauthenticated SECURITY DEFINER RPCs ──────────────────────────────
--
-- 20260812225000 granted EXECUTE on all functions to anon, and the
-- ALTER DEFAULT PRIVILEGES in 20260925000000 only affects functions created
-- *after* it. Every function in the baseline is therefore still anon-executable.
-- The ones below have **zero** references in foodshare-web/src and are either
-- unauthenticated-forcing or pure server-side maintenance:
--
--   get_or_create_room(integer, uuid, uuid)   SECURITY DEFINER, never compares
--       its arguments to auth.uid(). Creates a room and fires
--       trigger_notify_new_interest for an arbitrary victim: unauthenticated
--       notification spoofing + impersonated chat requests at scale. The
--       (bigint, ...) overload additionally has no SET search_path.
--   store_translation(...)                   SECURITY DEFINER with
--       ON CONFLICT DO UPDATE. Any anon caller can overwrite the translated
--       rendering of any listing/forum post in any of the 21 locales — mass
--       stored content tampering served to real users.
--   mark_all_notifications_read(uuid)        silently suppress any user's alerts
--   get_unread_notification_count(uuid)      enumerate any user's state
--   is_blocked_by_user(uuid, uuid)           enumerate block relationships
--   cleanup_old_notifications()              DELETE across all users' queues
--   cleanup_old_audit_logs()                 DELETE from email_audit_log
--   get_email_dashboard_stats_v2()           read the whole email ops dashboard
--   increment_email_provider_stats(...)      forge delivery statistics
--
-- Revoked from PUBLIC/anon/authenticated; service_role keeps EXECUTE.
--
-- ── Rollback ───────────────────────────────────────────────────────────────
-- Each block is independent. Re-granting is a single statement per object.

BEGIN;

-- ── 1. address: own-row reads only ──────────────────────────────────────────

DROP POLICY IF EXISTS "Enable read access for all users" ON public.address;

CREATE POLICY "Users can read own address"
  ON public.address
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

COMMENT ON POLICY "Users can read own address" ON public.address IS
  'Replaces a USING (true) policy that exposed every user''s street address and '
  'exact coordinates to the public anon key. Legacy table; the live table is '
  'public.user_addresses.';

-- ── 2. scope the mislabelled "Service role" policies ───────────────────────

DROP POLICY IF EXISTS "Service role full access on suppression list" ON public.email_suppression_list;
CREATE POLICY "Service role full access on suppression list"
  ON public.email_suppression_list
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on bounce events" ON public.email_bounce_events;
CREATE POLICY "Service role full access on bounce events"
  ON public.email_bounce_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on monthly quota" ON public.email_provider_monthly_quota;
CREATE POLICY "Service role full access on monthly quota"
  ON public.email_provider_monthly_quota
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on grok usage logs" ON public.grok_usage_logs;
CREATE POLICY "Service role full access on grok usage logs"
  ON public.grok_usage_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 3. forum_user_stats: self-read, service-role writes ─────────────────────

DROP POLICY IF EXISTS "System can manage forum user stats" ON public.forum_user_stats;

CREATE POLICY "Users can read own forum stats"
  ON public.forum_user_stats
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Service role can manage forum user stats"
  ON public.forum_user_stats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 4. user_notifications INSERT to service_role only ───────────────────────

DROP POLICY IF EXISTS "Service role can insert notifications" ON public.user_notifications;

CREATE POLICY "Service role can insert notifications"
  ON public.user_notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ── 5. revoke anon/authenticated EXECUTE on unauthenticated RPCs ────────────
--
-- Resolved from pg_proc by name so a missing or renamed function is skipped
-- instead of aborting the migration, and every overload of a name is revoked.

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname::text = ANY (ARRAY[
        'get_or_create_room',
        'store_translation',
        'mark_all_notifications_read',
        'get_unread_notification_count',
        'is_blocked_by_user',
        'cleanup_old_notifications',
        'cleanup_old_audit_logs',
        'get_email_dashboard_stats_v2',
        'increment_email_provider_stats'
      ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
  END LOOP;
END $$;

COMMIT;

-- Reload PostgREST's schema cache so the changed policies/privileges take effect
-- without a container restart.
NOTIFY pgrst, 'reload schema';

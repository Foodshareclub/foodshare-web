-- M-RLS: RLS privilege fixes (F-013, F-010, F-011) — sibling of M1
--
-- Authored 2026-11-12. Applies in the pre-re-exposure step, in the same
-- batch as M1 (20261106000000_f1_posts_anon_column_grants.sql). Findings
-- F-010 / F-011 / F-013 (artifacts/review-2026-11-10), line-verified at
-- backend main 3c153775. This file must land before the re-exposed surface
-- carries the vulnerable policies; the F4 gate (INTERNAL_SERVICE_SECRET)
-- protects the cache endpoint, not these tables.
--
-- F-013  public.waste_logs
--   The three user policies were keyed on the user-writable JWT claim
--   `auth.jwt() ->> 'household_id'`. Any authenticated user can set
--   household_id in their own user_metadata, which grants cross-tenant
--   read/write/delete on the victim household's rows. Fix: replace the
--   claim branch with a households join that verifies ownership — the
--   exact in-repo pattern of the sibling household_waste_logs policies
--   (20260908000000) — and keep the existing safe profile_id branch
--   (keyed on auth.uid(), not on any claim).
--   Behavioural consequence: household access is limited to the household
--   creator (no membership table exists in the schema); other household
--   members keep access only to rows they profiled (profile_id branch).
--   Null household_id rows behave as before the fix (claim branch was
--   NULL-comparing and never true).
--
-- F-010  public.telegram_user_states
--   Single policy with no TO clause (=> PUBLIC: anon + authenticated) and
--   USING (auth.uid() IS NOT NULL): any authenticated user could read,
--   write, and delete any user's bot session state. The sole consumer is
--   the service-role singleton (_shared/bot/user-state.ts, via
--   getSupabaseClient = SUPABASE_SERVICE_ROLE_KEY). Fix: drop the
--   permissive policy and create nothing. service_role keeps full access
--   through BYPASSRLS (platform.sql) and never evaluates any policy;
--   every role subject to RLS (anon, authenticated) is default-denied by
--   RLS with zero policies — the same end state the estate's own
--   20261108240000_drop_dead_service_role_policies batch established.
--   (A re-created `TO service_role` policy would be a rule the database
--   never applies: contract-drift.test.ts rejects any policy whose TO
--   list names only BYPASSRLS roles.)
--
-- F-011  public.rate_limits
--   Same defect shape: no TO clause (=> PUBLIC) with USING
--   (auth.uid() IS NOT NULL). Sole consumers are the service-role
--   singleton (api-v1-localization ui-strings.ts rate limiter; the bot
--   limiters use the dedicated telegram/whatsapp_rate_limits tables).
--   The table is keyed on an opaque `identifier` — it has no owner
--   column, so an owner-scoped read is not expressible. Fix: drop the
--   permissive policy, create nothing — service_role keeps access via
--   BYPASSRLS, every subject role is default-denied.
--
-- Same batch as the rls-audit.test.ts case-normalization fix (F-012):
-- that fix is what makes the estate's own RLS audit see these policies
-- (the catalog stores role names uppercase; the check compared lowercase
-- and skipped 219 policies). The regenerated supabase/oracle/catalog.json
-- that accompanies this file is what makes the audit assert against the
-- post-fix state.
--
-- Class completion (F-012 fallout): the case fix also exposed that nine
-- further policies on SERVICE_OWNED tables carried no TO clause (=>
-- PUBLIC) and were "protected" only by a service-role predicate. Those
-- predicates were inert at runtime in both directions: a genuine
-- service_role connection bypasses RLS and never evaluates a policy, and
-- no subject role can carry a genuine service_role claim (JWTs are
-- signature-verified), so the PUBLIC policies granted nothing to anyone.
-- The batch drops them and creates nothing: with RLS enabled, zero
-- policies is default-deny for every subject role, and service_role
-- keeps its BYPASSRLS access — identical observable behaviour, no dead
-- rules left in the catalog. The four user-facing policies of the same
-- shape (own notification logs, own queued notifications,
-- post_activity_logs read/insert) are re-created TO authenticated with
-- their predicates verbatim from the catalog — those ARE evaluated
-- (authenticated is subject to RLS) and are the live access.
-- post_activity_logs is a hybrid table (user clients insert their own
-- rows: web post-activity.ts, app ShareService/InvitationService), so it
-- stays out of the audit's SERVICE_OWNED set — the corresponding test
-- edit carries the reasoning.
BEGIN;

-- ---------------------------------------------------------------- F-013
DROP POLICY IF EXISTS "Users can view own household waste_logs" ON public.waste_logs;
CREATE POLICY "Users can view own household waste_logs" ON public.waste_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.households h
      WHERE h.id = waste_logs.household_id
        AND h.created_by = (SELECT auth.uid())
    )
    OR (auth.uid() IS NOT NULL AND waste_logs.profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own household waste_logs" ON public.waste_logs;
CREATE POLICY "Users can insert own household waste_logs" ON public.waste_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.households h
      WHERE h.id = waste_logs.household_id
        AND h.created_by = (SELECT auth.uid())
    )
    OR (auth.uid() IS NOT NULL AND waste_logs.profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own household waste_logs" ON public.waste_logs;
CREATE POLICY "Users can delete own household waste_logs" ON public.waste_logs
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.households h
      WHERE h.id = waste_logs.household_id
        AND h.created_by = (SELECT auth.uid())
    )
    OR (auth.uid() IS NOT NULL AND waste_logs.profile_id = auth.uid())
  );

-- F-010: drop the permissive PUBLIC policy; create nothing (see header).
DROP POLICY IF EXISTS "System can manage telegram states" ON public.telegram_user_states;

-- F-011: drop the permissive PUBLIC policy; create nothing (see header).
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;

-- ------------------------------------------- class completion (F-012)
-- Nine inert PUBLIC policies (service-role predicates that RLS never
-- evaluates) are dropped with no replacement — see header.
DROP POLICY IF EXISTS "Service role only for api_analytics" ON public.api_analytics;

DROP POLICY IF EXISTS "Service role can manage notification logs" ON public.notification_delivery_log;

DROP POLICY IF EXISTS "Service role can manage digest queue" ON public.notification_digest_queue;

DROP POLICY IF EXISTS "Service role can manage notification queue" ON public.notification_queue;

DROP POLICY IF EXISTS "Only service role can access orphaned_storage_cleanup" ON public.orphaned_storage_cleanup;

DROP POLICY IF EXISTS "telegram_rate_limits_service" ON public.telegram_rate_limits;

DROP POLICY IF EXISTS "Service role full access" ON public.translation_queue;

DROP POLICY IF EXISTS "whatsapp_rate_limits_service" ON public.whatsapp_rate_limits;

DROP POLICY IF EXISTS "whatsapp_user_states_service" ON public.whatsapp_user_states;

-- Four user-facing policies, re-created for the role that is actually
-- subject to RLS (authenticated), predicates verbatim from the catalog.
DROP POLICY IF EXISTS "Users can view their own notification logs" ON public.notification_delivery_log;
CREATE POLICY "Users can view their own notification logs" ON public.notification_delivery_log
  FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users can view their own queued notifications" ON public.notification_queue;
CREATE POLICY "Users can view their own queued notifications" ON public.notification_queue
  FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "post_activity_logs_insert" ON public.post_activity_logs;
CREATE POLICY "post_activity_logs_insert" ON public.post_activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (((actor_id = ( SELECT auth.uid() AS uid)) OR (( SELECT (( SELECT auth.jwt() AS jwt) ->> 'role'::text)) = 'service_role'::text)));

DROP POLICY IF EXISTS "post_activity_logs_select" ON public.post_activity_logs;
CREATE POLICY "post_activity_logs_select" ON public.post_activity_logs
  FOR SELECT TO authenticated
  USING (((actor_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.posts p
  WHERE ((p.id = post_activity_logs.post_id) AND (p.profile_id = auth.uid())))) OR public.is_admin() OR (( SELECT (auth.jwt() ->> 'role'::text)) = 'service_role'::text)));

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Scope two "Service role" policies that grant the public anon key a write.
--
-- 20260926000000_close_confirmed_privilege_holes.sql walked the mislabelled
-- "Service role can …" policies and gave them an explicit `TO service_role`.
-- Two were missed, and both are worse than the ones that were fixed, because
-- neither had a `USING` or `WITH CHECK` expression to accidentally restrict
-- them:
--
--   public.audit_logs
--     "Service role can insert audit logs" FOR INSERT WITH CHECK (true)
--     No `TO` clause, so the policy applies to PUBLIC — anon included. The
--     only read policy is `audit_logs_admin_view` (is_admin), so an
--     unauthenticated caller could not read the table but could append to it:
--     arbitrary `action`, `resource_type`, `resource_id`, `user_id`,
--     `ip_address` and `metadata`. An admin reviewing the audit log would be
--     reading planted entries. That is an integrity break in the one table
--     whose whole purpose is to be trustworthy.
--
--   public.image_upload_metrics
--     "Service can insert metrics" FOR INSERT WITH CHECK (true)
--     Same shape. Fabricated upload metrics attributed to any `user_id`.
--
-- The repair is the same shape as 20260926000000: drop and recreate with an
-- explicit `TO service_role`. Nothing that legitimately writes these tables
-- is affected — the edge functions connect with the service role, which
-- bypasses RLS outright, and a policy scoped to `service_role` is therefore
-- belt-and-braces rather than the mechanism they rely on.

BEGIN;

-- ── 1. audit_logs ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;

CREATE POLICY "Service role can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMENT ON POLICY "Service role can insert audit logs" ON public.audit_logs IS
  'Was FOR INSERT WITH CHECK (true) with no TO clause, so it applied to PUBLIC '
  'and the anon key could append fabricated audit entries that administrators '
  'then read as genuine.';

-- ── 2. image_upload_metrics ────────────────────────────────────────────────

DROP POLICY IF EXISTS "Service can insert metrics" ON public.image_upload_metrics;
-- Also drop the name this migration creates, so a re-run is a no-op rather
-- than a collision. Renaming a policy without dropping both names makes the
-- migration non-idempotent, which matters because deploys re-apply.
DROP POLICY IF EXISTS "Service role can insert upload metrics" ON public.image_upload_metrics;

CREATE POLICY "Service role can insert upload metrics"
  ON public.image_upload_metrics
  FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMENT ON POLICY "Service role can insert upload metrics"
  ON public.image_upload_metrics IS
  'Was "Service can insert metrics", FOR INSERT WITH CHECK (true) with no TO '
  'clause — the anon key could write fabricated metrics against any user_id.';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────
-- Verify the outcome
-- ----------------------------------------------------------------------
--
-- The property that matters is: **no write policy on these two tables is
-- reachable by a role other than service_role.**
--
-- The first version of this assertion excluded policies by *name*, which is
-- the wrong axis: a policy recreated with the correct name and no `TO` clause
-- is byte-identical in the migration's intent and completely open in effect.
-- Mutation-testing it — restoring `FOR INSERT WITH CHECK (true)` with no `TO`
-- — passed the check, which is the failure mode this assertion exists to
-- prevent. It now reads the roles from the catalog.
DO $$
DECLARE
    leaked text;
BEGIN
    SELECT string_agg(
               format('%s.%s [cmd=%s roles=%s]',
                      tablename, policyname, cmd,
                      coalesce(array_to_string(roles, ','), 'PUBLIC')),
               E'\n  ')
      INTO leaked
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('audit_logs', 'image_upload_metrics')
       -- A write policy is one that can add, change or remove a row.
       AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
       -- Reachable by anyone if it names no role at all, or names a client role.
       AND (
             roles IS NULL
             OR roles && ARRAY['anon', 'authenticated', 'public']::name[]
           );

    IF leaked IS NOT NULL THEN
        RAISE EXCEPTION
            'a write policy on audit_logs / image_upload_metrics is still reachable '
            'by anon or authenticated: %', leaked;
    END IF;
END
$$;

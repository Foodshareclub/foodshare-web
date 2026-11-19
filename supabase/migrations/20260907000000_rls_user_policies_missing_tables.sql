-- Least-privilege authenticated-user policies for tables whose RLS was
-- enabled (with service-role-only access) in 20260906000000.
--
-- Table-by-table intent:
-- 1. public.geocoding_cache: shared read-only cache for authenticated users.
--    No INSERT/UPDATE/DELETE from clients; writes happen service-side
--    (edge functions via SERVICE_ROLE_KEY bypass RLS).
-- 2. public.rate_limit_entries: NO authenticated access (service-side only).
--    Rate limiting is enforced service-side through the check_rate_limit()
--    RPC called by edge functions using SERVICE_ROLE_KEY. Granting clients
--    read access would leak rate-limit state (user enumeration / activity
--    probing via key lookups), and granting write access would let users
--    delete entries to evade limits. RLS deny-by-default therefore stands;
--    no policy is created here on purpose.
-- 3. public.household_waste_logs: full row-owner access for authenticated
--    users via the household ownership chain
--    household_waste_logs.household_id -> public.households.id, where the
--    household row's created_by column holds the owning user's id
--    (cf. 20260823120000: households deliberately has no FK to auth.users
--    to avoid dump/restore ordering coupling; created_by = auth.uid() is
--    the established ownership convention, also used by the sibling
--    waste_logs/households policies).

-- ── 1. geocoding_cache: authenticated read-only ──────────────────────────
-- Table-guard (2026-09-08): prod drifted after 20260906 applied
-- (public.geocoding_cache vanished); CREATE POLICY on a missing table aborts
-- the deploy transaction. Skip with NOTICE — repair migration
-- 20260908000000 owns recovery (fail-open deploy, fail-closed security:
-- no table means no access to protect).
DO $$ BEGIN
  IF to_regclass('public.geocoding_cache') IS NULL THEN
    RAISE NOTICE 'skip: public.geocoding_cache missing, policy not created (see 20260908000000)';
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'geocoding_cache'
      AND policyname = 'Authenticated users can read geocoding_cache'
  ) THEN
    CREATE POLICY "Authenticated users can read geocoding_cache"
      ON public.geocoding_cache
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- ── 2. rate_limit_entries: intentionally no authenticated policy ──────────
-- (see header comment: service-side only, deny-by-default).

-- ── 3. household_waste_logs: row-owner access via households.created_by ──
-- Same table-guard as §1: skip with NOTICE when household_waste_logs (or the
-- households table its policies join) is missing; repair owns recovery.
DO $$ BEGIN
  IF to_regclass('public.household_waste_logs') IS NULL OR to_regclass('public.households') IS NULL THEN
    RAISE NOTICE 'skip: household_waste_logs/households missing, policies not created (see 20260908000000)';
  ELSE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'household_waste_logs'
      AND policyname = 'Users can view own household_waste_logs'
  ) THEN
    CREATE POLICY "Users can view own household_waste_logs"
      ON public.household_waste_logs
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.households h
          WHERE h.id = household_waste_logs.household_id
            AND h.created_by = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'household_waste_logs'
      AND policyname = 'Users can insert own household_waste_logs'
  ) THEN
    CREATE POLICY "Users can insert own household_waste_logs"
      ON public.household_waste_logs
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.households h
          WHERE h.id = household_waste_logs.household_id
            AND h.created_by = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'household_waste_logs'
      AND policyname = 'Users can update own household_waste_logs'
  ) THEN
    CREATE POLICY "Users can update own household_waste_logs"
      ON public.household_waste_logs
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.households h
          WHERE h.id = household_waste_logs.household_id
            AND h.created_by = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.households h
          WHERE h.id = household_waste_logs.household_id
            AND h.created_by = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'household_waste_logs'
      AND policyname = 'Users can delete own household_waste_logs'
  ) THEN
    CREATE POLICY "Users can delete own household_waste_logs"
      ON public.household_waste_logs
      FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.households h
          WHERE h.id = household_waste_logs.household_id
            AND h.created_by = (SELECT auth.uid())
        )
      );
  END IF;
  END IF; -- table-guard ELSE
END $$;

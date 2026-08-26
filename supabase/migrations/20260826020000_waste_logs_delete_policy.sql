-- waste_logs delete policy (2026-08-26)
--
-- Gap fix: 20260823120000 provisioned SELECT/INSERT policies for
-- public.waste_logs but no DELETE policy. Foodlytics lets users remove
-- entries (supabase.from("waste_logs").delete()), which RLS silently
-- reduced to a 0-row update without this policy.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'waste_logs' AND policyname = 'Users can delete own household waste_logs'
  ) THEN
    CREATE POLICY "Users can delete own household waste_logs" ON public.waste_logs
      FOR DELETE
      USING (
        household_id::text = auth.jwt() ->> 'household_id'
        OR (auth.uid() IS NOT NULL AND profile_id = auth.uid())
      );
  END IF;
END $$;

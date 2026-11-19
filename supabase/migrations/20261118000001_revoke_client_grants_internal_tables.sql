-- Revoke client-role table privileges on service-only internal tables.
--
-- public.rate_limits and public.telegram_user_states are used only by the
-- service-role singleton (getSupabaseClient) in edge functions:
--   - api-v1-localization/handlers/ui-strings.ts  (rate_limits)
--   - _shared/bot/user-state.ts                   (telegram_user_states)
-- No web, app or client-side supabase-js code reads or writes them.
--
-- 20261112000000_rls_privilege_fixes.sql dropped their permissive policies,
-- so RLS already default-denies anon/authenticated. The table grants were
-- left in place (DELETE, INSERT, TRUNCATE, UPDATE; TRUNCATE is not subject
-- to RLS). This removes them so there is no privilege to fall back on if RLS
-- is ever disabled or a policy is added by mistake.
--
-- service_role is untouched (BYPASSRLS, keeps its grants).
-- REVOKE is idempotent. Policies were already dropped in 20261112000000;
-- DROP POLICY IF EXISTS is repeated for safety.

REVOKE ALL ON TABLE public.rate_limits FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.telegram_user_states FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "System can manage telegram states" ON public.telegram_user_states;

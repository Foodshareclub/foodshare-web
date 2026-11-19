-- Closes the last confirmed unauthenticated data-exposure surface: ten tables
-- in `public` that were created with Row Level Security **never enabled**, while
-- 20260812225000 grants `ALL PRIVILEGES ON ALL TABLES ... TO anon, authenticated`.
--
-- Those two facts compose into a full unauthenticated read/write hole. With the
-- public anon key (shipped in the browser bundle as NEXT_PUBLIC_SUPABASE_ANON_KEY),
-- every row in every table below is reachable through PostgREST with no session:
--
--   GET  /rest/v1/analytics_user_activity?select=*
--   POST /rest/v1/analytics_staging_listings
--
-- RLS is the only thing that would have stopped that, and none of these ten
-- tables has it — nor does any of them have a policy, a `REVOKE`, or a `FORCE`/
-- `DISABLE` statement anywhere in the 59 prior migrations. This was verified
-- with a multi-line-aware parse of every migration (a naive line regex misses
-- policies whose `ON <table>` clause is on the following line and undercounts).
--
-- Written as explicit statements rather than a DO/FOR loop on purpose: this is
-- a security migration, and a reviewer (or an automated coverage check) must be
-- able to grep every table it covers. Dynamic SQL in a loop defeats that.
--
-- Counts before this migration, per table: policies=0  enableRLS=0  revoke=0.
--
-- ── Why enabling RLS with no policies is correct here ───────────────────────
--
-- `ENABLE ROW LEVEL SECURITY` with zero policies is deny-all for anon and
-- authenticated. That is exactly the intended state: every legitimate consumer
-- of these tables already runs as `service_role`, which carries BYPASSRLS
-- (confirmed in 20260823120000 and 20260927000000), so enabling RLS changes
-- nothing for them and removes the anon surface entirely.
--
-- Verified callers, all service-role:
--
--   * foodshare-web `src/app/actions/analytics-sync.ts` uses `createAdminClient()`
--     (`SUPABASE_SERVICE_ROLE_KEY`), reads analytics_daily_stats,
--     analytics_user_activity and analytics_post_activity, and is reachable only
--     from `src/app/admin/analytics/sync/page.tsx`.
--   * foodshare-backend `api-v1-localization` handlers use the service-role key.
--   * foodshare-app, foodshare-tools, foodshare-runner: **zero** references to
--     any of these ten tables (ripgrep across all three).
--
-- So the blast radius outside service-role code paths is zero. The five
-- `analytics_staging_*` tables and `translation_backfill_jobs` have no code
-- references at all in any of the four repos — they are internal/work-in-
-- progress tables, which is a strong argument for deny-all rather than
-- inventing a permissive policy for them.
--
-- ── Why REVOKE as well ──────────────────────────────────────────────────────
--
-- RLS alone is sufficient to block access, but it still leaves the tables
-- registered as reachable endpoints in PostgREST (they answer with empty
-- results rather than not existing), and it leaves the blanket grant in place
-- for anything that later flips RLS off or adds a `USING (true)` policy by
-- habit. Revoking at the grant layer closes both. Scoped to anon/authenticated
-- only: `service_role` keeps its grants and its BYPASSRLS.
--
-- NOTE: this does **not** touch the blanket `ALTER DEFAULT PRIVILEGES ... GRANT
-- ALL ON TABLES TO anon` from 20260812225000. That default must stay, because
-- PostgREST requires the role to hold a table grant for an RLS policy to be
-- evaluated at all — removing it would break every table that legitimately
-- exposes anon reads via policies. Tightening it is a separate, riskier change.
--
-- ── Out of scope: public."Fridges" ─────────────────────────────────────────
--
-- The Airtable FDW foreign table (`CREATE FOREIGN TABLE`, baseline.sql:25909)
-- also has no RLS. It is deliberately left alone: FDW tables have their own
-- access model (server-level user mapping), it mirrors third-party Airtable
-- data rather than user data, and enabling RLS on it would need a policy
-- decision the Airtable mirror's consumers have not made. Tracked here so the
-- omission is explicit rather than an oversight.

-- Deny-all: ENABLE ROW LEVEL SECURITY with no policies, then drop the blanket
-- anon/authenticated grant. service_role keeps BYPASSRLS and its grants.

ALTER TABLE public.analytics_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_post_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_staging_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_staging_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_staging_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_staging_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_staging_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_backfill_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_service_usage ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.analytics_daily_stats FROM anon, authenticated;
REVOKE ALL ON public.analytics_post_activity FROM anon, authenticated;
REVOKE ALL ON public.analytics_staging_favorites FROM anon, authenticated;
REVOKE ALL ON public.analytics_staging_listings FROM anon, authenticated;
REVOKE ALL ON public.analytics_staging_reviews FROM anon, authenticated;
REVOKE ALL ON public.analytics_staging_rooms FROM anon, authenticated;
REVOKE ALL ON public.analytics_staging_users FROM anon, authenticated;
REVOKE ALL ON public.analytics_user_activity FROM anon, authenticated;
REVOKE ALL ON public.translation_backfill_jobs FROM anon, authenticated;
REVOKE ALL ON public.translation_service_usage FROM anon, authenticated;

-- Re-read schema cache so PostgREST stops advertising the tables to anon.
NOTIFY pgrst, 'reload schema';

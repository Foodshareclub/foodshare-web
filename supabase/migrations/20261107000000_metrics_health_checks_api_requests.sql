-- Two tables in the `metrics` schema that live code has been writing to and
-- reading from since the health endpoint was written, created in no migration
-- and on self-hosted in no init script. `supabase/oracle/platform.sql` carried
-- a two-column stand-in for each, so the catalog reported they existed and
-- nothing in the repository said the shapes were wrong.
--
-- Neither access ever succeeded. `recordHealthCheck` in `_shared/metrics.ts`
-- inserts five columns and the insert failed on every health check run, was
-- caught by the surrounding `try/catch` and logged; `api-v1-health`'s full
-- response has never carried a metrics summary because
-- `get_error_rate`/`get_p95_latency` read `status_code`, `response_time_ms`
-- and `created_at` from a table whose only columns are `id` and `at`, and the
-- error `getMetricsSummary` catches returns `null` instead of a number.
--
-- The shape is not inferred. `recordHealthCheck` inserts exactly the five
-- columns below, `public.record_request` (the production function this schema
-- came from) inserts exactly the ten columns of `api_requests`, and the two
-- summary RPCs read `status_code`, `response_time_ms` and `created_at` and
-- nothing else.
--
-- The CHECK constraint is the closed set the code already declares:
-- `HealthStatus` in `_shared/health/types.ts` is the three-member union
-- `healthy | degraded | unhealthy`. A string column with no constraint would
-- accept a value no caller can produce and would let a typo become a
-- permanently distinct health state.
--
-- `created_at` is on both tables: `cleanup_old_metrics` (the production
-- retention job) and both summary RPCs window on it, and neither insert names
-- it, so it must default.
--
-- The two remaining stand-ins in `platform.sql` (`circuit_breaker_events`,
-- `api_hourly_stats`) stay: after the dead circuit-sync code is removed, no
-- live call site touches either, and a shape no query reads would be
-- conjecture. When one gets a reader, it earns a migration of its own.

CREATE TABLE IF NOT EXISTS metrics.health_checks (
  id               bigserial PRIMARY KEY,
  service          text        NOT NULL,
  status           text        NOT NULL
    CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  response_time_ms integer     NOT NULL,
  details          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  error_message    text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS metrics.api_requests (
  id                  bigserial PRIMARY KEY,
  endpoint            text        NOT NULL,
  method              text        NOT NULL,
  response_time_ms    integer     NOT NULL,
  app_platform        text,
  app_version         text,
  cache_hit           boolean     NOT NULL DEFAULT false,
  status_code         integer,
  error_type          text,
  request_size_bytes  integer,
  response_size_bytes integer,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- The index is the summary query. Both RPCs ask for a `created_at` window,
-- which is a range scan on the timestamp, so the column is the timestamp
-- descending. The table is new, so the index is built inside the same
-- transaction that creates it -- the repository rule says `CONCURRENTLY`, and
-- a build on a table that does not exist yet cannot be concurrent.
CREATE INDEX IF NOT EXISTS idx_metrics_api_requests_created
  ON metrics.api_requests (created_at DESC);

-- RLS on, with no policies, as with `metrics.alerts`: nothing in this schema
-- is a user-facing read. The writer is the service-role client behind
-- `getSupabaseClient()`, and the two summary RPCs are `SECURITY DEFINER`, so
-- both sides reach the table without a policy, and no `authenticated` policy
-- can publish request telemetry.
ALTER TABLE metrics.health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics.api_requests ENABLE ROW LEVEL SECURITY;

-- The health endpoint's summary path and its recording path are one change:
-- a table that exists but cannot be written, or a read that succeeds against
-- a table the inserts keep failing into, are both worse than the broken pair
-- this replaces. A rollback of either half makes the other half fail loudly.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'metrics' AND table_name = 'health_checks'
  ) THEN
    RAISE EXCEPTION 'metrics.health_checks was not created';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'metrics' AND table_name = 'api_requests'
  ) THEN
    RAISE EXCEPTION 'metrics.api_requests was not created';
  END IF;
END $$;

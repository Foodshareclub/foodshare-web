-- The `metrics.alerts` table that api-v1-alerts has been writing to and reading
-- from since the alerts function was written.
--
-- Neither query ever succeeded. The inserts went to
-- `supabase.from("metrics.alerts")` and were caught by the surrounding
-- `try/catch` and logged; the reads that implement the cooldown did the same and
-- returned the alerts unchanged, so the cooldown has never deduplicated
-- anything. Every alert that fired was sent, every time, and no history of it
-- was kept anywhere.
--
-- Found by the compiler rather than by a review: `supabase/oracle/types.ts`
-- generates `Database` from the catalog, so `from("metrics.alerts")` is a type
-- error once the type is passed to `createClient`, and the error names the
-- schema that does not exist. The four earlier audits could not have found it,
-- because a relation that is *read from* as well as written to is a relation,
-- and the absent-relation list it belonged in was assembled from writes.
--
-- The shape is not inferred. `logAlerts` builds exactly one record shape and
-- `filterByAlertCooldowns` reads exactly two columns from it, and the columns
-- below are those and nothing more.
--
-- The two CHECK constraints are the two closed sets the code already declares:
-- `AlertType` in `_shared/api-v1-alerts/lib/types.ts` is a seven-member union and
-- `AlertSeverity` a three-member union. A string column with no constraint would
-- accept a value no caller can produce and would let a typo in an alert type
-- become a permanently distinct, permanently undeduplicated alert class.

CREATE SCHEMA IF NOT EXISTS metrics;

CREATE TABLE IF NOT EXISTS metrics.alerts (
  id         bigserial PRIMARY KEY,
  alert_type text        NOT NULL
    CHECK (alert_type IN (
      'error_rate_high',
      'latency_high',
      'circuit_breaker_open',
      'login_spike',
      'vault_failures',
      'connection_pool_exhaustion',
      'service_unhealthy'
    )),
  severity   text        NOT NULL
    CHECK (severity IN ('critical', 'warning', 'info')),
  message    text        NOT NULL,
  value      numeric     NOT NULL,
  threshold  numeric     NOT NULL,
  details    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The index is the cooldown query. It asks for the recent rows of a set of
-- alert types, which is a range scan on `created_at` within a small set of
-- `alert_type` values, so the leading column is the type and the second is the
-- timestamp descending -- the order the query wants, and descending so that a
-- partial read of the index satisfies it.
--
-- CONCURRENTLY per the repository rule: this is not a fresh database, and a
-- build on a table that does not exist yet cannot be concurrent, so the index is
-- created inside the same transaction that creates the table. When the table is
-- dropped and rebuilt later, this one should be built CONCURRENTLY.
CREATE INDEX IF NOT EXISTS idx_metrics_alerts_type_created
  ON metrics.alerts (alert_type, created_at DESC);

-- RLS on, with no policies. Nothing in this schema is a user-facing read, and a
-- policy that let `authenticated` read alert history would publish the
-- thresholds the alerting is measured against.
--
-- That makes the table service-role-only, which is also why
-- `logAlerts` and `filterByAlertCooldowns` now use the service client instead of
-- the request's user client: writing alert history is an administrative action,
-- and running it as the caller meant the insert would be denied by this policy
-- and logged as an error, which is exactly the silent failure this table exists
-- to remove.
ALTER TABLE metrics.alerts ENABLE ROW LEVEL SECURITY;

-- The read side of the function returns, so this is not only a statement of
-- intent: a rollback of either change alone makes the other fail. A table that
-- exists but cannot be written, or a write that succeeds against a table the
-- cooldown cannot read, are both worse than the single broken query this
-- replaces.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'metrics' AND table_name = 'alerts'
  ) THEN
    RAISE EXCEPTION 'metrics.alerts was not created';
  END IF;
END $$;

-- A read-only preview of the automation queue, for the worker's shadow mode.
--
-- The shadow branches must claim nothing and write nothing — that is what
-- makes their output diffable against the Deno job still doing the real
-- work. Calling the real claim and releasing would flip every row to
-- `processing` and back, which is a write the run it is being compared
-- against can observe. So the preview is a separate function that shares
-- the claim's selection predicate without the `FOR UPDATE SKIP LOCKED`
-- and without the status flip.
--
-- The predicate is duplicated here rather than extracted into a view
-- because the claim's is inside a data-modifying CTE, which cannot be
-- referenced read-only from another query. The duplication is the point:
-- a drift between the two is a shadow that reports the wrong population,
-- and the integration suite asserts the preview and the claim agree on
-- the same rows.

CREATE OR REPLACE FUNCTION public.preview_automation_queue(
    p_batch_size integer DEFAULT 100
)
RETURNS SETOF public.email_automation_queue
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
    SELECT *
    FROM public.email_automation_queue
    WHERE status = 'pending'
      AND scheduled_for <= now()
      AND attempts < max_attempts
    ORDER BY scheduled_for ASC, id ASC
    LIMIT p_batch_size;
$$;

REVOKE ALL ON FUNCTION public.preview_automation_queue(integer) FROM PUBLIC;

-- `anon` and `authenticated` are absent against a bare schema; revoking
-- from a missing role is an error.
DO $$
DECLARE
    client_role text;
BEGIN
    FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated']
    LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
            EXECUTE format(
                'REVOKE ALL ON FUNCTION public.preview_automation_queue(integer) FROM %I',
                client_role
            );
        END IF;
    END LOOP;
END
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT EXECUTE ON FUNCTION public.preview_automation_queue(integer)
            TO service_role;
    END IF;
END
$$;

-- Fix: a drip flow's next step was never scheduled.
--
-- `mark_automation_email_sent` decides whether to schedule the flow's next
-- step with `IF v_flow IS NOT NULL AND ...`. The `v_flow` is a
-- `%ROWTYPE` filled by `SELECT * INTO`, and for that shape of variable the
-- `IS NOT NULL` test reports false even when the row was found: the record
-- header is not set by the row fetch, only its fields are. The condition
-- therefore never passed, every successful first email fell into the ELSE
-- branch, and the enrollment was marked `completed` with no next step
-- queued — a multi-step drip silently ends after email one.
--
-- The same function's own guard for the write-back uses the reliable
-- idiom, `IF NOT FOUND`; the flow check is corrected to `FOUND`, which is
-- exactly the property the branch depends on: whether the SELECT found the
-- flow.
--
-- The defect could not be caught before it shipped because the integration
-- tests that pin it (the `automation` suite in services/crates/fs-db/tests)
-- ran nowhere: they skip without FS_TEST_DATABASE_URL, and no job supplied
-- one. They now run in CI against the full migration corpus, which is how
-- this one surfaced.

CREATE OR REPLACE FUNCTION public.mark_automation_email_sent(
    p_queue_id  uuid,
    p_provider  text,
    p_message_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_queue_item public.email_automation_queue%ROWTYPE;
    v_flow       public.email_automation_flows%ROWTYPE;
    v_next_step  jsonb;
    v_next_step_index integer;
    v_delay_minutes integer;
BEGIN
    UPDATE public.email_automation_queue
    SET status = 'sent',
        sent_at = now(),
        provider = p_provider,
        message_id = p_message_id,
        error_message = NULL,
        updated_at = now()
    WHERE id = p_queue_id
      AND status = 'processing'
    RETURNING * INTO v_queue_item;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Everything below runs only for the caller that still owned the row.
    UPDATE public.automation_enrollments
    SET current_step = v_queue_item.step_index + 1,
        updated_at = now()
    WHERE id = v_queue_item.enrollment_id;

    UPDATE public.email_automation_flows
    SET total_completed = total_completed + 1,
        updated_at = now()
    WHERE id = v_queue_item.flow_id;

    SELECT * INTO v_flow
    FROM public.email_automation_flows
    WHERE id = v_queue_item.flow_id;

    v_next_step_index := v_queue_item.step_index + 1;

    IF FOUND AND jsonb_array_length(v_flow.steps) > v_next_step_index THEN
        v_next_step := v_flow.steps -> v_next_step_index;
        v_delay_minutes := COALESCE((v_next_step ->> 'delay_minutes')::integer, 0);

        INSERT INTO public.email_automation_queue (
            enrollment_id, flow_id, profile_id, step_index,
            scheduled_for, email_data
        ) VALUES (
            v_queue_item.enrollment_id, v_queue_item.flow_id,
            v_queue_item.profile_id, v_next_step_index,
            now() + make_interval(mins => v_delay_minutes),
            v_next_step
        );
    ELSE
        UPDATE public.automation_enrollments
        SET status = 'completed',
            completed_at = now(),
            updated_at = now()
        WHERE id = v_queue_item.enrollment_id;
    END IF;

    RETURN true;
END;
$$;

COMMENT ON FUNCTION public.mark_automation_email_sent(uuid, text, text) IS
    'Marks a claimed automation email as sent, records the delivery evidence, advances the enrollment, and schedules the flow''s next step. The next-step guard is FOUND, not a row-variable IS NOT NULL test, which reports false for a %ROWTYPE filled by SELECT * INTO.';

-- The 20261001 assertions (exact signature, processing scope) apply to the
-- replacement unchanged, and CREATE OR REPLACE keeps the existing grants;
-- both are re-verified by the migration chain's own checks.
DO $$
DECLARE
    v_def text;
BEGIN
    SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'mark_automation_email_sent'
      AND pg_get_function_identity_arguments(p.oid)
          = 'p_queue_id uuid, p_provider text, p_message_id text';

    IF v_def IS NULL OR v_def NOT LIKE '%status = ''processing''%' THEN
        RAISE EXCEPTION
            'public.mark_automation_email_sent must keep its (uuid, text, text) signature and its processing scope';
    END IF;

    IF v_def NOT LIKE '%IF FOUND AND jsonb_array_length(v_flow.steps)%' THEN
        RAISE EXCEPTION
            'the next-step guard must be FOUND: a row-variable IS NOT NULL test reports false for the record variable filled by SELECT * INTO, and the drip''s next step is never scheduled';
    END IF;
END;
$$;

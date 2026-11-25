-- Repair the audit functions that still name columns dropped from
-- audit.logged_actions (2026-11-25).
--
-- 20261108260000_drop_dead_columns.sql dropped audit.logged_actions
-- .changed_fields, .event_time, .row_data and .schema_name. Three functions
-- still named them:
--
--   * audit.log_changes() inserted changed_fields in its INSERT, UPDATE and
--     DELETE branches. It is the trigger function of audit_posts, audit_rooms,
--     audit_profiles and audit_device_tokens, so every write to those tables
--     failed with `column "changed_fields" of relation "logged_actions" does
--     not exist` (listings, chat rooms, push tokens, profile edits, account
--     deletion).
--   * public.audit_display_name_override_changes() wrote schema_name, row_data,
--     changed_fields and user_id (user_id no longer exists either), so every
--     write to display_name_overrides failed the same way.
--   * audit.get_record_history() selected la.changed_fields.
--
-- The surviving columns are: id, table_name, action, old_data, new_data,
-- changed_by, correlation_id, client_ip, user_agent, changed_at.
--
-- audit.log_changes() keeps its body otherwise: same SECURITY DEFINER, same
-- session-config reads, and the UPDATE branch still skips rows where nothing
-- changed. The changed keys were stored nowhere readable except
-- get_record_history(), which now derives them from old_data and new_data
-- (same return type). No data changes; owners and grants are kept because
-- CREATE OR REPLACE preserves them.

CREATE OR REPLACE FUNCTION audit.log_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_old_data JSONB;
  v_new_data JSONB;
  v_has_changes BOOLEAN;
  v_correlation_id TEXT;
  v_client_ip INET;
  v_user_agent TEXT;
BEGIN
  -- Get correlation ID from session config (set by Edge Functions)
  v_correlation_id := current_setting('app.correlation_id', true);
  -- Get client info from session config (if available)
  v_client_ip := NULLIF(current_setting('app.client_ip', true), '')::INET;
  v_user_agent := current_setting('app.user_agent', true);
  -- Handle different operations
  IF TG_OP = 'INSERT' THEN
    v_new_data := to_jsonb(NEW);
    INSERT INTO audit.logged_actions (
      table_name, action, old_data, new_data,
      changed_by, correlation_id, client_ip, user_agent
    ) VALUES (
      TG_TABLE_NAME, 'INSERT', NULL, v_new_data,
      auth.uid(), v_correlation_id, v_client_ip, v_user_agent
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    -- Only log if something actually changed
    SELECT EXISTS (
      SELECT 1
      FROM jsonb_each(v_new_data)
      WHERE v_old_data->key IS DISTINCT FROM v_new_data->key
    ) INTO v_has_changes;
    IF v_has_changes THEN
      INSERT INTO audit.logged_actions (
        table_name, action, old_data, new_data,
        changed_by, correlation_id, client_ip, user_agent
      ) VALUES (
        TG_TABLE_NAME, 'UPDATE', v_old_data, v_new_data,
        auth.uid(), v_correlation_id, v_client_ip, v_user_agent
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    INSERT INTO audit.logged_actions (
      table_name, action, old_data, new_data,
      changed_by, correlation_id, client_ip, user_agent
    ) VALUES (
      TG_TABLE_NAME, 'DELETE', v_old_data, NULL,
      auth.uid(), v_correlation_id, v_client_ip, v_user_agent
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_display_name_override_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit.logged_actions (table_name, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, 'INSERT', NULL, to_jsonb(NEW), NEW.overridden_by);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit.logged_actions (table_name, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), NEW.overridden_by);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit.logged_actions (table_name, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, 'DELETE', to_jsonb(OLD), NULL, OLD.overridden_by);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION audit.get_record_history(p_table_name text, p_record_id uuid, p_limit integer DEFAULT 50)
 RETURNS TABLE(action text, changed_fields text[], old_data jsonb, new_data jsonb, changed_by uuid, changed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    la.action,
    CASE
      WHEN la.action = 'UPDATE' THEN (
        SELECT array_agg(n.key ORDER BY n.key)
        FROM jsonb_each(la.new_data) AS n
        WHERE la.old_data->n.key IS DISTINCT FROM n.value
      )
      ELSE NULL
    END,
    la.old_data,
    la.new_data,
    la.changed_by,
    la.changed_at
  FROM audit.logged_actions la
  WHERE la.table_name = p_table_name
    AND (
      (la.new_data->>'id')::UUID = p_record_id
      OR (la.old_data->>'id')::UUID = p_record_id
    )
  ORDER BY la.changed_at DESC
  LIMIT p_limit;
END;
$function$;

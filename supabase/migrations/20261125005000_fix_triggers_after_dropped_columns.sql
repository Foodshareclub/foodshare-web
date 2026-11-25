-- Repair the trigger and audit functions that still name columns dropped by
-- 20261108260000_drop_dead_columns.sql (2026-11-25).
--
-- Sorts BEFORE 20261125010000 on purpose: that migration UPDATEs public.forum,
-- which fires track_forum_edit_trigger, and deploy run 45666134589 rolled back
-- at it with `column "previous_title" of relation "forum_post_history" does not
-- exist`. deploy.sh applies every version missing from schema_migrations in
-- filename order, so an unapplied file dated earlier than the newest applied
-- one (20261125000000) is applied normally. Nothing has applied this content
-- anywhere: the earlier audit-only file (20261125020000, run 45666134589) rolled
-- back, so it is folded in here.
--
-- A plpgsql body is not checked when the column it names is dropped, and
-- pg_depend carries no entry for it, so DROP COLUMN went through while these
-- functions kept naming it. Found by running plpgsql_check over every plpgsql
-- function on production and confirmed per trigger by executing the write in a
-- rolled-back transaction. Every trigger below blocked the table's writes:
--
--   * audit.log_changes() inserted audit.logged_actions.changed_fields. Its
--     triggers (audit_posts, audit_rooms, audit_profiles, audit_device_tokens)
--     failed every INSERT/UPDATE/DELETE on listings, chat rooms, profiles and
--     push tokens.
--   * public.audit_display_name_override_changes() wrote schema_name, row_data,
--     changed_fields and user_id (user_id no longer exists either): every write
--     to display_name_overrides.
--   * public.track_forum_edit() wrote forum_post_history.previous_title,
--     previous_description, previous_image: every UPDATE of public.forum that
--     changes the title, description or image. Its editor_id is NOT NULL, so a
--     change made with no auth.uid() (such as 20261125010000's host rewrite)
--     is now skipped instead of raising; it is not marked is_edited either.
--   * public.track_comment_edit() wrote forum_comment_history.previous_content:
--     every edit of a comment's text.
--   * public.email_template_version_trigger() wrote
--     email_template_versions.change_reason: every content edit of an email
--     template.
--   * public.move_failed_email_to_dlq() wrote email_dead_letter_queue
--     .original_queue_id and .attempts: every email_queue row turning 'failed'.
--     `attempts` never existed (the baseline table has total_attempts, also
--     dropped now) and failure_reason is NOT NULL and was never supplied, so
--     this trigger failed since the baseline. It now supplies failure_reason
--     (the queue row's last_error) and omits the dropped columns.
--   * public.track_translation_changes() wrote translation_versions
--     .previous_version: every change to a translations row's messages.
--   * audit.get_record_history() selected la.changed_fields.
--
-- Each function keeps its body otherwise: same SECURITY DEFINER, search_path,
-- change detection and side effects (a user's edit still sets is_edited).
-- Rows that carried the dropped columns lost them with the drop; the history
-- tables keep what survives (who edited which row, and when). No data changes;
-- owners and grants are kept because CREATE OR REPLACE preserves them.
--
-- Not fixed here: about 75 callable (non-trigger) functions also name dropped
-- columns (for example check_client_compatibility, get_user_feature_flags,
-- get_delta_sync, track_user_activity, cleanup_expired_feed_cells). Removing
-- the column there changes what the function returns, which is a product
-- decision, so they are pinned in scripts/fixtures/function-write-columns-pinned.json
-- (checked by scripts/test-function-write-columns.ts) rather than rewritten blind.
--
-- The surviving audit.logged_actions columns are: id, table_name, action, old_data, new_data,
-- changed_by, correlation_id, client_ip, user_agent, changed_at.
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
CREATE OR REPLACE FUNCTION public.track_forum_edit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only track if content actually changed
  IF OLD.forum_post_name IS DISTINCT FROM NEW.forum_post_name OR
     OLD.forum_post_description IS DISTINCT FROM NEW.forum_post_description OR
     OLD.forum_post_image IS DISTINCT FROM NEW.forum_post_image THEN
    -- forum_post_history.editor_id is NOT NULL, and a change with no auth.uid()
    -- (a migration, a data repair, a service-role job) has no editor to record.
    -- Before, the history INSERT raised on those; 20261125010000's host rewrite
    -- is one, so such a change is neither recorded nor marked as an edit.
    IF (SELECT auth.uid()) IS NOT NULL THEN
      INSERT INTO public.forum_post_history (forum_id, editor_id)
      VALUES (OLD.id, (SELECT auth.uid()));
      -- Mark as edited
      NEW.is_edited := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.track_comment_edit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.comment IS DISTINCT FROM NEW.comment THEN
    INSERT INTO public.forum_comment_history (comment_id, editor_id)
    VALUES (OLD.id, (SELECT auth.uid()));
    NEW.is_edited := true;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.email_template_version_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF OLD.html_content IS DISTINCT FROM NEW.html_content
     OR OLD.subject IS DISTINCT FROM NEW.subject
     OR OLD.text_content IS DISTINCT FROM NEW.text_content
     OR OLD.variables IS DISTINCT FROM NEW.variables THEN
    INSERT INTO email_template_versions (
      template_id, version, subject, html_content, text_content, variables, changed_by
    ) VALUES (
      OLD.id, OLD.version, OLD.subject, OLD.html_content, OLD.text_content, OLD.variables, NEW.updated_by
    );
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.move_failed_email_to_dlq()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Only trigger when status changes to 'failed'
  IF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status != 'failed') THEN
    INSERT INTO email_dead_letter_queue (
      recipient_email,
      email_type,
      template_name,
      template_data,
      failure_reason,
      failed_providers,
      last_error,
      created_at
    ) VALUES (
      NEW.recipient_email,
      NEW.email_type,
      NEW.template_name,
      NEW.template_data,
      COALESCE(NEW.last_error, 'email marked failed'),
      ARRAY['resend', 'brevo', 'mailersend', 'aws_ses']::text[], -- all attempted
      NEW.last_error,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.track_translation_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old_messages JSONB;
  v_new_messages JSONB;
  v_changes JSONB := '{}';
  v_key TEXT;
  v_old_value TEXT;
  v_new_value TEXT;
BEGIN
  v_old_messages := COALESCE(OLD.messages, '{}'::JSONB);
  v_new_messages := COALESCE(NEW.messages, '{}'::JSONB);
  -- Find changed and new keys
  FOR v_key, v_new_value IN SELECT * FROM jsonb_each_text(v_new_messages)
  LOOP
    v_old_value := v_old_messages ->> v_key;
    IF v_old_value IS NULL OR v_old_value != v_new_value THEN
      v_changes := v_changes || jsonb_build_object(v_key, v_new_value);
    END IF;
  END LOOP;
  -- Find deleted keys (mark as null)
  FOR v_key IN SELECT * FROM jsonb_object_keys(v_old_messages)
  LOOP
    IF NOT v_new_messages ? v_key THEN
      v_changes := v_changes || jsonb_build_object(v_key, null);
    END IF;
  END LOOP;
  -- Only insert if there are actual changes
  IF v_changes != '{}'::JSONB THEN
    INSERT INTO translation_versions (locale, version, changes)
    VALUES (NEW.locale, NEW.version, v_changes);
  END IF;
  RETURN NEW;
END;
$function$;

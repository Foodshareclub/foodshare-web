-- Fix post_activity_logs foreign key constraint to allow post deletion
--
-- Problem: The trigger_log_post_changes() trigger fires on DELETE and tries to
-- insert an activity log, but the foreign key constraint fails because the post
-- is being deleted.
--
-- Solution: Change the foreign key to ON DELETE SET NULL, which:
-- 1. Allows posts to be deleted without constraint violations
-- 2. Preserves the audit trail (logs remain with post_id = NULL)
-- 3. The trigger can still log the deletion before the FK check

-- Step 1: Make post_id nullable (if not already)
ALTER TABLE post_activity_logs
  ALTER COLUMN post_id DROP NOT NULL;

-- Step 2: Drop the existing foreign key constraint
ALTER TABLE post_activity_logs
  DROP CONSTRAINT IF EXISTS post_activity_logs_post_id_fkey;

-- Step 3: Re-add the foreign key with ON DELETE SET NULL
ALTER TABLE post_activity_logs
  ADD CONSTRAINT post_activity_logs_post_id_fkey
  FOREIGN KEY (post_id)
  REFERENCES posts(id)
  ON DELETE SET NULL;

-- Step 4: Update the trigger to handle deletion properly
CREATE OR REPLACE FUNCTION trigger_log_post_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_activity_type TEXT;
  v_previous_state JSONB;
  v_new_state JSONB;
  v_changes JSONB;
BEGIN
  -- Determine activity type based on operation
  CASE TG_OP
    WHEN 'INSERT' THEN
      v_activity_type := 'created';
      v_previous_state := '{}'::JSONB;
      v_new_state := to_jsonb(NEW);
      v_changes := to_jsonb(NEW);
    WHEN 'UPDATE' THEN
      -- Detect specific types of updates
      IF OLD.is_active = true AND NEW.is_active = false THEN
        v_activity_type := 'deactivated';
      ELSIF OLD.is_active = false AND NEW.is_active = true THEN
        v_activity_type := 'activated';
      ELSE
        v_activity_type := 'updated';
      END IF;
      v_previous_state := to_jsonb(OLD);
      v_new_state := to_jsonb(NEW);
      -- Calculate changes (fields that differ)
      SELECT jsonb_object_agg(key, value) INTO v_changes
      FROM (
        SELECT key, to_jsonb(NEW) -> key as value
        FROM jsonb_object_keys(to_jsonb(NEW)) AS key
        WHERE to_jsonb(OLD) -> key IS DISTINCT FROM to_jsonb(NEW) -> key
      ) AS diff;
    WHEN 'DELETE' THEN
      v_activity_type := 'deleted';
      v_previous_state := to_jsonb(OLD);
      v_new_state := '{}'::JSONB;
      v_changes := '{}'::JSONB;
  END CASE;

  -- Insert the activity log
  INSERT INTO post_activity_logs (
    post_id,
    actor_id,
    activity_type,
    previous_state,
    new_state,
    changes,
    metadata
  ) VALUES (
    CASE TG_OP
      WHEN 'DELETE' THEN OLD.id
      ELSE COALESCE(NEW.id, OLD.id)
    END,
    CASE TG_OP
      WHEN 'DELETE' THEN OLD.profile_id
      ELSE COALESCE(NEW.profile_id, OLD.profile_id)
    END,
    v_activity_type::post_activity_type,
    v_previous_state,
    v_new_state,
    COALESCE(v_changes, '{}'::JSONB),
    jsonb_build_object(
      'trigger', TG_NAME,
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'logged_at', NOW()
    )
  );

  -- Return appropriate value based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Drop existing triggers and create separate ones for proper timing
DROP TRIGGER IF EXISTS log_post_changes ON posts;
DROP TRIGGER IF EXISTS log_post_changes_insert_update ON posts;
DROP TRIGGER IF EXISTS log_post_changes_delete ON posts;

-- AFTER trigger for INSERT and UPDATE
CREATE TRIGGER log_post_changes_insert_update
  AFTER INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_post_changes();

-- BEFORE trigger for DELETE (logs before the row is removed)
CREATE TRIGGER log_post_changes_delete
  BEFORE DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_post_changes();

-- Add a comment explaining the design
COMMENT ON TABLE post_activity_logs IS 'Audit log for post changes. post_id is nullable to preserve logs after post deletion (ON DELETE SET NULL).';

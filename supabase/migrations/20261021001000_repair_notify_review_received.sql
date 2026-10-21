-- Repair the trigger that fires when a review is received.
--
-- The trigger has never worked. It reads four columns that the reviews
-- table does not have:
--
--   NEW.reviewer_id    the table has profile_id
--   NEW.review_text    the table has feedback and notes
--   NEW.rating         the table has reviewed_rating
--
-- and it qualifies nothing while pinning search_path to the empty string,
-- so "FROM profiles" cannot resolve either. Every insert into reviews
-- therefore failed on the trigger, which is why no review could be
-- submitted and why the aggregate migration's own check -- which seeds
-- two review rows to prove the aggregate -- could not run.
--
-- The sibling trigger, notify_new_review, was written against the real
-- columns and works, so this is repaired to match it: the reviewer's
-- profile_id, the reviewed_rating, the feedback text, and the same
-- public schema the other trigger uses. It keeps its own purpose, which
-- is to notify the listing's owner that a review arrived; the sibling
-- notifies the reviewer's own connections.
--
-- The notification's columns are filled from the same values the working
-- trigger uses, and the type stays 'review_received', which is what the
-- application's own filter expects.

BEGIN;

-- The notification helper declares p_post_id and p_review_id as integer,
-- but the columns it writes -- user_notifications.post_id and
-- user_notifications.review_id -- are bigint, and so are the values the
-- callers pass: reviews.post_id, reviews.id and rooms.post_id. The
-- integer version therefore cannot be called with any of them, and the
-- call fails with "function create_user_notification(...) does not
-- exist" -- the one-argument-mismatch error that says the same thing
-- about a type it cannot narrow. The parameters are widened to bigint,
-- which is what the columns are.
CREATE OR REPLACE FUNCTION public.create_user_notification(p_recipient_id uuid, p_actor_id uuid, p_type text, p_title text, p_body text DEFAULT NULL::text, p_post_id bigint DEFAULT NULL::bigint, p_room_id uuid DEFAULT NULL::uuid, p_review_id bigint DEFAULT NULL::bigint, p_data jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  -- Don't notify yourself
  IF p_recipient_id = p_actor_id THEN
    RETURN NULL;
  END IF;

  INSERT INTO user_notifications (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    post_id,
    room_id,
    review_id,
    data
  ) VALUES (
    p_recipient_id,
    p_actor_id,
    p_type,
    p_title,
    p_body,
    p_post_id,
    p_room_id,
    p_review_id,
    p_data
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_review_received() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_reviewer_name text;
  v_post_owner_id uuid;
BEGIN
  -- Get reviewer name
  SELECT COALESCE(nickname, 'Someone') INTO v_reviewer_name
    FROM profiles
   WHERE id = NEW.profile_id;

  -- Get post owner if this is a post review
  IF NEW.post_id IS NOT NULL THEN
    SELECT profile_id INTO v_post_owner_id
      FROM posts
     WHERE id = NEW.post_id;

    IF v_post_owner_id IS NOT NULL THEN
      PERFORM create_user_notification(
        p_recipient_id := v_post_owner_id,
        p_actor_id := NEW.profile_id,
        p_type := 'review_received',
        p_title := COALESCE(v_reviewer_name, 'Someone') || ' left you a review',
        p_body := LEFT(COALESCE(NEW.feedback, NEW.notes, ''), 100),
        p_post_id := NEW.post_id,
        p_review_id := NEW.id,
        p_data := jsonb_build_object('rating', NEW.reviewed_rating)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_review_received() IS
  'Notifies the listing owner that a review was left. Repaired: it read '
  'reviewer_id, review_text and rating, none of which the reviews table '
  'has, and it left the schema unqualified while pinning search_path to the '
  'empty string, so no review could be inserted at all.';

COMMIT;

NOTIFY pgrst, 'reload schema';

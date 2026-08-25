-- Optimize aggregation queries: replace sequential COUNT queries with single RPC
-- Used for user dashboard / feed responses

CREATE OR REPLACE FUNCTION public.get_user_unread_counts(p_user_id UUID)
RETURNS TABLE(
  unread_notifications BIGINT,
  unread_messages BIGINT,
  pending_requests BIGINT
) AS $$
  SELECT
    COALESCE((SELECT COUNT(*) FROM public.user_notifications WHERE recipient_id = p_user_id AND is_read = FALSE), 0)::BIGINT,
    COALESCE((SELECT COUNT(*) FROM public.room_participants rp JOIN public.rooms r ON rp.room_id = r.id WHERE (r.user_id = p_user_id OR r.post_user_id = p_user_id) AND rp.user_id != p_user_id), 0)::BIGINT,
    COALESCE((SELECT COUNT(*) FROM public.rooms WHERE post_user_id = p_user_id), 0)::BIGINT;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_unread_counts(UUID) TO postgres, anon, authenticated, service_role;

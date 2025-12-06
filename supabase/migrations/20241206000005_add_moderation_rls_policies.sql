-- Migration: Add RLS policies for forum moderation tables
-- Date: 2024-12-06
-- Issue: Tables have RLS enabled but no policies defined
-- Tables: forum_moderation_notes, forum_moderation_queue, forum_moderation_stats

-- Helper function for moderator check (optimized with subquery pattern)
CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE profile_id = (SELECT auth.uid())
    AND role_name IN ('admin', 'superadmin', 'moderator')
  );
$$;

-- ============================================
-- forum_moderation_notes policies
-- ============================================

-- Moderators can view all moderation notes
CREATE POLICY "Moderators can view moderation notes"
ON public.forum_moderation_notes
FOR SELECT
TO authenticated
USING (public.is_moderator());

-- Moderators can create moderation notes
CREATE POLICY "Moderators can create moderation notes"
ON public.forum_moderation_notes
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_moderator()
  AND moderator_id = (SELECT auth.uid())
);

-- Moderators can update their own notes
CREATE POLICY "Moderators can update own notes"
ON public.forum_moderation_notes
FOR UPDATE
TO authenticated
USING (
  public.is_moderator()
  AND moderator_id = (SELECT auth.uid())
)
WITH CHECK (
  public.is_moderator()
  AND moderator_id = (SELECT auth.uid())
);

-- Only admins can delete moderation notes
CREATE POLICY "Admins can delete moderation notes"
ON public.forum_moderation_notes
FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================
-- forum_moderation_queue policies
-- ============================================

-- Moderators can view the moderation queue
CREATE POLICY "Moderators can view moderation queue"
ON public.forum_moderation_queue
FOR SELECT
TO authenticated
USING (public.is_moderator());

-- System/triggers can insert into queue (via service role)
-- Users can report content (creates queue entry)
CREATE POLICY "Authenticated users can report content"
ON public.forum_moderation_queue
FOR INSERT
TO authenticated
WITH CHECK (
  reported_by = (SELECT auth.uid())
);

-- Moderators can update queue items (process reports)
CREATE POLICY "Moderators can process queue items"
ON public.forum_moderation_queue
FOR UPDATE
TO authenticated
USING (public.is_moderator())
WITH CHECK (public.is_moderator());

-- Only admins can delete from queue
CREATE POLICY "Admins can delete queue items"
ON public.forum_moderation_queue
FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================
-- forum_moderation_stats policies
-- ============================================

-- Moderators can view moderation stats
CREATE POLICY "Moderators can view moderation stats"
ON public.forum_moderation_stats
FOR SELECT
TO authenticated
USING (public.is_moderator());

-- Only system can insert/update stats (via triggers or service role)
-- Moderators can view their own stats
CREATE POLICY "Users can view own moderation stats"
ON public.forum_moderation_stats
FOR SELECT
TO authenticated
USING (moderator_id = (SELECT auth.uid()));

-- Stats are typically updated by triggers, but allow moderators to update their own
CREATE POLICY "System updates moderation stats"
ON public.forum_moderation_stats
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Insert policy for system/admin
CREATE POLICY "Admins can insert moderation stats"
ON public.forum_moderation_stats
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

COMMENT ON POLICY "Moderators can view moderation notes" ON public.forum_moderation_notes IS 'Allow moderators to view all moderation notes';
COMMENT ON POLICY "Moderators can view moderation queue" ON public.forum_moderation_queue IS 'Allow moderators to view reported content';
COMMENT ON POLICY "Moderators can view moderation stats" ON public.forum_moderation_stats IS 'Allow moderators to view performance stats';

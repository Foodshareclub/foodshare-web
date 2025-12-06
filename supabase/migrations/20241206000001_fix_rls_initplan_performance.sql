-- ============================================================================
-- Migration: Fix RLS Policy Performance (InitPlan Optimization)
-- Date: 2024-12-06
-- Description: Wraps auth.uid() and auth.role() calls in subqueries to prevent
--              re-evaluation for each row. This is a critical performance fix.
-- 
-- Before: auth.uid() = user_id  (evaluated per row - O(n))
-- After:  (SELECT auth.uid()) = user_id  (evaluated once - O(1))
--
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- ============================================================================

-- Helper function to check if user is admin (optimized)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
    AND role IN ('admin', 'superadmin')
  );
$$;

-- ============================================================================
-- FORUM TABLES
-- ============================================================================

-- forum_comment_reactions
DROP POLICY IF EXISTS "Authenticated users can add reactions" ON public.forum_comment_reactions;
CREATE POLICY "Authenticated users can add reactions" ON public.forum_comment_reactions
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can remove their own reactions" ON public.forum_comment_reactions;
CREATE POLICY "Users can remove their own reactions" ON public.forum_comment_reactions
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

-- forum_bookmarks
DROP POLICY IF EXISTS "Users can read their own bookmarks" ON public.forum_bookmarks;
CREATE POLICY "Users can read their own bookmarks" ON public.forum_bookmarks
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can create their own bookmarks" ON public.forum_bookmarks;
CREATE POLICY "Users can create their own bookmarks" ON public.forum_bookmarks
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON public.forum_bookmarks;
CREATE POLICY "Users can delete their own bookmarks" ON public.forum_bookmarks
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

-- forum_tags
DROP POLICY IF EXISTS "Admins can manage tags" ON public.forum_tags;
CREATE POLICY "Admins can manage tags" ON public.forum_tags
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- forum_post_tags
DROP POLICY IF EXISTS "Post owners can manage their post tags" ON public.forum_post_tags;
CREATE POLICY "Post owners can manage their post tags" ON public.forum_post_tags
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forum
      WHERE forum.id = forum_post_tags.forum_id
      AND forum.profile_id = (SELECT auth.uid())
    )
  );

-- forum_categories
DROP POLICY IF EXISTS "Admins can manage categories" ON public.forum_categories;
CREATE POLICY "Admins can manage categories" ON public.forum_categories
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- forum_user_blocks
DROP POLICY IF EXISTS "Users can view their own blocks" ON public.forum_user_blocks;
CREATE POLICY "Users can view their own blocks" ON public.forum_user_blocks
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = blocker_id);

DROP POLICY IF EXISTS "Users can block others" ON public.forum_user_blocks;
CREATE POLICY "Users can block others" ON public.forum_user_blocks
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = blocker_id);

DROP POLICY IF EXISTS "Users can unblock" ON public.forum_user_blocks;
CREATE POLICY "Users can unblock" ON public.forum_user_blocks
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = blocker_id);

-- forum_bookmark_collections
DROP POLICY IF EXISTS "Users can view their own collections" ON public.forum_bookmark_collections;
CREATE POLICY "Users can view their own collections" ON public.forum_bookmark_collections
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = profile_id OR is_public = true);

DROP POLICY IF EXISTS "Users can create collections" ON public.forum_bookmark_collections;
CREATE POLICY "Users can create collections" ON public.forum_bookmark_collections
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can update their collections" ON public.forum_bookmark_collections;
CREATE POLICY "Users can update their collections" ON public.forum_bookmark_collections
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can delete their collections" ON public.forum_bookmark_collections;
CREATE POLICY "Users can delete their collections" ON public.forum_bookmark_collections
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

-- forum_conversations
DROP POLICY IF EXISTS "Users can view their conversations" ON public.forum_conversations;
CREATE POLICY "Users can view their conversations" ON public.forum_conversations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forum_conversation_participants
      WHERE conversation_id = forum_conversations.id
      AND profile_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create conversations" ON public.forum_conversations;
CREATE POLICY "Users can create conversations" ON public.forum_conversations
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = created_by);

DROP POLICY IF EXISTS "Conversation owners can update" ON public.forum_conversations;
CREATE POLICY "Conversation owners can update" ON public.forum_conversations
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = created_by);

-- forum_conversation_participants
DROP POLICY IF EXISTS "Participants can view conversation members" ON public.forum_conversation_participants;
CREATE POLICY "Participants can view conversation members" ON public.forum_conversation_participants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forum_conversation_participants fcp
      WHERE fcp.conversation_id = forum_conversation_participants.conversation_id
      AND fcp.profile_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can join conversations they're invited to" ON public.forum_conversation_participants;
CREATE POLICY "Users can join conversations they're invited to" ON public.forum_conversation_participants
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can update their own participation" ON public.forum_conversation_participants;
CREATE POLICY "Users can update their own participation" ON public.forum_conversation_participants
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

-- forum_messages
DROP POLICY IF EXISTS "Participants can view messages" ON public.forum_messages;
CREATE POLICY "Participants can view messages" ON public.forum_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forum_conversation_participants
      WHERE conversation_id = forum_messages.conversation_id
      AND profile_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can send messages" ON public.forum_messages;
CREATE POLICY "Participants can send messages" ON public.forum_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = sender_id
    AND EXISTS (
      SELECT 1 FROM public.forum_conversation_participants
      WHERE conversation_id = forum_messages.conversation_id
      AND profile_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Senders can edit their messages" ON public.forum_messages;
CREATE POLICY "Senders can edit their messages" ON public.forum_messages
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = sender_id);

-- forum_message_read_receipts
DROP POLICY IF EXISTS "Users can view read receipts in their conversations" ON public.forum_message_read_receipts;
CREATE POLICY "Users can view read receipts in their conversations" ON public.forum_message_read_receipts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forum_messages fm
      JOIN public.forum_conversation_participants fcp ON fcp.conversation_id = fm.conversation_id
      WHERE fm.id = forum_message_read_receipts.message_id
      AND fcp.profile_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can mark messages as read" ON public.forum_message_read_receipts;
CREATE POLICY "Users can mark messages as read" ON public.forum_message_read_receipts
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = profile_id);

-- forum_message_reactions
DROP POLICY IF EXISTS "Users can view message reactions" ON public.forum_message_reactions;
CREATE POLICY "Users can view message reactions" ON public.forum_message_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forum_messages fm
      JOIN public.forum_conversation_participants fcp ON fcp.conversation_id = fm.conversation_id
      WHERE fm.id = forum_message_reactions.message_id
      AND fcp.profile_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can react to messages" ON public.forum_message_reactions;
CREATE POLICY "Users can react to messages" ON public.forum_message_reactions
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can remove their reactions" ON public.forum_message_reactions;
CREATE POLICY "Users can remove their reactions" ON public.forum_message_reactions
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

-- ============================================================================
-- CHALLENGE TABLES
-- ============================================================================

-- challenge_activities
DROP POLICY IF EXISTS "Users can create challenge activities" ON public.challenge_activities;
CREATE POLICY "Users can create challenge activities" ON public.challenge_activities
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can update own activities" ON public.challenge_activities;
CREATE POLICY "Users can update own activities" ON public.challenge_activities
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

-- challenge_participants
DROP POLICY IF EXISTS "Users can accept challenges" ON public.challenge_participants;
CREATE POLICY "Users can accept challenges" ON public.challenge_participants
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can update their own participation" ON public.challenge_participants;
CREATE POLICY "Users can update their own participation" ON public.challenge_participants
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can delete their own participation" ON public.challenge_participants;
CREATE POLICY "Users can delete their own participation" ON public.challenge_participants
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

-- ============================================================================
-- NOTIFICATION & REPORT TABLES
-- ============================================================================

-- notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

-- reports
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = profile_id);

-- ============================================================================
-- ROOM/CHAT TABLES
-- ============================================================================

-- room_participants
DROP POLICY IF EXISTS "User can remove themselves from room" ON public.room_participants;
CREATE POLICY "User can remove themselves from room" ON public.room_participants
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Participants can view messages" ON public.room_participants;
CREATE POLICY "Participants can view messages" ON public.room_participants
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Participants can send messages" ON public.room_participants;
CREATE POLICY "Participants can send messages" ON public.room_participants
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can update own messages" ON public.room_participants;
CREATE POLICY "Users can update own messages" ON public.room_participants
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

-- ============================================================================
-- COMMENT TABLES
-- ============================================================================

-- comment_likes
DROP POLICY IF EXISTS "Users can like comments" ON public.comment_likes;
CREATE POLICY "Users can like comments" ON public.comment_likes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can unlike comments" ON public.comment_likes;
CREATE POLICY "Users can unlike comments" ON public.comment_likes
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

-- ============================================================================
-- EMAIL TABLES
-- ============================================================================

-- email_preferences
DROP POLICY IF EXISTS "Users can read their own email preferences" ON public.email_preferences;
CREATE POLICY "Users can read their own email preferences" ON public.email_preferences
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own email preferences" ON public.email_preferences;
CREATE POLICY "Users can insert their own email preferences" ON public.email_preferences
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own email preferences" ON public.email_preferences;
CREATE POLICY "Users can update their own email preferences" ON public.email_preferences
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- email_logs
DROP POLICY IF EXISTS "Users can read their own email logs" ON public.email_logs;
CREATE POLICY "Users can read their own email logs" ON public.email_logs
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = recipient_id OR public.is_admin());

-- email_queue
DROP POLICY IF EXISTS "Admins can view email queue" ON public.email_queue;
CREATE POLICY "Admins can view email queue" ON public.email_queue
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- email_provider_quota
DROP POLICY IF EXISTS "Admins can read quota data" ON public.email_provider_quota;
CREATE POLICY "Admins can read quota data" ON public.email_provider_quota
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- email_circuit_breaker_state
DROP POLICY IF EXISTS "Admins can manage circuit breaker state" ON public.email_circuit_breaker_state;
CREATE POLICY "Admins can manage circuit breaker state" ON public.email_circuit_breaker_state
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can see own organization circuit state" ON public.email_circuit_breaker_state;
CREATE POLICY "Users can see own organization circuit state" ON public.email_circuit_breaker_state
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = email_circuit_breaker_state.organization_id
      AND user_id = (SELECT auth.uid())
    )
  );

-- email_dead_letter_queue
DROP POLICY IF EXISTS "Admins can view dead letter queue" ON public.email_dead_letter_queue;
DROP POLICY IF EXISTS "Admins can manage dead letter queue" ON public.email_dead_letter_queue;
CREATE POLICY "Admins can manage dead letter queue" ON public.email_dead_letter_queue
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- email_health_events
DROP POLICY IF EXISTS "Admins can read health events" ON public.email_health_events;
CREATE POLICY "Admins can read health events" ON public.email_health_events
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- email_provider_metrics
DROP POLICY IF EXISTS "Admins can read provider metrics" ON public.email_provider_metrics;
CREATE POLICY "Admins can read provider metrics" ON public.email_provider_metrics
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- email_provider_health_metrics
DROP POLICY IF EXISTS "Admins can view health metrics" ON public.email_provider_health_metrics;
CREATE POLICY "Admins can view health metrics" ON public.email_provider_health_metrics
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- email_provider_health_history
DROP POLICY IF EXISTS "Admins can view health history" ON public.email_provider_health_history;
CREATE POLICY "Admins can view health history" ON public.email_provider_health_history
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- USER/AUTH TABLES
-- ============================================================================

-- user_locale_preferences
DROP POLICY IF EXISTS "Users can read own locale preferences" ON public.user_locale_preferences;
CREATE POLICY "Users can read own locale preferences" ON public.user_locale_preferences
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own locale preferences" ON public.user_locale_preferences;
CREATE POLICY "Users can insert own locale preferences" ON public.user_locale_preferences
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own locale preferences" ON public.user_locale_preferences;
CREATE POLICY "Users can update own locale preferences" ON public.user_locale_preferences
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- translation_sync_status
DROP POLICY IF EXISTS "Users can view own sync status" ON public.translation_sync_status;
DROP POLICY IF EXISTS "Users can update own sync status" ON public.translation_sync_status;
CREATE POLICY "Users can manage own sync status" ON public.translation_sync_status
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- translation_analytics
DROP POLICY IF EXISTS "Analytics readable by authenticated users" ON public.translation_analytics;
CREATE POLICY "Analytics readable by authenticated users" ON public.translation_analytics
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- translation_errors
DROP POLICY IF EXISTS "Errors readable by authenticated users" ON public.translation_errors;
CREATE POLICY "Errors readable by authenticated users" ON public.translation_errors
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- organizations
DROP POLICY IF EXISTS "Users can see own organizations" ON public.organizations;
CREATE POLICY "Users can see own organizations" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organizations.id
      AND user_id = (SELECT auth.uid())
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can manage all organizations" ON public.organizations;
CREATE POLICY "Admins can manage all organizations" ON public.organizations
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- admin_audit_log
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.admin_audit_log;
CREATE POLICY "Admins can read audit logs" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- user_roles
DROP POLICY IF EXISTS "Admins can read all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- MFA TABLES
-- ============================================================================

-- mfa_configuration
DROP POLICY IF EXISTS "Users can read own MFA configuration" ON public.mfa_configuration;
CREATE POLICY "Users can read own MFA configuration" ON public.mfa_configuration
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own MFA configuration" ON public.mfa_configuration;
CREATE POLICY "Users can update own MFA configuration" ON public.mfa_configuration
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can read all MFA configurations" ON public.mfa_configuration;
-- Merged into above policy

-- mfa_sessions
DROP POLICY IF EXISTS "Users can read own MFA sessions" ON public.mfa_sessions;
CREATE POLICY "Users can read own MFA sessions" ON public.mfa_sessions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can read all MFA sessions" ON public.mfa_sessions;
-- Merged into above policy

-- mfa_rate_limits
DROP POLICY IF EXISTS "Admins can read MFA rate limits" ON public.mfa_rate_limits;
CREATE POLICY "Admins can read MFA rate limits" ON public.mfa_rate_limits
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- mfa_verification_attempts
DROP POLICY IF EXISTS "System can manage MFA attempts" ON public.mfa_verification_attempts;
CREATE POLICY "System can manage MFA attempts" ON public.mfa_verification_attempts
  FOR ALL
  USING (true);

-- ============================================================================
-- MISC TABLES
-- ============================================================================

-- forms
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.forms;
CREATE POLICY "Enable insert for authenticated users only" ON public.forms
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- rate_limits
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;
CREATE POLICY "System can manage rate limits" ON public.rate_limits
  FOR ALL
  USING (true);

-- telegram_user_states
DROP POLICY IF EXISTS "System can manage telegram states" ON public.telegram_user_states;
CREATE POLICY "System can manage telegram states" ON public.telegram_user_states
  FOR ALL
  USING (true);

-- posts_image_backup
DROP POLICY IF EXISTS "Only authenticated users can view image backups" ON public.posts_image_backup;
CREATE POLICY "Only authenticated users can view image backups" ON public.posts_image_backup
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- ============================================================================
-- FORUM ANALYTICS & MODERATION
-- ============================================================================

-- forum_post_analytics
DROP POLICY IF EXISTS "Authors can view their post analytics" ON public.forum_post_analytics;
CREATE POLICY "Authors can view their post analytics" ON public.forum_post_analytics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forum
      WHERE forum.id = forum_post_analytics.forum_id
      AND forum.profile_id = (SELECT auth.uid())
    )
    OR public.is_admin()
  );

-- forum_author_analytics
DROP POLICY IF EXISTS "Authors can view their analytics" ON public.forum_author_analytics;
CREATE POLICY "Authors can view their analytics" ON public.forum_author_analytics
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = profile_id OR public.is_admin());

-- forum_content_experiments
DROP POLICY IF EXISTS "Authors can manage their experiments" ON public.forum_content_experiments;
CREATE POLICY "Authors can manage their experiments" ON public.forum_content_experiments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forum
      WHERE forum.id = forum_content_experiments.forum_id
      AND forum.profile_id = (SELECT auth.uid())
    )
  );

-- forum_rate_limits
DROP POLICY IF EXISTS "Users can view their own rate limits" ON public.forum_rate_limits;
DROP POLICY IF EXISTS "System can manage rate limits" ON public.forum_rate_limits;
CREATE POLICY "Users can view own rate limits or system manage" ON public.forum_rate_limits
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = profile_id OR public.is_admin());

-- forum_activities
DROP POLICY IF EXISTS "Users can view public activities" ON public.forum_activities;
CREATE POLICY "Users can view public activities" ON public.forum_activities
  FOR SELECT TO authenticated
  USING (is_public = true OR (SELECT auth.uid()) = profile_id);

DROP POLICY IF EXISTS "System can create activities" ON public.forum_activities;
CREATE POLICY "System can create activities" ON public.forum_activities
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = profile_id);

-- forum_feed_preferences
DROP POLICY IF EXISTS "Users can manage their feed preferences" ON public.forum_feed_preferences;
CREATE POLICY "Users can manage their feed preferences" ON public.forum_feed_preferences
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = profile_id)
  WITH CHECK ((SELECT auth.uid()) = profile_id);

-- forum_feed_read_status
DROP POLICY IF EXISTS "Users can manage their read status" ON public.forum_feed_read_status;
CREATE POLICY "Users can manage their read status" ON public.forum_feed_read_status
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = profile_id)
  WITH CHECK ((SELECT auth.uid()) = profile_id);

-- forum_scheduled_posts
DROP POLICY IF EXISTS "Users can manage their scheduled posts" ON public.forum_scheduled_posts;
CREATE POLICY "Users can manage their scheduled posts" ON public.forum_scheduled_posts
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = profile_id)
  WITH CHECK ((SELECT auth.uid()) = profile_id);

-- forum_recurring_posts
DROP POLICY IF EXISTS "Users can manage their recurring posts" ON public.forum_recurring_posts;
CREATE POLICY "Users can manage their recurring posts" ON public.forum_recurring_posts
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = profile_id)
  WITH CHECK ((SELECT auth.uid()) = profile_id);

-- forum_publication_queue
DROP POLICY IF EXISTS "Users can view their publication queue items" ON public.forum_publication_queue;
CREATE POLICY "Users can view their publication queue items" ON public.forum_publication_queue
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

-- forum_announcement_dismissals
DROP POLICY IF EXISTS "Users manage their dismissals" ON public.forum_announcement_dismissals;
CREATE POLICY "Users manage their dismissals" ON public.forum_announcement_dismissals
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = profile_id)
  WITH CHECK ((SELECT auth.uid()) = profile_id);

-- forum_reputation_history
DROP POLICY IF EXISTS "Users can view their own reputation history" ON public.forum_reputation_history;
CREATE POLICY "Users can view their own reputation history" ON public.forum_reputation_history
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

-- forum_user_warnings
DROP POLICY IF EXISTS "Users can view their own warnings" ON public.forum_user_warnings;
CREATE POLICY "Users can view their own warnings" ON public.forum_user_warnings
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = profile_id OR public.is_admin());

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Add comment for documentation
COMMENT ON FUNCTION public.is_admin() IS 'Optimized admin check function using subquery for auth.uid()';

-- ============================================================================
-- Migration: Remove Unused Indexes (High Priority)
-- Date: 2024-12-06
-- Description: Removes indexes that have never been used according to pg_stat.
--              This reduces storage and improves write performance.
--
-- NOTE: Only removing indexes on core tables. Review before applying to production.
--       Some indexes may be needed for future features - mark those for retention.
-- ============================================================================

-- ============================================================================
-- POSTS TABLE
-- ============================================================================

DROP INDEX IF EXISTS public.idx_posts_user_feed;
DROP INDEX IF EXISTS public.idx_posts_location_active;
DROP INDEX IF EXISTS public.idx_posts_post_arranged_at;

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

DROP INDEX IF EXISTS public.idx_profiles_is_active;
DROP INDEX IF EXISTS public.idx_profiles_last_seen_at;
DROP INDEX IF EXISTS public.idx_profiles_theme_preferences;
DROP INDEX IF EXISTS public.idx_profiles_location_gist;

-- ============================================================================
-- FORUM TABLE
-- ============================================================================

DROP INDEX IF EXISTS public.idx_forum_last_activity;
DROP INDEX IF EXISTS public.idx_forum_search;
DROP INDEX IF EXISTS public.idx_forum_hot_score;
DROP INDEX IF EXISTS public.idx_forum_series;
DROP INDEX IF EXISTS public.idx_forum_profile_created;
DROP INDEX IF EXISTS public.idx_forum_best_answer_id;

-- ============================================================================
-- COMMENTS TABLE
-- ============================================================================

DROP INDEX IF EXISTS public.idx_comments_user_id;
DROP INDEX IF EXISTS public.idx_comments_forum_id;
DROP INDEX IF EXISTS public.idx_comments_parent;
DROP INDEX IF EXISTS public.idx_comments_forum_created;
DROP INDEX IF EXISTS public.idx_comments_best_answer;
DROP INDEX IF EXISTS public.idx_comments_firebase_id;
DROP INDEX IF EXISTS public.idx_comments_forum_date;

-- ============================================================================
-- LIKES TABLE
-- ============================================================================

DROP INDEX IF EXISTS public.idx_likes_profile_id;
DROP INDEX IF EXISTS public.idx_likes_post_id;
DROP INDEX IF EXISTS public.idx_likes_user_post_composite;
DROP INDEX IF EXISTS public.idx_likes_post_profile_composite;

-- ============================================================================
-- REVIEWS TABLE
-- ============================================================================

DROP INDEX IF EXISTS public.idx_reviews_profile_id;
DROP INDEX IF EXISTS public.idx_reviews_post_id;
DROP INDEX IF EXISTS public.idx_reviews_forum_id;
DROP INDEX IF EXISTS public.idx_reviews_challenge_id;
DROP INDEX IF EXISTS public.idx_reviews_post_composite;
DROP INDEX IF EXISTS public.idx_reviews_user_date_composite;

-- ============================================================================
-- ROOMS TABLE
-- ============================================================================

DROP INDEX IF EXISTS public.idx_rooms_sharer;
DROP INDEX IF EXISTS public.idx_rooms_requester;
DROP INDEX IF EXISTS public.idx_rooms_post_id;
DROP INDEX IF EXISTS public.idx_rooms_last_message_sent_by;
DROP INDEX IF EXISTS public.idx_rooms_last_message_seen_by;
DROP INDEX IF EXISTS public.idx_rooms_post_arranged_to;
DROP INDEX IF EXISTS public.idx_rooms_sharer_post_composite;
DROP INDEX IF EXISTS public.idx_rooms_requester_post_composite;

-- ============================================================================
-- ROOM_PARTICIPANTS TABLE
-- ============================================================================

DROP INDEX IF EXISTS public.idx_room_participants_room_id;
DROP INDEX IF EXISTS public.idx_room_participants_profile_id;

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

DROP INDEX IF EXISTS public.idx_notifications_users_ff;
DROP INDEX IF EXISTS public.idx_notifications_profile_id;
DROP INDEX IF EXISTS public.idx_notifications_user_time;
DROP INDEX IF EXISTS public.idx_notifications_users_ff_time;

-- ============================================================================
-- CHALLENGES TABLE
-- ============================================================================

DROP INDEX IF EXISTS public.idx_challenges_profile_id;
DROP INDEX IF EXISTS public.idx_challenges_published_date;

-- ============================================================================
-- CHALLENGE_ACTIVITIES TABLE
-- ============================================================================

DROP INDEX IF EXISTS public.idx_challenge_activities_challenge_id;
DROP INDEX IF EXISTS public.idx_challenge_activities_accepted;
DROP INDEX IF EXISTS public.idx_challenge_activities_completed;
DROP INDEX IF EXISTS public.idx_challenge_activities_user_rejected;
DROP INDEX IF EXISTS public.idx_challenge_activities_accepted_challenge;
DROP INDEX IF EXISTS public.idx_challenge_activities_completed_challenge;

-- ============================================================================
-- CHALLENGE_PARTICIPANTS TABLE
-- ============================================================================

DROP INDEX IF EXISTS public.idx_challenge_participants_challenge;
DROP INDEX IF EXISTS public.idx_challenge_participants_profile;

-- ============================================================================
-- HANDLERS TABLE
-- ============================================================================

DROP INDEX IF EXISTS public.idx_handlers_profile_id;

-- ============================================================================
-- VIEWS TABLE
-- ============================================================================

DROP INDEX IF EXISTS public.idx_views_post_id;
DROP INDEX IF EXISTS public.idx_views_profile_id;

-- ============================================================================
-- REPORTS TABLE
-- ============================================================================

DROP INDEX IF EXISTS public.idx_reports_profile_id;

-- ============================================================================
-- FEEDBACK TABLE
-- ============================================================================

DROP INDEX IF EXISTS public.idx_feedback_status;
DROP INDEX IF EXISTS public.idx_feedback_created_at;

-- ============================================================================
-- EMAIL TABLES
-- ============================================================================

DROP INDEX IF EXISTS public.idx_email_logs_recipient_id;
DROP INDEX IF EXISTS public.idx_email_logs_email_type;
DROP INDEX IF EXISTS public.idx_email_logs_provider;
DROP INDEX IF EXISTS public.idx_email_logs_status;
DROP INDEX IF EXISTS public.idx_email_logs_sent_at;
DROP INDEX IF EXISTS public.idx_email_provider_quota_provider;
DROP INDEX IF EXISTS public.idx_email_provider_quota_date;
DROP INDEX IF EXISTS public.idx_email_provider_quota_provider_date;
DROP INDEX IF EXISTS public.idx_email_queue_status;
DROP INDEX IF EXISTS public.idx_email_queue_next_retry_at;
DROP INDEX IF EXISTS public.idx_email_queue_status_retry;
DROP INDEX IF EXISTS public.idx_email_queue_created_at;
DROP INDEX IF EXISTS public.idx_email_dlq_failure_reason;
DROP INDEX IF EXISTS public.idx_email_dlq_email_type;
DROP INDEX IF EXISTS public.idx_email_dlq_moved_at;
DROP INDEX IF EXISTS public.idx_health_events_provider;
DROP INDEX IF EXISTS public.idx_health_events_type;
DROP INDEX IF EXISTS public.idx_health_events_severity;
DROP INDEX IF EXISTS public.idx_health_history_provider;
DROP INDEX IF EXISTS public.idx_health_history_snapshot_at;
DROP INDEX IF EXISTS public.idx_circuit_breaker_org;
DROP INDEX IF EXISTS public.idx_circuit_breaker_state;
DROP INDEX IF EXISTS public.idx_provider_quota_org;

-- ============================================================================
-- FORUM RELATED TABLES
-- ============================================================================

-- Forum bookmarks
DROP INDEX IF EXISTS public.idx_forum_bookmarks_forum;
DROP INDEX IF EXISTS public.idx_forum_bookmarks_collection;
DROP INDEX IF EXISTS public.idx_forum_bookmarks_reminder;
DROP INDEX IF EXISTS public.idx_forum_bookmark_collections_default;

-- Forum reactions
DROP INDEX IF EXISTS public.idx_forum_reactions_forum;
DROP INDEX IF EXISTS public.idx_forum_reactions_type;
DROP INDEX IF EXISTS public.idx_forum_comment_reactions_comment;
DROP INDEX IF EXISTS public.idx_forum_comment_reactions_type;

-- Forum mentions
DROP INDEX IF EXISTS public.idx_mentions_forum;
DROP INDEX IF EXISTS public.idx_mentions_comment;
DROP INDEX IF EXISTS public.idx_mentions_created_at;

-- Forum notifications
DROP INDEX IF EXISTS public.idx_forum_notif_recipient;
DROP INDEX IF EXISTS public.idx_forum_notif_unread;
DROP INDEX IF EXISTS public.idx_forum_notif_created_at;
DROP INDEX IF EXISTS public.idx_forum_notif_type;
DROP INDEX IF EXISTS public.idx_forum_notifications_forum_id;
DROP INDEX IF EXISTS public.idx_forum_notifications_comment_id;

-- Forum reports
DROP INDEX IF EXISTS public.idx_reports_status;
DROP INDEX IF EXISTS public.idx_reports_forum;
DROP INDEX IF EXISTS public.idx_reports_comment;
DROP INDEX IF EXISTS public.idx_reports_created_at;

-- Forum polls
DROP INDEX IF EXISTS public.idx_polls_forum;
DROP INDEX IF EXISTS public.idx_poll_options_poll;
DROP INDEX IF EXISTS public.idx_poll_votes_poll;
DROP INDEX IF EXISTS public.idx_poll_votes_option;

-- Forum subscriptions
DROP INDEX IF EXISTS public.idx_subscriptions_forum;
DROP INDEX IF EXISTS public.idx_subscriptions_category;

-- Forum badges
DROP INDEX IF EXISTS public.idx_user_badges_badge;
DROP INDEX IF EXISTS public.idx_user_badges_featured;

-- Forum moderation
DROP INDEX IF EXISTS public.idx_mod_queue_status;
DROP INDEX IF EXISTS public.idx_mod_queue_priority;
DROP INDEX IF EXISTS public.idx_mod_queue_type;
DROP INDEX IF EXISTS public.idx_mod_queue_content;
DROP INDEX IF EXISTS public.idx_mod_notes_queue;
DROP INDEX IF EXISTS public.idx_mod_logs_action_type;
DROP INDEX IF EXISTS public.idx_mod_logs_target;
DROP INDEX IF EXISTS public.idx_mod_logs_created_at;
DROP INDEX IF EXISTS public.idx_mod_stats_date;
DROP INDEX IF EXISTS public.idx_user_warnings_active;
DROP INDEX IF EXISTS public.idx_forum_moderation_queue_comment_id;
DROP INDEX IF EXISTS public.idx_forum_moderation_queue_forum_id;
DROP INDEX IF EXISTS public.idx_forum_moderation_queue_message_id;
DROP INDEX IF EXISTS public.idx_forum_moderation_queue_report_id;
DROP INDEX IF EXISTS public.idx_forum_user_warnings_queue_id;

-- Forum history
DROP INDEX IF EXISTS public.idx_post_history_forum;
DROP INDEX IF EXISTS public.idx_post_history_created;
DROP INDEX IF EXISTS public.idx_comment_history_comment;

-- Forum drafts
DROP INDEX IF EXISTS public.idx_drafts_last_saved;
DROP INDEX IF EXISTS public.idx_forum_drafts_category_id;

-- Forum analytics
DROP INDEX IF EXISTS public.idx_forum_post_analytics_date;
DROP INDEX IF EXISTS public.idx_forum_post_analytics_forum;
DROP INDEX IF EXISTS public.idx_forum_author_analytics_date;
DROP INDEX IF EXISTS public.idx_forum_author_analytics_top_post_id;

-- Forum reading
DROP INDEX IF EXISTS public.idx_reading_progress_forum;
DROP INDEX IF EXISTS public.idx_reading_progress_last_read;
DROP INDEX IF EXISTS public.idx_reading_history_profile_time;
DROP INDEX IF EXISTS public.idx_reading_history_forum;
DROP INDEX IF EXISTS public.idx_forum_reading_progress_last_read_comment_id;

-- Forum experiments
DROP INDEX IF EXISTS public.idx_forum_content_experiments_forum;

-- Forum series
DROP INDEX IF EXISTS public.idx_series_slug;
DROP INDEX IF EXISTS public.idx_series_category;
DROP INDEX IF EXISTS public.idx_series_published;
DROP INDEX IF EXISTS public.idx_series_posts_series;
DROP INDEX IF EXISTS public.idx_series_posts_forum;

-- Forum searches
DROP INDEX IF EXISTS public.idx_saved_searches_notify;
DROP INDEX IF EXISTS public.idx_popular_searches_count;
DROP INDEX IF EXISTS public.idx_popular_searches_recent;

-- Forum scheduling
DROP INDEX IF EXISTS public.idx_scheduled_posts_scheduled_for;
DROP INDEX IF EXISTS public.idx_scheduled_posts_status;
DROP INDEX IF EXISTS public.idx_recurring_posts_next_scheduled;
DROP INDEX IF EXISTS public.idx_publication_queue_status;
DROP INDEX IF EXISTS public.idx_publication_queue_scheduled;
DROP INDEX IF EXISTS public.idx_forum_publication_queue_recurring_post_id;
DROP INDEX IF EXISTS public.idx_forum_publication_queue_scheduled_post_id;
DROP INDEX IF EXISTS public.idx_forum_scheduled_posts_category_id;
DROP INDEX IF EXISTS public.idx_forum_scheduled_posts_published_forum_id;
DROP INDEX IF EXISTS public.idx_forum_scheduled_posts_series_id;
DROP INDEX IF EXISTS public.idx_forum_recurring_posts_category_id;

-- Forum conversations
DROP INDEX IF EXISTS public.idx_forum_conversations_updated;
DROP INDEX IF EXISTS public.idx_forum_conversations_last_message;
DROP INDEX IF EXISTS public.idx_forum_conversation_participants_conversation;
DROP INDEX IF EXISTS public.idx_forum_messages_conversation;
DROP INDEX IF EXISTS public.idx_forum_message_read_receipts_message;
DROP INDEX IF EXISTS public.idx_forum_message_reactions_reaction_type_id;
DROP INDEX IF EXISTS public.idx_forum_messages_reply_to_id;

-- Forum reputation
DROP INDEX IF EXISTS public.idx_user_reputation_total;
DROP INDEX IF EXISTS public.idx_user_reputation_weekly;
DROP INDEX IF EXISTS public.idx_reputation_history_created;
DROP INDEX IF EXISTS public.idx_forum_reputation_history_source_forum_id;
DROP INDEX IF EXISTS public.idx_forum_reputation_history_source_comment_id;

-- Forum rate limits
DROP INDEX IF EXISTS public.idx_forum_rate_limits_window_end;

-- Forum activities
DROP INDEX IF EXISTS public.idx_forum_activities_profile_id;
DROP INDEX IF EXISTS public.idx_forum_activities_activity_type;
DROP INDEX IF EXISTS public.idx_forum_activities_created_at;
DROP INDEX IF EXISTS public.idx_forum_activities_target_forum;
DROP INDEX IF EXISTS public.idx_forum_activities_target_badge_id;
DROP INDEX IF EXISTS public.idx_forum_activities_target_comment_id;
DROP INDEX IF EXISTS public.idx_forum_activities_target_series_id;

-- Forum feed
DROP INDEX IF EXISTS public.idx_forum_feed_read_status_activity_id;

-- Forum announcements
DROP INDEX IF EXISTS public.idx_announcements_active;
DROP INDEX IF EXISTS public.idx_announcements_dates;
DROP INDEX IF EXISTS public.idx_announcements_priority;
DROP INDEX IF EXISTS public.idx_announcement_analytics_announcement;
DROP INDEX IF EXISTS public.idx_forum_announcements_target_category_id;

-- Forum user stats
DROP INDEX IF EXISTS public.idx_forum_user_stats_trust_level;

-- Comment likes
DROP INDEX IF EXISTS public.idx_comment_likes_comment;

-- ============================================================================
-- OTHER TABLES
-- ============================================================================

-- User roles
DROP INDEX IF EXISTS public.idx_user_roles_role_id;

-- Organization members
DROP INDEX IF EXISTS public.idx_org_members_org;

-- MFA
DROP INDEX IF EXISTS public.idx_mfa_config_enabled;
DROP INDEX IF EXISTS public.idx_mfa_attempts_expires;
DROP INDEX IF EXISTS public.idx_mfa_sessions_active;
DROP INDEX IF EXISTS public.idx_mfa_sessions_expires;
DROP INDEX IF EXISTS public.idx_mfa_rate_limits_ip;
DROP INDEX IF EXISTS public.idx_mfa_rate_limits_locked;

-- Admin
DROP INDEX IF EXISTS public.idx_audit_log_action;
DROP INDEX IF EXISTS public.idx_audit_log_created;

-- Translations
DROP INDEX IF EXISTS public.idx_translations_version;
DROP INDEX IF EXISTS public.idx_translations_locale_version;
DROP INDEX IF EXISTS public.idx_user_locale_user_id;
DROP INDEX IF EXISTS public.idx_translation_analytics_locale;
DROP INDEX IF EXISTS public.idx_translation_analytics_platform;
DROP INDEX IF EXISTS public.idx_translation_analytics_user;
DROP INDEX IF EXISTS public.idx_translation_analytics_timestamp;
DROP INDEX IF EXISTS public.idx_translation_analytics_locale_platform;
DROP INDEX IF EXISTS public.idx_translation_errors_timestamp;
DROP INDEX IF EXISTS public.idx_translation_errors_locale;
DROP INDEX IF EXISTS public.idx_translation_errors_user_id;
DROP INDEX IF EXISTS public.idx_translation_versions_locale_version;
DROP INDEX IF EXISTS public.idx_translation_cache_locale_platform;
DROP INDEX IF EXISTS public.idx_translation_sync_user_device;
DROP INDEX IF EXISTS public.idx_translation_change_log_locale_version;
DROP INDEX IF EXISTS public.idx_translation_change_log_changed_by;

-- Rate limits
DROP INDEX IF EXISTS public.idx_rate_limits_identifier;

-- Telegram
DROP INDEX IF EXISTS public.idx_telegram_messages_per_day_gin;
DROP INDEX IF EXISTS public.idx_telegram_messages_per_week_gin;
DROP INDEX IF EXISTS public.idx_telegram_messages_per_month_gin;
DROP INDEX IF EXISTS public.idx_telegram_most_used_words_gin;
DROP INDEX IF EXISTS public.idx_telegram_emoji_usage_gin;
DROP INDEX IF EXISTS public.idx_telegram_active_hours_gin;
DROP INDEX IF EXISTS public.idx_telegram_user_states_updated;

-- Community fridges
DROP INDEX IF EXISTS public.idx_community_fridges_location;
DROP INDEX IF EXISTS public.idx_community_fridges_status;
DROP INDEX IF EXISTS public.idx_community_fridges_city;

-- Grok
DROP INDEX IF EXISTS public.idx_grok_usage_logs_timestamp;

-- Profile stats
DROP INDEX IF EXISTS public.idx_profile_stats_rating_average;

-- Vault (audit schema)
DROP INDEX IF EXISTS audit.idx_vault_access_log_user_id;
DROP INDEX IF EXISTS audit.idx_vault_access_log_secret_name;
DROP INDEX IF EXISTS audit.idx_vault_access_log_accessed_at;
DROP INDEX IF EXISTS audit.idx_vault_access_log_failed;

-- ============================================================================
-- ANALYZE TABLES
-- ============================================================================

-- Update statistics after index removal
ANALYZE public.posts;
ANALYZE public.profiles;
ANALYZE public.forum;
ANALYZE public.comments;
ANALYZE public.likes;
ANALYZE public.reviews;
ANALYZE public.rooms;
ANALYZE public.notifications;
ANALYZE public.challenges;
ANALYZE public.challenge_activities;

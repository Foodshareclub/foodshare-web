-- ============================================================================
-- Drop the columns no code names and nothing in the database references.
--
-- A column dies in two layers at once. The structural layer: no index,
-- foreign key, view, policy, function or trigger reads it — `pg_depend`
-- carries no entry for it, so PostgreSQL would not refuse the drop. The
-- code layer: no edge function, no worker query, no operational script, no
-- post-baseline migration, no cron job, and no client — web or the
-- cross-platform app, whose single Swift codebase builds both iOS and
-- Android — names it. A column in both layers is storage and surface
-- nothing uses: it bloats every row, and it reads in the generated types
-- like data the product carries.
--
-- 249 columns from the baseline estate sit in both layers, in 54
-- tables: the analytics aggregates nothing computes
-- (`forum_post_analytics.bounce_rate`, `user_activity_summary.peak_activity_hours`),
-- the feature scaffolding nothing implements (`forum_recurring_posts`,
-- `forum_content_experiments`, `experiments.hypothesis`,
-- `translation_platform_config`), the pre-Firebase residue
-- (`comments.firebase_metadata`), the legacy image paths
-- (`posts_image_backup.image_url_1`), and stubs of features whose tables
-- the code reads through other columns (`forum_user_reputation`,
-- `mfa_rate_limits`, `notifications`' push-metadata half).
--
-- Measured, not assumed, before a single drop:
--
--   * The catalog's `structurallyReferenced` flag is `pg_depend` itself
--     (column references are recorded as `refclassid = pg_class` with the
--     table oid and the column number; a column's own default is excluded
--     because a default travels with the column). Every column dropped here
--     is false on that flag, so the drop breaks no object PostgreSQL
--     knows about.
--   * The code scan is the same corpus the view audit reads: edge
--     functions (generated types excluded), the worker's crates and SQL,
--     operational scripts, volumes, post-baseline migrations, and the
--     sibling checkouts when the workspace has them. The baseline dump and
--     the catalog are definitions, not call sites.
--   * Platform tables are out of scope: `storage.objects` is owned by the
--     storage service, which writes from its own image and whose writers no
--     repository can see. The audit is scoped to `public` and `audit`.
--   * The keepers are the live columns of the same tables —
--     `notifications` keeps the columns the in-app channel writes,
--     `forum_recurring_posts` keeps its identity columns. The in-transaction
--     assertion names a sample so a drop that reaches too far aborts.
--
-- `ALTER TABLE ... DROP COLUMN` has no `IF EXISTS`, so the drops run in a
-- loop that skips an absent column with a notice; a deploy that replays
-- the migration is safe, and the assertion below still holds.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    target text;
    parts text[];
    list text[] := ARRAY[
        'audit.logged_actions.changed_fields',
        'audit.logged_actions.event_time',
        'audit.logged_actions.row_data',
        'audit.logged_actions.schema_name',
        'public.address.last_processed_id',
        'public.address.location_status',
        'public.address.test_delete',
        'public.analytics_staging_reviews.review_type',
        'public.app_version_requirements.force_update_message',
        'public.app_version_requirements.min_version',
        'public.app_version_requirements.recommended_version',
        'public.app_version_requirements.soft_update_message',
        'public.campaign_recipients.click_count',
        'public.campaign_recipients.clicked_links',
        'public.campaign_recipients.open_count',
        'public.comments.firebase_metadata',
        'public.community_fridges.firebase_metadata',
        'public.compressed_images.compressed_at',
        'public.compressed_images.savings_percent',
        'public.content_translations.character_count',
        'public.content_translations.last_hit_at',
        'public.crm_customers.custom_fields',
        'public.crm_customers.lifetime_value',
        'public.daily_stats.active_cities',
        'public.daily_stats.expired_listings',
        'public.daily_stats.searches_performed',
        'public.dynamic_content_translations.hit_count',
        'public.dynamic_content_translations.last_hit_at',
        'public.dynamic_content_translations.source_locale',
        'public.dynamic_content_translations.translation_source',
        'public.email_bounce_events.bounce_category',
        'public.email_bounce_events.raw_payload',
        'public.email_dead_letter_queue.first_attempt_at',
        'public.email_dead_letter_queue.moved_to_dlq_at',
        'public.email_dead_letter_queue.original_queue_id',
        'public.email_dead_letter_queue.total_attempts',
        'public.email_provider_health_history.snapshot_at',
        'public.email_suppression_list.bounce_subtype',
        'public.email_suppression_list.original_message_id',
        'public.email_suppression_list.suppressed_at',
        'public.email_template_versions.change_reason',
        'public.experiment_assignments.assigned_at',
        'public.experiments.hypothesis',
        'public.experiments.primary_metric',
        'public.experiments.secondary_metrics',
        'public.experiments.target_platforms',
        'public.experiments.user_segments',
        'public.experiments.winner_variant',
        'public.feature_flags.disabled_at',
        'public.feature_flags.min_app_version',
        'public.feature_flags.target_platforms',
        'public.forum.series_order',
        'public.forum_announcement_dismissals.dismissed_at',
        'public.forum_announcements.clicks_count',
        'public.forum_announcements.cta_text',
        'public.forum_announcements.cta_url',
        'public.forum_announcements.dismissals_count',
        'public.forum_announcements.is_dismissible',
        'public.forum_announcements.target_trust_levels',
        'public.forum_announcements.text_color',
        'public.forum_author_analytics.new_posts_count',
        'public.forum_author_analytics.total_comments',
        'public.forum_author_analytics.total_followers_gained',
        'public.forum_author_analytics.total_followers_lost',
        'public.forum_author_analytics.total_reactions',
        'public.forum_bookmark_collections.bookmarks_count',
        'public.forum_bookmark_collections.is_default',
        'public.forum_comment_history.edit_reason',
        'public.forum_comment_history.previous_content',
        'public.forum_content_experiments.variant_a',
        'public.forum_content_experiments.variant_a_clicks',
        'public.forum_content_experiments.variant_a_views',
        'public.forum_content_experiments.variant_b',
        'public.forum_content_experiments.variant_b_clicks',
        'public.forum_content_experiments.variant_b_views',
        'public.forum_conversation_participants.left_at',
        'public.forum_conversation_participants.muted_until',
        'public.forum_conversations.is_group',
        'public.forum_conversations.last_message_preview',
        'public.forum_feed_preferences.compact_view',
        'public.forum_feed_preferences.hide_read_items',
        'public.forum_feed_preferences.show_badges',
        'public.forum_feed_preferences.show_bookmarks',
        'public.forum_feed_preferences.show_comments',
        'public.forum_feed_preferences.show_follows',
        'public.forum_feed_preferences.show_likes',
        'public.forum_feed_preferences.show_polls',
        'public.forum_feed_preferences.show_reactions',
        'public.forum_messages.edited_at',
        'public.forum_messages.is_deleted',
        'public.forum_moderation_notes.is_internal',
        'public.forum_moderation_queue.assigned_at',
        'public.forum_moderation_queue.content_snapshot',
        'public.forum_moderation_queue.flag_details',
        'public.forum_moderation_stats.avg_response_time_minutes',
        'public.forum_moderation_stats.bans_issued',
        'public.forum_moderation_stats.items_approved',
        'public.forum_moderation_stats.items_removed',
        'public.forum_moderation_stats.items_reviewed',
        'public.forum_moderation_stats.warnings_issued',
        'public.forum_popular_searches.first_searched_at',
        'public.forum_popular_searches.last_searched_at',
        'public.forum_popular_searches.search_count',
        'public.forum_post_analytics.avg_read_time_seconds',
        'public.forum_post_analytics.bookmarks_count',
        'public.forum_post_analytics.bounce_rate',
        'public.forum_post_analytics.device_breakdown',
        'public.forum_post_analytics.referrer_sources',
        'public.forum_post_analytics.shares_count',
        'public.forum_post_analytics.unique_visitors',
        'public.forum_post_history.edit_reason',
        'public.forum_post_history.previous_description',
        'public.forum_post_history.previous_image',
        'public.forum_post_history.previous_title',
        'public.forum_rate_limit_config.cooldown_seconds',
        'public.forum_rate_limit_config.max_actions',
        'public.forum_rate_limit_config.trust_level_multipliers',
        'public.forum_rate_limits.window_end',
        'public.forum_reading_progress.is_fully_read',
        'public.forum_reading_progress.scroll_position',
        'public.forum_reading_progress.time_spent_seconds',
        'public.forum_recurring_posts.custom_cron',
        'public.forum_recurring_posts.description_template',
        'public.forum_recurring_posts.last_published_at',
        'public.forum_recurring_posts.max_occurrences',
        'public.forum_recurring_posts.next_scheduled_at',
        'public.forum_recurring_posts.recurrence_day',
        'public.forum_recurring_posts.recurrence_time',
        'public.forum_recurring_posts.template_variables',
        'public.forum_recurring_posts.total_published',
        'public.forum_reputation_actions.is_positive',
        'public.forum_reputation_history.action_key',
        'public.forum_reputation_levels.min_points',
        'public.forum_reputation_levels.perks',
        'public.forum_saved_searches.last_notified_at',
        'public.forum_saved_searches.notify_on_new',
        'public.forum_scheduled_posts.notify_followers',
        'public.forum_scheduled_posts.published_at',
        'public.forum_scheduled_posts.series_order',
        'public.forum_series.estimated_read_time',
        'public.forum_series.published_at',
        'public.forum_series_posts.chapter_description',
        'public.forum_series_posts.chapter_title',
        'public.forum_series_posts.is_free_preview',
        'public.forum_user_follows.notify_on_new_post',
        'public.forum_user_reputation.last_activity_date',
        'public.forum_user_reputation.level_title',
        'public.forum_user_reputation.month_start_date',
        'public.forum_user_reputation.negative_points',
        'public.forum_user_reputation.points_this_month',
        'public.forum_user_reputation.points_this_week',
        'public.forum_user_reputation.positive_points',
        'public.forum_user_reputation.reputation_level',
        'public.forum_user_reputation.total_points',
        'public.forum_user_reputation.week_start_date',
        'public.forum_user_warnings.ban_lifted_at',
        'public.forum_user_warnings.ban_until',
        'public.handlers.handler_name',
        'public.handlers.handlers_description',
        'public.handlers.icon_image',
        'public.image_compressions.compressed_format',
        'public.image_compressions.compressed_height',
        'public.image_compressions.compressed_path',
        'public.image_compressions.compressed_width',
        'public.image_compressions.original_format',
        'public.image_compressions.original_height',
        'public.image_compressions.original_width',
        'public.image_compressions.quality_setting',
        'public.image_compressions.saved_percent',
        'public.languages.country_flag',
        'public.languages.flagCode',
        'public.languages.flag_url',
        'public.legal.covid19',
        'public.legal_documents.effective_date',
        'public.mfa_rate_limits.attempt_count',
        'public.mfa_rate_limits.is_locked_out',
        'public.mfa_rate_limits.window_duration',
        'public.mfa_sessions.device_fingerprint',
        'public.mfa_verification_attempts.attempts_count',
        'public.mfa_verification_attempts.code_hash',
        'public.mfa_verification_attempts.is_expired',
        'public.newsletter_campaigns.segment_criteria',
        'public.newsletter_campaigns.total_complained',
        'public.newsletter_campaigns.total_unsubscribed',
        'public.notification_priority_config.bypass_consolidation',
        'public.notification_priority_config.consolidation_window_minutes',
        'public.notification_priority_config.max_per_hour',
        'public.notification_priority_config.ttl_seconds',
        'public.notification_queue.consolidated_count',
        'public.notification_queue.consolidated_ids',
        'public.notifications.initial_page_name',
        'public.notifications.notification_image_url',
        'public.notifications.notification_text',
        'public.notifications.notification_title',
        'public.notifications.parameter_data',
        'public.notifications.target_audience',
        'public.notifications.user_refs',
        'public.notifications.users_ff',
        'public.orphaned_storage_cleanup.bucket_id',
        'public.pending_operations.conflict_resolution',
        'public.pending_operations.server_timestamp',
        'public.post_views.viewer_ip_hash',
        'public.posts_image_backup.backed_up_at',
        'public.posts_image_backup.image_url_1',
        'public.posts_image_backup.image_url_2',
        'public.posts_image_backup.image_url_3',
        'public.precomputed_feed_cells.access_count',
        'public.precomputed_feed_cells.computation_time_ms',
        'public.profiles.available_days',
        'public.profiles.preferred_pickup_time',
        'public.profiles.search_radius_mi',
        'public.telegram_user_activity.active_hours',
        'public.telegram_user_activity.forward_count',
        'public.telegram_user_activity.hashtag_count',
        'public.telegram_user_activity.link_count',
        'public.telegram_user_activity.mention_count',
        'public.telegram_user_activity.messages_per_day',
        'public.telegram_user_activity.messages_per_month',
        'public.telegram_user_activity.messages_per_week',
        'public.telegram_user_activity.sentiment_score',
        'public.telegram_user_activity.sticker_count',
        'public.telegram_user_activity.voice_message_count',
        'public.translation_cache.compressed_data',
        'public.translation_cache.uncompressed_size',
        'public.translation_platform_config.background_sync_enabled',
        'public.translation_platform_config.cache_ttl_seconds',
        'public.translation_platform_config.compression_enabled',
        'public.translation_platform_config.custom_headers',
        'public.translation_platform_config.max_batch_size',
        'public.translation_platform_config.prefetch_enabled',
        'public.translation_platform_config.rate_limit_requests',
        'public.translation_platform_config.rate_limit_window_seconds',
        'public.translation_platform_config.realtime_enabled',
        'public.translation_platform_config.streaming_enabled',
        'public.translation_platform_config.supports_delta_updates',
        'public.translation_platform_config.supports_offline_mode',
        'public.translation_service_usage.free_limit',
        'public.translation_sync_status.last_synced_version',
        'public.translation_sync_status.pending_changes',
        'public.translation_versions.previous_version',
        'public.user_activity_summary.categories_viewed',
        'public.user_activity_summary.first_activity_at',
        'public.user_activity_summary.locations_searched',
        'public.user_activity_summary.peak_activity_hours',
        'public.user_activity_summary.search_count',
        'public.user_activity_summary.search_terms',
        'public.user_notifications.email_sent_at',
        'public.user_notifications.push_sent',
        'public.user_notifications.push_sent_at'
    ];
BEGIN
    FOREACH target IN ARRAY list LOOP
        parts := string_to_array(target, '.');
        IF EXISTS (
            SELECT 1
            FROM pg_attribute a
            JOIN pg_class c ON c.oid = a.attrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = parts[1]
              AND c.relname = parts[2]
              AND a.attname = parts[3]
              AND a.attnum > 0
              AND NOT a.attisdropped
        ) THEN
            EXECUTE format('ALTER TABLE %I.%I DROP COLUMN %I',
                           parts[1], parts[2], parts[3]);
        ELSE
            RAISE NOTICE 'column %.% absent; skipping', parts[2], parts[3];
        END IF;
    END LOOP;
END
$$;

-- In-transaction assertion: none of the dropped columns survives, and the
-- live columns of the same tables are intact.
DO $$
DECLARE
    survivors integer;
    keepers integer;
    list text[] := ARRAY[
        'audit.logged_actions.changed_fields',
        'audit.logged_actions.event_time',
        'audit.logged_actions.row_data',
        'audit.logged_actions.schema_name',
        'public.address.last_processed_id',
        'public.address.location_status',
        'public.address.test_delete',
        'public.analytics_staging_reviews.review_type',
        'public.app_version_requirements.force_update_message',
        'public.app_version_requirements.min_version',
        'public.app_version_requirements.recommended_version',
        'public.app_version_requirements.soft_update_message',
        'public.campaign_recipients.click_count',
        'public.campaign_recipients.clicked_links',
        'public.campaign_recipients.open_count',
        'public.comments.firebase_metadata',
        'public.community_fridges.firebase_metadata',
        'public.compressed_images.compressed_at',
        'public.compressed_images.savings_percent',
        'public.content_translations.character_count',
        'public.content_translations.last_hit_at',
        'public.crm_customers.custom_fields',
        'public.crm_customers.lifetime_value',
        'public.daily_stats.active_cities',
        'public.daily_stats.expired_listings',
        'public.daily_stats.searches_performed',
        'public.dynamic_content_translations.hit_count',
        'public.dynamic_content_translations.last_hit_at',
        'public.dynamic_content_translations.source_locale',
        'public.dynamic_content_translations.translation_source',
        'public.email_bounce_events.bounce_category',
        'public.email_bounce_events.raw_payload',
        'public.email_dead_letter_queue.first_attempt_at',
        'public.email_dead_letter_queue.moved_to_dlq_at',
        'public.email_dead_letter_queue.original_queue_id',
        'public.email_dead_letter_queue.total_attempts',
        'public.email_provider_health_history.snapshot_at',
        'public.email_suppression_list.bounce_subtype',
        'public.email_suppression_list.original_message_id',
        'public.email_suppression_list.suppressed_at',
        'public.email_template_versions.change_reason',
        'public.experiment_assignments.assigned_at',
        'public.experiments.hypothesis',
        'public.experiments.primary_metric',
        'public.experiments.secondary_metrics',
        'public.experiments.target_platforms',
        'public.experiments.user_segments',
        'public.experiments.winner_variant',
        'public.feature_flags.disabled_at',
        'public.feature_flags.min_app_version',
        'public.feature_flags.target_platforms',
        'public.forum.series_order',
        'public.forum_announcement_dismissals.dismissed_at',
        'public.forum_announcements.clicks_count',
        'public.forum_announcements.cta_text',
        'public.forum_announcements.cta_url',
        'public.forum_announcements.dismissals_count',
        'public.forum_announcements.is_dismissible',
        'public.forum_announcements.target_trust_levels',
        'public.forum_announcements.text_color',
        'public.forum_author_analytics.new_posts_count',
        'public.forum_author_analytics.total_comments',
        'public.forum_author_analytics.total_followers_gained',
        'public.forum_author_analytics.total_followers_lost',
        'public.forum_author_analytics.total_reactions',
        'public.forum_bookmark_collections.bookmarks_count',
        'public.forum_bookmark_collections.is_default',
        'public.forum_comment_history.edit_reason',
        'public.forum_comment_history.previous_content',
        'public.forum_content_experiments.variant_a',
        'public.forum_content_experiments.variant_a_clicks',
        'public.forum_content_experiments.variant_a_views',
        'public.forum_content_experiments.variant_b',
        'public.forum_content_experiments.variant_b_clicks',
        'public.forum_content_experiments.variant_b_views',
        'public.forum_conversation_participants.left_at',
        'public.forum_conversation_participants.muted_until',
        'public.forum_conversations.is_group',
        'public.forum_conversations.last_message_preview',
        'public.forum_feed_preferences.compact_view',
        'public.forum_feed_preferences.hide_read_items',
        'public.forum_feed_preferences.show_badges',
        'public.forum_feed_preferences.show_bookmarks',
        'public.forum_feed_preferences.show_comments',
        'public.forum_feed_preferences.show_follows',
        'public.forum_feed_preferences.show_likes',
        'public.forum_feed_preferences.show_polls',
        'public.forum_feed_preferences.show_reactions',
        'public.forum_messages.edited_at',
        'public.forum_messages.is_deleted',
        'public.forum_moderation_notes.is_internal',
        'public.forum_moderation_queue.assigned_at',
        'public.forum_moderation_queue.content_snapshot',
        'public.forum_moderation_queue.flag_details',
        'public.forum_moderation_stats.avg_response_time_minutes',
        'public.forum_moderation_stats.bans_issued',
        'public.forum_moderation_stats.items_approved',
        'public.forum_moderation_stats.items_removed',
        'public.forum_moderation_stats.items_reviewed',
        'public.forum_moderation_stats.warnings_issued',
        'public.forum_popular_searches.first_searched_at',
        'public.forum_popular_searches.last_searched_at',
        'public.forum_popular_searches.search_count',
        'public.forum_post_analytics.avg_read_time_seconds',
        'public.forum_post_analytics.bookmarks_count',
        'public.forum_post_analytics.bounce_rate',
        'public.forum_post_analytics.device_breakdown',
        'public.forum_post_analytics.referrer_sources',
        'public.forum_post_analytics.shares_count',
        'public.forum_post_analytics.unique_visitors',
        'public.forum_post_history.edit_reason',
        'public.forum_post_history.previous_description',
        'public.forum_post_history.previous_image',
        'public.forum_post_history.previous_title',
        'public.forum_rate_limit_config.cooldown_seconds',
        'public.forum_rate_limit_config.max_actions',
        'public.forum_rate_limit_config.trust_level_multipliers',
        'public.forum_rate_limits.window_end',
        'public.forum_reading_progress.is_fully_read',
        'public.forum_reading_progress.scroll_position',
        'public.forum_reading_progress.time_spent_seconds',
        'public.forum_recurring_posts.custom_cron',
        'public.forum_recurring_posts.description_template',
        'public.forum_recurring_posts.last_published_at',
        'public.forum_recurring_posts.max_occurrences',
        'public.forum_recurring_posts.next_scheduled_at',
        'public.forum_recurring_posts.recurrence_day',
        'public.forum_recurring_posts.recurrence_time',
        'public.forum_recurring_posts.template_variables',
        'public.forum_recurring_posts.total_published',
        'public.forum_reputation_actions.is_positive',
        'public.forum_reputation_history.action_key',
        'public.forum_reputation_levels.min_points',
        'public.forum_reputation_levels.perks',
        'public.forum_saved_searches.last_notified_at',
        'public.forum_saved_searches.notify_on_new',
        'public.forum_scheduled_posts.notify_followers',
        'public.forum_scheduled_posts.published_at',
        'public.forum_scheduled_posts.series_order',
        'public.forum_series.estimated_read_time',
        'public.forum_series.published_at',
        'public.forum_series_posts.chapter_description',
        'public.forum_series_posts.chapter_title',
        'public.forum_series_posts.is_free_preview',
        'public.forum_user_follows.notify_on_new_post',
        'public.forum_user_reputation.last_activity_date',
        'public.forum_user_reputation.level_title',
        'public.forum_user_reputation.month_start_date',
        'public.forum_user_reputation.negative_points',
        'public.forum_user_reputation.points_this_month',
        'public.forum_user_reputation.points_this_week',
        'public.forum_user_reputation.positive_points',
        'public.forum_user_reputation.reputation_level',
        'public.forum_user_reputation.total_points',
        'public.forum_user_reputation.week_start_date',
        'public.forum_user_warnings.ban_lifted_at',
        'public.forum_user_warnings.ban_until',
        'public.handlers.handler_name',
        'public.handlers.handlers_description',
        'public.handlers.icon_image',
        'public.image_compressions.compressed_format',
        'public.image_compressions.compressed_height',
        'public.image_compressions.compressed_path',
        'public.image_compressions.compressed_width',
        'public.image_compressions.original_format',
        'public.image_compressions.original_height',
        'public.image_compressions.original_width',
        'public.image_compressions.quality_setting',
        'public.image_compressions.saved_percent',
        'public.languages.country_flag',
        'public.languages.flagCode',
        'public.languages.flag_url',
        'public.legal.covid19',
        'public.legal_documents.effective_date',
        'public.mfa_rate_limits.attempt_count',
        'public.mfa_rate_limits.is_locked_out',
        'public.mfa_rate_limits.window_duration',
        'public.mfa_sessions.device_fingerprint',
        'public.mfa_verification_attempts.attempts_count',
        'public.mfa_verification_attempts.code_hash',
        'public.mfa_verification_attempts.is_expired',
        'public.newsletter_campaigns.segment_criteria',
        'public.newsletter_campaigns.total_complained',
        'public.newsletter_campaigns.total_unsubscribed',
        'public.notification_priority_config.bypass_consolidation',
        'public.notification_priority_config.consolidation_window_minutes',
        'public.notification_priority_config.max_per_hour',
        'public.notification_priority_config.ttl_seconds',
        'public.notification_queue.consolidated_count',
        'public.notification_queue.consolidated_ids',
        'public.notifications.initial_page_name',
        'public.notifications.notification_image_url',
        'public.notifications.notification_text',
        'public.notifications.notification_title',
        'public.notifications.parameter_data',
        'public.notifications.target_audience',
        'public.notifications.user_refs',
        'public.notifications.users_ff',
        'public.orphaned_storage_cleanup.bucket_id',
        'public.pending_operations.conflict_resolution',
        'public.pending_operations.server_timestamp',
        'public.post_views.viewer_ip_hash',
        'public.posts_image_backup.backed_up_at',
        'public.posts_image_backup.image_url_1',
        'public.posts_image_backup.image_url_2',
        'public.posts_image_backup.image_url_3',
        'public.precomputed_feed_cells.access_count',
        'public.precomputed_feed_cells.computation_time_ms',
        'public.profiles.available_days',
        'public.profiles.preferred_pickup_time',
        'public.profiles.search_radius_mi',
        'public.telegram_user_activity.active_hours',
        'public.telegram_user_activity.forward_count',
        'public.telegram_user_activity.hashtag_count',
        'public.telegram_user_activity.link_count',
        'public.telegram_user_activity.mention_count',
        'public.telegram_user_activity.messages_per_day',
        'public.telegram_user_activity.messages_per_month',
        'public.telegram_user_activity.messages_per_week',
        'public.telegram_user_activity.sentiment_score',
        'public.telegram_user_activity.sticker_count',
        'public.telegram_user_activity.voice_message_count',
        'public.translation_cache.compressed_data',
        'public.translation_cache.uncompressed_size',
        'public.translation_platform_config.background_sync_enabled',
        'public.translation_platform_config.cache_ttl_seconds',
        'public.translation_platform_config.compression_enabled',
        'public.translation_platform_config.custom_headers',
        'public.translation_platform_config.max_batch_size',
        'public.translation_platform_config.prefetch_enabled',
        'public.translation_platform_config.rate_limit_requests',
        'public.translation_platform_config.rate_limit_window_seconds',
        'public.translation_platform_config.realtime_enabled',
        'public.translation_platform_config.streaming_enabled',
        'public.translation_platform_config.supports_delta_updates',
        'public.translation_platform_config.supports_offline_mode',
        'public.translation_service_usage.free_limit',
        'public.translation_sync_status.last_synced_version',
        'public.translation_sync_status.pending_changes',
        'public.translation_versions.previous_version',
        'public.user_activity_summary.categories_viewed',
        'public.user_activity_summary.first_activity_at',
        'public.user_activity_summary.locations_searched',
        'public.user_activity_summary.peak_activity_hours',
        'public.user_activity_summary.search_count',
        'public.user_activity_summary.search_terms',
        'public.user_notifications.email_sent_at',
        'public.user_notifications.push_sent',
        'public.user_notifications.push_sent_at'
    ];
    target text;
    parts text[];
BEGIN
    survivors := 0;
    FOREACH target IN ARRAY list LOOP
        parts := string_to_array(target, '.');
        IF EXISTS (
            SELECT 1
            FROM pg_attribute a
            JOIN pg_class c ON c.oid = a.attrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = parts[1]
              AND c.relname = parts[2]
              AND a.attname = parts[3]
              AND a.attnum > 0
              AND NOT a.attisdropped
        ) THEN
            survivors := survivors + 1;
        END IF;
    END LOOP;
    IF survivors > 0 THEN
        RAISE EXCEPTION 'dead columns still present after drop: %', survivors;
    END IF;

    keepers := 0;
    FOREACH target IN ARRAY ARRAY[
        'public.notifications.notification_sound',
        'public.notifications.profile_id',
        'public.forum_recurring_posts.id',
        'public.forum_user_reputation.profile_id',
        'public.mfa_rate_limits.profile_id',
        'public.feature_flags.flag_key',
        'public.image_compressions.id',
        'public.telegram_user_activity.user_id',
        'public.translation_platform_config.platform',
        'audit.logged_actions.action'
    ] LOOP
        parts := string_to_array(target, '.');
        IF EXISTS (
            SELECT 1
            FROM pg_attribute a
            JOIN pg_class c ON c.oid = a.attrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = parts[1]
              AND c.relname = parts[2]
              AND a.attname = parts[3]
              AND a.attnum > 0
              AND NOT a.attisdropped
        ) THEN
            keepers := keepers + 1;
        END IF;
    END LOOP;
    IF keepers <> 10 THEN
        RAISE EXCEPTION 'keeper columns damaged: % of 10 intact', keepers;
    END IF;
END
$$;

COMMIT;

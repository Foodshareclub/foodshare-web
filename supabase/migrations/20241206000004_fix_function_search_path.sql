-- Migration: Fix function search_path security
-- Date: 2024-12-06
-- Issue: Functions with mutable search_path can be exploited via search_path injection
-- Solution: Set search_path to empty string for all public functions

-- Core helper functions
ALTER FUNCTION public.is_admin() SET search_path = '';
ALTER FUNCTION public.has_role(text) SET search_path = '';
ALTER FUNCTION public.has_any_role(text[]) SET search_path = '';
ALTER FUNCTION public.get_user_roles(uuid) SET search_path = '';

-- Forum functions
ALTER FUNCTION public.generate_forum_slug() SET search_path = '';
ALTER FUNCTION public.update_forum_search_vector() SET search_path = '';
ALTER FUNCTION public.update_forum_last_activity() SET search_path = '';
ALTER FUNCTION public.handle_comment_insert() SET search_path = '';
ALTER FUNCTION public.handle_comment_delete() SET search_path = '';
ALTER FUNCTION public.get_threaded_comments(bigint) SET search_path = '';
ALTER FUNCTION public.update_tag_usage_count() SET search_path = '';
ALTER FUNCTION public.toggle_forum_bookmark(bigint) SET search_path = '';
ALTER FUNCTION public.update_comment_likes_count() SET search_path = '';
ALTER FUNCTION public.toggle_comment_like(bigint) SET search_path = '';
ALTER FUNCTION public.search_forum(text, integer, integer) SET search_path = '';
ALTER FUNCTION public.increment_forum_view(bigint) SET search_path = '';
ALTER FUNCTION public.update_category_posts_count() SET search_path = '';
ALTER FUNCTION public.increment_forum_likes(bigint) SET search_path = '';
ALTER FUNCTION public.decrement_forum_likes(bigint) SET search_path = '';

-- Post/location functions
ALTER FUNCTION public.find_nearby_posts_geography(double precision, double precision, double precision) SET search_path = '';
ALTER FUNCTION public.nearby_posts_full(double precision, double precision, double precision) SET search_path = '';
ALTER FUNCTION public.nearby_posts(double precision, double precision, double precision) SET search_path = '';
ALTER FUNCTION public.posts_in_view(double precision, double precision, double precision, double precision) SET search_path = '';
ALTER FUNCTION public.posts_within_radius(double precision, double precision, double precision) SET search_path = '';
ALTER FUNCTION public.nearby_community_fridges(double precision, double precision, double precision) SET search_path = '';
ALTER FUNCTION public.nearby_address(double precision, double precision, double precision) SET search_path = '';
ALTER FUNCTION public.address_in_view(double precision, double precision, double precision, double precision) SET search_path = '';
ALTER FUNCTION public.posts_location_json(posts) SET search_path = '';
ALTER FUNCTION public.extract_coordinates(text) SET search_path = '';
ALTER FUNCTION public.get_latitude(text) SET search_path = '';
ALTER FUNCTION public.get_longitude(text) SET search_path = '';
ALTER FUNCTION public.strip_address(text) SET search_path = '';
ALTER FUNCTION public.get_post(bigint) SET search_path = '';
ALTER FUNCTION public.increment_post_views(bigint) SET search_path = '';
ALTER FUNCTION public.queue_location_update() SET search_path = '';
ALTER FUNCTION public.geocode_and_update_location(bigint, text) SET search_path = '';

-- User/profile functions
ALTER FUNCTION public.user_statistics(uuid) SET search_path = '';
ALTER FUNCTION public.update_user_rating() SET search_path = '';
ALTER FUNCTION public.award_reputation(uuid, integer, text) SET search_path = '';
ALTER FUNCTION public.record_activity(uuid, text, text, jsonb) SET search_path = '';
ALTER FUNCTION public.trending_items(integer) SET search_path = '';
ALTER FUNCTION public.increment_view_count(bigint) SET search_path = '';
ALTER FUNCTION public.increment_challenged_people(bigint) SET search_path = '';

-- Chat/messaging functions
ALTER FUNCTION public.mark_messages_read(bigint) SET search_path = '';
ALTER FUNCTION public.is_room_participant(bigint) SET search_path = '';

-- Email system functions
ALTER FUNCTION public.update_email_preferences_updated_at() SET search_path = '';
ALTER FUNCTION public.create_default_email_preferences() SET search_path = '';
ALTER FUNCTION public.update_email_provider_quota_updated_at() SET search_path = '';
ALTER FUNCTION public.increment_provider_quota(text) SET search_path = '';
ALTER FUNCTION public.check_provider_quota(text) SET search_path = '';
ALTER FUNCTION public.update_email_queue_updated_at() SET search_path = '';
ALTER FUNCTION public.queue_email(text, text, text, text, jsonb, text, timestamp with time zone) SET search_path = '';
ALTER FUNCTION public.retry_queued_email(uuid) SET search_path = '';
ALTER FUNCTION public.get_ready_emails(integer) SET search_path = '';
ALTER FUNCTION public.cleanup_old_queue_items() SET search_path = '';
ALTER FUNCTION public.should_send_email_notification(uuid, text) SET search_path = '';
ALTER FUNCTION public.notify_new_chat_message() SET search_path = '';
ALTER FUNCTION public.notify_new_feedback() SET search_path = '';
ALTER FUNCTION public.send_review_reminder(uuid, bigint) SET search_path = '';
ALTER FUNCTION public.send_food_listing_notification(uuid, bigint) SET search_path = '';
ALTER FUNCTION public.move_to_dead_letter_queue(uuid, text) SET search_path = '';
ALTER FUNCTION public.retry_dlq_email(uuid) SET search_path = '';

-- Health monitoring functions
ALTER FUNCTION public.record_circuit_event(text, text, text) SET search_path = '';
ALTER FUNCTION public.update_circuit_breaker_state(text, text) SET search_path = '';
ALTER FUNCTION public.record_provider_failure(text, text) SET search_path = '';
ALTER FUNCTION public.record_provider_success(text) SET search_path = '';
ALTER FUNCTION public.record_email_metrics(text, boolean, integer, text) SET search_path = '';
ALTER FUNCTION public.get_provider_health_summary() SET search_path = '';
ALTER FUNCTION public.cleanup_old_health_events() SET search_path = '';
ALTER FUNCTION public.cleanup_old_metrics() SET search_path = '';
ALTER FUNCTION public.calculate_provider_health_score(text) SET search_path = '';
ALTER FUNCTION public.record_provider_metrics(text, integer, integer, numeric, numeric) SET search_path = '';
ALTER FUNCTION public.snapshot_provider_health() SET search_path = '';
ALTER FUNCTION public.get_healthiest_provider() SET search_path = '';
ALTER FUNCTION public.check_provider_rate_limit(text) SET search_path = '';
ALTER FUNCTION public.reset_circuit_breaker(text) SET search_path = '';

-- MFA functions
ALTER FUNCTION public.generate_mfa_code() SET search_path = '';
ALTER FUNCTION public.create_mfa_challenge(uuid, text) SET search_path = '';
ALTER FUNCTION public.verify_mfa_challenge(uuid, text) SET search_path = '';
ALTER FUNCTION public.requires_mfa(uuid) SET search_path = '';
ALTER FUNCTION public.get_current_aal() SET search_path = '';
ALTER FUNCTION public.hash_mfa_code(text) SET search_path = '';
ALTER FUNCTION public.verify_mfa_code(text, text) SET search_path = '';
ALTER FUNCTION public.generate_backup_codes(integer) SET search_path = '';
ALTER FUNCTION public.check_mfa_rate_limit(uuid) SET search_path = '';

-- Utility functions
ALTER FUNCTION public.update_feedback_updated_at() SET search_path = '';
ALTER FUNCTION public.update_report_timestamp() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.clean_blog_content(text) SET search_path = '';
ALTER FUNCTION public.jsonb_set(jsonb, text[], jsonb) SET search_path = '';
ALTER FUNCTION public.encrypt_pii(text) SET search_path = '';
ALTER FUNCTION public.decrypt_pii(bytea) SET search_path = '';
ALTER FUNCTION public.get_vault_secret(text) SET search_path = '';
ALTER FUNCTION public.calculate_next_occurrence(timestamp with time zone, text) SET search_path = '';
ALTER FUNCTION public.check_rate_limit(text, integer, interval) SET search_path = '';
ALTER FUNCTION public.check_platform_rate_limit(text, text) SET search_path = '';

-- Translation functions
ALTER FUNCTION public.generate_translation_etag(text) SET search_path = '';
ALTER FUNCTION public.get_delta_translations(text, timestamp with time zone) SET search_path = '';
ALTER FUNCTION public.track_translation_changes() SET search_path = '';
ALTER FUNCTION public.get_translation_stats() SET search_path = '';
ALTER FUNCTION public.is_valid_locale(text) SET search_path = '';

-- Notification functions
ALTER FUNCTION public.notify_new_post() SET search_path = '';
ALTER FUNCTION public.notify_new_user() SET search_path = '';
ALTER FUNCTION public.update_avatar_url_on_storage_upload() SET search_path = '';
ALTER FUNCTION public.cleanup_old_telegram_states() SET search_path = '';

COMMENT ON SCHEMA public IS 'Function search_path security hardened - 2024-12-06';

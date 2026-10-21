// deno-fmt-ignore-file
// DO NOT EDIT.
//
// Generated from supabase/oracle/catalog.json by supabase/oracle/types.ts,
// which applies supabase/migrations/ to a real PostgreSQL 17
// and dumps the catalog. The file is verified byte-for-byte by
// `__tests__/generated-types.test.ts`, so it cannot drift from the schema.
//
// Regenerate:  deno run --allow-all supabase/oracle/types.ts --write
// Verify:      deno run --allow-all supabase/oracle/types.ts --check
/** Any JSON value, as PostgREST returns one. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** `Database` is the type the Supabase client is parameterised by. */
export type Database = {

  audit: {
    Tables: {
      logged_actions: {
        Row: {
        action: string | null;
        changed_fields: Array<Json> | null;
        event_time: string | null;
        row_data: Json | null;
        schema_name: string | null;
        table_name: string | null;
        user_id: string | null;
        };
        Insert: {
        action?: string;
        changed_fields?: Array<Json>;
        event_time?: string;
        row_data?: Json;
        schema_name?: string;
        table_name?: string;
        user_id?: string;
        };
        Update: {
        action?: string | null;
        changed_fields?: Array<Json> | null;
        event_time?: string | null;
        row_data?: Json | null;
        schema_name?: string | null;
        table_name?: string | null;
        user_id?: string | null;
        };
        Relationships: [];
      },
      vault_access_log: {
        Row: {
        access_granted: boolean | null;
        access_method: string | null;
        access_result: string | null;
        accessed_at: string;
        additional_info: Json | null;
        id: number;
        ip_address: string | null;
        request_id: string | null;
        secret_name: string;
        user_agent: string | null;
        user_id: string | null;
        user_role: string | null;
        };
        Insert: {
        access_granted?: boolean;
        access_method?: string;
        access_result?: string;
        accessed_at?: string;
        additional_info?: Json;
        id: number;
        ip_address?: string;
        request_id?: string;
        secret_name: string;
        user_agent?: string;
        user_id?: string;
        user_role?: string;
        };
        Update: {
        access_granted?: boolean | null;
        access_method?: string | null;
        access_result?: string | null;
        accessed_at?: string;
        additional_info?: Json | null;
        id?: number;
        ip_address?: string | null;
        request_id?: string | null;
        secret_name?: string;
        user_agent?: string | null;
        user_id?: string | null;
        user_role?: string | null;
        };
        Relationships: [];
      }
    };
    Views: { [_ in never]: never; };
    CompositeTypes: { [_ in never]: never; };
  },
  auth: {
    Tables: {
      users: {
        Row: {
        aud: string | null;
        confirmation_token: string | null;
        created_at: string | null;
        email: string | null;
        email_confirmed_at: string | null;
        encrypted_password: string | null;
        id: string;
        instance_id: string | null;
        raw_app_meta_data: Json | null;
        raw_user_meta_data: Json | null;
        role: string | null;
        updated_at: string | null;
        };
        Insert: {
        aud?: string;
        confirmation_token?: string;
        created_at?: string;
        email?: string;
        email_confirmed_at?: string;
        encrypted_password?: string;
        id?: string;
        instance_id?: string;
        raw_app_meta_data?: Json;
        raw_user_meta_data?: Json;
        role?: string;
        updated_at?: string;
        };
        Update: {
        aud?: string | null;
        confirmation_token?: string | null;
        created_at?: string | null;
        email?: string | null;
        email_confirmed_at?: string | null;
        encrypted_password?: string | null;
        id?: string;
        instance_id?: string | null;
        raw_app_meta_data?: Json | null;
        raw_user_meta_data?: Json | null;
        role?: string | null;
        updated_at?: string | null;
        };
        Relationships: [];
      }
    };
    Views: { [_ in never]: never; };
    CompositeTypes: { [_ in never]: never; };
  },
  billing: {
    Tables: {
      revenuecat_identities: {
        Row: {
        customer_id: string;
        expires_at: string | null;
        has_access: boolean;
        reconciled_at: string | null;
        revision: number;
        user_id: string;
        verification_reference: string;
        verified_at: string;
        };
        Insert: {
        customer_id: string;
        expires_at?: string;
        has_access?: boolean;
        reconciled_at?: string;
        revision?: number;
        user_id: string;
        verification_reference: string;
        verified_at?: string;
        };
        Update: {
        customer_id?: string;
        expires_at?: string | null;
        has_access?: boolean;
        reconciled_at?: string | null;
        revision?: number;
        user_id?: string;
        verification_reference?: string;
        verified_at?: string;
        };
        Relationships: [];
      },
      subscriptions: {
        Row: {
        created_at: string | null;
        id: string;
        status: string | null;
        user_id: string | null;
        };
        Insert: {
        created_at?: string;
        id?: string;
        status?: string;
        user_id?: string;
        };
        Update: {
        created_at?: string | null;
        id?: string;
        status?: string | null;
        user_id?: string | null;
        };
        Relationships: [];
      }
    };
    Views: { [_ in never]: never; };
    CompositeTypes: { [_ in never]: never; };
  },
  metrics: {
    Tables: {
      alerts: {
        Row: {
        alert_type: string;
        created_at: string;
        details: Json;
        id: number;
        message: string;
        severity: string;
        threshold: number;
        value: number;
        };
        Insert: {
        alert_type: string;
        created_at?: string;
        details?: Json;
        id?: number;
        message: string;
        severity: string;
        threshold: number;
        value: number;
        };
        Update: {
        alert_type?: string;
        created_at?: string;
        details?: Json;
        id?: number;
        message?: string;
        severity?: string;
        threshold?: number;
        value?: number;
        };
        Relationships: [];
      },
      api_hourly_stats: {
        Row: {
        at: string | null;
        id: number;
        };
        Insert: {
        at?: string;
        id?: number;
        };
        Update: {
        at?: string | null;
        id?: number;
        };
        Relationships: [];
      },
      api_requests: {
        Row: {
        at: string | null;
        id: number;
        };
        Insert: {
        at?: string;
        id?: number;
        };
        Update: {
        at?: string | null;
        id?: number;
        };
        Relationships: [];
      },
      circuit_breaker_events: {
        Row: {
        at: string | null;
        id: number;
        };
        Insert: {
        at?: string;
        id?: number;
        };
        Update: {
        at?: string | null;
        id?: number;
        };
        Relationships: [];
      },
      health_checks: {
        Row: {
        at: string | null;
        id: number;
        };
        Insert: {
        at?: string;
        id?: number;
        };
        Update: {
        at?: string | null;
        id?: number;
        };
        Relationships: [];
      }
    };
    Views: { [_ in never]: never; };
    CompositeTypes: { [_ in never]: never; };
  },
  public: {
    Tables: {
      address: {
        Row: {
        address_line_1: string;
        address_line_2: string;
        address_line_3: string;
        city: string;
        country: string | null;
        country_id: number;
        county: string;
        created_at: string;
        generated_full_address: string;
        last_processed_id: number | null;
        lat: number;
        location: unknown;
        location_status: Database["public"]["Enums"]["location_status"] | null;
        long: number;
        postal_code: string;
        profile_id: string;
        radius_meters: number;
        state_province: string;
        test_delete: Json | null;
        transportation: string;
        updated_at: string | null;
        };
        Insert: {
        address_line_1?: string;
        address_line_2?: string;
        address_line_3?: string;
        city?: string;
        country?: string;
        country_id?: number;
        county?: string;
        created_at?: string;
        generated_full_address?: string;
        last_processed_id?: number;
        lat?: number;
        location?: unknown;
        location_status?: Database["public"]["Enums"]["location_status"];
        long?: number;
        postal_code?: string;
        profile_id: string;
        radius_meters?: number;
        state_province?: string;
        test_delete?: Json;
        transportation?: string;
        updated_at?: string;
        };
        Update: {
        address_line_1?: string;
        address_line_2?: string;
        address_line_3?: string;
        city?: string;
        country?: string | null;
        country_id?: number;
        county?: string;
        created_at?: string;
        generated_full_address?: string;
        last_processed_id?: number | null;
        lat?: number;
        location?: unknown;
        location_status?: Database["public"]["Enums"]["location_status"] | null;
        long?: number;
        postal_code?: string;
        profile_id?: string;
        radius_meters?: number;
        state_province?: string;
        test_delete?: Json | null;
        transportation?: string;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      admin_audit_log: {
        Row: {
        action: string;
        admin_id: string;
        created_at: string;
        error_message: string | null;
        id: string;
        ip_address: string | null;
        metadata: Json | null;
        resource_id: string | null;
        resource_type: string;
        success: boolean | null;
        user_agent: string | null;
        };
        Insert: {
        action: string;
        admin_id: string;
        created_at?: string;
        error_message?: string;
        id?: string;
        ip_address?: string;
        metadata?: Json;
        resource_id?: string;
        resource_type: string;
        success?: boolean;
        user_agent?: string;
        };
        Update: {
        action?: string;
        admin_id?: string;
        created_at?: string;
        error_message?: string | null;
        id?: string;
        ip_address?: string | null;
        metadata?: Json | null;
        resource_id?: string | null;
        resource_type?: string;
        success?: boolean | null;
        user_agent?: string | null;
        };
        Relationships: [];
      },
      analytics_daily_stats: {
        Row: {
        active_users: number | null;
        completed_shares: number | null;
        computed_at: string | null;
        date: string;
        messages_sent: number | null;
        new_listings: number | null;
        new_users: number | null;
        returning_users: number | null;
        synced_to_motherduck: boolean | null;
        top_categories: Json | null;
        };
        Insert: {
        active_users?: number;
        completed_shares?: number;
        computed_at?: string;
        date: string;
        messages_sent?: number;
        new_listings?: number;
        new_users?: number;
        returning_users?: number;
        synced_to_motherduck?: boolean;
        top_categories?: Json;
        };
        Update: {
        active_users?: number | null;
        completed_shares?: number | null;
        computed_at?: string | null;
        date?: string;
        messages_sent?: number | null;
        new_listings?: number | null;
        new_users?: number | null;
        returning_users?: number | null;
        synced_to_motherduck?: boolean | null;
        top_categories?: Json | null;
        };
        Relationships: [];
      },
      analytics_post_activity: {
        Row: {
        date: string | null;
        id: string;
        post_type: string | null;
        posts_arranged: number | null;
        posts_viewed: number | null;
        synced_to_motherduck: boolean | null;
        total_likes: number | null;
        updated_at: string | null;
        };
        Insert: {
        date?: string;
        id: string;
        post_type?: string;
        posts_arranged?: number;
        posts_viewed?: number;
        synced_to_motherduck?: boolean;
        total_likes?: number;
        updated_at?: string;
        };
        Update: {
        date?: string | null;
        id?: string;
        post_type?: string | null;
        posts_arranged?: number | null;
        posts_viewed?: number | null;
        synced_to_motherduck?: boolean | null;
        total_likes?: number | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      analytics_staging_favorites: {
        Row: {
        created_at: string | null;
        id: string;
        post_id: number | null;
        synced_to_motherduck: boolean | null;
        user_id: string | null;
        };
        Insert: {
        created_at?: string;
        id: string;
        post_id?: number;
        synced_to_motherduck?: boolean;
        user_id?: string;
        };
        Update: {
        created_at?: string | null;
        id?: string;
        post_id?: number | null;
        synced_to_motherduck?: boolean | null;
        user_id?: string | null;
        };
        Relationships: [];
      },
      analytics_staging_listings: {
        Row: {
        created_at: string | null;
        id: number;
        is_active: boolean | null;
        is_arranged: boolean | null;
        latitude: number | null;
        longitude: number | null;
        post_address: string | null;
        post_arranged_at: string | null;
        post_arranged_to: string | null;
        post_description: string | null;
        post_like_counter: number | null;
        post_name: string | null;
        post_type: string | null;
        post_views: number | null;
        profile_id: string | null;
        synced_to_motherduck: boolean | null;
        updated_at: string | null;
        };
        Insert: {
        created_at?: string;
        id: number;
        is_active?: boolean;
        is_arranged?: boolean;
        latitude?: number;
        longitude?: number;
        post_address?: string;
        post_arranged_at?: string;
        post_arranged_to?: string;
        post_description?: string;
        post_like_counter?: number;
        post_name?: string;
        post_type?: string;
        post_views?: number;
        profile_id?: string;
        synced_to_motherduck?: boolean;
        updated_at?: string;
        };
        Update: {
        created_at?: string | null;
        id?: number;
        is_active?: boolean | null;
        is_arranged?: boolean | null;
        latitude?: number | null;
        longitude?: number | null;
        post_address?: string | null;
        post_arranged_at?: string | null;
        post_arranged_to?: string | null;
        post_description?: string | null;
        post_like_counter?: number | null;
        post_name?: string | null;
        post_type?: string | null;
        post_views?: number | null;
        profile_id?: string | null;
        synced_to_motherduck?: boolean | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      analytics_staging_reviews: {
        Row: {
        created_at: string | null;
        id: string;
        post_id: number | null;
        rating: number | null;
        review_type: string | null;
        reviewer_id: string | null;
        synced_to_motherduck: boolean | null;
        updated_at: string | null;
        };
        Insert: {
        created_at?: string;
        id: string;
        post_id?: number;
        rating?: number;
        review_type?: string;
        reviewer_id?: string;
        synced_to_motherduck?: boolean;
        updated_at?: string;
        };
        Update: {
        created_at?: string | null;
        id?: string;
        post_id?: number | null;
        rating?: number | null;
        review_type?: string | null;
        reviewer_id?: string | null;
        synced_to_motherduck?: boolean | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      analytics_staging_rooms: {
        Row: {
        created_at: string | null;
        id: string;
        last_message_at: string | null;
        post_id: number | null;
        requester_id: string | null;
        sharer_id: string | null;
        synced_to_motherduck: boolean | null;
        updated_at: string | null;
        };
        Insert: {
        created_at?: string;
        id: string;
        last_message_at?: string;
        post_id?: number;
        requester_id?: string;
        sharer_id?: string;
        synced_to_motherduck?: boolean;
        updated_at?: string;
        };
        Update: {
        created_at?: string | null;
        id?: string;
        last_message_at?: string | null;
        post_id?: number | null;
        requester_id?: string | null;
        sharer_id?: string | null;
        synced_to_motherduck?: boolean | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      analytics_staging_users: {
        Row: {
        avatar_url: string | null;
        bio: string | null;
        created_at: string | null;
        email: string | null;
        id: string;
        is_active: boolean | null;
        is_verified: boolean | null;
        last_seen_at: string | null;
        nickname: string | null;
        synced_to_motherduck: boolean | null;
        updated_at: string | null;
        };
        Insert: {
        avatar_url?: string;
        bio?: string;
        created_at?: string;
        email?: string;
        id: string;
        is_active?: boolean;
        is_verified?: boolean;
        last_seen_at?: string;
        nickname?: string;
        synced_to_motherduck?: boolean;
        updated_at?: string;
        };
        Update: {
        avatar_url?: string | null;
        bio?: string | null;
        created_at?: string | null;
        email?: string | null;
        id?: string;
        is_active?: boolean | null;
        is_verified?: boolean | null;
        last_seen_at?: string | null;
        nickname?: string | null;
        synced_to_motherduck?: boolean | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      analytics_user_activity: {
        Row: {
        last_activity_at: string | null;
        listings_saved: number | null;
        listings_viewed: number | null;
        messages_initiated: number | null;
        shares_completed: number | null;
        synced_to_motherduck: boolean | null;
        updated_at: string | null;
        user_id: string;
        };
        Insert: {
        last_activity_at?: string;
        listings_saved?: number;
        listings_viewed?: number;
        messages_initiated?: number;
        shares_completed?: number;
        synced_to_motherduck?: boolean;
        updated_at?: string;
        user_id: string;
        };
        Update: {
        last_activity_at?: string | null;
        listings_saved?: number | null;
        listings_viewed?: number | null;
        messages_initiated?: number | null;
        shares_completed?: number | null;
        synced_to_motherduck?: boolean | null;
        updated_at?: string | null;
        user_id?: string;
        };
        Relationships: [];
      },
      api_analytics: {
        Row: {
        created_at: string;
        endpoint: string;
        error_code: string | null;
        id: string;
        method: string;
        response_time_ms: number | null;
        status_code: number | null;
        user_id: string | null;
        };
        Insert: {
        created_at?: string;
        endpoint: string;
        error_code?: string;
        id?: string;
        method: string;
        response_time_ms?: number;
        status_code?: number;
        user_id?: string;
        };
        Update: {
        created_at?: string;
        endpoint?: string;
        error_code?: string | null;
        id?: string;
        method?: string;
        response_time_ms?: number | null;
        status_code?: number | null;
        user_id?: string | null;
        };
        Relationships: [];
      },
      app_config: {
        Row: {
        category: string;
        created_at: string | null;
        description: string | null;
        id: string;
        key: string;
        platform: string | null;
        updated_at: string | null;
        value: Json;
        };
        Insert: {
        category: string;
        created_at?: string;
        description?: string;
        id?: string;
        key: string;
        platform?: string;
        updated_at?: string;
        value: Json;
        };
        Update: {
        category?: string;
        created_at?: string | null;
        description?: string | null;
        id?: string;
        key?: string;
        platform?: string | null;
        updated_at?: string | null;
        value?: Json;
        };
        Relationships: [];
      },
      app_version_requirements: {
        Row: {
        force_update_message: string | null;
        min_version: string;
        platform: string;
        recommended_version: string;
        soft_update_message: string | null;
        updated_at: string;
        };
        Insert: {
        force_update_message?: string;
        min_version: string;
        platform: string;
        recommended_version: string;
        soft_update_message?: string;
        updated_at?: string;
        };
        Update: {
        force_update_message?: string | null;
        min_version?: string;
        platform?: string;
        recommended_version?: string;
        soft_update_message?: string | null;
        updated_at?: string;
        };
        Relationships: [];
      },
      audience_segments: {
        Row: {
        cached_count: number | null;
        color: string | null;
        created_at: string | null;
        created_by: string | null;
        criteria: Json;
        description: string | null;
        icon_name: string | null;
        id: string;
        is_dynamic: boolean | null;
        is_system: boolean | null;
        last_calculated_at: string | null;
        name: string;
        updated_at: string | null;
        };
        Insert: {
        cached_count?: number;
        color?: string;
        created_at?: string;
        created_by?: string;
        criteria?: Json;
        description?: string;
        icon_name?: string;
        id?: string;
        is_dynamic?: boolean;
        is_system?: boolean;
        last_calculated_at?: string;
        name: string;
        updated_at?: string;
        };
        Update: {
        cached_count?: number | null;
        color?: string | null;
        created_at?: string | null;
        created_by?: string | null;
        criteria?: Json;
        description?: string | null;
        icon_name?: string | null;
        id?: string;
        is_dynamic?: boolean | null;
        is_system?: boolean | null;
        last_calculated_at?: string | null;
        name?: string;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      audit_logs: {
        Row: {
        action: string;
        created_at: string | null;
        id: string;
        ip_address: string | null;
        metadata: Json | null;
        resource_id: string;
        resource_type: string;
        user_agent: string | null;
        user_id: string | null;
        };
        Insert: {
        action: string;
        created_at?: string;
        id?: string;
        ip_address?: string;
        metadata?: Json;
        resource_id: string;
        resource_type: string;
        user_agent?: string;
        user_id?: string;
        };
        Update: {
        action?: string;
        created_at?: string | null;
        id?: string;
        ip_address?: string | null;
        metadata?: Json | null;
        resource_id?: string;
        resource_type?: string;
        user_agent?: string | null;
        user_id?: string | null;
        };
        Relationships: [];
      },
      automation_enrollments: {
        Row: {
        completed_at: string | null;
        converted: boolean | null;
        converted_at: string | null;
        created_at: string | null;
        current_step: number | null;
        enrolled_at: string | null;
        exit_reason: string | null;
        exited_at: string | null;
        flow_id: string;
        id: string;
        profile_id: string;
        status: string;
        step_history: Json | null;
        updated_at: string | null;
        };
        Insert: {
        completed_at?: string;
        converted?: boolean;
        converted_at?: string;
        created_at?: string;
        current_step?: number;
        enrolled_at?: string;
        exit_reason?: string;
        exited_at?: string;
        flow_id: string;
        id?: string;
        profile_id: string;
        status?: string;
        step_history?: Json;
        updated_at?: string;
        };
        Update: {
        completed_at?: string | null;
        converted?: boolean | null;
        converted_at?: string | null;
        created_at?: string | null;
        current_step?: number | null;
        enrolled_at?: string | null;
        exit_reason?: string | null;
        exited_at?: string | null;
        flow_id?: string;
        id?: string;
        profile_id?: string;
        status?: string;
        step_history?: Json | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      blocked_users: {
        Row: {
        blocked_at: string;
        blocked_user_id: string;
        id: string;
        reason: string | null;
        user_id: string;
        };
        Insert: {
        blocked_at?: string;
        blocked_user_id: string;
        id?: string;
        reason?: string;
        user_id: string;
        };
        Update: {
        blocked_at?: string;
        blocked_user_id?: string;
        id?: string;
        reason?: string | null;
        user_id?: string;
        };
        Relationships: [];
      },
      bookmarks: {
        Row: {
        created_at: string | null;
        forum_id: number;
        id: number;
        post_id: number;
        profile_id: string;
        };
        Insert: {
        created_at?: string;
        forum_id?: number;
        id?: number;
        post_id?: number;
        profile_id: string;
        };
        Update: {
        created_at?: string | null;
        forum_id?: number;
        id?: number;
        post_id?: number;
        profile_id?: string;
        };
        Relationships: [];
      },
      campaign_recipients: {
        Row: {
        campaign_id: string;
        click_count: number | null;
        clicked_at: string | null;
        clicked_links: Json | null;
        created_at: string | null;
        delivered_at: string | null;
        email: string;
        error_message: string | null;
        id: string;
        open_count: number | null;
        opened_at: string | null;
        profile_id: string | null;
        provider: string | null;
        provider_message_id: string | null;
        sent_at: string | null;
        status: string;
        subscriber_id: string | null;
        updated_at: string | null;
        };
        Insert: {
        campaign_id: string;
        click_count?: number;
        clicked_at?: string;
        clicked_links?: Json;
        created_at?: string;
        delivered_at?: string;
        email: string;
        error_message?: string;
        id?: string;
        open_count?: number;
        opened_at?: string;
        profile_id?: string;
        provider?: string;
        provider_message_id?: string;
        sent_at?: string;
        status?: string;
        subscriber_id?: string;
        updated_at?: string;
        };
        Update: {
        campaign_id?: string;
        click_count?: number | null;
        clicked_at?: string | null;
        clicked_links?: Json | null;
        created_at?: string | null;
        delivered_at?: string | null;
        email?: string;
        error_message?: string | null;
        id?: string;
        open_count?: number | null;
        opened_at?: string | null;
        profile_id?: string | null;
        provider?: string | null;
        provider_message_id?: string | null;
        sent_at?: string | null;
        status?: string;
        subscriber_id?: string | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      categories: {
        Row: {
        color: string | null;
        created_at: string | null;
        description: string | null;
        icon_url: string | null;
        id: number;
        is_active: boolean | null;
        name: string;
        sort_order: number | null;
        };
        Insert: {
        color?: string;
        created_at?: string;
        description?: string;
        icon_url?: string;
        id?: number;
        is_active?: boolean;
        name: string;
        sort_order?: number;
        };
        Update: {
        color?: string | null;
        created_at?: string | null;
        description?: string | null;
        icon_url?: string | null;
        id?: number;
        is_active?: boolean | null;
        name?: string;
        sort_order?: number | null;
        };
        Relationships: [];
      },
      challenge_activities: {
        Row: {
        challenge_id: number;
        created_at: string;
        id: number;
        user_accepted_challenge: string | null;
        user_completed_challenge: string | null;
        user_rejected_challenge: string | null;
        };
        Insert: {
        challenge_id: number;
        created_at?: string;
        id: number;
        user_accepted_challenge?: string;
        user_completed_challenge?: string;
        user_rejected_challenge?: string;
        };
        Update: {
        challenge_id?: number;
        created_at?: string;
        id?: number;
        user_accepted_challenge?: string | null;
        user_completed_challenge?: string | null;
        user_rejected_challenge?: string | null;
        };
        Relationships: [];
      },
      challenge_participants: {
        Row: {
        accepted_at: string;
        challenge_id: number;
        completed_at: string | null;
        id: number;
        is_completed: boolean;
        profile_id: string;
        };
        Insert: {
        accepted_at?: string;
        challenge_id: number;
        completed_at?: string;
        id: number;
        is_completed?: boolean;
        profile_id: string;
        };
        Update: {
        accepted_at?: string;
        challenge_id?: number;
        completed_at?: string | null;
        id?: number;
        is_completed?: boolean;
        profile_id?: string;
        };
        Relationships: [];
      },
      challenges: {
        Row: {
        challenge_action: string;
        challenge_created_at: string;
        challenge_description: string;
        challenge_difficulty: string;
        challenge_image: string;
        challenge_likes_counter: number;
        challenge_published: boolean;
        challenge_score: number;
        challenge_title: string;
        challenge_updated_at: string;
        challenge_views: number;
        challenged_people: number;
        deleted_at: string | null;
        id: number;
        profile_id: string;
        };
        Insert: {
        challenge_action?: string;
        challenge_created_at?: string;
        challenge_description?: string;
        challenge_difficulty?: string;
        challenge_image?: string;
        challenge_likes_counter?: number;
        challenge_published?: boolean;
        challenge_score?: number;
        challenge_title?: string;
        challenge_updated_at?: string;
        challenge_views?: number;
        challenged_people?: number;
        deleted_at?: string;
        id: number;
        profile_id?: string;
        };
        Update: {
        challenge_action?: string;
        challenge_created_at?: string;
        challenge_description?: string;
        challenge_difficulty?: string;
        challenge_image?: string;
        challenge_likes_counter?: number;
        challenge_published?: boolean;
        challenge_score?: number;
        challenge_title?: string;
        challenge_updated_at?: string;
        challenge_views?: number;
        challenged_people?: number;
        deleted_at?: string | null;
        id?: number;
        profile_id?: string;
        };
        Relationships: [];
      },
      comments: {
        Row: {
        comment: string | null;
        comment_created_at: string;
        deleted_at: string | null;
        depth: number | null;
        firebase_id: string | null;
        firebase_metadata: Json | null;
        forum_id: number | null;
        id: number;
        is_best_answer: boolean | null;
        is_edited: boolean | null;
        is_pinned: boolean | null;
        likes_count: number | null;
        parent_id: number | null;
        reactions_count: Json | null;
        replies_count: number | null;
        reports_count: number | null;
        rich_content: Json | null;
        updated_at: string | null;
        user_id: string;
        };
        Insert: {
        comment?: string;
        comment_created_at?: string;
        deleted_at?: string;
        depth?: number;
        firebase_id?: string;
        firebase_metadata?: Json;
        forum_id?: number;
        id: number;
        is_best_answer?: boolean;
        is_edited?: boolean;
        is_pinned?: boolean;
        likes_count?: number;
        parent_id?: number;
        reactions_count?: Json;
        replies_count?: number;
        reports_count?: number;
        rich_content?: Json;
        updated_at?: string;
        user_id: string;
        };
        Update: {
        comment?: string | null;
        comment_created_at?: string;
        deleted_at?: string | null;
        depth?: number | null;
        firebase_id?: string | null;
        firebase_metadata?: Json | null;
        forum_id?: number | null;
        id?: number;
        is_best_answer?: boolean | null;
        is_edited?: boolean | null;
        is_pinned?: boolean | null;
        likes_count?: number | null;
        parent_id?: number | null;
        reactions_count?: Json | null;
        replies_count?: number | null;
        reports_count?: number | null;
        rich_content?: Json | null;
        updated_at?: string | null;
        user_id?: string;
        };
        Relationships: [];
      },
      community_fridges: {
        Row: {
        age_years: number | null;
        available_hours: string | null;
        check_in_link: string | null;
        city: string | null;
        company_type: string | null;
        created_at: string | null;
        created_date: string | null;
        description: string | null;
        firebase_metadata: Json | null;
        full_address: string | null;
        has_pantry: boolean | null;
        host_company: string | null;
        id: string;
        languages: Array<string> | null;
        last_check_in: string | null;
        latest_cleanliness_status: string | null;
        latest_food_status: string | null;
        latitude: number | null;
        launch_date: string | null;
        location: unknown | null;
        location_type: string | null;
        longitude: number | null;
        name: string;
        photo_url: string | null;
        point_person_email: string | null;
        point_person_name: string | null;
        qr_code_url: string | null;
        reference_directions: string | null;
        slack_channel_id: string | null;
        slack_channel_link: string | null;
        state: string | null;
        status: string | null;
        status_last_updated: string | null;
        street_address: string | null;
        total_check_ins: number | null;
        updated_at: string | null;
        zip_code: string | null;
        };
        Insert: {
        age_years?: number;
        available_hours?: string;
        check_in_link?: string;
        city?: string;
        company_type?: string;
        created_at?: string;
        created_date?: string;
        description?: string;
        firebase_metadata?: Json;
        full_address?: string;
        has_pantry?: boolean;
        host_company?: string;
        id?: string;
        languages?: Array<string>;
        last_check_in?: string;
        latest_cleanliness_status?: string;
        latest_food_status?: string;
        latitude?: number;
        launch_date?: string;
        location?: unknown;
        location_type?: string;
        longitude?: number;
        name: string;
        photo_url?: string;
        point_person_email?: string;
        point_person_name?: string;
        qr_code_url?: string;
        reference_directions?: string;
        slack_channel_id?: string;
        slack_channel_link?: string;
        state?: string;
        status?: string;
        status_last_updated?: string;
        street_address?: string;
        total_check_ins?: number;
        updated_at?: string;
        zip_code?: string;
        };
        Update: {
        age_years?: number | null;
        available_hours?: string | null;
        check_in_link?: string | null;
        city?: string | null;
        company_type?: string | null;
        created_at?: string | null;
        created_date?: string | null;
        description?: string | null;
        firebase_metadata?: Json | null;
        full_address?: string | null;
        has_pantry?: boolean | null;
        host_company?: string | null;
        id?: string;
        languages?: Array<string> | null;
        last_check_in?: string | null;
        latest_cleanliness_status?: string | null;
        latest_food_status?: string | null;
        latitude?: number | null;
        launch_date?: string | null;
        location?: unknown | null;
        location_type?: string | null;
        longitude?: number | null;
        name?: string;
        photo_url?: string | null;
        point_person_email?: string | null;
        point_person_name?: string | null;
        qr_code_url?: string | null;
        reference_directions?: string | null;
        slack_channel_id?: string | null;
        slack_channel_link?: string | null;
        state?: string | null;
        status?: string | null;
        status_last_updated?: string | null;
        street_address?: string | null;
        total_check_ins?: number | null;
        updated_at?: string | null;
        zip_code?: string | null;
        };
        Relationships: [];
      },
      compressed_images: {
        Row: {
        bucket_id: string;
        compressed_at: string | null;
        compressed_size: number;
        id: number;
        object_path: string;
        original_size: number;
        savings_percent: number | null;
        };
        Insert: {
        bucket_id: string;
        compressed_at?: string;
        compressed_size: number;
        id?: number;
        object_path: string;
        original_size: number;
        savings_percent?: number;
        };
        Update: {
        bucket_id?: string;
        compressed_at?: string | null;
        compressed_size?: number;
        id?: number;
        object_path?: string;
        original_size?: number;
        savings_percent?: number | null;
        };
        Relationships: [];
      },
      content_translations: {
        Row: {
        character_count: number | null;
        content_id: string;
        content_type: string;
        created_at: string | null;
        expires_at: string | null;
        field_name: string;
        hit_count: number | null;
        id: string;
        last_hit_at: string | null;
        quality_score: number | null;
        source_locale: string;
        source_text: string;
        target_locale: string;
        translated_text: string;
        translation_service: string | null;
        };
        Insert: {
        character_count?: number;
        content_id: string;
        content_type: string;
        created_at?: string;
        expires_at?: string;
        field_name: string;
        hit_count?: number;
        id?: string;
        last_hit_at?: string;
        quality_score?: number;
        source_locale: string;
        source_text: string;
        target_locale: string;
        translated_text: string;
        translation_service?: string;
        };
        Update: {
        character_count?: number | null;
        content_id?: string;
        content_type?: string;
        created_at?: string | null;
        expires_at?: string | null;
        field_name?: string;
        hit_count?: number | null;
        id?: string;
        last_hit_at?: string | null;
        quality_score?: number | null;
        source_locale?: string;
        source_text?: string;
        target_locale?: string;
        translated_text?: string;
        translation_service?: string | null;
        };
        Relationships: [];
      },
      countries: {
        Row: {
        continent: Database["public"]["Enums"]["continents"];
        id: number;
        iso2: string;
        iso3: string;
        local_name: string;
        name: string;
        };
        Insert: {
        continent?: Database["public"]["Enums"]["continents"];
        id: number;
        iso2?: string;
        iso3?: string;
        local_name?: string;
        name?: string;
        };
        Update: {
        continent?: Database["public"]["Enums"]["continents"];
        id?: number;
        iso2?: string;
        iso3?: string;
        local_name?: string;
        name?: string;
        };
        Relationships: [];
      },
      crm_customer_notes: {
        Row: {
        admin_id: string;
        content: string;
        created_at: string | null;
        customer_id: string;
        id: string;
        is_pinned: boolean | null;
        note_text: string | null;
        note_type: string | null;
        updated_at: string | null;
        };
        Insert: {
        admin_id: string;
        content: string;
        created_at?: string;
        customer_id: string;
        id?: string;
        is_pinned?: boolean;
        note_text?: string;
        note_type?: string;
        updated_at?: string;
        };
        Update: {
        admin_id?: string;
        content?: string;
        created_at?: string | null;
        customer_id?: string;
        id?: string;
        is_pinned?: boolean | null;
        note_text?: string | null;
        note_type?: string | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      crm_customer_tag_assignments: {
        Row: {
        created_at: string | null;
        customer_id: string;
        id: string;
        tag_id: string;
        };
        Insert: {
        created_at?: string;
        customer_id: string;
        id?: string;
        tag_id: string;
        };
        Update: {
        created_at?: string | null;
        customer_id?: string;
        id?: string;
        tag_id?: string;
        };
        Relationships: [];
      },
      crm_customer_tags: {
        Row: {
        color: string | null;
        created_at: string | null;
        description: string | null;
        id: string;
        is_system: boolean | null;
        name: string;
        updated_at: string | null;
        };
        Insert: {
        color?: string;
        created_at?: string;
        description?: string;
        id?: string;
        is_system?: boolean;
        name: string;
        updated_at?: string;
        };
        Update: {
        color?: string | null;
        created_at?: string | null;
        description?: string | null;
        id?: string;
        is_system?: boolean | null;
        name?: string;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      crm_customers: {
        Row: {
        archived_at: string | null;
        archived_reason: string | null;
        churn_risk_score: number | null;
        created_at: string | null;
        custom_fields: Json | null;
        customer_type: string | null;
        engagement_score: number | null;
        first_interaction_at: string | null;
        id: string;
        is_archived: boolean | null;
        last_interaction_at: string | null;
        lifecycle_stage: string | null;
        lifetime_value: number | null;
        ltv_score: number | null;
        notes: string | null;
        preferred_contact_method: string | null;
        profile_id: string;
        source: string | null;
        status: string | null;
        total_interactions: number | null;
        total_transactions: number | null;
        updated_at: string | null;
        };
        Insert: {
        archived_at?: string;
        archived_reason?: string;
        churn_risk_score?: number;
        created_at?: string;
        custom_fields?: Json;
        customer_type?: string;
        engagement_score?: number;
        first_interaction_at?: string;
        id?: string;
        is_archived?: boolean;
        last_interaction_at?: string;
        lifecycle_stage?: string;
        lifetime_value?: number;
        ltv_score?: number;
        notes?: string;
        preferred_contact_method?: string;
        profile_id: string;
        source?: string;
        status?: string;
        total_interactions?: number;
        total_transactions?: number;
        updated_at?: string;
        };
        Update: {
        archived_at?: string | null;
        archived_reason?: string | null;
        churn_risk_score?: number | null;
        created_at?: string | null;
        custom_fields?: Json | null;
        customer_type?: string | null;
        engagement_score?: number | null;
        first_interaction_at?: string | null;
        id?: string;
        is_archived?: boolean | null;
        last_interaction_at?: string | null;
        lifecycle_stage?: string | null;
        lifetime_value?: number | null;
        ltv_score?: number | null;
        notes?: string | null;
        preferred_contact_method?: string | null;
        profile_id?: string;
        source?: string | null;
        status?: string | null;
        total_interactions?: number | null;
        total_transactions?: number | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      daily_stats: {
        Row: {
        active_cities: Json | null;
        active_users: number;
        completed_shares: number;
        computed_at: string;
        date: string;
        expired_listings: number;
        messages_sent: number;
        new_listings: number;
        new_users: number;
        notifications_sent: number;
        returning_users: number;
        searches_performed: number;
        top_categories: Json | null;
        };
        Insert: {
        active_cities?: Json;
        active_users?: number;
        completed_shares?: number;
        computed_at?: string;
        date: string;
        expired_listings?: number;
        messages_sent?: number;
        new_listings?: number;
        new_users?: number;
        notifications_sent?: number;
        returning_users?: number;
        searches_performed?: number;
        top_categories?: Json;
        };
        Update: {
        active_cities?: Json | null;
        active_users?: number;
        completed_shares?: number;
        computed_at?: string;
        date?: string;
        expired_listings?: number;
        messages_sent?: number;
        new_listings?: number;
        new_users?: number;
        notifications_sent?: number;
        returning_users?: number;
        searches_performed?: number;
        top_categories?: Json | null;
        };
        Relationships: [];
      },
      device_attestations: {
        Row: {
        app_version: string | null;
        assertion_counter: number;
        attestation_verified: boolean;
        bundle_id: string | null;
        created_at: string;
        flags: Json;
        id: string;
        key_id: string;
        last_seen: string;
        os_version: string | null;
        platform: string | null;
        public_key: string | null;
        risk_score: number | null;
        trust_level: string;
        updated_at: string;
        user_id: string | null;
        verification_count: number;
        };
        Insert: {
        app_version?: string;
        assertion_counter?: number;
        attestation_verified?: boolean;
        bundle_id?: string;
        created_at?: string;
        flags?: Json;
        id?: string;
        key_id: string;
        last_seen?: string;
        os_version?: string;
        platform?: string;
        public_key?: string;
        risk_score?: number;
        trust_level?: string;
        updated_at?: string;
        user_id?: string;
        verification_count?: number;
        };
        Update: {
        app_version?: string | null;
        assertion_counter?: number;
        attestation_verified?: boolean;
        bundle_id?: string | null;
        created_at?: string;
        flags?: Json;
        id?: string;
        key_id?: string;
        last_seen?: string;
        os_version?: string | null;
        platform?: string | null;
        public_key?: string | null;
        risk_score?: number | null;
        trust_level?: string;
        updated_at?: string;
        user_id?: string | null;
        verification_count?: number;
        };
        Relationships: [];
      },
      device_tokens: {
        Row: {
        auth: string | null;
        created_at: string;
        endpoint: string | null;
        last_used_at: string | null;
        p256dh: string | null;
        platform: string;
        profile_id: string;
        token: string;
        updated_at: string;
        user_agent: string | null;
        };
        Insert: {
        auth?: string;
        created_at?: string;
        endpoint?: string;
        last_used_at?: string;
        p256dh?: string;
        platform: string;
        profile_id: string;
        token: string;
        updated_at?: string;
        user_agent?: string;
        };
        Update: {
        auth?: string | null;
        created_at?: string;
        endpoint?: string | null;
        last_used_at?: string | null;
        p256dh?: string | null;
        platform?: string;
        profile_id?: string;
        token?: string;
        updated_at?: string;
        user_agent?: string | null;
        };
        Relationships: [];
      },
      display_name_overrides: {
        Row: {
        created_at: string;
        display_name: string;
        expires_at: string | null;
        overridden_by: string | null;
        reason: string;
        updated_at: string;
        user_id: string;
        };
        Insert: {
        created_at?: string;
        display_name: string;
        expires_at?: string;
        overridden_by?: string;
        reason: string;
        updated_at?: string;
        user_id: string;
        };
        Update: {
        created_at?: string;
        display_name?: string;
        expires_at?: string | null;
        overridden_by?: string | null;
        reason?: string;
        updated_at?: string;
        user_id?: string;
        };
        Relationships: [];
      },
      dynamic_content_translations: {
        Row: {
        content_hash: string;
        content_type: string;
        created_at: string | null;
        expires_at: string | null;
        hit_count: number | null;
        id: string;
        last_hit_at: string | null;
        quality_score: number | null;
        source_locale: string;
        source_text: string;
        target_locale: string;
        translated_text: string;
        translation_source: string | null;
        };
        Insert: {
        content_hash: string;
        content_type?: string;
        created_at?: string;
        expires_at?: string;
        hit_count?: number;
        id?: string;
        last_hit_at?: string;
        quality_score?: number;
        source_locale?: string;
        source_text: string;
        target_locale: string;
        translated_text: string;
        translation_source?: string;
        };
        Update: {
        content_hash?: string;
        content_type?: string;
        created_at?: string | null;
        expires_at?: string | null;
        hit_count?: number | null;
        id?: string;
        last_hit_at?: string | null;
        quality_score?: number | null;
        source_locale?: string;
        source_text?: string;
        target_locale?: string;
        translated_text?: string;
        translation_source?: string | null;
        };
        Relationships: [];
      },
      email_audit_log: {
        Row: {
        action: string;
        created_at: string;
        details: Json | null;
        event_type: string;
        id: string;
        ip_address: string | null;
        provider: string | null;
        request_id: string | null;
        severity: string;
        target_email: string | null;
        target_user_id: string | null;
        user_agent: string | null;
        user_id: string | null;
        };
        Insert: {
        action: string;
        created_at?: string;
        details?: Json;
        event_type: string;
        id?: string;
        ip_address?: string;
        provider?: string;
        request_id?: string;
        severity: string;
        target_email?: string;
        target_user_id?: string;
        user_agent?: string;
        user_id?: string;
        };
        Update: {
        action?: string;
        created_at?: string;
        details?: Json | null;
        event_type?: string;
        id?: string;
        ip_address?: string | null;
        provider?: string | null;
        request_id?: string | null;
        severity?: string;
        target_email?: string | null;
        target_user_id?: string | null;
        user_agent?: string | null;
        user_id?: string | null;
        };
        Relationships: [];
      },
      email_automation_flows: {
        Row: {
        conversion_goal: string | null;
        created_at: string | null;
        created_by: string | null;
        description: string | null;
        id: string;
        name: string;
        status: string;
        steps: Json | null;
        total_completed: number | null;
        total_converted: number | null;
        total_enrolled: number | null;
        trigger_config: Json | null;
        trigger_type: string;
        updated_at: string | null;
        };
        Insert: {
        conversion_goal?: string;
        created_at?: string;
        created_by?: string;
        description?: string;
        id?: string;
        name: string;
        status?: string;
        steps?: Json;
        total_completed?: number;
        total_converted?: number;
        total_enrolled?: number;
        trigger_config?: Json;
        trigger_type: string;
        updated_at?: string;
        };
        Update: {
        conversion_goal?: string | null;
        created_at?: string | null;
        created_by?: string | null;
        description?: string | null;
        id?: string;
        name?: string;
        status?: string;
        steps?: Json | null;
        total_completed?: number | null;
        total_converted?: number | null;
        total_enrolled?: number | null;
        trigger_config?: Json | null;
        trigger_type?: string;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      email_automation_queue: {
        Row: {
        attempts: number;
        created_at: string | null;
        email_data: Json;
        enrollment_id: string;
        error_message: string | null;
        flow_id: string;
        id: string;
        last_attempt_at: string | null;
        max_attempts: number;
        message_id: string | null;
        profile_id: string;
        provider: string | null;
        scheduled_for: string;
        sent_at: string | null;
        status: string;
        step_index: number;
        updated_at: string | null;
        };
        Insert: {
        attempts?: number;
        created_at?: string;
        email_data?: Json;
        enrollment_id: string;
        error_message?: string;
        flow_id: string;
        id?: string;
        last_attempt_at?: string;
        max_attempts?: number;
        message_id?: string;
        profile_id: string;
        provider?: string;
        scheduled_for: string;
        sent_at?: string;
        status?: string;
        step_index?: number;
        updated_at?: string;
        };
        Update: {
        attempts?: number;
        created_at?: string | null;
        email_data?: Json;
        enrollment_id?: string;
        error_message?: string | null;
        flow_id?: string;
        id?: string;
        last_attempt_at?: string | null;
        max_attempts?: number;
        message_id?: string | null;
        profile_id?: string;
        provider?: string | null;
        scheduled_for?: string;
        sent_at?: string | null;
        status?: string;
        step_index?: number;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      email_bounce_events: {
        Row: {
        bounce_category: string | null;
        bounce_type: string | null;
        created_at: string | null;
        email: string;
        event_type: string;
        id: string;
        message_id: string | null;
        processed_at: string | null;
        provider: string;
        raw_payload: Json | null;
        };
        Insert: {
        bounce_category?: string;
        bounce_type?: string;
        created_at?: string;
        email: string;
        event_type: string;
        id?: string;
        message_id?: string;
        processed_at?: string;
        provider: string;
        raw_payload?: Json;
        };
        Update: {
        bounce_category?: string | null;
        bounce_type?: string | null;
        created_at?: string | null;
        email?: string;
        event_type?: string;
        id?: string;
        message_id?: string | null;
        processed_at?: string | null;
        provider?: string;
        raw_payload?: Json | null;
        };
        Relationships: [];
      },
      email_circuit_breaker_state: {
        Row: {
        consecutive_successes: number;
        created_at: string;
        failures: number;
        last_failure_time: string | null;
        next_retry_time: string | null;
        organization_id: string;
        provider: string;
        state: string;
        updated_at: string;
        };
        Insert: {
        consecutive_successes?: number;
        created_at?: string;
        failures?: number;
        last_failure_time?: string;
        next_retry_time?: string;
        organization_id: string;
        provider: string;
        state?: string;
        updated_at?: string;
        };
        Update: {
        consecutive_successes?: number;
        created_at?: string;
        failures?: number;
        last_failure_time?: string | null;
        next_retry_time?: string | null;
        organization_id?: string;
        provider?: string;
        state?: string;
        updated_at?: string;
        };
        Relationships: [];
      },
      email_dead_letter_queue: {
        Row: {
        created_at: string | null;
        email_type: string;
        failed_providers: Array<string> | null;
        failure_reason: string;
        first_attempt_at: string | null;
        id: string;
        last_attempt_at: string | null;
        last_error: string | null;
        metadata: Json | null;
        moved_to_dlq_at: string | null;
        original_queue_id: string | null;
        recipient_email: string;
        recipient_id: string | null;
        template_data: Json;
        template_name: string;
        total_attempts: number;
        updated_at: string | null;
        };
        Insert: {
        created_at?: string;
        email_type: string;
        failed_providers?: Array<string>;
        failure_reason: string;
        first_attempt_at?: string;
        id?: string;
        last_attempt_at?: string;
        last_error?: string;
        metadata?: Json;
        moved_to_dlq_at?: string;
        original_queue_id?: string;
        recipient_email: string;
        recipient_id?: string;
        template_data?: Json;
        template_name: string;
        total_attempts?: number;
        updated_at?: string;
        };
        Update: {
        created_at?: string | null;
        email_type?: string;
        failed_providers?: Array<string> | null;
        failure_reason?: string;
        first_attempt_at?: string | null;
        id?: string;
        last_attempt_at?: string | null;
        last_error?: string | null;
        metadata?: Json | null;
        moved_to_dlq_at?: string | null;
        original_queue_id?: string | null;
        recipient_email?: string;
        recipient_id?: string | null;
        template_data?: Json;
        template_name?: string;
        total_attempts?: number;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      email_delivery_log: {
        Row: {
        campaign_id: string | null;
        clicked_at: string | null;
        created_at: string;
        delivered_at: string | null;
        email_type: string;
        error_code: string | null;
        error_message: string | null;
        id: string;
        message_id: string | null;
        metadata: Json;
        opened_at: string | null;
        provider: string | null;
        queued_at: string;
        retry_count: number;
        sent_at: string | null;
        status: string;
        template_slug: string | null;
        updated_at: string;
        user_id: string;
        };
        Insert: {
        campaign_id?: string;
        clicked_at?: string;
        created_at?: string;
        delivered_at?: string;
        email_type: string;
        error_code?: string;
        error_message?: string;
        id?: string;
        message_id?: string;
        metadata?: Json;
        opened_at?: string;
        provider?: string;
        queued_at?: string;
        retry_count?: number;
        sent_at?: string;
        status?: string;
        template_slug?: string;
        updated_at?: string;
        user_id: string;
        };
        Update: {
        campaign_id?: string | null;
        clicked_at?: string | null;
        created_at?: string;
        delivered_at?: string | null;
        email_type?: string;
        error_code?: string | null;
        error_message?: string | null;
        id?: string;
        message_id?: string | null;
        metadata?: Json;
        opened_at?: string | null;
        provider?: string | null;
        queued_at?: string;
        retry_count?: number;
        sent_at?: string | null;
        status?: string;
        template_slug?: string | null;
        updated_at?: string;
        user_id?: string;
        };
        Relationships: [];
      },
      email_health_events: {
        Row: {
        created_at: string;
        event_type: string;
        id: number;
        message: string;
        metadata: Json | null;
        provider: string | null;
        severity: string;
        };
        Insert: {
        created_at?: string;
        event_type: string;
        id?: number;
        message: string;
        metadata?: Json;
        provider?: string;
        severity?: string;
        };
        Update: {
        created_at?: string;
        event_type?: string;
        id?: number;
        message?: string;
        metadata?: Json | null;
        provider?: string | null;
        severity?: string;
        };
        Relationships: [];
      },
      email_logs: {
        Row: {
        created_at: string | null;
        email_type: string;
        error_message: string | null;
        id: string;
        provider: string;
        provider_message_id: string | null;
        recipient_email: string;
        recipient_id: string | null;
        sent_at: string | null;
        status: string | null;
        subject: string;
        template_data: Json | null;
        };
        Insert: {
        created_at?: string;
        email_type: string;
        error_message?: string;
        id?: string;
        provider: string;
        provider_message_id?: string;
        recipient_email: string;
        recipient_id?: string;
        sent_at?: string;
        status?: string;
        subject: string;
        template_data?: Json;
        };
        Update: {
        created_at?: string | null;
        email_type?: string;
        error_message?: string | null;
        id?: string;
        provider?: string;
        provider_message_id?: string | null;
        recipient_email?: string;
        recipient_id?: string | null;
        sent_at?: string | null;
        status?: string | null;
        subject?: string;
        template_data?: Json | null;
        };
        Relationships: [];
      },
      email_preferences: {
        Row: {
        chat_notifications: boolean | null;
        created_at: string | null;
        feedback_notifications: boolean | null;
        food_listings_notifications: boolean | null;
        id: string;
        notification_frequency: string | null;
        profile_id: string;
        quiet_hours_end: string | null;
        quiet_hours_start: string | null;
        review_reminders: boolean | null;
        updated_at: string | null;
        };
        Insert: {
        chat_notifications?: boolean;
        created_at?: string;
        feedback_notifications?: boolean;
        food_listings_notifications?: boolean;
        id?: string;
        notification_frequency?: string;
        profile_id: string;
        quiet_hours_end?: string;
        quiet_hours_start?: string;
        review_reminders?: boolean;
        updated_at?: string;
        };
        Update: {
        chat_notifications?: boolean | null;
        created_at?: string | null;
        feedback_notifications?: boolean | null;
        food_listings_notifications?: boolean | null;
        id?: string;
        notification_frequency?: string | null;
        profile_id?: string;
        quiet_hours_end?: string | null;
        quiet_hours_start?: string | null;
        review_reminders?: boolean | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      email_provider_health_history: {
        Row: {
        average_latency_ms: number;
        created_at: string | null;
        failed_requests: number;
        health_score: number;
        id: string;
        provider: string;
        snapshot_at: string | null;
        success_rate: number;
        successful_requests: number;
        total_requests: number;
        };
        Insert: {
        average_latency_ms: number;
        created_at?: string;
        failed_requests: number;
        health_score: number;
        id?: string;
        provider: string;
        snapshot_at?: string;
        success_rate: number;
        successful_requests: number;
        total_requests: number;
        };
        Update: {
        average_latency_ms?: number;
        created_at?: string | null;
        failed_requests?: number;
        health_score?: number;
        id?: string;
        provider?: string;
        snapshot_at?: string | null;
        success_rate?: number;
        successful_requests?: number;
        total_requests?: number;
        };
        Relationships: [];
      },
      email_provider_health_metrics: {
        Row: {
        average_latency_ms: number;
        circuit_state: string | null;
        consecutive_failures: number;
        created_at: string;
        daily_quota_limit: number;
        daily_quota_used: number;
        emails_bounced: number;
        emails_clicked: number;
        emails_complained: number;
        emails_delivered: number;
        emails_opened: number;
        failed_requests: number;
        health_score: number;
        id: string;
        last_failure_at: string | null;
        last_success_at: string | null;
        last_synced_at: string | null;
        last_updated: string;
        monthly_quota_limit: number;
        monthly_quota_used: number;
        provider: string;
        successful_requests: number;
        total_requests: number;
        };
        Insert: {
        average_latency_ms?: number;
        circuit_state?: string;
        consecutive_failures?: number;
        created_at?: string;
        daily_quota_limit?: number;
        daily_quota_used?: number;
        emails_bounced?: number;
        emails_clicked?: number;
        emails_complained?: number;
        emails_delivered?: number;
        emails_opened?: number;
        failed_requests?: number;
        health_score?: number;
        id?: string;
        last_failure_at?: string;
        last_success_at?: string;
        last_synced_at?: string;
        last_updated?: string;
        monthly_quota_limit?: number;
        monthly_quota_used?: number;
        provider: string;
        successful_requests?: number;
        total_requests?: number;
        };
        Update: {
        average_latency_ms?: number;
        circuit_state?: string | null;
        consecutive_failures?: number;
        created_at?: string;
        daily_quota_limit?: number;
        daily_quota_used?: number;
        emails_bounced?: number;
        emails_clicked?: number;
        emails_complained?: number;
        emails_delivered?: number;
        emails_opened?: number;
        failed_requests?: number;
        health_score?: number;
        id?: string;
        last_failure_at?: string | null;
        last_success_at?: string | null;
        last_synced_at?: string | null;
        last_updated?: string;
        monthly_quota_limit?: number;
        monthly_quota_used?: number;
        provider?: string;
        successful_requests?: number;
        total_requests?: number;
        };
        Relationships: [];
      },
      email_provider_metrics: {
        Row: {
        average_latency_ms: number | null;
        created_at: string;
        date: string;
        failure_count: number;
        id: number;
        provider: string;
        success_count: number;
        success_rate: number | null;
        total_latency_ms: number;
        total_requests: number;
        updated_at: string;
        };
        Insert: {
        average_latency_ms?: number;
        created_at?: string;
        date?: string;
        failure_count?: number;
        id?: number;
        provider: string;
        success_count?: number;
        success_rate?: number;
        total_latency_ms?: number;
        total_requests?: number;
        updated_at?: string;
        };
        Update: {
        average_latency_ms?: number | null;
        created_at?: string;
        date?: string;
        failure_count?: number;
        id?: number;
        provider?: string;
        success_count?: number;
        success_rate?: number | null;
        total_latency_ms?: number;
        total_requests?: number;
        updated_at?: string;
        };
        Relationships: [];
      },
      email_provider_monthly_quota: {
        Row: {
        created_at: string | null;
        emails_sent: number;
        id: string;
        monthly_limit: number;
        organization_id: string;
        provider: string;
        updated_at: string | null;
        year_month: string;
        };
        Insert: {
        created_at?: string;
        emails_sent?: number;
        id?: string;
        monthly_limit: number;
        organization_id?: string;
        provider: string;
        updated_at?: string;
        year_month: string;
        };
        Update: {
        created_at?: string | null;
        emails_sent?: number;
        id?: string;
        monthly_limit?: number;
        organization_id?: string;
        provider?: string;
        updated_at?: string | null;
        year_month?: string;
        };
        Relationships: [];
      },
      email_provider_quota: {
        Row: {
        created_at: string | null;
        daily_limit: number;
        date: string;
        emails_sent: number | null;
        id: string;
        monthly_limit: number;
        organization_id: string;
        provider: string;
        updated_at: string | null;
        };
        Insert: {
        created_at?: string;
        daily_limit: number;
        date?: string;
        emails_sent?: number;
        id?: string;
        monthly_limit?: number;
        organization_id: string;
        provider: string;
        updated_at?: string;
        };
        Update: {
        created_at?: string | null;
        daily_limit?: number;
        date?: string;
        emails_sent?: number | null;
        id?: string;
        monthly_limit?: number;
        organization_id?: string;
        provider?: string;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      email_provider_stats: {
        Row: {
        avg_latency_ms: number;
        created_at: string;
        daily_quota_limit: number;
        date: string;
        emails_bounced: number;
        emails_clicked: number;
        emails_complained: number;
        emails_delivered: number;
        emails_opened: number;
        emails_sent: number;
        id: string;
        monthly_quota_limit: number;
        provider: string;
        requests_failed: number;
        requests_success: number;
        requests_total: number;
        total_latency_ms: number;
        updated_at: string;
        };
        Insert: {
        avg_latency_ms?: number;
        created_at?: string;
        daily_quota_limit?: number;
        date?: string;
        emails_bounced?: number;
        emails_clicked?: number;
        emails_complained?: number;
        emails_delivered?: number;
        emails_opened?: number;
        emails_sent?: number;
        id?: string;
        monthly_quota_limit?: number;
        provider: string;
        requests_failed?: number;
        requests_success?: number;
        requests_total?: number;
        total_latency_ms?: number;
        updated_at?: string;
        };
        Update: {
        avg_latency_ms?: number;
        created_at?: string;
        daily_quota_limit?: number;
        date?: string;
        emails_bounced?: number;
        emails_clicked?: number;
        emails_complained?: number;
        emails_delivered?: number;
        emails_opened?: number;
        emails_sent?: number;
        id?: string;
        monthly_quota_limit?: number;
        provider?: string;
        requests_failed?: number;
        requests_success?: number;
        requests_total?: number;
        total_latency_ms?: number;
        updated_at?: string;
        };
        Relationships: [];
      },
      email_queue: {
        Row: {
        attempts: number | null;
        created_at: string | null;
        email_type: string;
        id: string;
        last_error: string | null;
        max_attempts: number | null;
        next_retry_at: string | null;
        recipient_email: string;
        recipient_id: string | null;
        status: string | null;
        template_data: Json;
        template_name: string;
        updated_at: string | null;
        };
        Insert: {
        attempts?: number;
        created_at?: string;
        email_type: string;
        id?: string;
        last_error?: string;
        max_attempts?: number;
        next_retry_at?: string;
        recipient_email: string;
        recipient_id?: string;
        status?: string;
        template_data?: Json;
        template_name: string;
        updated_at?: string;
        };
        Update: {
        attempts?: number | null;
        created_at?: string | null;
        email_type?: string;
        id?: string;
        last_error?: string | null;
        max_attempts?: number | null;
        next_retry_at?: string | null;
        recipient_email?: string;
        recipient_id?: string | null;
        status?: string | null;
        template_data?: Json;
        template_name?: string;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      email_suppression_list: {
        Row: {
        bounce_subtype: string | null;
        bounce_type: string | null;
        created_at: string | null;
        email: string;
        expires_at: string | null;
        id: string;
        metadata: Json | null;
        original_message_id: string | null;
        provider: string | null;
        reason: string;
        suppressed_at: string | null;
        };
        Insert: {
        bounce_subtype?: string;
        bounce_type?: string;
        created_at?: string;
        email: string;
        expires_at?: string;
        id?: string;
        metadata?: Json;
        original_message_id?: string;
        provider?: string;
        reason: string;
        suppressed_at?: string;
        };
        Update: {
        bounce_subtype?: string | null;
        bounce_type?: string | null;
        created_at?: string | null;
        email?: string;
        expires_at?: string | null;
        id?: string;
        metadata?: Json | null;
        original_message_id?: string | null;
        provider?: string | null;
        reason?: string;
        suppressed_at?: string | null;
        };
        Relationships: [];
      },
      email_suppressions: {
        Row: {
        created_at: string;
        email: string;
        expires_at: string | null;
        id: string;
        reason: string;
        source: string | null;
        };
        Insert: {
        created_at?: string;
        email: string;
        expires_at?: string;
        id?: string;
        reason: string;
        source?: string;
        };
        Update: {
        created_at?: string;
        email?: string;
        expires_at?: string | null;
        id?: string;
        reason?: string;
        source?: string | null;
        };
        Relationships: [];
      },
      email_template_versions: {
        Row: {
        change_reason: string | null;
        changed_at: string | null;
        changed_by: string | null;
        html_content: string;
        id: string;
        subject: string;
        template_id: string | null;
        text_content: string | null;
        variables: Json | null;
        version: number;
        };
        Insert: {
        change_reason?: string;
        changed_at?: string;
        changed_by?: string;
        html_content: string;
        id?: string;
        subject: string;
        template_id?: string;
        text_content?: string;
        variables?: Json;
        version: number;
        };
        Update: {
        change_reason?: string | null;
        changed_at?: string | null;
        changed_by?: string | null;
        html_content?: string;
        id?: string;
        subject?: string;
        template_id?: string | null;
        text_content?: string | null;
        variables?: Json | null;
        version?: number;
        };
        Relationships: [];
      },
      email_templates: {
        Row: {
        category: string;
        created_at: string | null;
        created_by: string | null;
        html_content: string;
        id: string;
        is_active: boolean | null;
        metadata: Json | null;
        name: string;
        slug: string;
        subject: string;
        text_content: string | null;
        updated_at: string | null;
        updated_by: string | null;
        variables: Json | null;
        version: number | null;
        };
        Insert: {
        category?: string;
        created_at?: string;
        created_by?: string;
        html_content: string;
        id?: string;
        is_active?: boolean;
        metadata?: Json;
        name: string;
        slug: string;
        subject: string;
        text_content?: string;
        updated_at?: string;
        updated_by?: string;
        variables?: Json;
        version?: number;
        };
        Update: {
        category?: string;
        created_at?: string | null;
        created_by?: string | null;
        html_content?: string;
        id?: string;
        is_active?: boolean | null;
        metadata?: Json | null;
        name?: string;
        slug?: string;
        subject?: string;
        text_content?: string | null;
        updated_at?: string | null;
        updated_by?: string | null;
        variables?: Json | null;
        version?: number | null;
        };
        Relationships: [];
      },
      experiment_assignments: {
        Row: {
        assigned_at: string;
        experiment_key: string;
        user_id: string;
        variant_id: string;
        };
        Insert: {
        assigned_at?: string;
        experiment_key: string;
        user_id: string;
        variant_id: string;
        };
        Update: {
        assigned_at?: string;
        experiment_key?: string;
        user_id?: string;
        variant_id?: string;
        };
        Relationships: [];
      },
      experiments: {
        Row: {
        created_at: string;
        description: string | null;
        end_date: string | null;
        hypothesis: string | null;
        id: string;
        key: string;
        name: string;
        primary_metric: string | null;
        results: Json | null;
        sample_percentage: number | null;
        secondary_metrics: Array<string> | null;
        start_date: string | null;
        status: string;
        target_platforms: Array<string> | null;
        updated_at: string;
        user_segments: Array<string> | null;
        variants: Json;
        winner_variant: string | null;
        };
        Insert: {
        created_at?: string;
        description?: string;
        end_date?: string;
        hypothesis?: string;
        id?: string;
        key: string;
        name: string;
        primary_metric?: string;
        results?: Json;
        sample_percentage?: number;
        secondary_metrics?: Array<string>;
        start_date?: string;
        status?: string;
        target_platforms?: Array<string>;
        updated_at?: string;
        user_segments?: Array<string>;
        variants?: Json;
        winner_variant?: string;
        };
        Update: {
        created_at?: string;
        description?: string | null;
        end_date?: string | null;
        hypothesis?: string | null;
        id?: string;
        key?: string;
        name?: string;
        primary_metric?: string | null;
        results?: Json | null;
        sample_percentage?: number | null;
        secondary_metrics?: Array<string> | null;
        start_date?: string | null;
        status?: string;
        target_platforms?: Array<string> | null;
        updated_at?: string;
        user_segments?: Array<string> | null;
        variants?: Json;
        winner_variant?: string | null;
        };
        Relationships: [];
      },
      feature_flag_overrides: {
        Row: {
        created_at: string;
        created_by: string | null;
        enabled: boolean;
        expires_at: string | null;
        flag_key: string;
        reason: string | null;
        user_id: string;
        };
        Insert: {
        created_at?: string;
        created_by?: string;
        enabled: boolean;
        expires_at?: string;
        flag_key: string;
        reason?: string;
        user_id: string;
        };
        Update: {
        created_at?: string;
        created_by?: string | null;
        enabled?: boolean;
        expires_at?: string | null;
        flag_key?: string;
        reason?: string | null;
        user_id?: string;
        };
        Relationships: [];
      },
      feature_flags: {
        Row: {
        config: Json | null;
        created_at: string;
        created_by: string | null;
        description: string | null;
        disabled_at: string | null;
        display_name: string;
        enabled: boolean;
        enabled_at: string | null;
        expires_at: string | null;
        flag_key: string;
        id: string;
        metadata: Json;
        min_app_version: Json | null;
        rollout_percentage: number;
        target_platforms: Array<string> | null;
        target_segments: Array<string> | null;
        updated_at: string;
        };
        Insert: {
        config?: Json;
        created_at?: string;
        created_by?: string;
        description?: string;
        disabled_at?: string;
        display_name: string;
        enabled?: boolean;
        enabled_at?: string;
        expires_at?: string;
        flag_key: string;
        id?: string;
        metadata?: Json;
        min_app_version?: Json;
        rollout_percentage?: number;
        target_platforms?: Array<string>;
        target_segments?: Array<string>;
        updated_at?: string;
        };
        Update: {
        config?: Json | null;
        created_at?: string;
        created_by?: string | null;
        description?: string | null;
        disabled_at?: string | null;
        display_name?: string;
        enabled?: boolean;
        enabled_at?: string | null;
        expires_at?: string | null;
        flag_key?: string;
        id?: string;
        metadata?: Json;
        min_app_version?: Json | null;
        rollout_percentage?: number;
        target_platforms?: Array<string> | null;
        target_segments?: Array<string> | null;
        updated_at?: string;
        };
        Relationships: [];
      },
      feedback: {
        Row: {
        created_at: string | null;
        email: string;
        feedback_type: string | null;
        id: string;
        message: string;
        name: string;
        profile_id: string | null;
        status: string | null;
        subject: string;
        updated_at: string | null;
        };
        Insert: {
        created_at?: string;
        email: string;
        feedback_type?: string;
        id?: string;
        message: string;
        name: string;
        profile_id?: string;
        status?: string;
        subject: string;
        updated_at?: string;
        };
        Update: {
        created_at?: string | null;
        email?: string;
        feedback_type?: string | null;
        id?: string;
        message?: string;
        name?: string;
        profile_id?: string | null;
        status?: string | null;
        subject?: string;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      forms: {
        Row: {
        created_at: string;
        id: number;
        };
        Insert: {
        created_at?: string;
        id: number;
        };
        Update: {
        created_at?: string;
        id?: number;
        };
        Relationships: [];
      },
      forum: {
        Row: {
        best_answer_id: number | null;
        category_id: number | null;
        deleted_at: string | null;
        featured_at: string | null;
        featured_by: string | null;
        featured_until: string | null;
        forum_comments_counter: number | null;
        forum_likes_counter: number;
        forum_post_created_at: string;
        forum_post_description: string | null;
        forum_post_image: string | null;
        forum_post_name: string | null;
        forum_post_updated_at: string;
        forum_published: boolean;
        hot_score: number | null;
        id: number;
        is_edited: boolean | null;
        is_featured: boolean | null;
        is_locked: boolean | null;
        is_pinned: boolean | null;
        last_activity_at: string | null;
        post_type: string | null;
        profile_id: string;
        reactions_count: Json | null;
        reports_count: number | null;
        rich_content: Json | null;
        search_vector: string | null;
        series_id: string | null;
        series_order: number | null;
        slug: string | null;
        views_count: number | null;
        };
        Insert: {
        best_answer_id?: number;
        category_id?: number;
        deleted_at?: string;
        featured_at?: string;
        featured_by?: string;
        featured_until?: string;
        forum_comments_counter?: number;
        forum_likes_counter?: number;
        forum_post_created_at?: string;
        forum_post_description?: string;
        forum_post_image?: string;
        forum_post_name?: string;
        forum_post_updated_at?: string;
        forum_published?: boolean;
        hot_score?: number;
        id: number;
        is_edited?: boolean;
        is_featured?: boolean;
        is_locked?: boolean;
        is_pinned?: boolean;
        last_activity_at?: string;
        post_type?: string;
        profile_id: string;
        reactions_count?: Json;
        reports_count?: number;
        rich_content?: Json;
        search_vector?: string;
        series_id?: string;
        series_order?: number;
        slug?: string;
        views_count?: number;
        };
        Update: {
        best_answer_id?: number | null;
        category_id?: number | null;
        deleted_at?: string | null;
        featured_at?: string | null;
        featured_by?: string | null;
        featured_until?: string | null;
        forum_comments_counter?: number | null;
        forum_likes_counter?: number;
        forum_post_created_at?: string;
        forum_post_description?: string | null;
        forum_post_image?: string | null;
        forum_post_name?: string | null;
        forum_post_updated_at?: string;
        forum_published?: boolean;
        hot_score?: number | null;
        id?: number;
        is_edited?: boolean | null;
        is_featured?: boolean | null;
        is_locked?: boolean | null;
        is_pinned?: boolean | null;
        last_activity_at?: string | null;
        post_type?: string | null;
        profile_id?: string;
        reactions_count?: Json | null;
        reports_count?: number | null;
        rich_content?: Json | null;
        search_vector?: string | null;
        series_id?: string | null;
        series_order?: number | null;
        slug?: string | null;
        views_count?: number | null;
        };
        Relationships: [];
      },
      forum_activities: {
        Row: {
        activity_type: string;
        created_at: string | null;
        id: string;
        is_public: boolean | null;
        metadata: Json | null;
        profile_id: string;
        target_badge_id: number | null;
        target_comment_id: number | null;
        target_forum_id: number | null;
        target_profile_id: string | null;
        target_series_id: string | null;
        };
        Insert: {
        activity_type: string;
        created_at?: string;
        id?: string;
        is_public?: boolean;
        metadata?: Json;
        profile_id: string;
        target_badge_id?: number;
        target_comment_id?: number;
        target_forum_id?: number;
        target_profile_id?: string;
        target_series_id?: string;
        };
        Update: {
        activity_type?: string;
        created_at?: string | null;
        id?: string;
        is_public?: boolean | null;
        metadata?: Json | null;
        profile_id?: string;
        target_badge_id?: number | null;
        target_comment_id?: number | null;
        target_forum_id?: number | null;
        target_profile_id?: string | null;
        target_series_id?: string | null;
        };
        Relationships: [];
      },
      forum_activity_types: {
        Row: {
        created_at: string | null;
        description: string | null;
        icon_name: string | null;
        id: number;
        is_public: boolean | null;
        name: string;
        };
        Insert: {
        created_at?: string;
        description?: string;
        icon_name?: string;
        id?: number;
        is_public?: boolean;
        name: string;
        };
        Update: {
        created_at?: string | null;
        description?: string | null;
        icon_name?: string | null;
        id?: number;
        is_public?: boolean | null;
        name?: string;
        };
        Relationships: [];
      },
      forum_announcement_analytics: {
        Row: {
        announcement_id: string;
        created_at: string | null;
        event_data: Json | null;
        event_type: string;
        id: string;
        page_url: string | null;
        profile_id: string | null;
        };
        Insert: {
        announcement_id: string;
        created_at?: string;
        event_data?: Json;
        event_type: string;
        id?: string;
        page_url?: string;
        profile_id?: string;
        };
        Update: {
        announcement_id?: string;
        created_at?: string | null;
        event_data?: Json | null;
        event_type?: string;
        id?: string;
        page_url?: string | null;
        profile_id?: string | null;
        };
        Relationships: [];
      },
      forum_announcement_dismissals: {
        Row: {
        announcement_id: string;
        dismissed_at: string | null;
        id: string;
        profile_id: string;
        };
        Insert: {
        announcement_id: string;
        dismissed_at?: string;
        id?: string;
        profile_id: string;
        };
        Update: {
        announcement_id?: string;
        dismissed_at?: string | null;
        id?: string;
        profile_id?: string;
        };
        Relationships: [];
      },
      forum_announcements: {
        Row: {
        announcement_type: string | null;
        background_color: string | null;
        clicks_count: number | null;
        content: string;
        created_at: string | null;
        created_by: string;
        cta_style: string | null;
        cta_text: string | null;
        cta_url: string | null;
        dismissals_count: number | null;
        display_location: string | null;
        ends_at: string | null;
        icon_name: string | null;
        id: string;
        is_active: boolean | null;
        is_dismissible: boolean | null;
        is_pinned: boolean | null;
        is_published: boolean | null;
        priority: number | null;
        rich_content: Json | null;
        starts_at: string | null;
        target_category_id: number | null;
        target_segment: Json | null;
        target_trust_levels: Array<number> | null;
        target_type: string | null;
        text_color: string | null;
        title: string;
        updated_at: string | null;
        updated_by: string | null;
        views_count: number | null;
        };
        Insert: {
        announcement_type?: string;
        background_color?: string;
        clicks_count?: number;
        content: string;
        created_at?: string;
        created_by: string;
        cta_style?: string;
        cta_text?: string;
        cta_url?: string;
        dismissals_count?: number;
        display_location?: string;
        ends_at?: string;
        icon_name?: string;
        id?: string;
        is_active?: boolean;
        is_dismissible?: boolean;
        is_pinned?: boolean;
        is_published?: boolean;
        priority?: number;
        rich_content?: Json;
        starts_at?: string;
        target_category_id?: number;
        target_segment?: Json;
        target_trust_levels?: Array<number>;
        target_type?: string;
        text_color?: string;
        title: string;
        updated_at?: string;
        updated_by?: string;
        views_count?: number;
        };
        Update: {
        announcement_type?: string | null;
        background_color?: string | null;
        clicks_count?: number | null;
        content?: string;
        created_at?: string | null;
        created_by?: string;
        cta_style?: string | null;
        cta_text?: string | null;
        cta_url?: string | null;
        dismissals_count?: number | null;
        display_location?: string | null;
        ends_at?: string | null;
        icon_name?: string | null;
        id?: string;
        is_active?: boolean | null;
        is_dismissible?: boolean | null;
        is_pinned?: boolean | null;
        is_published?: boolean | null;
        priority?: number | null;
        rich_content?: Json | null;
        starts_at?: string | null;
        target_category_id?: number | null;
        target_segment?: Json | null;
        target_trust_levels?: Array<number> | null;
        target_type?: string | null;
        text_color?: string | null;
        title?: string;
        updated_at?: string | null;
        updated_by?: string | null;
        views_count?: number | null;
        };
        Relationships: [];
      },
      forum_author_analytics: {
        Row: {
        created_at: string | null;
        date: string;
        engagement_rate: number | null;
        id: string;
        new_posts_count: number | null;
        profile_id: string;
        top_post_id: number | null;
        total_comments: number | null;
        total_followers_gained: number | null;
        total_followers_lost: number | null;
        total_likes: number | null;
        total_reactions: number | null;
        total_views: number | null;
        };
        Insert: {
        created_at?: string;
        date?: string;
        engagement_rate?: number;
        id?: string;
        new_posts_count?: number;
        profile_id: string;
        top_post_id?: number;
        total_comments?: number;
        total_followers_gained?: number;
        total_followers_lost?: number;
        total_likes?: number;
        total_reactions?: number;
        total_views?: number;
        };
        Update: {
        created_at?: string | null;
        date?: string;
        engagement_rate?: number | null;
        id?: string;
        new_posts_count?: number | null;
        profile_id?: string;
        top_post_id?: number | null;
        total_comments?: number | null;
        total_followers_gained?: number | null;
        total_followers_lost?: number | null;
        total_likes?: number | null;
        total_reactions?: number | null;
        total_views?: number | null;
        };
        Relationships: [];
      },
      forum_badges: {
        Row: {
        badge_type: string;
        color: string | null;
        created_at: string | null;
        criteria: Json | null;
        description: string;
        icon_name: string | null;
        id: number;
        is_active: boolean | null;
        name: string;
        points: number | null;
        slug: string;
        };
        Insert: {
        badge_type: string;
        color?: string;
        created_at?: string;
        criteria?: Json;
        description: string;
        icon_name?: string;
        id?: number;
        is_active?: boolean;
        name: string;
        points?: number;
        slug: string;
        };
        Update: {
        badge_type?: string;
        color?: string | null;
        created_at?: string | null;
        criteria?: Json | null;
        description?: string;
        icon_name?: string | null;
        id?: number;
        is_active?: boolean | null;
        name?: string;
        points?: number | null;
        slug?: string;
        };
        Relationships: [];
      },
      forum_bookmark_collections: {
        Row: {
        bookmarks_count: number | null;
        color: string | null;
        created_at: string | null;
        description: string | null;
        icon_name: string | null;
        id: string;
        is_default: boolean | null;
        is_private: boolean | null;
        name: string;
        profile_id: string;
        sort_order: number | null;
        updated_at: string | null;
        };
        Insert: {
        bookmarks_count?: number;
        color?: string;
        created_at?: string;
        description?: string;
        icon_name?: string;
        id?: string;
        is_default?: boolean;
        is_private?: boolean;
        name: string;
        profile_id: string;
        sort_order?: number;
        updated_at?: string;
        };
        Update: {
        bookmarks_count?: number | null;
        color?: string | null;
        created_at?: string | null;
        description?: string | null;
        icon_name?: string | null;
        id?: string;
        is_default?: boolean | null;
        is_private?: boolean | null;
        name?: string;
        profile_id?: string;
        sort_order?: number | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      forum_categories: {
        Row: {
        color: string | null;
        created_at: string | null;
        description: string | null;
        icon_name: string | null;
        id: number;
        is_active: boolean | null;
        name: string;
        posts_count: number | null;
        slug: string;
        sort_order: number | null;
        updated_at: string | null;
        };
        Insert: {
        color?: string;
        created_at?: string;
        description?: string;
        icon_name?: string;
        id?: number;
        is_active?: boolean;
        name: string;
        posts_count?: number;
        slug: string;
        sort_order?: number;
        updated_at?: string;
        };
        Update: {
        color?: string | null;
        created_at?: string | null;
        description?: string | null;
        icon_name?: string | null;
        id?: number;
        is_active?: boolean | null;
        name?: string;
        posts_count?: number | null;
        slug?: string;
        sort_order?: number | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      forum_comment_history: {
        Row: {
        comment_id: number;
        created_at: string | null;
        edit_reason: string | null;
        editor_id: string;
        id: string;
        previous_content: string | null;
        };
        Insert: {
        comment_id: number;
        created_at?: string;
        edit_reason?: string;
        editor_id: string;
        id?: string;
        previous_content?: string;
        };
        Update: {
        comment_id?: number;
        created_at?: string | null;
        edit_reason?: string | null;
        editor_id?: string;
        id?: string;
        previous_content?: string | null;
        };
        Relationships: [];
      },
      forum_comment_reactions: {
        Row: {
        comment_id: number;
        created_at: string | null;
        id: string;
        profile_id: string;
        reaction_type_id: number;
        };
        Insert: {
        comment_id: number;
        created_at?: string;
        id?: string;
        profile_id: string;
        reaction_type_id: number;
        };
        Update: {
        comment_id?: number;
        created_at?: string | null;
        id?: string;
        profile_id?: string;
        reaction_type_id?: number;
        };
        Relationships: [];
      },
      forum_content_experiments: {
        Row: {
        created_at: string | null;
        ended_at: string | null;
        experiment_type: string;
        forum_id: number;
        id: string;
        is_active: boolean | null;
        started_at: string | null;
        variant_a: string;
        variant_a_clicks: number | null;
        variant_a_views: number | null;
        variant_b: string;
        variant_b_clicks: number | null;
        variant_b_views: number | null;
        winning_variant: string | null;
        };
        Insert: {
        created_at?: string;
        ended_at?: string;
        experiment_type: string;
        forum_id: number;
        id?: string;
        is_active?: boolean;
        started_at?: string;
        variant_a: string;
        variant_a_clicks?: number;
        variant_a_views?: number;
        variant_b: string;
        variant_b_clicks?: number;
        variant_b_views?: number;
        winning_variant?: string;
        };
        Update: {
        created_at?: string | null;
        ended_at?: string | null;
        experiment_type?: string;
        forum_id?: number;
        id?: string;
        is_active?: boolean | null;
        started_at?: string | null;
        variant_a?: string;
        variant_a_clicks?: number | null;
        variant_a_views?: number | null;
        variant_b?: string;
        variant_b_clicks?: number | null;
        variant_b_views?: number | null;
        winning_variant?: string | null;
        };
        Relationships: [];
      },
      forum_conversation_participants: {
        Row: {
        conversation_id: string;
        id: string;
        is_muted: boolean | null;
        joined_at: string | null;
        last_read_at: string | null;
        left_at: string | null;
        muted_until: string | null;
        nickname: string | null;
        profile_id: string;
        role: string | null;
        };
        Insert: {
        conversation_id: string;
        id?: string;
        is_muted?: boolean;
        joined_at?: string;
        last_read_at?: string;
        left_at?: string;
        muted_until?: string;
        nickname?: string;
        profile_id: string;
        role?: string;
        };
        Update: {
        conversation_id?: string;
        id?: string;
        is_muted?: boolean | null;
        joined_at?: string | null;
        last_read_at?: string | null;
        left_at?: string | null;
        muted_until?: string | null;
        nickname?: string | null;
        profile_id?: string;
        role?: string | null;
        };
        Relationships: [];
      },
      forum_conversations: {
        Row: {
        created_at: string | null;
        created_by: string | null;
        id: string;
        is_archived: boolean | null;
        is_group: boolean | null;
        last_message_at: string | null;
        last_message_preview: string | null;
        metadata: Json | null;
        title: string | null;
        updated_at: string | null;
        };
        Insert: {
        created_at?: string;
        created_by?: string;
        id?: string;
        is_archived?: boolean;
        is_group?: boolean;
        last_message_at?: string;
        last_message_preview?: string;
        metadata?: Json;
        title?: string;
        updated_at?: string;
        };
        Update: {
        created_at?: string | null;
        created_by?: string | null;
        id?: string;
        is_archived?: boolean | null;
        is_group?: boolean | null;
        last_message_at?: string | null;
        last_message_preview?: string | null;
        metadata?: Json | null;
        title?: string | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      forum_drafts: {
        Row: {
        category_id: number | null;
        created_at: string | null;
        description: string | null;
        id: string;
        image_url: string | null;
        last_saved_at: string | null;
        poll_data: Json | null;
        post_type: string | null;
        profile_id: string;
        rich_content: Json | null;
        tags: Array<number> | null;
        title: string | null;
        };
        Insert: {
        category_id?: number;
        created_at?: string;
        description?: string;
        id?: string;
        image_url?: string;
        last_saved_at?: string;
        poll_data?: Json;
        post_type?: string;
        profile_id: string;
        rich_content?: Json;
        tags?: Array<number>;
        title?: string;
        };
        Update: {
        category_id?: number | null;
        created_at?: string | null;
        description?: string | null;
        id?: string;
        image_url?: string | null;
        last_saved_at?: string | null;
        poll_data?: Json | null;
        post_type?: string | null;
        profile_id?: string;
        rich_content?: Json | null;
        tags?: Array<number> | null;
        title?: string | null;
        };
        Relationships: [];
      },
      forum_feed_preferences: {
        Row: {
        compact_view: boolean | null;
        created_at: string | null;
        feed_sort: string | null;
        hide_read_items: boolean | null;
        id: string;
        profile_id: string;
        show_badges: boolean | null;
        show_bookmarks: boolean | null;
        show_comments: boolean | null;
        show_follows: boolean | null;
        show_likes: boolean | null;
        show_polls: boolean | null;
        show_posts: boolean | null;
        show_reactions: boolean | null;
        updated_at: string | null;
        };
        Insert: {
        compact_view?: boolean;
        created_at?: string;
        feed_sort?: string;
        hide_read_items?: boolean;
        id?: string;
        profile_id: string;
        show_badges?: boolean;
        show_bookmarks?: boolean;
        show_comments?: boolean;
        show_follows?: boolean;
        show_likes?: boolean;
        show_polls?: boolean;
        show_posts?: boolean;
        show_reactions?: boolean;
        updated_at?: string;
        };
        Update: {
        compact_view?: boolean | null;
        created_at?: string | null;
        feed_sort?: string | null;
        hide_read_items?: boolean | null;
        id?: string;
        profile_id?: string;
        show_badges?: boolean | null;
        show_bookmarks?: boolean | null;
        show_comments?: boolean | null;
        show_follows?: boolean | null;
        show_likes?: boolean | null;
        show_polls?: boolean | null;
        show_posts?: boolean | null;
        show_reactions?: boolean | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      forum_feed_read_status: {
        Row: {
        activity_id: string;
        id: string;
        profile_id: string;
        read_at: string | null;
        };
        Insert: {
        activity_id: string;
        id?: string;
        profile_id: string;
        read_at?: string;
        };
        Update: {
        activity_id?: string;
        id?: string;
        profile_id?: string;
        read_at?: string | null;
        };
        Relationships: [];
      },
      forum_mentions: {
        Row: {
        comment_id: number | null;
        created_at: string | null;
        forum_id: number | null;
        id: string;
        mentioned_profile_id: string;
        mentioner_profile_id: string;
        };
        Insert: {
        comment_id?: number;
        created_at?: string;
        forum_id?: number;
        id?: string;
        mentioned_profile_id: string;
        mentioner_profile_id: string;
        };
        Update: {
        comment_id?: number | null;
        created_at?: string | null;
        forum_id?: number | null;
        id?: string;
        mentioned_profile_id?: string;
        mentioner_profile_id?: string;
        };
        Relationships: [];
      },
      forum_message_reactions: {
        Row: {
        created_at: string | null;
        id: string;
        message_id: string;
        profile_id: string;
        reaction_type_id: number;
        };
        Insert: {
        created_at?: string;
        id?: string;
        message_id: string;
        profile_id: string;
        reaction_type_id: number;
        };
        Update: {
        created_at?: string | null;
        id?: string;
        message_id?: string;
        profile_id?: string;
        reaction_type_id?: number;
        };
        Relationships: [];
      },
      forum_message_read_receipts: {
        Row: {
        id: string;
        message_id: string;
        profile_id: string;
        read_at: string | null;
        };
        Insert: {
        id?: string;
        message_id: string;
        profile_id: string;
        read_at?: string;
        };
        Update: {
        id?: string;
        message_id?: string;
        profile_id?: string;
        read_at?: string | null;
        };
        Relationships: [];
      },
      forum_messages: {
        Row: {
        content: string | null;
        conversation_id: string;
        created_at: string | null;
        deleted_at: string | null;
        edited_at: string | null;
        id: string;
        is_deleted: boolean | null;
        is_edited: boolean | null;
        message_type: string | null;
        metadata: Json | null;
        reply_to_id: string | null;
        rich_content: Json | null;
        sender_id: string | null;
        };
        Insert: {
        content?: string;
        conversation_id: string;
        created_at?: string;
        deleted_at?: string;
        edited_at?: string;
        id?: string;
        is_deleted?: boolean;
        is_edited?: boolean;
        message_type?: string;
        metadata?: Json;
        reply_to_id?: string;
        rich_content?: Json;
        sender_id?: string;
        };
        Update: {
        content?: string | null;
        conversation_id?: string;
        created_at?: string | null;
        deleted_at?: string | null;
        edited_at?: string | null;
        id?: string;
        is_deleted?: boolean | null;
        is_edited?: boolean | null;
        message_type?: string | null;
        metadata?: Json | null;
        reply_to_id?: string | null;
        rich_content?: Json | null;
        sender_id?: string | null;
        };
        Relationships: [];
      },
      forum_moderation_notes: {
        Row: {
        created_at: string | null;
        id: string;
        is_internal: boolean | null;
        moderator_id: string;
        note: string;
        queue_id: string;
        };
        Insert: {
        created_at?: string;
        id?: string;
        is_internal?: boolean;
        moderator_id: string;
        note: string;
        queue_id: string;
        };
        Update: {
        created_at?: string | null;
        id?: string;
        is_internal?: boolean | null;
        moderator_id?: string;
        note?: string;
        queue_id?: string;
        };
        Relationships: [];
      },
      forum_moderation_queue: {
        Row: {
        assigned_at: string | null;
        assigned_to: string | null;
        comment_id: number | null;
        content_snapshot: Json | null;
        content_type: string;
        created_at: string | null;
        flag_details: Json | null;
        flag_reason: string | null;
        flag_score: number | null;
        forum_id: number | null;
        id: string;
        message_id: string | null;
        priority: number | null;
        profile_id: string | null;
        queue_type: string;
        report_id: string | null;
        reporter_id: string | null;
        resolution: string | null;
        resolution_notes: string | null;
        resolved_at: string | null;
        resolved_by: string | null;
        status: string | null;
        updated_at: string | null;
        };
        Insert: {
        assigned_at?: string;
        assigned_to?: string;
        comment_id?: number;
        content_snapshot?: Json;
        content_type: string;
        created_at?: string;
        flag_details?: Json;
        flag_reason?: string;
        flag_score?: number;
        forum_id?: number;
        id?: string;
        message_id?: string;
        priority?: number;
        profile_id?: string;
        queue_type: string;
        report_id?: string;
        reporter_id?: string;
        resolution?: string;
        resolution_notes?: string;
        resolved_at?: string;
        resolved_by?: string;
        status?: string;
        updated_at?: string;
        };
        Update: {
        assigned_at?: string | null;
        assigned_to?: string | null;
        comment_id?: number | null;
        content_snapshot?: Json | null;
        content_type?: string;
        created_at?: string | null;
        flag_details?: Json | null;
        flag_reason?: string | null;
        flag_score?: number | null;
        forum_id?: number | null;
        id?: string;
        message_id?: string | null;
        priority?: number | null;
        profile_id?: string | null;
        queue_type?: string;
        report_id?: string | null;
        reporter_id?: string | null;
        resolution?: string | null;
        resolution_notes?: string | null;
        resolved_at?: string | null;
        resolved_by?: string | null;
        status?: string | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      forum_moderation_stats: {
        Row: {
        avg_response_time_minutes: number | null;
        bans_issued: number | null;
        date: string;
        id: string;
        items_approved: number | null;
        items_removed: number | null;
        items_reviewed: number | null;
        moderator_id: string;
        warnings_issued: number | null;
        };
        Insert: {
        avg_response_time_minutes?: number;
        bans_issued?: number;
        date?: string;
        id?: string;
        items_approved?: number;
        items_removed?: number;
        items_reviewed?: number;
        moderator_id: string;
        warnings_issued?: number;
        };
        Update: {
        avg_response_time_minutes?: number | null;
        bans_issued?: number | null;
        date?: string;
        id?: string;
        items_approved?: number | null;
        items_removed?: number | null;
        items_reviewed?: number | null;
        moderator_id?: string;
        warnings_issued?: number | null;
        };
        Relationships: [];
      },
      forum_moderator_logs: {
        Row: {
        action_type: string;
        created_at: string | null;
        details: Json | null;
        id: string;
        ip_address: string | null;
        moderator_id: string;
        reason: string | null;
        target_id: string;
        target_profile_id: string | null;
        target_type: string;
        };
        Insert: {
        action_type: string;
        created_at?: string;
        details?: Json;
        id?: string;
        ip_address?: string;
        moderator_id: string;
        reason?: string;
        target_id: string;
        target_profile_id?: string;
        target_type: string;
        };
        Update: {
        action_type?: string;
        created_at?: string | null;
        details?: Json | null;
        id?: string;
        ip_address?: string | null;
        moderator_id?: string;
        reason?: string | null;
        target_id?: string;
        target_profile_id?: string | null;
        target_type?: string;
        };
        Relationships: [];
      },
      forum_notifications: {
        Row: {
        actor_id: string | null;
        comment_id: number | null;
        created_at: string | null;
        data: Json | null;
        forum_id: number | null;
        id: string;
        is_read: boolean | null;
        recipient_id: string;
        type: string;
        };
        Insert: {
        actor_id?: string;
        comment_id?: number;
        created_at?: string;
        data?: Json;
        forum_id?: number;
        id?: string;
        is_read?: boolean;
        recipient_id: string;
        type: string;
        };
        Update: {
        actor_id?: string | null;
        comment_id?: number | null;
        created_at?: string | null;
        data?: Json | null;
        forum_id?: number | null;
        id?: string;
        is_read?: boolean | null;
        recipient_id?: string;
        type?: string;
        };
        Relationships: [];
      },
      forum_poll_options: {
        Row: {
        created_at: string | null;
        id: string;
        option_text: string;
        poll_id: string;
        sort_order: number | null;
        votes_count: number | null;
        };
        Insert: {
        created_at?: string;
        id?: string;
        option_text: string;
        poll_id: string;
        sort_order?: number;
        votes_count?: number;
        };
        Update: {
        created_at?: string | null;
        id?: string;
        option_text?: string;
        poll_id?: string;
        sort_order?: number | null;
        votes_count?: number | null;
        };
        Relationships: [];
      },
      forum_poll_votes: {
        Row: {
        created_at: string | null;
        id: string;
        option_id: string;
        poll_id: string;
        profile_id: string;
        };
        Insert: {
        created_at?: string;
        id?: string;
        option_id: string;
        poll_id: string;
        profile_id: string;
        };
        Update: {
        created_at?: string | null;
        id?: string;
        option_id?: string;
        poll_id?: string;
        profile_id?: string;
        };
        Relationships: [];
      },
      forum_polls: {
        Row: {
        created_at: string | null;
        ends_at: string | null;
        forum_id: number;
        id: string;
        is_anonymous: boolean | null;
        poll_type: string;
        question: string;
        show_results_before_vote: boolean | null;
        total_votes: number | null;
        updated_at: string | null;
        };
        Insert: {
        created_at?: string;
        ends_at?: string;
        forum_id: number;
        id?: string;
        is_anonymous?: boolean;
        poll_type?: string;
        question: string;
        show_results_before_vote?: boolean;
        total_votes?: number;
        updated_at?: string;
        };
        Update: {
        created_at?: string | null;
        ends_at?: string | null;
        forum_id?: number;
        id?: string;
        is_anonymous?: boolean | null;
        poll_type?: string;
        question?: string;
        show_results_before_vote?: boolean | null;
        total_votes?: number | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      forum_popular_searches: {
        Row: {
        first_searched_at: string | null;
        id: number;
        last_searched_at: string | null;
        query: string;
        search_count: number | null;
        };
        Insert: {
        first_searched_at?: string;
        id?: number;
        last_searched_at?: string;
        query: string;
        search_count?: number;
        };
        Update: {
        first_searched_at?: string | null;
        id?: number;
        last_searched_at?: string | null;
        query?: string;
        search_count?: number | null;
        };
        Relationships: [];
      },
      forum_post_analytics: {
        Row: {
        avg_read_time_seconds: number | null;
        bookmarks_count: number | null;
        bounce_rate: number | null;
        comments_count: number | null;
        created_at: string | null;
        date: string;
        device_breakdown: Json | null;
        forum_id: number;
        id: string;
        likes_count: number | null;
        reactions_count: number | null;
        referrer_sources: Json | null;
        shares_count: number | null;
        unique_visitors: number | null;
        views_count: number | null;
        };
        Insert: {
        avg_read_time_seconds?: number;
        bookmarks_count?: number;
        bounce_rate?: number;
        comments_count?: number;
        created_at?: string;
        date?: string;
        device_breakdown?: Json;
        forum_id: number;
        id?: string;
        likes_count?: number;
        reactions_count?: number;
        referrer_sources?: Json;
        shares_count?: number;
        unique_visitors?: number;
        views_count?: number;
        };
        Update: {
        avg_read_time_seconds?: number | null;
        bookmarks_count?: number | null;
        bounce_rate?: number | null;
        comments_count?: number | null;
        created_at?: string | null;
        date?: string;
        device_breakdown?: Json | null;
        forum_id?: number;
        id?: string;
        likes_count?: number | null;
        reactions_count?: number | null;
        referrer_sources?: Json | null;
        shares_count?: number | null;
        unique_visitors?: number | null;
        views_count?: number | null;
        };
        Relationships: [];
      },
      forum_post_history: {
        Row: {
        created_at: string | null;
        edit_reason: string | null;
        editor_id: string;
        forum_id: number;
        id: string;
        previous_description: string | null;
        previous_image: string | null;
        previous_title: string | null;
        };
        Insert: {
        created_at?: string;
        edit_reason?: string;
        editor_id: string;
        forum_id: number;
        id?: string;
        previous_description?: string;
        previous_image?: string;
        previous_title?: string;
        };
        Update: {
        created_at?: string | null;
        edit_reason?: string | null;
        editor_id?: string;
        forum_id?: number;
        id?: string;
        previous_description?: string | null;
        previous_image?: string | null;
        previous_title?: string | null;
        };
        Relationships: [];
      },
      forum_post_tags: {
        Row: {
        created_at: string | null;
        forum_id: number;
        tag_id: number;
        };
        Insert: {
        created_at?: string;
        forum_id: number;
        tag_id: number;
        };
        Update: {
        created_at?: string | null;
        forum_id?: number;
        tag_id?: number;
        };
        Relationships: [];
      },
      forum_publication_queue: {
        Row: {
        attempts: number | null;
        created_at: string | null;
        error_message: string | null;
        id: string;
        last_attempt_at: string | null;
        max_attempts: number | null;
        priority: number | null;
        recurring_post_id: string | null;
        scheduled_for: string;
        scheduled_post_id: string | null;
        status: string | null;
        };
        Insert: {
        attempts?: number;
        created_at?: string;
        error_message?: string;
        id?: string;
        last_attempt_at?: string;
        max_attempts?: number;
        priority?: number;
        recurring_post_id?: string;
        scheduled_for: string;
        scheduled_post_id?: string;
        status?: string;
        };
        Update: {
        attempts?: number | null;
        created_at?: string | null;
        error_message?: string | null;
        id?: string;
        last_attempt_at?: string | null;
        max_attempts?: number | null;
        priority?: number | null;
        recurring_post_id?: string | null;
        scheduled_for?: string;
        scheduled_post_id?: string | null;
        status?: string | null;
        };
        Relationships: [];
      },
      forum_rate_limit_config: {
        Row: {
        action_type: string;
        cooldown_seconds: number | null;
        created_at: string | null;
        description: string | null;
        id: number;
        is_active: boolean | null;
        max_actions: number;
        trust_level_multipliers: Json | null;
        window_seconds: number;
        };
        Insert: {
        action_type: string;
        cooldown_seconds?: number;
        created_at?: string;
        description?: string;
        id?: number;
        is_active?: boolean;
        max_actions: number;
        trust_level_multipliers?: Json;
        window_seconds: number;
        };
        Update: {
        action_type?: string;
        cooldown_seconds?: number | null;
        created_at?: string | null;
        description?: string | null;
        id?: number;
        is_active?: boolean | null;
        max_actions?: number;
        trust_level_multipliers?: Json | null;
        window_seconds?: number;
        };
        Relationships: [];
      },
      forum_rate_limits: {
        Row: {
        action_count: number | null;
        action_type: string;
        created_at: string | null;
        id: string;
        metadata: Json | null;
        profile_id: string;
        updated_at: string | null;
        window_end: string | null;
        window_start: string | null;
        };
        Insert: {
        action_count?: number;
        action_type: string;
        created_at?: string;
        id?: string;
        metadata?: Json;
        profile_id: string;
        updated_at?: string;
        window_end?: string;
        window_start?: string;
        };
        Update: {
        action_count?: number | null;
        action_type?: string;
        created_at?: string | null;
        id?: string;
        metadata?: Json | null;
        profile_id?: string;
        updated_at?: string | null;
        window_end?: string | null;
        window_start?: string | null;
        };
        Relationships: [];
      },
      forum_reactions: {
        Row: {
        created_at: string | null;
        forum_id: number;
        id: string;
        profile_id: string;
        reaction_type_id: number;
        };
        Insert: {
        created_at?: string;
        forum_id: number;
        id?: string;
        profile_id: string;
        reaction_type_id: number;
        };
        Update: {
        created_at?: string | null;
        forum_id?: number;
        id?: string;
        profile_id?: string;
        reaction_type_id?: number;
        };
        Relationships: [];
      },
      forum_reading_history: {
        Row: {
        forum_id: number;
        id: string;
        profile_id: string;
        viewed_at: string | null;
        };
        Insert: {
        forum_id: number;
        id?: string;
        profile_id: string;
        viewed_at?: string;
        };
        Update: {
        forum_id?: number;
        id?: string;
        profile_id?: string;
        viewed_at?: string | null;
        };
        Relationships: [];
      },
      forum_reading_progress: {
        Row: {
        created_at: string | null;
        forum_id: number;
        id: string;
        is_fully_read: boolean | null;
        last_read_at: string | null;
        last_read_comment_id: number | null;
        profile_id: string;
        read_count: number | null;
        scroll_position: number | null;
        time_spent_seconds: number | null;
        };
        Insert: {
        created_at?: string;
        forum_id: number;
        id?: string;
        is_fully_read?: boolean;
        last_read_at?: string;
        last_read_comment_id?: number;
        profile_id: string;
        read_count?: number;
        scroll_position?: number;
        time_spent_seconds?: number;
        };
        Update: {
        created_at?: string | null;
        forum_id?: number;
        id?: string;
        is_fully_read?: boolean | null;
        last_read_at?: string | null;
        last_read_comment_id?: number | null;
        profile_id?: string;
        read_count?: number | null;
        scroll_position?: number | null;
        time_spent_seconds?: number | null;
        };
        Relationships: [];
      },
      forum_recurring_posts: {
        Row: {
        category_id: number | null;
        created_at: string | null;
        custom_cron: string | null;
        description_template: string | null;
        end_date: string | null;
        id: string;
        is_active: boolean | null;
        last_published_at: string | null;
        max_occurrences: number | null;
        next_scheduled_at: string | null;
        post_type: string | null;
        profile_id: string;
        recurrence_day: number | null;
        recurrence_time: string;
        recurrence_type: string;
        tags: Array<number> | null;
        template_variables: Json | null;
        timezone: string | null;
        title_template: string;
        total_published: number | null;
        updated_at: string | null;
        };
        Insert: {
        category_id?: number;
        created_at?: string;
        custom_cron?: string;
        description_template?: string;
        end_date?: string;
        id?: string;
        is_active?: boolean;
        last_published_at?: string;
        max_occurrences?: number;
        next_scheduled_at?: string;
        post_type?: string;
        profile_id: string;
        recurrence_day?: number;
        recurrence_time: string;
        recurrence_type: string;
        tags?: Array<number>;
        template_variables?: Json;
        timezone?: string;
        title_template: string;
        total_published?: number;
        updated_at?: string;
        };
        Update: {
        category_id?: number | null;
        created_at?: string | null;
        custom_cron?: string | null;
        description_template?: string | null;
        end_date?: string | null;
        id?: string;
        is_active?: boolean | null;
        last_published_at?: string | null;
        max_occurrences?: number | null;
        next_scheduled_at?: string | null;
        post_type?: string | null;
        profile_id?: string;
        recurrence_day?: number | null;
        recurrence_time?: string;
        recurrence_type?: string;
        tags?: Array<number> | null;
        template_variables?: Json | null;
        timezone?: string | null;
        title_template?: string;
        total_published?: number | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      forum_reports: {
        Row: {
        comment_id: number | null;
        created_at: string | null;
        description: string | null;
        forum_id: number | null;
        id: string;
        moderator_id: string | null;
        moderator_notes: string | null;
        reason: string;
        reported_profile_id: string | null;
        reporter_id: string;
        resolved_at: string | null;
        status: string;
        updated_at: string | null;
        };
        Insert: {
        comment_id?: number;
        created_at?: string;
        description?: string;
        forum_id?: number;
        id?: string;
        moderator_id?: string;
        moderator_notes?: string;
        reason: string;
        reported_profile_id?: string;
        reporter_id: string;
        resolved_at?: string;
        status?: string;
        updated_at?: string;
        };
        Update: {
        comment_id?: number | null;
        created_at?: string | null;
        description?: string | null;
        forum_id?: number | null;
        id?: string;
        moderator_id?: string | null;
        moderator_notes?: string | null;
        reason?: string;
        reported_profile_id?: string | null;
        reporter_id?: string;
        resolved_at?: string | null;
        status?: string;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      forum_reputation_actions: {
        Row: {
        action_key: string;
        created_at: string | null;
        daily_limit: number | null;
        description: string;
        id: number;
        is_active: boolean | null;
        is_positive: boolean | null;
        points: number;
        };
        Insert: {
        action_key: string;
        created_at?: string;
        daily_limit?: number;
        description: string;
        id?: number;
        is_active?: boolean;
        is_positive?: boolean;
        points: number;
        };
        Update: {
        action_key?: string;
        created_at?: string | null;
        daily_limit?: number | null;
        description?: string;
        id?: number;
        is_active?: boolean | null;
        is_positive?: boolean | null;
        points?: number;
        };
        Relationships: [];
      },
      forum_reputation_history: {
        Row: {
        action_key: string;
        created_at: string | null;
        description: string | null;
        id: string;
        metadata: Json | null;
        points: number;
        profile_id: string;
        source_comment_id: number | null;
        source_forum_id: number | null;
        source_profile_id: string | null;
        };
        Insert: {
        action_key: string;
        created_at?: string;
        description?: string;
        id?: string;
        metadata?: Json;
        points: number;
        profile_id: string;
        source_comment_id?: number;
        source_forum_id?: number;
        source_profile_id?: string;
        };
        Update: {
        action_key?: string;
        created_at?: string | null;
        description?: string | null;
        id?: string;
        metadata?: Json | null;
        points?: number;
        profile_id?: string;
        source_comment_id?: number | null;
        source_forum_id?: number | null;
        source_profile_id?: string | null;
        };
        Relationships: [];
      },
      forum_reputation_levels: {
        Row: {
        color: string | null;
        created_at: string | null;
        icon_name: string | null;
        level: number;
        min_points: number;
        perks: Json | null;
        title: string;
        };
        Insert: {
        color?: string;
        created_at?: string;
        icon_name?: string;
        level: number;
        min_points: number;
        perks?: Json;
        title: string;
        };
        Update: {
        color?: string | null;
        created_at?: string | null;
        icon_name?: string | null;
        level?: number;
        min_points?: number;
        perks?: Json | null;
        title?: string;
        };
        Relationships: [];
      },
      forum_saved_searches: {
        Row: {
        created_at: string | null;
        filters: Json | null;
        id: string;
        last_notified_at: string | null;
        name: string;
        notify_on_new: boolean | null;
        profile_id: string;
        query: string;
        results_count: number | null;
        updated_at: string | null;
        };
        Insert: {
        created_at?: string;
        filters?: Json;
        id?: string;
        last_notified_at?: string;
        name: string;
        notify_on_new?: boolean;
        profile_id: string;
        query: string;
        results_count?: number;
        updated_at?: string;
        };
        Update: {
        created_at?: string | null;
        filters?: Json | null;
        id?: string;
        last_notified_at?: string | null;
        name?: string;
        notify_on_new?: boolean | null;
        profile_id?: string;
        query?: string;
        results_count?: number | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      forum_scheduled_posts: {
        Row: {
        category_id: number | null;
        created_at: string | null;
        description: string | null;
        failure_reason: string | null;
        id: string;
        image_url: string | null;
        notify_followers: boolean | null;
        poll_data: Json | null;
        post_type: string | null;
        profile_id: string;
        published_at: string | null;
        published_forum_id: number | null;
        rich_content: Json | null;
        scheduled_for: string;
        series_id: string | null;
        series_order: number | null;
        status: string | null;
        tags: Array<number> | null;
        timezone: string | null;
        title: string;
        updated_at: string | null;
        };
        Insert: {
        category_id?: number;
        created_at?: string;
        description?: string;
        failure_reason?: string;
        id?: string;
        image_url?: string;
        notify_followers?: boolean;
        poll_data?: Json;
        post_type?: string;
        profile_id: string;
        published_at?: string;
        published_forum_id?: number;
        rich_content?: Json;
        scheduled_for: string;
        series_id?: string;
        series_order?: number;
        status?: string;
        tags?: Array<number>;
        timezone?: string;
        title: string;
        updated_at?: string;
        };
        Update: {
        category_id?: number | null;
        created_at?: string | null;
        description?: string | null;
        failure_reason?: string | null;
        id?: string;
        image_url?: string | null;
        notify_followers?: boolean | null;
        poll_data?: Json | null;
        post_type?: string | null;
        profile_id?: string;
        published_at?: string | null;
        published_forum_id?: number | null;
        rich_content?: Json | null;
        scheduled_for?: string;
        series_id?: string | null;
        series_order?: number | null;
        status?: string | null;
        tags?: Array<number> | null;
        timezone?: string | null;
        title?: string;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      forum_search_history: {
        Row: {
        filters: Json | null;
        id: string;
        profile_id: string;
        query: string;
        results_count: number | null;
        searched_at: string | null;
        };
        Insert: {
        filters?: Json;
        id?: string;
        profile_id: string;
        query: string;
        results_count?: number;
        searched_at?: string;
        };
        Update: {
        filters?: Json | null;
        id?: string;
        profile_id?: string;
        query?: string;
        results_count?: number | null;
        searched_at?: string | null;
        };
        Relationships: [];
      },
      forum_series: {
        Row: {
        category_id: number | null;
        cover_image: string | null;
        created_at: string | null;
        description: string | null;
        difficulty_level: string | null;
        estimated_read_time: number | null;
        id: string;
        is_complete: boolean | null;
        is_published: boolean | null;
        posts_count: number | null;
        profile_id: string;
        published_at: string | null;
        slug: string;
        title: string;
        total_likes: number | null;
        total_views: number | null;
        updated_at: string | null;
        };
        Insert: {
        category_id?: number;
        cover_image?: string;
        created_at?: string;
        description?: string;
        difficulty_level?: string;
        estimated_read_time?: number;
        id?: string;
        is_complete?: boolean;
        is_published?: boolean;
        posts_count?: number;
        profile_id: string;
        published_at?: string;
        slug: string;
        title: string;
        total_likes?: number;
        total_views?: number;
        updated_at?: string;
        };
        Update: {
        category_id?: number | null;
        cover_image?: string | null;
        created_at?: string | null;
        description?: string | null;
        difficulty_level?: string | null;
        estimated_read_time?: number | null;
        id?: string;
        is_complete?: boolean | null;
        is_published?: boolean | null;
        posts_count?: number | null;
        profile_id?: string;
        published_at?: string | null;
        slug?: string;
        title?: string;
        total_likes?: number | null;
        total_views?: number | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      forum_series_posts: {
        Row: {
        chapter_description: string | null;
        chapter_title: string | null;
        created_at: string | null;
        forum_id: number;
        id: string;
        is_free_preview: boolean | null;
        series_id: string;
        sort_order: number;
        };
        Insert: {
        chapter_description?: string;
        chapter_title?: string;
        created_at?: string;
        forum_id: number;
        id?: string;
        is_free_preview?: boolean;
        series_id: string;
        sort_order?: number;
        };
        Update: {
        chapter_description?: string | null;
        chapter_title?: string | null;
        created_at?: string | null;
        forum_id?: number;
        id?: string;
        is_free_preview?: boolean | null;
        series_id?: string;
        sort_order?: number;
        };
        Relationships: [];
      },
      forum_subscriptions: {
        Row: {
        category_id: number | null;
        created_at: string | null;
        email_notifications: boolean | null;
        forum_id: number | null;
        id: string;
        notify_on_mention: boolean | null;
        notify_on_reaction: boolean | null;
        notify_on_reply: boolean | null;
        profile_id: string;
        };
        Insert: {
        category_id?: number;
        created_at?: string;
        email_notifications?: boolean;
        forum_id?: number;
        id?: string;
        notify_on_mention?: boolean;
        notify_on_reaction?: boolean;
        notify_on_reply?: boolean;
        profile_id: string;
        };
        Update: {
        category_id?: number | null;
        created_at?: string | null;
        email_notifications?: boolean | null;
        forum_id?: number | null;
        id?: string;
        notify_on_mention?: boolean | null;
        notify_on_reaction?: boolean | null;
        notify_on_reply?: boolean | null;
        profile_id?: string;
        };
        Relationships: [];
      },
      forum_system_messages: {
        Row: {
        content: string;
        created_at: string | null;
        id: string;
        is_active: boolean | null;
        message_key: string;
        message_type: string | null;
        title: string;
        updated_at: string | null;
        variables: Json | null;
        };
        Insert: {
        content: string;
        created_at?: string;
        id?: string;
        is_active?: boolean;
        message_key: string;
        message_type?: string;
        title: string;
        updated_at?: string;
        variables?: Json;
        };
        Update: {
        content?: string;
        created_at?: string | null;
        id?: string;
        is_active?: boolean | null;
        message_key?: string;
        message_type?: string | null;
        title?: string;
        updated_at?: string | null;
        variables?: Json | null;
        };
        Relationships: [];
      },
      forum_tags: {
        Row: {
        color: string | null;
        created_at: string | null;
        description: string | null;
        id: number;
        name: string;
        slug: string;
        usage_count: number | null;
        };
        Insert: {
        color?: string;
        created_at?: string;
        description?: string;
        id?: number;
        name: string;
        slug: string;
        usage_count?: number;
        };
        Update: {
        color?: string | null;
        created_at?: string | null;
        description?: string | null;
        id?: number;
        name?: string;
        slug?: string;
        usage_count?: number | null;
        };
        Relationships: [];
      },
      forum_trust_levels: {
        Row: {
        can_create_polls: boolean | null;
        can_create_wiki: boolean | null;
        can_delete_own_posts: boolean | null;
        can_edit_own_posts: boolean | null;
        can_flag: boolean | null;
        can_like: boolean | null;
        can_mention_users: boolean | null;
        can_post: boolean | null;
        can_post_links: boolean | null;
        can_reply: boolean | null;
        can_send_messages: boolean | null;
        can_upload_images: boolean | null;
        color: string | null;
        created_at: string | null;
        description: string | null;
        level: number;
        max_flags_per_day: number | null;
        max_likes_per_day: number | null;
        max_posts_per_day: number | null;
        max_topics_per_day: number | null;
        min_days_since_join: number | null;
        min_likes_given: number | null;
        min_likes_received: number | null;
        min_posts_created: number | null;
        min_posts_read: number | null;
        min_replies_received: number | null;
        min_time_spent_minutes: number | null;
        min_topics_created: number | null;
        min_topics_read: number | null;
        name: string;
        };
        Insert: {
        can_create_polls?: boolean;
        can_create_wiki?: boolean;
        can_delete_own_posts?: boolean;
        can_edit_own_posts?: boolean;
        can_flag?: boolean;
        can_like?: boolean;
        can_mention_users?: boolean;
        can_post?: boolean;
        can_post_links?: boolean;
        can_reply?: boolean;
        can_send_messages?: boolean;
        can_upload_images?: boolean;
        color?: string;
        created_at?: string;
        description?: string;
        level: number;
        max_flags_per_day?: number;
        max_likes_per_day?: number;
        max_posts_per_day?: number;
        max_topics_per_day?: number;
        min_days_since_join?: number;
        min_likes_given?: number;
        min_likes_received?: number;
        min_posts_created?: number;
        min_posts_read?: number;
        min_replies_received?: number;
        min_time_spent_minutes?: number;
        min_topics_created?: number;
        min_topics_read?: number;
        name: string;
        };
        Update: {
        can_create_polls?: boolean | null;
        can_create_wiki?: boolean | null;
        can_delete_own_posts?: boolean | null;
        can_edit_own_posts?: boolean | null;
        can_flag?: boolean | null;
        can_like?: boolean | null;
        can_mention_users?: boolean | null;
        can_post?: boolean | null;
        can_post_links?: boolean | null;
        can_reply?: boolean | null;
        can_send_messages?: boolean | null;
        can_upload_images?: boolean | null;
        color?: string | null;
        created_at?: string | null;
        description?: string | null;
        level?: number;
        max_flags_per_day?: number | null;
        max_likes_per_day?: number | null;
        max_posts_per_day?: number | null;
        max_topics_per_day?: number | null;
        min_days_since_join?: number | null;
        min_likes_given?: number | null;
        min_likes_received?: number | null;
        min_posts_created?: number | null;
        min_posts_read?: number | null;
        min_replies_received?: number | null;
        min_time_spent_minutes?: number | null;
        min_topics_created?: number | null;
        min_topics_read?: number | null;
        name?: string;
        };
        Relationships: [];
      },
      forum_user_badges: {
        Row: {
        awarded_at: string | null;
        awarded_by: string | null;
        badge_id: number;
        id: string;
        is_featured: boolean | null;
        profile_id: string;
        };
        Insert: {
        awarded_at?: string;
        awarded_by?: string;
        badge_id: number;
        id?: string;
        is_featured?: boolean;
        profile_id: string;
        };
        Update: {
        awarded_at?: string | null;
        awarded_by?: string | null;
        badge_id?: number;
        id?: string;
        is_featured?: boolean | null;
        profile_id?: string;
        };
        Relationships: [];
      },
      forum_user_blocks: {
        Row: {
        blocked_id: string;
        blocker_id: string;
        created_at: string | null;
        id: string;
        reason: string | null;
        };
        Insert: {
        blocked_id: string;
        blocker_id: string;
        created_at?: string;
        id?: string;
        reason?: string;
        };
        Update: {
        blocked_id?: string;
        blocker_id?: string;
        created_at?: string | null;
        id?: string;
        reason?: string | null;
        };
        Relationships: [];
      },
      forum_user_follows: {
        Row: {
        created_at: string | null;
        follower_id: string;
        following_id: string;
        id: string;
        notify_on_new_post: boolean | null;
        };
        Insert: {
        created_at?: string;
        follower_id: string;
        following_id: string;
        id?: string;
        notify_on_new_post?: boolean;
        };
        Update: {
        created_at?: string | null;
        follower_id?: string;
        following_id?: string;
        id?: string;
        notify_on_new_post?: boolean | null;
        };
        Relationships: [];
      },
      forum_user_reputation: {
        Row: {
        created_at: string | null;
        current_streak: number | null;
        id: string;
        last_activity_date: string | null;
        level_title: string | null;
        longest_streak: number | null;
        month_start_date: string | null;
        negative_points: number | null;
        points_this_month: number | null;
        points_this_week: number | null;
        positive_points: number | null;
        profile_id: string;
        reputation_level: number | null;
        total_points: number | null;
        updated_at: string | null;
        week_start_date: string | null;
        };
        Insert: {
        created_at?: string;
        current_streak?: number;
        id?: string;
        last_activity_date?: string;
        level_title?: string;
        longest_streak?: number;
        month_start_date?: string;
        negative_points?: number;
        points_this_month?: number;
        points_this_week?: number;
        positive_points?: number;
        profile_id: string;
        reputation_level?: number;
        total_points?: number;
        updated_at?: string;
        week_start_date?: string;
        };
        Update: {
        created_at?: string | null;
        current_streak?: number | null;
        id?: string;
        last_activity_date?: string | null;
        level_title?: string | null;
        longest_streak?: number | null;
        month_start_date?: string | null;
        negative_points?: number | null;
        points_this_month?: number | null;
        points_this_week?: number | null;
        positive_points?: number | null;
        profile_id?: string;
        reputation_level?: number | null;
        total_points?: number | null;
        updated_at?: string | null;
        week_start_date?: string | null;
        };
        Relationships: [];
      },
      forum_user_stats: {
        Row: {
        comments_count: number | null;
        flags_agreed: number | null;
        followers_count: number | null;
        following_count: number | null;
        helpful_count: number | null;
        joined_forum_at: string | null;
        last_comment_at: string | null;
        last_post_at: string | null;
        likes_given: number | null;
        likes_received: number | null;
        posts_count: number | null;
        posts_read: number | null;
        profile_id: string;
        reactions_received: number | null;
        replies_received: number | null;
        reputation_score: number | null;
        silenced_until: string | null;
        time_spent_minutes: number | null;
        topics_read: number | null;
        trust_level: number | null;
        trust_level_locked: boolean | null;
        updated_at: string | null;
        was_silenced: boolean | null;
        was_warned: boolean | null;
        };
        Insert: {
        comments_count?: number;
        flags_agreed?: number;
        followers_count?: number;
        following_count?: number;
        helpful_count?: number;
        joined_forum_at?: string;
        last_comment_at?: string;
        last_post_at?: string;
        likes_given?: number;
        likes_received?: number;
        posts_count?: number;
        posts_read?: number;
        profile_id: string;
        reactions_received?: number;
        replies_received?: number;
        reputation_score?: number;
        silenced_until?: string;
        time_spent_minutes?: number;
        topics_read?: number;
        trust_level?: number;
        trust_level_locked?: boolean;
        updated_at?: string;
        was_silenced?: boolean;
        was_warned?: boolean;
        };
        Update: {
        comments_count?: number | null;
        flags_agreed?: number | null;
        followers_count?: number | null;
        following_count?: number | null;
        helpful_count?: number | null;
        joined_forum_at?: string | null;
        last_comment_at?: string | null;
        last_post_at?: string | null;
        likes_given?: number | null;
        likes_received?: number | null;
        posts_count?: number | null;
        posts_read?: number | null;
        profile_id?: string;
        reactions_received?: number | null;
        replies_received?: number | null;
        reputation_score?: number | null;
        silenced_until?: string | null;
        time_spent_minutes?: number | null;
        topics_read?: number | null;
        trust_level?: number | null;
        trust_level_locked?: boolean | null;
        updated_at?: string | null;
        was_silenced?: boolean | null;
        was_warned?: boolean | null;
        };
        Relationships: [];
      },
      forum_user_warnings: {
        Row: {
        acknowledged_at: string | null;
        ban_lifted_at: string | null;
        ban_lifted_by: string | null;
        ban_until: string | null;
        created_at: string | null;
        details: Json | null;
        expires_at: string | null;
        id: string;
        is_active: boolean | null;
        moderator_id: string;
        profile_id: string;
        queue_id: string | null;
        reason: string;
        warning_type: string;
        };
        Insert: {
        acknowledged_at?: string;
        ban_lifted_at?: string;
        ban_lifted_by?: string;
        ban_until?: string;
        created_at?: string;
        details?: Json;
        expires_at?: string;
        id?: string;
        is_active?: boolean;
        moderator_id: string;
        profile_id: string;
        queue_id?: string;
        reason: string;
        warning_type: string;
        };
        Update: {
        acknowledged_at?: string | null;
        ban_lifted_at?: string | null;
        ban_lifted_by?: string | null;
        ban_until?: string | null;
        created_at?: string | null;
        details?: Json | null;
        expires_at?: string | null;
        id?: string;
        is_active?: boolean | null;
        moderator_id?: string;
        profile_id?: string;
        queue_id?: string | null;
        reason?: string;
        warning_type?: string;
        };
        Relationships: [];
      },
      geocoding_cache: {
        Row: {
        address: string;
        cached_at: string | null;
        display_name: string | null;
        latitude: number;
        longitude: number;
        };
        Insert: {
        address: string;
        cached_at?: string;
        display_name?: string;
        latitude: number;
        longitude: number;
        };
        Update: {
        address?: string;
        cached_at?: string | null;
        display_name?: string | null;
        latitude?: number;
        longitude?: number;
        };
        Relationships: [];
      },
      grok_usage_logs: {
        Row: {
        created_at: string | null;
        id: string;
        model: string;
        timestamp: string;
        tokens: number;
        };
        Insert: {
        created_at?: string;
        id?: string;
        model: string;
        timestamp?: string;
        tokens?: number;
        };
        Update: {
        created_at?: string | null;
        id?: string;
        model?: string;
        timestamp?: string;
        tokens?: number;
        };
        Relationships: [];
      },
      group_message_deletions: {
        Row: {
        chat_id: number;
        created_at: string | null;
        delete_at: string;
        id: string;
        message_id: number;
        };
        Insert: {
        chat_id: number;
        created_at?: string;
        delete_at: string;
        id?: string;
        message_id: number;
        };
        Update: {
        chat_id?: number;
        created_at?: string | null;
        delete_at?: string;
        id?: string;
        message_id?: number;
        };
        Relationships: [];
      },
      handlers: {
        Row: {
        handler_name: string | null;
        handlers_description: string | null;
        icon_image: string | null;
        id: number;
        profile_id: string;
        qr_code: string | null;
        };
        Insert: {
        handler_name?: string;
        handlers_description?: string;
        icon_image?: string;
        id: number;
        profile_id: string;
        qr_code?: string;
        };
        Update: {
        handler_name?: string | null;
        handlers_description?: string | null;
        icon_image?: string | null;
        id?: number;
        profile_id?: string;
        qr_code?: string | null;
        };
        Relationships: [];
      },
      household_waste_logs: {
        Row: {
        created_at: string | null;
        date: string;
        household_id: string | null;
        id: string;
        updated_at: string | null;
        waste_weight_kg: number;
        };
        Insert: {
        created_at?: string;
        date: string;
        household_id?: string;
        id?: string;
        updated_at?: string;
        waste_weight_kg?: number;
        };
        Update: {
        created_at?: string | null;
        date?: string;
        household_id?: string | null;
        id?: string;
        updated_at?: string | null;
        waste_weight_kg?: number;
        };
        Relationships: [];
      },
      households: {
        Row: {
        created_at: string;
        created_by: string | null;
        id: string;
        name: string | null;
        updated_at: string;
        };
        Insert: {
        created_at?: string;
        created_by?: string;
        id?: string;
        name?: string;
        updated_at?: string;
        };
        Update: {
        created_at?: string;
        created_by?: string | null;
        id?: string;
        name?: string | null;
        updated_at?: string;
        };
        Relationships: [];
      },
      image_compressions: {
        Row: {
        bucket: string;
        completed_at: string | null;
        compressed_format: string | null;
        compressed_height: number | null;
        compressed_path: string | null;
        compressed_size: number | null;
        compressed_width: number | null;
        compression_method: string | null;
        created_at: string | null;
        error_message: string | null;
        id: string;
        original_format: string | null;
        original_height: number | null;
        original_path: string;
        original_size: number;
        original_width: number | null;
        processing_time_ms: number | null;
        quality_setting: number | null;
        saved_bytes: number | null;
        saved_percent: number | null;
        status: string | null;
        };
        Insert: {
        bucket: string;
        completed_at?: string;
        compressed_format?: string;
        compressed_height?: number;
        compressed_path?: string;
        compressed_size?: number;
        compressed_width?: number;
        compression_method?: string;
        created_at?: string;
        error_message?: string;
        id?: string;
        original_format?: string;
        original_height?: number;
        original_path: string;
        original_size: number;
        original_width?: number;
        processing_time_ms?: number;
        quality_setting?: number;
        saved_bytes?: number;
        saved_percent?: number;
        status?: string;
        };
        Update: {
        bucket?: string;
        completed_at?: string | null;
        compressed_format?: string | null;
        compressed_height?: number | null;
        compressed_path?: string | null;
        compressed_size?: number | null;
        compressed_width?: number | null;
        compression_method?: string | null;
        created_at?: string | null;
        error_message?: string | null;
        id?: string;
        original_format?: string | null;
        original_height?: number | null;
        original_path?: string;
        original_size?: number;
        original_width?: number | null;
        processing_time_ms?: number | null;
        quality_setting?: number | null;
        saved_bytes?: number | null;
        saved_percent?: number | null;
        status?: string | null;
        };
        Relationships: [];
      },
      image_upload_metrics: {
        Row: {
        bucket: string;
        compressed_size: number;
        compression_method: string;
        id: number;
        original_size: number;
        path: string;
        processing_time_ms: number;
        saved_bytes: number;
        storage: string;
        uploaded_at: string;
        user_id: string | null;
        };
        Insert: {
        bucket: string;
        compressed_size: number;
        compression_method: string;
        id?: number;
        original_size: number;
        path: string;
        processing_time_ms: number;
        saved_bytes: number;
        storage?: string;
        uploaded_at?: string;
        user_id?: string;
        };
        Update: {
        bucket?: string;
        compressed_size?: number;
        compression_method?: string;
        id?: number;
        original_size?: number;
        path?: string;
        processing_time_ms?: number;
        saved_bytes?: number;
        storage?: string;
        uploaded_at?: string;
        user_id?: string | null;
        };
        Relationships: [];
      },
      in_app_notifications: {
        Row: {
        action_url: string | null;
        body: string;
        category: string;
        created_at: string;
        data: Json | null;
        id: string;
        image_url: string | null;
        read_at: string | null;
        title: string;
        user_id: string;
        };
        Insert: {
        action_url?: string;
        body: string;
        category?: string;
        created_at?: string;
        data?: Json;
        id?: string;
        image_url?: string;
        read_at?: string;
        title: string;
        user_id: string;
        };
        Update: {
        action_url?: string | null;
        body?: string;
        category?: string;
        created_at?: string;
        data?: Json | null;
        id?: string;
        image_url?: string | null;
        read_at?: string | null;
        title?: string;
        user_id?: string;
        };
        Relationships: [];
      },
      languages: {
        Row: {
        country_flag: Json | null;
        flag_url: string | null;
        flagCode: string | null;
        id: number;
        language: string | null;
        languageCode: string | null;
        };
        Insert: {
        country_flag?: Json;
        flag_url?: string;
        flagCode?: string;
        id: number;
        language?: string;
        languageCode?: string;
        };
        Update: {
        country_flag?: Json | null;
        flag_url?: string | null;
        flagCode?: string | null;
        id?: number;
        language?: string | null;
        languageCode?: string | null;
        };
        Relationships: [];
      },
      legal: {
        Row: {
        covid19: string | null;
        id: number;
        };
        Insert: {
        covid19?: string;
        id: number;
        };
        Update: {
        covid19?: string | null;
        id?: number;
        };
        Relationships: [];
      },
      legal_documents: {
        Row: {
        content: string;
        created_at: string;
        effective_date: string;
        id: string;
        locale: string;
        title: string;
        type: string;
        updated_at: string;
        version: string;
        };
        Insert: {
        content: string;
        created_at?: string;
        effective_date?: string;
        id?: string;
        locale: string;
        title: string;
        type: string;
        updated_at?: string;
        version?: string;
        };
        Update: {
        content?: string;
        created_at?: string;
        effective_date?: string;
        id?: string;
        locale?: string;
        title?: string;
        type?: string;
        updated_at?: string;
        version?: string;
        };
        Relationships: [];
      },
      likes: {
        Row: {
        challenge_id: number;
        comment_id: number;
        created_at: string;
        forum_id: number;
        id: number;
        post_id: number;
        profile_id: string;
        };
        Insert: {
        challenge_id: number;
        comment_id?: number;
        created_at?: string;
        forum_id: number;
        id: number;
        post_id: number;
        profile_id: string;
        };
        Update: {
        challenge_id?: number;
        comment_id?: number;
        created_at?: string;
        forum_id?: number;
        id?: number;
        post_id?: number;
        profile_id?: string;
        };
        Relationships: [];
      },
      location_update_queue: {
        Row: {
        completed_at: string | null;
        created_at: string;
        error_message: string | null;
        id: number;
        last_attempt_at: string | null;
        max_retries: number | null;
        post_address: string | null;
        post_id: number;
        retry_count: number | null;
        status: string | null;
        updated_at: string | null;
        };
        Insert: {
        completed_at?: string;
        created_at?: string;
        error_message?: string;
        id?: number;
        last_attempt_at?: string;
        max_retries?: number;
        post_address?: string;
        post_id: number;
        retry_count?: number;
        status?: string;
        updated_at?: string;
        };
        Update: {
        completed_at?: string | null;
        created_at?: string;
        error_message?: string | null;
        id?: number;
        last_attempt_at?: string | null;
        max_retries?: number | null;
        post_address?: string | null;
        post_id?: number;
        retry_count?: number | null;
        status?: string | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      mfa_configuration: {
        Row: {
        backup_codes: Array<string> | null;
        backup_codes_used: Array<string> | null;
        created_at: string;
        email_verified: boolean | null;
        id: string;
        is_mfa_enabled: boolean | null;
        last_mfa_verification_at: string | null;
        mfa_enabled_at: string | null;
        mfa_method: string | null;
        phone_verified: boolean | null;
        profile_id: string;
        require_mfa_for_admin: boolean | null;
        updated_at: string;
        };
        Insert: {
        backup_codes?: Array<string>;
        backup_codes_used?: Array<string>;
        created_at?: string;
        email_verified?: boolean;
        id?: string;
        is_mfa_enabled?: boolean;
        last_mfa_verification_at?: string;
        mfa_enabled_at?: string;
        mfa_method?: string;
        phone_verified?: boolean;
        profile_id: string;
        require_mfa_for_admin?: boolean;
        updated_at?: string;
        };
        Update: {
        backup_codes?: Array<string> | null;
        backup_codes_used?: Array<string> | null;
        created_at?: string;
        email_verified?: boolean | null;
        id?: string;
        is_mfa_enabled?: boolean | null;
        last_mfa_verification_at?: string | null;
        mfa_enabled_at?: string | null;
        mfa_method?: string | null;
        phone_verified?: boolean | null;
        profile_id?: string;
        require_mfa_for_admin?: boolean | null;
        updated_at?: string;
        };
        Relationships: [];
      },
      mfa_rate_limits: {
        Row: {
        attempt_count: number | null;
        id: string;
        ip_address: string | null;
        is_locked_out: boolean | null;
        last_attempt_at: string | null;
        limit_type: string;
        locked_until: string | null;
        max_attempts: number | null;
        metadata: Json | null;
        profile_id: string | null;
        window_duration: string | null;
        window_start: string;
        };
        Insert: {
        attempt_count?: number;
        id?: string;
        ip_address?: string;
        is_locked_out?: boolean;
        last_attempt_at?: string;
        limit_type: string;
        locked_until?: string;
        max_attempts?: number;
        metadata?: Json;
        profile_id?: string;
        window_duration?: string;
        window_start?: string;
        };
        Update: {
        attempt_count?: number | null;
        id?: string;
        ip_address?: string | null;
        is_locked_out?: boolean | null;
        last_attempt_at?: string | null;
        limit_type?: string;
        locked_until?: string | null;
        max_attempts?: number | null;
        metadata?: Json | null;
        profile_id?: string | null;
        window_duration?: string | null;
        window_start?: string;
        };
        Relationships: [];
      },
      mfa_sessions: {
        Row: {
        created_at: string;
        current_aal: string;
        device_fingerprint: string | null;
        expires_at: string;
        id: string;
        ip_address: string | null;
        is_active: boolean | null;
        last_activity_at: string | null;
        mfa_method_used: string | null;
        mfa_verified_at: string | null;
        profile_id: string;
        session_id: string;
        user_agent: string | null;
        };
        Insert: {
        created_at?: string;
        current_aal: string;
        device_fingerprint?: string;
        expires_at?: string;
        id?: string;
        ip_address?: string;
        is_active?: boolean;
        last_activity_at?: string;
        mfa_method_used?: string;
        mfa_verified_at?: string;
        profile_id: string;
        session_id: string;
        user_agent?: string;
        };
        Update: {
        created_at?: string;
        current_aal?: string;
        device_fingerprint?: string | null;
        expires_at?: string;
        id?: string;
        ip_address?: string | null;
        is_active?: boolean | null;
        last_activity_at?: string | null;
        mfa_method_used?: string | null;
        mfa_verified_at?: string | null;
        profile_id?: string;
        session_id?: string;
        user_agent?: string | null;
        };
        Relationships: [];
      },
      mfa_verification_attempts: {
        Row: {
        attempts_count: number | null;
        code_hash: string;
        created_at: string;
        expires_at: string;
        id: string;
        ip_address: string | null;
        is_expired: boolean | null;
        is_verified: boolean | null;
        max_attempts: number | null;
        profile_id: string;
        user_agent: string | null;
        verification_method: string;
        verified_at: string | null;
        };
        Insert: {
        attempts_count?: number;
        code_hash: string;
        created_at?: string;
        expires_at?: string;
        id?: string;
        ip_address?: string;
        is_expired?: boolean;
        is_verified?: boolean;
        max_attempts?: number;
        profile_id: string;
        user_agent?: string;
        verification_method: string;
        verified_at?: string;
        };
        Update: {
        attempts_count?: number | null;
        code_hash?: string;
        created_at?: string;
        expires_at?: string;
        id?: string;
        ip_address?: string | null;
        is_expired?: boolean | null;
        is_verified?: boolean | null;
        max_attempts?: number | null;
        profile_id?: string;
        user_agent?: string | null;
        verification_method?: string;
        verified_at?: string | null;
        };
        Relationships: [];
      },
      moderation_queue: {
        Row: {
        created_at: string;
        id: string;
        item_id: string;
        item_type: string;
        reason: string | null;
        reporter_id: string | null;
        resolution_notes: string | null;
        reviewed_at: string | null;
        reviewed_by: string | null;
        status: string;
        updated_at: string;
        };
        Insert: {
        created_at?: string;
        id?: string;
        item_id: string;
        item_type: string;
        reason?: string;
        reporter_id?: string;
        resolution_notes?: string;
        reviewed_at?: string;
        reviewed_by?: string;
        status?: string;
        updated_at?: string;
        };
        Update: {
        created_at?: string;
        id?: string;
        item_id?: string;
        item_type?: string;
        reason?: string | null;
        reporter_id?: string | null;
        resolution_notes?: string | null;
        reviewed_at?: string | null;
        reviewed_by?: string | null;
        status?: string;
        updated_at?: string;
        };
        Relationships: [];
      },
      newsletter_campaigns: {
        Row: {
        campaign_type: string;
        completed_at: string | null;
        created_at: string | null;
        created_by: string | null;
        html_content: string | null;
        id: string;
        name: string;
        plain_text_content: string | null;
        preview_text: string | null;
        scheduled_at: string | null;
        segment_criteria: Json | null;
        segment_id: string | null;
        sent_at: string | null;
        status: string;
        subject: string;
        total_bounced: number | null;
        total_clicked: number | null;
        total_complained: number | null;
        total_delivered: number | null;
        total_opened: number | null;
        total_recipients: number | null;
        total_sent: number | null;
        total_unsubscribed: number | null;
        updated_at: string | null;
        };
        Insert: {
        campaign_type?: string;
        completed_at?: string;
        created_at?: string;
        created_by?: string;
        html_content?: string;
        id?: string;
        name: string;
        plain_text_content?: string;
        preview_text?: string;
        scheduled_at?: string;
        segment_criteria?: Json;
        segment_id?: string;
        sent_at?: string;
        status?: string;
        subject: string;
        total_bounced?: number;
        total_clicked?: number;
        total_complained?: number;
        total_delivered?: number;
        total_opened?: number;
        total_recipients?: number;
        total_sent?: number;
        total_unsubscribed?: number;
        updated_at?: string;
        };
        Update: {
        campaign_type?: string;
        completed_at?: string | null;
        created_at?: string | null;
        created_by?: string | null;
        html_content?: string | null;
        id?: string;
        name?: string;
        plain_text_content?: string | null;
        preview_text?: string | null;
        scheduled_at?: string | null;
        segment_criteria?: Json | null;
        segment_id?: string | null;
        sent_at?: string | null;
        status?: string;
        subject?: string;
        total_bounced?: number | null;
        total_clicked?: number | null;
        total_complained?: number | null;
        total_delivered?: number | null;
        total_opened?: number | null;
        total_recipients?: number | null;
        total_sent?: number | null;
        total_unsubscribed?: number | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      newsletter_subscribers: {
        Row: {
        created_at: string | null;
        email: string;
        first_name: string | null;
        id: string;
        metadata: Json | null;
        source: string | null;
        status: string;
        subscribed_at: string | null;
        unsubscribe_reason: string | null;
        unsubscribed_at: string | null;
        updated_at: string | null;
        };
        Insert: {
        created_at?: string;
        email: string;
        first_name?: string;
        id?: string;
        metadata?: Json;
        source?: string;
        status?: string;
        subscribed_at?: string;
        unsubscribe_reason?: string;
        unsubscribed_at?: string;
        updated_at?: string;
        };
        Update: {
        created_at?: string | null;
        email?: string;
        first_name?: string | null;
        id?: string;
        metadata?: Json | null;
        source?: string | null;
        status?: string;
        subscribed_at?: string | null;
        unsubscribe_reason?: string | null;
        unsubscribed_at?: string | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      notification_delivery_log: {
        Row: {
        body: string;
        channels: Json;
        created_at: string;
        delivered_at: string | null;
        error: string | null;
        id: string;
        notification_id: string;
        status: string;
        title: string;
        type: string;
        updated_at: string;
        user_id: string;
        };
        Insert: {
        body: string;
        channels?: Json;
        created_at?: string;
        delivered_at?: string;
        error?: string;
        id?: string;
        notification_id: string;
        status: string;
        title: string;
        type: string;
        updated_at?: string;
        user_id: string;
        };
        Update: {
        body?: string;
        channels?: Json;
        created_at?: string;
        delivered_at?: string | null;
        error?: string | null;
        id?: string;
        notification_id?: string;
        status?: string;
        title?: string;
        type?: string;
        updated_at?: string;
        user_id?: string;
        };
        Relationships: [];
      },
      notification_digest_queue: {
        Row: {
        body: string;
        category: Database["public"]["Enums"]["notification_category"];
        created_at: string;
        data: Json | null;
        error_message: string | null;
        frequency: string;
        id: string;
        notification_type: string;
        scheduled_for: string;
        sent_at: string | null;
        status: string;
        title: string;
        user_id: string;
        };
        Insert: {
        body: string;
        category: Database["public"]["Enums"]["notification_category"];
        created_at?: string;
        data?: Json;
        error_message?: string;
        frequency: string;
        id?: string;
        notification_type: string;
        scheduled_for: string;
        sent_at?: string;
        status?: string;
        title: string;
        user_id: string;
        };
        Update: {
        body?: string;
        category?: Database["public"]["Enums"]["notification_category"];
        created_at?: string;
        data?: Json | null;
        error_message?: string | null;
        frequency?: string;
        id?: string;
        notification_type?: string;
        scheduled_for?: string;
        sent_at?: string | null;
        status?: string;
        title?: string;
        user_id?: string;
        };
        Relationships: [];
      },
      notification_preferences: {
        Row: {
        category: Database["public"]["Enums"]["notification_category"];
        channel: Database["public"]["Enums"]["notification_channel"];
        created_at: string;
        enabled: boolean;
        frequency: string;
        id: string;
        quiet_hours_enabled: boolean | null;
        quiet_hours_end: string | null;
        quiet_hours_start: string | null;
        updated_at: string;
        user_id: string;
        };
        Insert: {
        category: Database["public"]["Enums"]["notification_category"];
        channel: Database["public"]["Enums"]["notification_channel"];
        created_at?: string;
        enabled?: boolean;
        frequency?: string;
        id?: string;
        quiet_hours_enabled?: boolean;
        quiet_hours_end?: string;
        quiet_hours_start?: string;
        updated_at?: string;
        user_id: string;
        };
        Update: {
        category?: Database["public"]["Enums"]["notification_category"];
        channel?: Database["public"]["Enums"]["notification_channel"];
        created_at?: string;
        enabled?: boolean;
        frequency?: string;
        id?: string;
        quiet_hours_enabled?: boolean | null;
        quiet_hours_end?: string | null;
        quiet_hours_start?: string | null;
        updated_at?: string;
        user_id?: string;
        };
        Relationships: [];
      },
      notification_priority_config: {
        Row: {
        base_priority: number;
        bypass_consolidation: boolean;
        bypass_quiet_hours: boolean;
        consolidation_window_minutes: number | null;
        max_per_hour: number | null;
        notification_type: string;
        ttl_seconds: number | null;
        };
        Insert: {
        base_priority?: number;
        bypass_consolidation?: boolean;
        bypass_quiet_hours?: boolean;
        consolidation_window_minutes?: number;
        max_per_hour?: number;
        notification_type: string;
        ttl_seconds?: number;
        };
        Update: {
        base_priority?: number;
        bypass_consolidation?: boolean;
        bypass_quiet_hours?: boolean;
        consolidation_window_minutes?: number | null;
        max_per_hour?: number | null;
        notification_type?: string;
        ttl_seconds?: number | null;
        };
        Relationships: [];
      },
      notification_queue: {
        Row: {
        body: string | null;
        consolidated_count: number | null;
        consolidated_ids: Array<string> | null;
        consolidation_key: string | null;
        created_at: string;
        error_message: string | null;
        id: string;
        notification_type: string;
        payload: Json;
        priority: number;
        processed_at: string | null;
        scheduled_for: string;
        status: string;
        title: string;
        user_id: string;
        };
        Insert: {
        body?: string;
        consolidated_count?: number;
        consolidated_ids?: Array<string>;
        consolidation_key?: string;
        created_at?: string;
        error_message?: string;
        id?: string;
        notification_type: string;
        payload?: Json;
        priority?: number;
        processed_at?: string;
        scheduled_for?: string;
        status?: string;
        title: string;
        user_id: string;
        };
        Update: {
        body?: string | null;
        consolidated_count?: number | null;
        consolidated_ids?: Array<string> | null;
        consolidation_key?: string | null;
        created_at?: string;
        error_message?: string | null;
        id?: string;
        notification_type?: string;
        payload?: Json;
        priority?: number;
        processed_at?: string | null;
        scheduled_for?: string;
        status?: string;
        title?: string;
        user_id?: string;
        };
        Relationships: [];
      },
      notification_settings: {
        Row: {
        created_at: string;
        daily_digest_enabled: boolean;
        daily_digest_time: string;
        dnd_enabled: boolean;
        dnd_until: string | null;
        email_enabled: boolean;
        phone_number: string | null;
        phone_verified: boolean;
        push_enabled: boolean;
        quiet_hours_enabled: boolean;
        quiet_hours_end: string;
        quiet_hours_start: string;
        sms_enabled: boolean;
        telegram_enabled: boolean;
        timezone: string;
        updated_at: string;
        user_id: string;
        weekly_digest_day: number;
        weekly_digest_enabled: boolean;
        };
        Insert: {
        created_at?: string;
        daily_digest_enabled?: boolean;
        daily_digest_time?: string;
        dnd_enabled?: boolean;
        dnd_until?: string;
        email_enabled?: boolean;
        phone_number?: string;
        phone_verified?: boolean;
        push_enabled?: boolean;
        quiet_hours_enabled?: boolean;
        quiet_hours_end?: string;
        quiet_hours_start?: string;
        sms_enabled?: boolean;
        telegram_enabled?: boolean;
        timezone?: string;
        updated_at?: string;
        user_id: string;
        weekly_digest_day?: number;
        weekly_digest_enabled?: boolean;
        };
        Update: {
        created_at?: string;
        daily_digest_enabled?: boolean;
        daily_digest_time?: string;
        dnd_enabled?: boolean;
        dnd_until?: string | null;
        email_enabled?: boolean;
        phone_number?: string | null;
        phone_verified?: boolean;
        push_enabled?: boolean;
        quiet_hours_enabled?: boolean;
        quiet_hours_end?: string;
        quiet_hours_start?: string;
        sms_enabled?: boolean;
        telegram_enabled?: boolean;
        timezone?: string;
        updated_at?: string;
        user_id?: string;
        weekly_digest_day?: number;
        weekly_digest_enabled?: boolean;
        };
        Relationships: [];
      },
      notification_templates: {
        Row: {
        body_template: string;
        channels: Array<string>;
        created_at: string;
        id: string;
        is_active: boolean;
        name: string;
        priority: string;
        title_template: string;
        type: string;
        updated_at: string;
        };
        Insert: {
        body_template: string;
        channels?: Array<string>;
        created_at?: string;
        id?: string;
        is_active?: boolean;
        name: string;
        priority?: string;
        title_template: string;
        type?: string;
        updated_at?: string;
        };
        Update: {
        body_template?: string;
        channels?: Array<string>;
        created_at?: string;
        id?: string;
        is_active?: boolean;
        name?: string;
        priority?: string;
        title_template?: string;
        type?: string;
        updated_at?: string;
        };
        Relationships: [];
      },
      notifications: {
        Row: {
        batch_index: number | null;
        error: string | null;
        id: number;
        initial_page_name: string | null;
        notification_image_url: string | null;
        notification_sound: string | null;
        notification_text: string | null;
        notification_title: string | null;
        num_batches: number | null;
        num_sent: number | null;
        parameter_data: string | null;
        profile_id: string | null;
        status: string | null;
        sync_version: number | null;
        target_audience: string | null;
        timestamp: Json | null;
        user_refs: string | null;
        users_ff: string | null;
        };
        Insert: {
        batch_index?: number;
        error?: string;
        id: number;
        initial_page_name?: string;
        notification_image_url?: string;
        notification_sound?: string;
        notification_text?: string;
        notification_title?: string;
        num_batches?: number;
        num_sent?: number;
        parameter_data?: string;
        profile_id?: string;
        status?: string;
        sync_version?: number;
        target_audience?: string;
        timestamp?: Json;
        user_refs?: string;
        users_ff?: string;
        };
        Update: {
        batch_index?: number | null;
        error?: string | null;
        id?: number;
        initial_page_name?: string | null;
        notification_image_url?: string | null;
        notification_sound?: string | null;
        notification_text?: string | null;
        notification_title?: string | null;
        num_batches?: number | null;
        num_sent?: number | null;
        parameter_data?: string | null;
        profile_id?: string | null;
        status?: string | null;
        sync_version?: number | null;
        target_audience?: string | null;
        timestamp?: Json | null;
        user_refs?: string | null;
        users_ff?: string | null;
        };
        Relationships: [];
      },
      organization_members: {
        Row: {
        created_at: string;
        id: string;
        organization_id: string;
        role: string | null;
        user_id: string;
        };
        Insert: {
        created_at?: string;
        id?: string;
        organization_id: string;
        role?: string;
        user_id: string;
        };
        Update: {
        created_at?: string;
        id?: string;
        organization_id?: string;
        role?: string | null;
        user_id?: string;
        };
        Relationships: [];
      },
      organizations: {
        Row: {
        created_at: string;
        id: string;
        name: string;
        slug: string;
        updated_at: string;
        };
        Insert: {
        created_at?: string;
        id?: string;
        name: string;
        slug: string;
        updated_at?: string;
        };
        Update: {
        created_at?: string;
        id?: string;
        name?: string;
        slug?: string;
        updated_at?: string;
        };
        Relationships: [];
      },
      orphaned_storage_cleanup: {
        Row: {
        bucket_id: string;
        created_at: string | null;
        deleted_at: string | null;
        id: number;
        name: string;
        size_bytes: number | null;
        };
        Insert: {
        bucket_id: string;
        created_at?: string;
        deleted_at?: string;
        id?: number;
        name: string;
        size_bytes?: number;
        };
        Update: {
        bucket_id?: string;
        created_at?: string | null;
        deleted_at?: string | null;
        id?: number;
        name?: string;
        size_bytes?: number | null;
        };
        Relationships: [];
      },
      pending_operations: {
        Row: {
        client_timestamp: string;
        conflict_resolution: Json | null;
        created_at: string;
        error_message: string | null;
        id: string;
        operation_type: string;
        payload: Json;
        record_id: string | null;
        server_timestamp: string;
        status: string;
        table_name: string;
        user_id: string;
        };
        Insert: {
        client_timestamp: string;
        conflict_resolution?: Json;
        created_at?: string;
        error_message?: string;
        id?: string;
        operation_type: string;
        payload: Json;
        record_id?: string;
        server_timestamp?: string;
        status?: string;
        table_name: string;
        user_id: string;
        };
        Update: {
        client_timestamp?: string;
        conflict_resolution?: Json | null;
        created_at?: string;
        error_message?: string | null;
        id?: string;
        operation_type?: string;
        payload?: Json;
        record_id?: string | null;
        server_timestamp?: string;
        status?: string;
        table_name?: string;
        user_id?: string;
        };
        Relationships: [];
      },
      post_activity_daily_stats: {
        Row: {
        created_at: string | null;
        date: string;
        id: string;
        post_type: string;
        posts_arranged: number | null;
        posts_collected: number | null;
        posts_created: number | null;
        posts_deleted: number | null;
        posts_expired: number | null;
        posts_reported: number | null;
        posts_updated: number | null;
        posts_viewed: number | null;
        total_contacts: number | null;
        total_likes: number | null;
        total_shares: number | null;
        unique_arrangers: number | null;
        unique_posters: number | null;
        unique_viewers: number | null;
        updated_at: string | null;
        };
        Insert: {
        created_at?: string;
        date: string;
        id?: string;
        post_type?: string;
        posts_arranged?: number;
        posts_collected?: number;
        posts_created?: number;
        posts_deleted?: number;
        posts_expired?: number;
        posts_reported?: number;
        posts_updated?: number;
        posts_viewed?: number;
        total_contacts?: number;
        total_likes?: number;
        total_shares?: number;
        unique_arrangers?: number;
        unique_posters?: number;
        unique_viewers?: number;
        updated_at?: string;
        };
        Update: {
        created_at?: string | null;
        date?: string;
        id?: string;
        post_type?: string;
        posts_arranged?: number | null;
        posts_collected?: number | null;
        posts_created?: number | null;
        posts_deleted?: number | null;
        posts_expired?: number | null;
        posts_reported?: number | null;
        posts_updated?: number | null;
        posts_viewed?: number | null;
        total_contacts?: number | null;
        total_likes?: number | null;
        total_shares?: number | null;
        unique_arrangers?: number | null;
        unique_posters?: number | null;
        unique_viewers?: number | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      post_activity_logs: {
        Row: {
        activity_type: Database["public"]["Enums"]["post_activity_type"];
        actor_id: string | null;
        changes: Json | null;
        created_at: string;
        id: string;
        ip_address: string | null;
        metadata: Json | null;
        new_state: Json | null;
        notes: string | null;
        post_id: number | null;
        previous_state: Json | null;
        reason: string | null;
        related_post_id: number | null;
        related_profile_id: string | null;
        related_room_id: string | null;
        request_id: string | null;
        user_agent: string | null;
        };
        Insert: {
        activity_type: Database["public"]["Enums"]["post_activity_type"];
        actor_id?: string;
        changes?: Json;
        created_at?: string;
        id?: string;
        ip_address?: string;
        metadata?: Json;
        new_state?: Json;
        notes?: string;
        post_id?: number;
        previous_state?: Json;
        reason?: string;
        related_post_id?: number;
        related_profile_id?: string;
        related_room_id?: string;
        request_id?: string;
        user_agent?: string;
        };
        Update: {
        activity_type?: Database["public"]["Enums"]["post_activity_type"];
        actor_id?: string | null;
        changes?: Json | null;
        created_at?: string;
        id?: string;
        ip_address?: string | null;
        metadata?: Json | null;
        new_state?: Json | null;
        notes?: string | null;
        post_id?: number | null;
        previous_state?: Json | null;
        reason?: string | null;
        related_post_id?: number | null;
        related_profile_id?: string | null;
        related_room_id?: string | null;
        request_id?: string | null;
        user_agent?: string | null;
        };
        Relationships: [];
      },
      post_reports: {
        Row: {
        ai_analysis: Json | null;
        ai_confidence: number | null;
        ai_recommended_action: string | null;
        ai_severity_score: number | null;
        created_at: string;
        description: string | null;
        id: string;
        moderator_action: string | null;
        moderator_id: string | null;
        moderator_notes: string | null;
        post_id: number;
        reason: string;
        reporter_id: string;
        resolved_at: string | null;
        status: string;
        updated_at: string;
        };
        Insert: {
        ai_analysis?: Json;
        ai_confidence?: number;
        ai_recommended_action?: string;
        ai_severity_score?: number;
        created_at?: string;
        description?: string;
        id?: string;
        moderator_action?: string;
        moderator_id?: string;
        moderator_notes?: string;
        post_id: number;
        reason: string;
        reporter_id: string;
        resolved_at?: string;
        status?: string;
        updated_at?: string;
        };
        Update: {
        ai_analysis?: Json | null;
        ai_confidence?: number | null;
        ai_recommended_action?: string | null;
        ai_severity_score?: number | null;
        created_at?: string;
        description?: string | null;
        id?: string;
        moderator_action?: string | null;
        moderator_id?: string | null;
        moderator_notes?: string | null;
        post_id?: number;
        reason?: string;
        reporter_id?: string;
        resolved_at?: string | null;
        status?: string;
        updated_at?: string;
        };
        Relationships: [];
      },
      post_views: {
        Row: {
        created_at: string;
        id: string;
        post_id: number;
        session_id: string | null;
        viewer_id: string | null;
        viewer_ip_hash: string | null;
        };
        Insert: {
        created_at?: string;
        id?: string;
        post_id: number;
        session_id?: string;
        viewer_id?: string;
        viewer_ip_hash?: string;
        };
        Update: {
        created_at?: string;
        id?: string;
        post_id?: number;
        session_id?: string | null;
        viewer_id?: string | null;
        viewer_ip_hash?: string | null;
        };
        Relationships: [];
      },
      posts: {
        Row: {
        admin_notes: string | null;
        available_hours: string;
        category_id: number | null;
        condition: string;
        contact_preferences: Array<string> | null;
        created_at: string;
        deleted_at: string | null;
        donation: string;
        donation_rules: string;
        embedding: number[] | null;
        expires_at: string | null;
        food_in_fridge: Json | null;
        fridge_id: string | null;
        has_pantry: boolean;
        id: number;
        images: Array<string> | null;
        is_active: boolean;
        is_arranged: boolean;
        label: string | null;
        linktree: string;
        local_map: string;
        location: unknown | null;
        location_json: Json | null;
        location_type: string;
        metadata: Json | null;
        network: string | null;
        news_articles: string;
        pickup_time: string;
        post_address: string;
        post_arranged_at: string | null;
        post_arranged_to: string | null;
        post_description: string;
        post_like_counter: number | null;
        post_name: string;
        post_slug: string | null;
        post_stripped_address: string | null;
        post_type: string;
        post_viewed_at: string;
        post_views: number;
        prefill_form: string;
        profile_id: string;
        quantity: string | null;
        sync_version: number | null;
        synced_to_motherduck: boolean | null;
        tags: Array<string> | null;
        transportation: string | null;
        updated_at: string;
        version: number;
        website: string;
        };
        Insert: {
        admin_notes?: string;
        available_hours?: string;
        category_id?: number;
        condition?: string;
        contact_preferences?: Array<string>;
        created_at?: string;
        deleted_at?: string;
        donation?: string;
        donation_rules?: string;
        embedding?: number[];
        expires_at?: string;
        food_in_fridge?: Json;
        fridge_id?: string;
        has_pantry?: boolean;
        id: number;
        images?: Array<string>;
        is_active?: boolean;
        is_arranged?: boolean;
        label?: string;
        linktree?: string;
        local_map?: string;
        location?: unknown;
        location_json?: Json;
        location_type?: string;
        metadata?: Json;
        network?: string;
        news_articles?: string;
        pickup_time?: string;
        post_address?: string;
        post_arranged_at?: string;
        post_arranged_to?: string;
        post_description?: string;
        post_like_counter?: number;
        post_name?: string;
        post_slug?: string;
        post_stripped_address?: string;
        post_type?: string;
        post_viewed_at?: string;
        post_views?: number;
        prefill_form?: string;
        profile_id: string;
        quantity?: string;
        sync_version?: number;
        synced_to_motherduck?: boolean;
        tags?: Array<string>;
        transportation?: string;
        updated_at?: string;
        version?: number;
        website?: string;
        };
        Update: {
        admin_notes?: string | null;
        available_hours?: string;
        category_id?: number | null;
        condition?: string;
        contact_preferences?: Array<string> | null;
        created_at?: string;
        deleted_at?: string | null;
        donation?: string;
        donation_rules?: string;
        embedding?: number[] | null;
        expires_at?: string | null;
        food_in_fridge?: Json | null;
        fridge_id?: string | null;
        has_pantry?: boolean;
        id?: number;
        images?: Array<string> | null;
        is_active?: boolean;
        is_arranged?: boolean;
        label?: string | null;
        linktree?: string;
        local_map?: string;
        location?: unknown | null;
        location_json?: Json | null;
        location_type?: string;
        metadata?: Json | null;
        network?: string | null;
        news_articles?: string;
        pickup_time?: string;
        post_address?: string;
        post_arranged_at?: string | null;
        post_arranged_to?: string | null;
        post_description?: string;
        post_like_counter?: number | null;
        post_name?: string;
        post_slug?: string | null;
        post_stripped_address?: string | null;
        post_type?: string;
        post_viewed_at?: string;
        post_views?: number;
        prefill_form?: string;
        profile_id?: string;
        quantity?: string | null;
        sync_version?: number | null;
        synced_to_motherduck?: boolean | null;
        tags?: Array<string> | null;
        transportation?: string | null;
        updated_at?: string;
        version?: number;
        website?: string;
        };
        Relationships: [];
      },
      posts_image_backup: {
        Row: {
        backed_up_at: string | null;
        id: number;
        image_url_1: string | null;
        image_url_2: string | null;
        image_url_3: string | null;
        };
        Insert: {
        backed_up_at?: string;
        id: number;
        image_url_1?: string;
        image_url_2?: string;
        image_url_3?: string;
        };
        Update: {
        backed_up_at?: string | null;
        id?: number;
        image_url_1?: string | null;
        image_url_2?: string | null;
        image_url_3?: string | null;
        };
        Relationships: [];
      },
      precomputed_feed_cells: {
        Row: {
        access_count: number;
        cell_id: string;
        center_lat: number;
        center_lng: number;
        computation_time_ms: number | null;
        computed_at: string;
        expires_at: string;
        feed_data: Json;
        item_count: number;
        last_accessed_at: string;
        radius_km: number;
        version: number;
        };
        Insert: {
        access_count?: number;
        cell_id: string;
        center_lat: number;
        center_lng: number;
        computation_time_ms?: number;
        computed_at?: string;
        expires_at?: string;
        feed_data: Json;
        item_count?: number;
        last_accessed_at?: string;
        radius_km?: number;
        version?: number;
        };
        Update: {
        access_count?: number;
        cell_id?: string;
        center_lat?: number;
        center_lng?: number;
        computation_time_ms?: number | null;
        computed_at?: string;
        expires_at?: string;
        feed_data?: Json;
        item_count?: number;
        last_accessed_at?: string;
        radius_km?: number;
        version?: number;
        };
        Relationships: [];
      },
      profile_stats: {
        Row: {
        created_at: string | null;
        five_stars_rating: boolean | null;
        four_stars_rating: boolean | null;
        items_received: number | null;
        items_shared: number | null;
        liked_challenges_counter: number | null;
        liked_forums_counter: number | null;
        liked_posts_counter: number | null;
        profile_id: string;
        rating_average: number | null;
        rating_count: number | null;
        reviewed_challenges_average_rating: number | null;
        reviewed_forum_average_rating: number | null;
        reviewed_posts_average_rating: number | null;
        reviews_challenge_counter: number | null;
        reviews_forum_counter: number | null;
        reviews_post_counter: number | null;
        shared_challenges_counter: number | null;
        shared_forums_counter: number | null;
        shared_posts_counter: number | null;
        shared_posts_with_five_users: boolean | null;
        updated_at: string | null;
        };
        Insert: {
        created_at?: string;
        five_stars_rating?: boolean;
        four_stars_rating?: boolean;
        items_received?: number;
        items_shared?: number;
        liked_challenges_counter?: number;
        liked_forums_counter?: number;
        liked_posts_counter?: number;
        profile_id: string;
        rating_average?: number;
        rating_count?: number;
        reviewed_challenges_average_rating?: number;
        reviewed_forum_average_rating?: number;
        reviewed_posts_average_rating?: number;
        reviews_challenge_counter?: number;
        reviews_forum_counter?: number;
        reviews_post_counter?: number;
        shared_challenges_counter?: number;
        shared_forums_counter?: number;
        shared_posts_counter?: number;
        shared_posts_with_five_users?: boolean;
        updated_at?: string;
        };
        Update: {
        created_at?: string | null;
        five_stars_rating?: boolean | null;
        four_stars_rating?: boolean | null;
        items_received?: number | null;
        items_shared?: number | null;
        liked_challenges_counter?: number | null;
        liked_forums_counter?: number | null;
        liked_posts_counter?: number | null;
        profile_id?: string;
        rating_average?: number | null;
        rating_count?: number | null;
        reviewed_challenges_average_rating?: number | null;
        reviewed_forum_average_rating?: number | null;
        reviewed_posts_average_rating?: number | null;
        reviews_challenge_counter?: number | null;
        reviews_forum_counter?: number | null;
        reviews_post_counter?: number | null;
        shared_challenges_counter?: number | null;
        shared_forums_counter?: number | null;
        shared_posts_counter?: number | null;
        shared_posts_with_five_users?: boolean | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      profiles: {
        Row: {
        about_me: string;
        available_days: Json | null;
        avatar_url: string;
        ban_reason: string | null;
        bio: string | null;
        birth_date: string;
        created_time: string;
        deleted_at: string | null;
        dietary_preferences: Json | null;
        email: string | null;
        email_verified: boolean | null;
        facebook: string;
        first_name: string;
        food_allergies: string | null;
        id: string;
        instagram: string;
        is_active: boolean | null;
        is_verified: boolean | null;
        language: string | null;
        last_seen_at: string | null;
        location: unknown | null;
        location_sharing_enabled: boolean | null;
        nickname: string;
        notification_preferences: Json | null;
        onboarding_completed: boolean;
        phone: string;
        phone_number: string | null;
        preferred_contact_method: string | null;
        preferred_locale: string | null;
        preferred_pickup_time: Json | null;
        profile_visibility: string | null;
        search_radius_km: number | null;
        search_radius_mi: number | null;
        second_name: string;
        synced_to_motherduck: boolean | null;
        telegram_id: number | null;
        telegram_username: string | null;
        theme_preferences: Json | null;
        transportation: string;
        twitter: string;
        updated_at: string;
        verification_attempts: number | null;
        verification_code: string | null;
        verification_code_expires_at: string | null;
        verification_locked_until: string | null;
        whatsapp_phone: string | null;
        };
        Insert: {
        about_me?: string;
        available_days?: Json;
        avatar_url?: string;
        ban_reason?: string;
        bio?: string;
        birth_date?: string;
        created_time?: string;
        deleted_at?: string;
        dietary_preferences?: Json;
        email?: string;
        email_verified?: boolean;
        facebook?: string;
        first_name?: string;
        food_allergies?: string;
        id: string;
        instagram?: string;
        is_active?: boolean;
        is_verified?: boolean;
        language?: string;
        last_seen_at?: string;
        location?: unknown;
        location_sharing_enabled?: boolean;
        nickname?: string;
        notification_preferences?: Json;
        onboarding_completed?: boolean;
        phone?: string;
        phone_number?: string;
        preferred_contact_method?: string;
        preferred_locale?: string;
        preferred_pickup_time?: Json;
        profile_visibility?: string;
        search_radius_km?: number;
        search_radius_mi?: number;
        second_name?: string;
        synced_to_motherduck?: boolean;
        telegram_id?: number;
        telegram_username?: string;
        theme_preferences?: Json;
        transportation?: string;
        twitter?: string;
        updated_at?: string;
        verification_attempts?: number;
        verification_code?: string;
        verification_code_expires_at?: string;
        verification_locked_until?: string;
        whatsapp_phone?: string;
        };
        Update: {
        about_me?: string;
        available_days?: Json | null;
        avatar_url?: string;
        ban_reason?: string | null;
        bio?: string | null;
        birth_date?: string;
        created_time?: string;
        deleted_at?: string | null;
        dietary_preferences?: Json | null;
        email?: string | null;
        email_verified?: boolean | null;
        facebook?: string;
        first_name?: string;
        food_allergies?: string | null;
        id?: string;
        instagram?: string;
        is_active?: boolean | null;
        is_verified?: boolean | null;
        language?: string | null;
        last_seen_at?: string | null;
        location?: unknown | null;
        location_sharing_enabled?: boolean | null;
        nickname?: string;
        notification_preferences?: Json | null;
        onboarding_completed?: boolean;
        phone?: string;
        phone_number?: string | null;
        preferred_contact_method?: string | null;
        preferred_locale?: string | null;
        preferred_pickup_time?: Json | null;
        profile_visibility?: string | null;
        search_radius_km?: number | null;
        search_radius_mi?: number | null;
        second_name?: string;
        synced_to_motherduck?: boolean | null;
        telegram_id?: number | null;
        telegram_username?: string | null;
        theme_preferences?: Json | null;
        transportation?: string;
        twitter?: string;
        updated_at?: string;
        verification_attempts?: number | null;
        verification_code?: string | null;
        verification_code_expires_at?: string | null;
        verification_locked_until?: string | null;
        whatsapp_phone?: string | null;
        };
        Relationships: [];
      },
      rate_limit_entries: {
        Row: {
        created_at: number;
        id: number;
        key: string;
        };
        Insert: {
        created_at: number;
        id?: number;
        key: string;
        };
        Update: {
        created_at?: number;
        id?: number;
        key?: string;
        };
        Relationships: [];
      },
      rate_limits: {
        Row: {
        id: string;
        identifier: string;
        request_count: number | null;
        window_start: string | null;
        };
        Insert: {
        id?: string;
        identifier: string;
        request_count?: number;
        window_start?: string;
        };
        Update: {
        id?: string;
        identifier?: string;
        request_count?: number | null;
        window_start?: string | null;
        };
        Relationships: [];
      },
      reaction_types: {
        Row: {
        emoji: string;
        id: number;
        name: string;
        sort_order: number | null;
        };
        Insert: {
        emoji: string;
        id?: number;
        name: string;
        sort_order?: number;
        };
        Update: {
        emoji?: string;
        id?: number;
        name?: string;
        sort_order?: number | null;
        };
        Relationships: [];
      },
      reports: {
        Row: {
        created_at: string;
        description: string;
        id: number;
        notes: string;
        profile_id: string;
        };
        Insert: {
        created_at?: string;
        description?: string;
        id: number;
        notes?: string;
        profile_id?: string;
        };
        Update: {
        created_at?: string;
        description?: string;
        id?: number;
        notes?: string;
        profile_id?: string;
        };
        Relationships: [];
      },
      reviews: {
        Row: {
        challenge_id: number | null;
        created_at: string;
        feedback: string;
        forum_id: number | null;
        id: number;
        notes: string;
        post_id: number | null;
        profile_id: string;
        reviewed_rating: number;
        };
        Insert: {
        challenge_id?: number;
        created_at?: string;
        feedback?: string;
        forum_id?: number;
        id: number;
        notes?: string;
        post_id?: number;
        profile_id: string;
        reviewed_rating?: number;
        };
        Update: {
        challenge_id?: number | null;
        created_at?: string;
        feedback?: string;
        forum_id?: number | null;
        id?: number;
        notes?: string;
        post_id?: number | null;
        profile_id?: string;
        reviewed_rating?: number;
        };
        Relationships: [];
      },
      roles: {
        Row: {
        created_at: string | null;
        description: string | null;
        id: number;
        name: string;
        };
        Insert: {
        created_at?: string;
        description?: string;
        id?: number;
        name: string;
        };
        Update: {
        created_at?: string | null;
        description?: string | null;
        id?: number;
        name?: string;
        };
        Relationships: [];
      },
      room_participants: {
        Row: {
        id: string;
        image: string;
        profile_id: string;
        room_id: string | null;
        text: string;
        timestamp: string;
        };
        Insert: {
        id?: string;
        image?: string;
        profile_id: string;
        room_id?: string;
        text?: string;
        timestamp?: string;
        };
        Update: {
        id?: string;
        image?: string;
        profile_id?: string;
        room_id?: string | null;
        text?: string;
        timestamp?: string;
        };
        Relationships: [];
      },
      rooms: {
        Row: {
        archived_at: string | null;
        deleted_at: string | null;
        email_to: string;
        id: string;
        is_archived: boolean;
        last_message: string;
        last_message_seen_by: string;
        last_message_sent_by: string;
        last_message_time: string;
        post_arranged_at: string | null;
        post_arranged_to: string | null;
        post_id: number | null;
        requester: string;
        sharer: string;
        sync_version: number | null;
        };
        Insert: {
        archived_at?: string;
        deleted_at?: string;
        email_to?: string;
        id?: string;
        is_archived?: boolean;
        last_message?: string;
        last_message_seen_by: string;
        last_message_sent_by: string;
        last_message_time?: string;
        post_arranged_at?: string;
        post_arranged_to?: string;
        post_id?: number;
        requester: string;
        sharer: string;
        sync_version?: number;
        };
        Update: {
        archived_at?: string | null;
        deleted_at?: string | null;
        email_to?: string;
        id?: string;
        is_archived?: boolean;
        last_message?: string;
        last_message_seen_by?: string;
        last_message_sent_by?: string;
        last_message_time?: string;
        post_arranged_at?: string | null;
        post_arranged_to?: string | null;
        post_id?: number | null;
        requester?: string;
        sharer?: string;
        sync_version?: number | null;
        };
        Relationships: [];
      },
      sync_checkpoints: {
        Row: {
        last_sync_at: string;
        last_sync_version: number;
        table_name: string;
        user_id: string;
        };
        Insert: {
        last_sync_at?: string;
        last_sync_version?: number;
        table_name: string;
        user_id: string;
        };
        Update: {
        last_sync_at?: string;
        last_sync_version?: number;
        table_name?: string;
        user_id?: string;
        };
        Relationships: [];
      },
      telegram_link_tokens: {
        Row: {
        created_at: string;
        expires_at: string;
        id: string;
        token: string;
        used_at: string | null;
        user_id: string;
        };
        Insert: {
        created_at?: string;
        expires_at: string;
        id?: string;
        token: string;
        used_at?: string;
        user_id: string;
        };
        Update: {
        created_at?: string;
        expires_at?: string;
        id?: string;
        token?: string;
        used_at?: string | null;
        user_id?: string;
        };
        Relationships: [];
      },
      telegram_rate_limits: {
        Row: {
        request_count: number | null;
        updated_at: string | null;
        user_id: number;
        window_start: string | null;
        };
        Insert: {
        request_count?: number;
        updated_at?: string;
        user_id: number;
        window_start?: string;
        };
        Update: {
        request_count?: number | null;
        updated_at?: string | null;
        user_id?: number;
        window_start?: string | null;
        };
        Relationships: [];
      },
      telegram_user_activity: {
        Row: {
        active_days: Array<string> | null;
        active_hours: Json | null;
        average_message_length: number | null;
        emoji_usage: Json | null;
        first_message_date: string | null;
        first_name: string | null;
        forward_count: number | null;
        hashtag_count: number | null;
        id: number;
        interactions: Json | null;
        last_message_date: string | null;
        last_name: string | null;
        link_count: number | null;
        media_count: number | null;
        mention_count: number | null;
        message_count: number | null;
        messages_per_day: Json | null;
        messages_per_month: Json | null;
        messages_per_week: Json | null;
        most_active_hour: number | null;
        most_used_words: Json | null;
        new_users: number | null;
        reply_count: number | null;
        sentiment_score: number | null;
        sticker_count: number | null;
        topics: Json | null;
        total_characters: number | null;
        total_messages: number | null;
        user_id: number;
        username: string | null;
        voice_message_count: number | null;
        };
        Insert: {
        active_days?: Array<string>;
        active_hours?: Json;
        average_message_length?: number;
        emoji_usage?: Json;
        first_message_date?: string;
        first_name?: string;
        forward_count?: number;
        hashtag_count?: number;
        id?: number;
        interactions?: Json;
        last_message_date?: string;
        last_name?: string;
        link_count?: number;
        media_count?: number;
        mention_count?: number;
        message_count?: number;
        messages_per_day?: Json;
        messages_per_month?: Json;
        messages_per_week?: Json;
        most_active_hour?: number;
        most_used_words?: Json;
        new_users?: number;
        reply_count?: number;
        sentiment_score?: number;
        sticker_count?: number;
        topics?: Json;
        total_characters?: number;
        total_messages?: number;
        user_id: number;
        username?: string;
        voice_message_count?: number;
        };
        Update: {
        active_days?: Array<string> | null;
        active_hours?: Json | null;
        average_message_length?: number | null;
        emoji_usage?: Json | null;
        first_message_date?: string | null;
        first_name?: string | null;
        forward_count?: number | null;
        hashtag_count?: number | null;
        id?: number;
        interactions?: Json | null;
        last_message_date?: string | null;
        last_name?: string | null;
        link_count?: number | null;
        media_count?: number | null;
        mention_count?: number | null;
        message_count?: number | null;
        messages_per_day?: Json | null;
        messages_per_month?: Json | null;
        messages_per_week?: Json | null;
        most_active_hour?: number | null;
        most_used_words?: Json | null;
        new_users?: number | null;
        reply_count?: number | null;
        sentiment_score?: number | null;
        sticker_count?: number | null;
        topics?: Json | null;
        total_characters?: number | null;
        total_messages?: number | null;
        user_id?: number;
        username?: string | null;
        voice_message_count?: number | null;
        };
        Relationships: [];
      },
      telegram_user_states: {
        Row: {
        expires_at: string | null;
        state: Json;
        updated_at: string | null;
        user_id: number;
        };
        Insert: {
        expires_at?: string;
        state: Json;
        updated_at?: string;
        user_id: number;
        };
        Update: {
        expires_at?: string | null;
        state?: Json;
        updated_at?: string | null;
        user_id?: number;
        };
        Relationships: [];
      },
      translation_analytics: {
        Row: {
        cached: boolean | null;
        delta_sync: boolean;
        device_id: string | null;
        fallback: boolean | null;
        id: string;
        ip_address: string | null;
        locale: string;
        platform: string;
        response_time_ms: number | null;
        status_code: number | null;
        timestamp: string | null;
        user_agent: string | null;
        user_id: string | null;
        };
        Insert: {
        cached?: boolean;
        delta_sync?: boolean;
        device_id?: string;
        fallback?: boolean;
        id?: string;
        ip_address?: string;
        locale: string;
        platform: string;
        response_time_ms?: number;
        status_code?: number;
        timestamp?: string;
        user_agent?: string;
        user_id?: string;
        };
        Update: {
        cached?: boolean | null;
        delta_sync?: boolean;
        device_id?: string | null;
        fallback?: boolean | null;
        id?: string;
        ip_address?: string | null;
        locale?: string;
        platform?: string;
        response_time_ms?: number | null;
        status_code?: number | null;
        timestamp?: string | null;
        user_agent?: string | null;
        user_id?: string | null;
        };
        Relationships: [];
      },
      translation_backfill_jobs: {
        Row: {
        completed_at: string | null;
        error_message: string | null;
        id: string;
        items_processed: number | null;
        job_type: string;
        started_at: string;
        status: string;
        triggered_by: string | null;
        };
        Insert: {
        completed_at?: string;
        error_message?: string;
        id?: string;
        items_processed?: number;
        job_type: string;
        started_at?: string;
        status?: string;
        triggered_by?: string;
        };
        Update: {
        completed_at?: string | null;
        error_message?: string | null;
        id?: string;
        items_processed?: number | null;
        job_type?: string;
        started_at?: string;
        status?: string;
        triggered_by?: string | null;
        };
        Relationships: [];
      },
      translation_cache: {
        Row: {
        compressed_data: string | null;
        compressed_size: number | null;
        created_at: string | null;
        etag: string;
        expires_at: string;
        id: string;
        locale: string;
        platform: string;
        uncompressed_size: number | null;
        };
        Insert: {
        compressed_data?: string;
        compressed_size?: number;
        created_at?: string;
        etag: string;
        expires_at: string;
        id?: string;
        locale: string;
        platform: string;
        uncompressed_size?: number;
        };
        Update: {
        compressed_data?: string | null;
        compressed_size?: number | null;
        created_at?: string | null;
        etag?: string;
        expires_at?: string;
        id?: string;
        locale?: string;
        platform?: string;
        uncompressed_size?: number | null;
        };
        Relationships: [];
      },
      translation_change_log: {
        Row: {
        change_type: string | null;
        changed_by: string | null;
        created_at: string | null;
        id: string;
        key_path: string;
        locale: string;
        new_value: string | null;
        old_value: string | null;
        version: string;
        };
        Insert: {
        change_type?: string;
        changed_by?: string;
        created_at?: string;
        id?: string;
        key_path: string;
        locale: string;
        new_value?: string;
        old_value?: string;
        version: string;
        };
        Update: {
        change_type?: string | null;
        changed_by?: string | null;
        created_at?: string | null;
        id?: string;
        key_path?: string;
        locale?: string;
        new_value?: string | null;
        old_value?: string | null;
        version?: string;
        };
        Relationships: [];
      },
      translation_errors: {
        Row: {
        error_code: string | null;
        error_message: string | null;
        id: string;
        locale: string;
        platform: string;
        timestamp: string | null;
        user_id: string | null;
        };
        Insert: {
        error_code?: string;
        error_message?: string;
        id?: string;
        locale: string;
        platform: string;
        timestamp?: string;
        user_id?: string;
        };
        Update: {
        error_code?: string | null;
        error_message?: string | null;
        id?: string;
        locale?: string;
        platform?: string;
        timestamp?: string | null;
        user_id?: string | null;
        };
        Relationships: [];
      },
      translation_platform_config: {
        Row: {
        background_sync_enabled: boolean | null;
        cache_ttl_seconds: number | null;
        compression_enabled: boolean | null;
        created_at: string | null;
        custom_headers: Json | null;
        id: string;
        max_batch_size: number | null;
        platform: string;
        prefetch_enabled: boolean | null;
        rate_limit_requests: number | null;
        rate_limit_window_seconds: number | null;
        realtime_enabled: boolean | null;
        streaming_enabled: boolean | null;
        supports_delta_updates: boolean | null;
        supports_offline_mode: boolean | null;
        updated_at: string | null;
        };
        Insert: {
        background_sync_enabled?: boolean;
        cache_ttl_seconds?: number;
        compression_enabled?: boolean;
        created_at?: string;
        custom_headers?: Json;
        id?: string;
        max_batch_size?: number;
        platform: string;
        prefetch_enabled?: boolean;
        rate_limit_requests?: number;
        rate_limit_window_seconds?: number;
        realtime_enabled?: boolean;
        streaming_enabled?: boolean;
        supports_delta_updates?: boolean;
        supports_offline_mode?: boolean;
        updated_at?: string;
        };
        Update: {
        background_sync_enabled?: boolean | null;
        cache_ttl_seconds?: number | null;
        compression_enabled?: boolean | null;
        created_at?: string | null;
        custom_headers?: Json | null;
        id?: string;
        max_batch_size?: number | null;
        platform?: string;
        prefetch_enabled?: boolean | null;
        rate_limit_requests?: number | null;
        rate_limit_window_seconds?: number | null;
        realtime_enabled?: boolean | null;
        streaming_enabled?: boolean | null;
        supports_delta_updates?: boolean | null;
        supports_offline_mode?: boolean | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      translation_queue: {
        Row: {
        attempts: number;
        content_id: string;
        content_type: string;
        created_at: string;
        error_message: string | null;
        field_name: string;
        id: string;
        processed_at: string | null;
        source_text: string;
        status: string;
        target_locale: string;
        };
        Insert: {
        attempts?: number;
        content_id: string;
        content_type: string;
        created_at?: string;
        error_message?: string;
        field_name: string;
        id?: string;
        processed_at?: string;
        source_text: string;
        status?: string;
        target_locale: string;
        };
        Update: {
        attempts?: number;
        content_id?: string;
        content_type?: string;
        created_at?: string;
        error_message?: string | null;
        field_name?: string;
        id?: string;
        processed_at?: string | null;
        source_text?: string;
        status?: string;
        target_locale?: string;
        };
        Relationships: [];
      },
      translation_service_usage: {
        Row: {
        chars_used: number | null;
        free_limit: number;
        id: number;
        month_year: string;
        service_name: string;
        updated_at: string | null;
        };
        Insert: {
        chars_used?: number;
        free_limit: number;
        id?: number;
        month_year: string;
        service_name: string;
        updated_at?: string;
        };
        Update: {
        chars_used?: number | null;
        free_limit?: number;
        id?: number;
        month_year?: string;
        service_name?: string;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      translation_sync_status: {
        Row: {
        created_at: string | null;
        device_id: string | null;
        id: string;
        last_synced_at: string | null;
        last_synced_version: string | null;
        locale: string;
        pending_changes: Json | null;
        sync_status: string | null;
        updated_at: string | null;
        user_id: string | null;
        };
        Insert: {
        created_at?: string;
        device_id?: string;
        id?: string;
        last_synced_at?: string;
        last_synced_version?: string;
        locale: string;
        pending_changes?: Json;
        sync_status?: string;
        updated_at?: string;
        user_id?: string;
        };
        Update: {
        created_at?: string | null;
        device_id?: string | null;
        id?: string;
        last_synced_at?: string | null;
        last_synced_version?: string | null;
        locale?: string;
        pending_changes?: Json | null;
        sync_status?: string | null;
        updated_at?: string | null;
        user_id?: string | null;
        };
        Relationships: [];
      },
      translation_usage_analytics: {
        Row: {
        cache_hit: boolean;
        content_type: string;
        created_at: string | null;
        id: string;
        response_time_ms: number | null;
        target_locale: string;
        tokens_used: number | null;
        user_id: string | null;
        };
        Insert: {
        cache_hit: boolean;
        content_type: string;
        created_at?: string;
        id?: string;
        response_time_ms?: number;
        target_locale: string;
        tokens_used?: number;
        user_id?: string;
        };
        Update: {
        cache_hit?: boolean;
        content_type?: string;
        created_at?: string | null;
        id?: string;
        response_time_ms?: number | null;
        target_locale?: string;
        tokens_used?: number | null;
        user_id?: string | null;
        };
        Relationships: [];
      },
      translation_versions: {
        Row: {
        changes: Json;
        created_at: string | null;
        id: string;
        locale: string;
        previous_version: string | null;
        version: string;
        };
        Insert: {
        changes?: Json;
        created_at?: string;
        id?: string;
        locale: string;
        previous_version?: string;
        version: string;
        };
        Update: {
        changes?: Json;
        created_at?: string | null;
        id?: string;
        locale?: string;
        previous_version?: string | null;
        version?: string;
        };
        Relationships: [];
      },
      translations: {
        Row: {
        created_at: string | null;
        id: string;
        locale: string;
        messages: Json;
        updated_at: string | null;
        version: string;
        };
        Insert: {
        created_at?: string;
        id?: string;
        locale: string;
        messages?: Json;
        updated_at?: string;
        version: string;
        };
        Update: {
        created_at?: string | null;
        id?: string;
        locale?: string;
        messages?: Json;
        updated_at?: string | null;
        version?: string;
        };
        Relationships: [];
      },
      us_foodwaste_categories: {
        Row: {
        category: string;
        co2_impact_million_tonnes: number;
        cost_usd_billions: number;
        id: string;
        last_updated_at: string;
        source: string;
        waste_pct: number;
        waste_tonnes: number;
        };
        Insert: {
        category: string;
        co2_impact_million_tonnes: number;
        cost_usd_billions: number;
        id?: string;
        last_updated_at?: string;
        source?: string;
        waste_pct: number;
        waste_tonnes: number;
        };
        Update: {
        category?: string;
        co2_impact_million_tonnes?: number;
        cost_usd_billions?: number;
        id?: string;
        last_updated_at?: string;
        source?: string;
        waste_pct?: number;
        waste_tonnes?: number;
        };
        Relationships: [];
      },
      user_activity_summary: {
        Row: {
        categories_viewed: Json;
        first_activity_at: string | null;
        last_activity_at: string | null;
        listings_saved: number;
        listings_viewed: number;
        locations_searched: Json;
        messages_initiated: number;
        peak_activity_hours: Json;
        search_count: number;
        search_terms: Array<string>;
        shares_completed: number;
        updated_at: string;
        user_id: string;
        };
        Insert: {
        categories_viewed?: Json;
        first_activity_at?: string;
        last_activity_at?: string;
        listings_saved?: number;
        listings_viewed?: number;
        locations_searched?: Json;
        messages_initiated?: number;
        peak_activity_hours?: Json;
        search_count?: number;
        search_terms?: Array<string>;
        shares_completed?: number;
        updated_at?: string;
        user_id: string;
        };
        Update: {
        categories_viewed?: Json;
        first_activity_at?: string | null;
        last_activity_at?: string | null;
        listings_saved?: number;
        listings_viewed?: number;
        locations_searched?: Json;
        messages_initiated?: number;
        peak_activity_hours?: Json;
        search_count?: number;
        search_terms?: Array<string>;
        shares_completed?: number;
        updated_at?: string;
        user_id?: string;
        };
        Relationships: [];
      },
      user_addresses: {
        Row: {
        address_line1: string | null;
        address_line2: string | null;
        city: string | null;
        country: string | null;
        created_at: string | null;
        id: string;
        latitude: number | null;
        longitude: number | null;
        postal_code: string | null;
        profile_id: string;
        state_province: string | null;
        updated_at: string | null;
        };
        Insert: {
        address_line1?: string;
        address_line2?: string;
        city?: string;
        country?: string;
        created_at?: string;
        id?: string;
        latitude?: number;
        longitude?: number;
        postal_code?: string;
        profile_id: string;
        state_province?: string;
        updated_at?: string;
        };
        Update: {
        address_line1?: string | null;
        address_line2?: string | null;
        city?: string | null;
        country?: string | null;
        created_at?: string | null;
        id?: string;
        latitude?: number | null;
        longitude?: number | null;
        postal_code?: string | null;
        profile_id?: string;
        state_province?: string | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      user_events_2025_12: {
        Row: {
        created_at: string;
        event_data: Json;
        event_type: string;
        id: string;
        user_id: string;
        };
        Insert: {
        created_at?: string;
        event_data?: Json;
        event_type: string;
        id?: string;
        user_id: string;
        };
        Update: {
        created_at?: string;
        event_data?: Json;
        event_type?: string;
        id?: string;
        user_id?: string;
        };
        Relationships: [];
      },
      user_events_2026_01: {
        Row: {
        created_at: string;
        event_data: Json;
        event_type: string;
        id: string;
        user_id: string;
        };
        Insert: {
        created_at?: string;
        event_data?: Json;
        event_type: string;
        id?: string;
        user_id: string;
        };
        Update: {
        created_at?: string;
        event_data?: Json;
        event_type?: string;
        id?: string;
        user_id?: string;
        };
        Relationships: [];
      },
      user_events_2026_02: {
        Row: {
        created_at: string;
        event_data: Json;
        event_type: string;
        id: string;
        user_id: string;
        };
        Insert: {
        created_at?: string;
        event_data?: Json;
        event_type: string;
        id?: string;
        user_id: string;
        };
        Update: {
        created_at?: string;
        event_data?: Json;
        event_type?: string;
        id?: string;
        user_id?: string;
        };
        Relationships: [];
      },
      user_locale_preferences: {
        Row: {
        created_at: string | null;
        date_format: string | null;
        id: string;
        locale: string;
        number_format: string | null;
        timezone: string | null;
        updated_at: string | null;
        user_id: string | null;
        };
        Insert: {
        created_at?: string;
        date_format?: string;
        id?: string;
        locale?: string;
        number_format?: string;
        timezone?: string;
        updated_at?: string;
        user_id?: string;
        };
        Update: {
        created_at?: string | null;
        date_format?: string | null;
        id?: string;
        locale?: string;
        number_format?: string | null;
        timezone?: string | null;
        updated_at?: string | null;
        user_id?: string | null;
        };
        Relationships: [];
      },
      user_notifications: {
        Row: {
        actor_id: string | null;
        body: string | null;
        created_at: string | null;
        data: Json | null;
        email_sent: boolean | null;
        email_sent_at: string | null;
        id: string;
        is_read: boolean | null;
        post_id: number | null;
        push_sent: boolean | null;
        push_sent_at: string | null;
        read_at: string | null;
        recipient_id: string;
        review_id: number | null;
        room_id: string | null;
        title: string;
        type: string;
        updated_at: string | null;
        };
        Insert: {
        actor_id?: string;
        body?: string;
        created_at?: string;
        data?: Json;
        email_sent?: boolean;
        email_sent_at?: string;
        id?: string;
        is_read?: boolean;
        post_id?: number;
        push_sent?: boolean;
        push_sent_at?: string;
        read_at?: string;
        recipient_id: string;
        review_id?: number;
        room_id?: string;
        title: string;
        type: string;
        updated_at?: string;
        };
        Update: {
        actor_id?: string | null;
        body?: string | null;
        created_at?: string | null;
        data?: Json | null;
        email_sent?: boolean | null;
        email_sent_at?: string | null;
        id?: string;
        is_read?: boolean | null;
        post_id?: number | null;
        push_sent?: boolean | null;
        push_sent_at?: string | null;
        read_at?: string | null;
        recipient_id?: string;
        review_id?: number | null;
        room_id?: string | null;
        title?: string;
        type?: string;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      user_preferences: {
        Row: {
        created_at: string | null;
        email_notifications: boolean | null;
        feed_view_mode: string | null;
        id: string;
        language: string | null;
        notifications_enabled: boolean | null;
        preferred_categories: Array<number> | null;
        profile_id: string;
        push_notifications: boolean | null;
        search_radius_km: number | null;
        show_distance: boolean | null;
        theme: string | null;
        updated_at: string | null;
        };
        Insert: {
        created_at?: string;
        email_notifications?: boolean;
        feed_view_mode?: string;
        id?: string;
        language?: string;
        notifications_enabled?: boolean;
        preferred_categories?: Array<number>;
        profile_id: string;
        push_notifications?: boolean;
        search_radius_km?: number;
        show_distance?: boolean;
        theme?: string;
        updated_at?: string;
        };
        Update: {
        created_at?: string | null;
        email_notifications?: boolean | null;
        feed_view_mode?: string | null;
        id?: string;
        language?: string | null;
        notifications_enabled?: boolean | null;
        preferred_categories?: Array<number> | null;
        profile_id?: string;
        push_notifications?: boolean | null;
        search_radius_km?: number | null;
        show_distance?: boolean | null;
        theme?: string | null;
        updated_at?: string | null;
        };
        Relationships: [];
      },
      user_rate_limits: {
        Row: {
        count: number;
        created_at: string;
        id: number;
        key: string;
        reset_at: string;
        updated_at: string;
        user_id: string;
        };
        Insert: {
        count?: number;
        created_at?: string;
        id?: number;
        key: string;
        reset_at: string;
        updated_at?: string;
        user_id: string;
        };
        Update: {
        count?: number;
        created_at?: string;
        id?: number;
        key?: string;
        reset_at?: string;
        updated_at?: string;
        user_id?: string;
        };
        Relationships: [];
      },
      user_roles: {
        Row: {
        granted_at: string | null;
        granted_by: string | null;
        profile_id: string;
        role_id: number;
        };
        Insert: {
        granted_at?: string;
        granted_by?: string;
        profile_id: string;
        role_id: number;
        };
        Update: {
        granted_at?: string | null;
        granted_by?: string | null;
        profile_id?: string;
        role_id?: number;
        };
        Relationships: [];
      },
      views: {
        Row: {
        challenge_id: number | null;
        created_at: string | null;
        forum_id: number | null;
        id: number;
        post_id: number | null;
        profile_id: string;
        viewed_at: string | null;
        };
        Insert: {
        challenge_id?: number;
        created_at?: string;
        forum_id?: number;
        id?: number;
        post_id?: number;
        profile_id: string;
        viewed_at?: string;
        };
        Update: {
        challenge_id?: number | null;
        created_at?: string | null;
        forum_id?: number | null;
        id?: number;
        post_id?: number | null;
        profile_id?: string;
        viewed_at?: string | null;
        };
        Relationships: [];
      },
      waste_logs: {
        Row: {
        category: string | null;
        co2_impact_lbs: number | null;
        cost_usd: number | null;
        created_at: string;
        discard_date: string;
        food_name: string;
        household_id: string | null;
        id: string;
        profile_id: string | null;
        reason: string | null;
        updated_at: string;
        water_impact_gal: number | null;
        weight_lbs: number;
        };
        Insert: {
        category?: string;
        co2_impact_lbs?: number;
        cost_usd?: number;
        created_at?: string;
        discard_date?: string;
        food_name: string;
        household_id?: string;
        id?: string;
        profile_id?: string;
        reason?: string;
        updated_at?: string;
        water_impact_gal?: number;
        weight_lbs?: number;
        };
        Update: {
        category?: string | null;
        co2_impact_lbs?: number | null;
        cost_usd?: number | null;
        created_at?: string;
        discard_date?: string;
        food_name?: string;
        household_id?: string | null;
        id?: string;
        profile_id?: string | null;
        reason?: string | null;
        updated_at?: string;
        water_impact_gal?: number | null;
        weight_lbs?: number;
        };
        Relationships: [];
      },
      whatsapp_rate_limits: {
        Row: {
        phone_number: string;
        request_count: number | null;
        updated_at: string | null;
        window_start: string | null;
        };
        Insert: {
        phone_number: string;
        request_count?: number;
        updated_at?: string;
        window_start?: string;
        };
        Update: {
        phone_number?: string;
        request_count?: number | null;
        updated_at?: string | null;
        window_start?: string | null;
        };
        Relationships: [];
      },
      whatsapp_user_states: {
        Row: {
        expires_at: string;
        phone_number: string;
        state: Json;
        updated_at: string | null;
        };
        Insert: {
        expires_at: string;
        phone_number: string;
        state: Json;
        updated_at?: string;
        };
        Update: {
        expires_at?: string;
        phone_number?: string;
        state?: Json;
        updated_at?: string | null;
        };
        Relationships: [];
      }
    };
    Views: {
      analytics_full_favorites: {
        Row: {
        created_at: string | null;
        id: string | null;
        post_id: number | null;
        user_id: string | null;
        };
        Insert: {
        created_at?: string;
        id?: string;
        post_id?: number;
        user_id?: string;
        };
        Update: {
        created_at?: string | null;
        id?: string | null;
        post_id?: number | null;
        user_id?: string | null;
        };
        Relationships: [];
      }
      // view: postgrest returns this as read-only, but the generated
      // shape is identical to a table's so the client treats it as one.,
      analytics_full_listings: {
        Row: {
        created_at: string | null;
        id: number | null;
        is_active: boolean | null;
        is_arranged: boolean | null;
        latitude: number | null;
        longitude: number | null;
        post_address: string | null;
        post_arranged_at: string | null;
        post_arranged_to: string | null;
        post_description: string | null;
        post_like_counter: number | null;
        post_name: string | null;
        post_type: string | null;
        post_views: number | null;
        profile_id: string | null;
        synced_to_motherduck: boolean | null;
        updated_at: string | null;
        };
        Insert: {
        created_at?: string;
        id?: number;
        is_active?: boolean;
        is_arranged?: boolean;
        latitude?: number;
        longitude?: number;
        post_address?: string;
        post_arranged_at?: string;
        post_arranged_to?: string;
        post_description?: string;
        post_like_counter?: number;
        post_name?: string;
        post_type?: string;
        post_views?: number;
        profile_id?: string;
        synced_to_motherduck?: boolean;
        updated_at?: string;
        };
        Update: {
        created_at?: string | null;
        id?: number | null;
        is_active?: boolean | null;
        is_arranged?: boolean | null;
        latitude?: number | null;
        longitude?: number | null;
        post_address?: string | null;
        post_arranged_at?: string | null;
        post_arranged_to?: string | null;
        post_description?: string | null;
        post_like_counter?: number | null;
        post_name?: string | null;
        post_type?: string | null;
        post_views?: number | null;
        profile_id?: string | null;
        synced_to_motherduck?: boolean | null;
        updated_at?: string | null;
        };
        Relationships: [];
      }
      // view: postgrest returns this as read-only, but the generated
      // shape is identical to a table's so the client treats it as one.,
      analytics_full_reviews: {
        Row: {
        created_at: string | null;
        id: string | null;
        post_id: number | null;
        rating: number | null;
        review_type: string | null;
        reviewer_id: string | null;
        updated_at: string | null;
        };
        Insert: {
        created_at?: string;
        id?: string;
        post_id?: number;
        rating?: number;
        review_type?: string;
        reviewer_id?: string;
        updated_at?: string;
        };
        Update: {
        created_at?: string | null;
        id?: string | null;
        post_id?: number | null;
        rating?: number | null;
        review_type?: string | null;
        reviewer_id?: string | null;
        updated_at?: string | null;
        };
        Relationships: [];
      }
      // view: postgrest returns this as read-only, but the generated
      // shape is identical to a table's so the client treats it as one.,
      analytics_full_rooms: {
        Row: {
        created_at: string | null;
        id: string | null;
        last_message_at: string | null;
        post_id: number | null;
        requester_id: string | null;
        sharer_id: string | null;
        updated_at: string | null;
        };
        Insert: {
        created_at?: string;
        id?: string;
        last_message_at?: string;
        post_id?: number;
        requester_id?: string;
        sharer_id?: string;
        updated_at?: string;
        };
        Update: {
        created_at?: string | null;
        id?: string | null;
        last_message_at?: string | null;
        post_id?: number | null;
        requester_id?: string | null;
        sharer_id?: string | null;
        updated_at?: string | null;
        };
        Relationships: [];
      }
      // view: postgrest returns this as read-only, but the generated
      // shape is identical to a table's so the client treats it as one.,
      analytics_full_users: {
        Row: {
        avatar_url: string | null;
        bio: string | null;
        created_at: string | null;
        email: string | null;
        id: string | null;
        is_active: boolean | null;
        is_verified: boolean | null;
        last_seen_at: string | null;
        nickname: string | null;
        synced_to_motherduck: boolean | null;
        updated_at: string | null;
        };
        Insert: {
        avatar_url?: string;
        bio?: string;
        created_at?: string;
        email?: string;
        id?: string;
        is_active?: boolean;
        is_verified?: boolean;
        last_seen_at?: string;
        nickname?: string;
        synced_to_motherduck?: boolean;
        updated_at?: string;
        };
        Update: {
        avatar_url?: string | null;
        bio?: string | null;
        created_at?: string | null;
        email?: string | null;
        id?: string | null;
        is_active?: boolean | null;
        is_verified?: boolean | null;
        last_seen_at?: string | null;
        nickname?: string | null;
        synced_to_motherduck?: boolean | null;
        updated_at?: string | null;
        };
        Relationships: [];
      }
      // view: postgrest returns this as read-only, but the generated
      // shape is identical to a table's so the client treats it as one.,
      compression_efficiency: {
        Row: {
        avg_savings_percent: number | null;
        avg_time_ms: number | null;
        compression_method: string | null;
        total_saved_bytes: number | null;
        uses: number | null;
        };
        Insert: {
        avg_savings_percent?: number;
        avg_time_ms?: number;
        compression_method?: string;
        total_saved_bytes?: number;
        uses?: number;
        };
        Update: {
        avg_savings_percent?: number | null;
        avg_time_ms?: number | null;
        compression_method?: string | null;
        total_saved_bytes?: number | null;
        uses?: number | null;
        };
        Relationships: [];
      }
      // view: postgrest returns this as read-only, but the generated
      // shape is identical to a table's so the client treats it as one.,
      compression_stats: {
        Row: {
        avg_saved_percent: number | null;
        bucket: string | null;
        total_bytes_saved: number | null;
        total_compressed_bytes: number | null;
        total_compressions: number | null;
        total_original_bytes: number | null;
        };
        Insert: {
        avg_saved_percent?: number;
        bucket?: string;
        total_bytes_saved?: number;
        total_compressed_bytes?: number;
        total_compressions?: number;
        total_original_bytes?: number;
        };
        Update: {
        avg_saved_percent?: number | null;
        bucket?: string | null;
        total_bytes_saved?: number | null;
        total_compressed_bytes?: number | null;
        total_compressions?: number | null;
        total_original_bytes?: number | null;
        };
        Relationships: [];
      }
      // view: postgrest returns this as read-only, but the generated
      // shape is identical to a table's so the client treats it as one.,
      image_upload_stats: {
        Row: {
        avg_processing_time_ms: number | null;
        bucket: string | null;
        total_compressed_size: number | null;
        total_original_size: number | null;
        total_saved_bytes: number | null;
        total_uploads: number | null;
        unique_users: number | null;
        upload_date: string | null;
        };
        Insert: {
        avg_processing_time_ms?: number;
        bucket?: string;
        total_compressed_size?: number;
        total_original_size?: number;
        total_saved_bytes?: number;
        total_uploads?: number;
        unique_users?: number;
        upload_date?: string;
        };
        Update: {
        avg_processing_time_ms?: number | null;
        bucket?: string | null;
        total_compressed_size?: number | null;
        total_original_size?: number | null;
        total_saved_bytes?: number | null;
        total_uploads?: number | null;
        unique_users?: number | null;
        upload_date?: string | null;
        };
        Relationships: [];
      }
      // view: postgrest returns this as read-only, but the generated
      // shape is identical to a table's so the client treats it as one.,
      pending_automation_emails: {
        Row: {
        attempts: number | null;
        created_at: string | null;
        email: string | null;
        email_data: Json | null;
        enrollment_id: string | null;
        error_message: string | null;
        first_name: string | null;
        flow_id: string | null;
        id: string | null;
        last_attempt_at: string | null;
        max_attempts: number | null;
        profile_id: string | null;
        scheduled_for: string | null;
        second_name: string | null;
        sent_at: string | null;
        status: string | null;
        step_index: number | null;
        updated_at: string | null;
        };
        Insert: {
        attempts?: number;
        created_at?: string;
        email?: string;
        email_data?: Json;
        enrollment_id?: string;
        error_message?: string;
        first_name?: string;
        flow_id?: string;
        id?: string;
        last_attempt_at?: string;
        max_attempts?: number;
        profile_id?: string;
        scheduled_for?: string;
        second_name?: string;
        sent_at?: string;
        status?: string;
        step_index?: number;
        updated_at?: string;
        };
        Update: {
        attempts?: number | null;
        created_at?: string | null;
        email?: string | null;
        email_data?: Json | null;
        enrollment_id?: string | null;
        error_message?: string | null;
        first_name?: string | null;
        flow_id?: string | null;
        id?: string | null;
        last_attempt_at?: string | null;
        max_attempts?: number | null;
        profile_id?: string | null;
        scheduled_for?: string | null;
        second_name?: string | null;
        sent_at?: string | null;
        status?: string | null;
        step_index?: number | null;
        updated_at?: string | null;
        };
        Relationships: [];
      }
      // view: postgrest returns this as read-only, but the generated
      // shape is identical to a table's so the client treats it as one.,
      posts_with_location: {
        Row: {
        available_hours: string | null;
        canonical_slug: string | null;
        category_id: number | null;
        condition: string | null;
        created_at: string | null;
        expires_at: string | null;
        fridge_id: string | null;
        has_pantry: boolean | null;
        id: number | null;
        images: Array<string> | null;
        is_active: boolean | null;
        is_arranged: boolean | null;
        latitude: number | null;
        location: unknown | null;
        location_json: Json | null;
        location_type: string | null;
        longitude: number | null;
        metadata: Json | null;
        pickup_time: string | null;
        post_address: string | null;
        post_arranged_at: string | null;
        post_description: string | null;
        post_like_counter: number | null;
        post_name: string | null;
        post_slug: string | null;
        post_stripped_address: string | null;
        post_type: string | null;
        post_views: number | null;
        profile_id: string | null;
        quantity: string | null;
        slug: string | null;
        sync_version: number | null;
        tags: Array<string> | null;
        updated_at: string | null;
        version: number | null;
        };
        Insert: {
        available_hours?: string;
        canonical_slug?: string;
        category_id?: number;
        condition?: string;
        created_at?: string;
        expires_at?: string;
        fridge_id?: string;
        has_pantry?: boolean;
        id?: number;
        images?: Array<string>;
        is_active?: boolean;
        is_arranged?: boolean;
        latitude?: number;
        location?: unknown;
        location_json?: Json;
        location_type?: string;
        longitude?: number;
        metadata?: Json;
        pickup_time?: string;
        post_address?: string;
        post_arranged_at?: string;
        post_description?: string;
        post_like_counter?: number;
        post_name?: string;
        post_slug?: string;
        post_stripped_address?: string;
        post_type?: string;
        post_views?: number;
        profile_id?: string;
        quantity?: string;
        slug?: string;
        sync_version?: number;
        tags?: Array<string>;
        updated_at?: string;
        version?: number;
        };
        Update: {
        available_hours?: string | null;
        canonical_slug?: string | null;
        category_id?: number | null;
        condition?: string | null;
        created_at?: string | null;
        expires_at?: string | null;
        fridge_id?: string | null;
        has_pantry?: boolean | null;
        id?: number | null;
        images?: Array<string> | null;
        is_active?: boolean | null;
        is_arranged?: boolean | null;
        latitude?: number | null;
        location?: unknown | null;
        location_json?: Json | null;
        location_type?: string | null;
        longitude?: number | null;
        metadata?: Json | null;
        pickup_time?: string | null;
        post_address?: string | null;
        post_arranged_at?: string | null;
        post_description?: string | null;
        post_like_counter?: number | null;
        post_name?: string | null;
        post_slug?: string | null;
        post_stripped_address?: string | null;
        post_type?: string | null;
        post_views?: number | null;
        profile_id?: string | null;
        quantity?: string | null;
        slug?: string | null;
        sync_version?: number | null;
        tags?: Array<string> | null;
        updated_at?: string | null;
        version?: number | null;
        };
        Relationships: [];
      }
      // view: postgrest returns this as read-only, but the generated
      // shape is identical to a table's so the client treats it as one.,
      profiles_public: {
        Row: {
        about_me: string | null;
        avatar_url: string | null;
        created_time: string | null;
        first_name: string | null;
        id: string | null;
        is_active: boolean | null;
        is_verified: boolean | null;
        language: string | null;
        location: unknown | null;
        location_sharing_enabled: boolean | null;
        nickname: string | null;
        profile_visibility: string | null;
        search_radius_km: number | null;
        second_name: string | null;
        };
        Insert: {
        about_me?: string;
        avatar_url?: string;
        created_time?: string;
        first_name?: string;
        id?: string;
        is_active?: boolean;
        is_verified?: boolean;
        language?: string;
        location?: unknown;
        location_sharing_enabled?: boolean;
        nickname?: string;
        profile_visibility?: string;
        search_radius_km?: number;
        second_name?: string;
        };
        Update: {
        about_me?: string | null;
        avatar_url?: string | null;
        created_time?: string | null;
        first_name?: string | null;
        id?: string | null;
        is_active?: boolean | null;
        is_verified?: boolean | null;
        language?: string | null;
        location?: unknown | null;
        location_sharing_enabled?: boolean | null;
        nickname?: string | null;
        profile_visibility?: string | null;
        search_radius_km?: number | null;
        second_name?: string | null;
        };
        Relationships: [];
      }
      // view: postgrest returns this as read-only, but the generated
      // shape is identical to a table's so the client treats it as one.,
      recent_audit_activity: {
        Row: {
        action: string | null;
        created_at: string | null;
        id: string | null;
        ip_address: string | null;
        metadata: Json | null;
        resource_id: string | null;
        resource_type: string | null;
        user_agent: string | null;
        user_id: string | null;
        };
        Insert: {
        action?: string;
        created_at?: string;
        id?: string;
        ip_address?: string;
        metadata?: Json;
        resource_id?: string;
        resource_type?: string;
        user_agent?: string;
        user_id?: string;
        };
        Update: {
        action?: string | null;
        created_at?: string | null;
        id?: string | null;
        ip_address?: string | null;
        metadata?: Json | null;
        resource_id?: string | null;
        resource_type?: string | null;
        user_agent?: string | null;
        user_id?: string | null;
        };
        Relationships: [];
      }
      // view: postgrest returns this as read-only, but the generated
      // shape is identical to a table's so the client treats it as one.,
      storage_costs: {
        Row: {
        bucket: string | null;
        estimated_monthly_cost_usd: number | null;
        file_count: number | null;
        total_gb: number | null;
        };
        Insert: {
        bucket?: string;
        estimated_monthly_cost_usd?: number;
        file_count?: number;
        total_gb?: number;
        };
        Update: {
        bucket?: string | null;
        estimated_monthly_cost_usd?: number | null;
        file_count?: number | null;
        total_gb?: number | null;
        };
        Relationships: [];
      }
      // view: postgrest returns this as read-only, but the generated
      // shape is identical to a table's so the client treats it as one.,
      top_uploaders: {
        Row: {
        last_upload: string | null;
        total_saved: number | null;
        total_size_uploaded: number | null;
        upload_count: number | null;
        user_id: string | null;
        };
        Insert: {
        last_upload?: string;
        total_saved?: number;
        total_size_uploaded?: number;
        upload_count?: number;
        user_id?: string;
        };
        Update: {
        last_upload?: string | null;
        total_saved?: number | null;
        total_size_uploaded?: number | null;
        upload_count?: number | null;
        user_id?: string | null;
        };
        Relationships: [];
      }
      // view: postgrest returns this as read-only, but the generated
      // shape is identical to a table's so the client treats it as one.,
      vector_type_substituted: {
        Row: {
        missing: string | null;
        replaced: string | null;
        stand_in: string | null;
        };
        Insert: {
        missing?: string;
        replaced?: string;
        stand_in?: string;
        };
        Update: {
        missing?: string | null;
        replaced?: string | null;
        stand_in?: string | null;
        };
        Relationships: [];
      }
      // view: postgrest returns this as read-only, but the generated
      // shape is identical to a table's so the client treats it as one.
    };
    Functions: {
      acknowledge_alert: {
        Args: {
        p_alert_id: number | null;
        p_user_id: string | null;
      };
        Returns: boolean;
      },
      add_bookmark_to_collection: {
        Args: {
        p_forum_id: number | null;
        p_collection_id?: string | null;
        p_notes?: string | null;
        p_tags?: Array<string> | null;
        p_reminder_at?: string | null;
      };
        Returns: string;
      },
      add_post_to_series: {
        Args: {
        p_series_id: string | null;
        p_forum_id: number | null;
        p_chapter_title?: string | null;
        p_chapter_description?: string | null;
      };
        Returns: Json;
      },
      add_to_moderation_queue: {
        Args: {
        p_queue_type: string | null;
        p_content_type: string | null;
        p_forum_id?: number | null;
        p_comment_id?: number | null;
        p_message_id?: string | null;
        p_target_profile_id?: string | null;
        p_report_id?: string | null;
        p_flag_reason?: string | null;
        p_flag_score?: number | null;
        p_priority?: number | null;
      };
        Returns: string;
      },
      add_to_suppression_list: {
        Args: {
        p_email: string | null;
        p_reason: string | null;
        p_provider?: string | null;
        p_bounce_type?: string | null;
        p_bounce_subtype?: string | null;
        p_message_id?: string | null;
        p_expires_at?: string | null;
      };
        Returns: string;
      },
      address_in_view: {
        Args: {
        min_lat: number | null;
        min_long: number | null;
        max_lat: number | null;
        max_long: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      aggregate_daily_author_analytics: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      apply_pending_operation: {
        Args: {
        p_operation_id: string | null;
      };
        Returns: Json;
      },
      arrange_post: {
        Args: {
        p_post_id: number | null;
        p_requester_id: string | null;
      };
        Returns: Json;
      },
      audit_display_name_override_changes: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      auto_subscribe_post_author: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      award_reputation: {
        Args: {
        p_profile_id: string | null;
        p_action_key: string | null;
        p_source_profile_id?: string | null;
        p_source_forum_id?: number | null;
        p_source_comment_id?: number | null;
        p_description?: string | null;
      };
        Returns: number;
      },
      batch_delete_notifications: {
        Args: {
        p_user_id: string | null;
        p_notification_ids?: Array<number> | null;
        p_older_than_days?: number | null;
      };
        Returns: Json;
      },
      batch_mark_notifications_read: {
        Args: {
        p_user_id: string | null;
        p_notification_ids?: Array<number> | null;
        p_category?: string | null;
      };
        Returns: Json;
      },
      batch_record_email_metrics: {
        Args: {
        p_metrics: Json | null;
      };
        Returns: undefined;
      },
      billing_cleanup_old_events: {
        Args: {
        p_retention_days?: number | null;
      };
        Returns: Json;
      },
      billing_find_user_for_transaction: {
        Args: {
        p_app_account_token: string | null;
        p_original_transaction_id: string | null;
      };
        Returns: string;
      },
      billing_get_current_status: {
        Args: {
        p_original_transaction_id: string | null;
        p_platform: string | null;
      };
        Returns: string;
      },
      billing_get_user_subscription: {
        Args: {
        p_user_id: string | null;
      };
        Returns: Json;
      },
      billing_is_user_premium: {
        Args: {
        p_user_id: string | null;
      };
        Returns: boolean;
      },
      billing_mark_event_processed: {
        Args: {
        p_event_id: string | null;
        p_subscription_id?: string | null;
        p_error?: string | null;
      };
        Returns: undefined;
      },
      billing_process_dlq: {
        Args: Record<never, never>;
        Returns: Json;
      },
      billing_process_webhook_atomically: {
        Args: {
        p_notification_uuid: string | null;
        p_platform: string | null;
        p_notification_type: string | null;
        p_subtype: string | null;
        p_original_transaction_id: string | null;
        p_signed_payload: string | null;
        p_decoded_payload: Json | null;
        p_signed_date: string | null;
        p_user_id: string | null;
        p_product_id: string | null;
        p_bundle_id: string | null;
        p_status: string | null;
        p_purchase_date: string | null;
        p_original_purchase_date: string | null;
        p_expires_date: string | null;
        p_auto_renew_status: boolean | null;
        p_auto_renew_product_id: string | null;
        p_environment: string | null;
        p_app_account_token: string | null;
      };
        Returns: Json;
      },
      billing_record_subscription_event: {
        Args: {
        p_notification_uuid: string | null;
        p_platform?: string | null;
        p_notification_type?: string | null;
        p_subtype?: string | null;
        p_original_transaction_id?: string | null;
        p_signed_payload?: string | null;
        p_decoded_payload?: Json | null;
        p_signed_date?: string | null;
      };
        Returns: Json;
      },
      billing_update_daily_metrics: {
        Args: {
        p_date?: string | null;
      };
        Returns: Json;
      },
      billing_upsert_subscription: {
        Args: {
        p_user_id: string | null;
        p_platform?: string | null;
        p_original_transaction_id?: string | null;
        p_product_id?: string | null;
        p_bundle_id?: string | null;
        p_status?: string | null;
        p_purchase_date?: string | null;
        p_original_purchase_date?: string | null;
        p_expires_date?: string | null;
        p_auto_renew_status?: boolean | null;
        p_auto_renew_product_id?: string | null;
        p_environment?: string | null;
        p_app_account_token?: string | null;
      };
        Returns: string;
      },
      billing_validate_status_transition: {
        Args: {
        p_current_status: string | null;
        p_new_status: string | null;
        p_event_type: string | null;
      };
        Returns: boolean;
      },
      block_user: {
        Args: {
        p_blocked_id: string | null;
        p_reason?: string | null;
      };
        Returns: boolean;
      },
      calculate_hot_score: {
        Args: {
        p_likes: number | null;
        p_comments: number | null;
        p_reactions: number | null;
        p_views: number | null;
        p_created_at: string | null;
      };
        Returns: number;
      },
      calculate_next_occurrence: {
        Args: {
        p_recurrence_type: string | null;
        p_recurrence_day: number | null;
        p_recurrence_time: string | null;
        p_timezone: string | null;
      };
        Returns: string;
      },
      calculate_provider_health_score: {
        Args: {
        p_success_rate: number | null;
        p_avg_latency_ms: number | null;
        p_consecutive_failures: number | null;
      };
        Returns: number;
      },
      calculate_trust_level: {
        Args: {
        p_profile_id: string | null;
      };
        Returns: number;
      },
      call_update_locations: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      call_update_post_coordinates: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      cancel_arrangement: {
        Args: {
        p_post_id: number | null;
      };
        Returns: Json;
      },
      cancel_scheduled_post: {
        Args: {
        p_scheduled_id: string | null;
      };
        Returns: boolean;
      },
      cast_poll_vote: {
        Args: {
        p_poll_id: string | null;
        p_option_ids: Array<string> | null;
      };
        Returns: Json;
      },
      check_and_award_badges: {
        Args: {
        p_profile_id: string | null;
      };
        Returns: Array<string>;
      },
      check_client_compatibility: {
        Args: {
        p_platform: string | null;
        p_version: string | null;
      };
        Returns: Json;
      },
      check_for_duplicate_like: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      check_mfa_rate_limit: {
        Args: {
        p_profile_id: string | null;
        p_ip_address: string | null;
        p_limit_type: string | null;
        p_max_attempts?: number | null;
        p_window_duration?: string | null;
      };
        Returns: Json;
      },
      check_platform_rate_limit: {
        Args: {
        p_identifier: string | null;
        p_platform: string | null;
      };
        Returns: Json;
      },
      check_provider_quota: {
        Args: {
        p_provider: string | null;
        p_date?: string | null;
      };
        Returns: boolean;
      },
      check_provider_rate_limit: {
        Args: {
        p_provider: string | null;
        p_max_per_minute?: number | null;
      };
        Returns: boolean;
      },
      check_quiet_hours: {
        Args: {
        p_user_id: string | null;
      };
        Returns: boolean;
      },
      check_rate_limit: {
        Args: {
        p_identifier: string | null;
        p_max_requests?: number | null;
        p_window_seconds?: number | null;
      } | {
        p_key: string | null;
        p_limit: number | null;
        p_window_ms: number | null;
      } | {
        user_id: string | null;
        operation: string | null;
        max_requests: number | null;
        time_window_seconds: number | null;
      };
        Returns: boolean | Json;
      },
      check_trust_permission: {
        Args: {
        p_profile_id: string | null;
        p_permission: string | null;
      };
        Returns: boolean;
      },
      check_vault_secret_exists: {
        Args: {
        secret_name: string | null;
      };
        Returns: boolean;
      },
      claim_automation_queue: {
        Args: {
        p_batch_size?: number | null;
        p_stale_after_seconds?: number | null;
      };
        Returns: Array<unknown>;
      },
      claim_challenge_reward: {
        Args: {
        p_user_id: string | null;
        p_challenge_id: string | null;
      };
        Returns: Json;
      },
      claim_email_queue: {
        Args: {
        p_batch_size?: number | null;
        p_max_attempts?: number | null;
        p_stale_after_seconds?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      claim_queue_item: {
        Args: {
        p_queue_id: string | null;
      };
        Returns: boolean;
      },
      claim_telegram_link_token: {
        Args: {
        p_token: string | null;
        p_telegram_id: number | null;
        p_username?: string | null;
        p_first_name?: string | null;
      };
        Returns: Json;
      },
      clean_blog_content: {
        Args: {
        content: string | null;
      };
        Returns: string;
      },
      cleanup_cron_logs: {
        Args: {
        retention_days?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      cleanup_expired_feed_cells: {
        Args: Record<never, never>;
        Returns: number;
      },
      cleanup_expired_translations: {
        Args: Record<never, never>;
        Returns: number;
      },
      cleanup_forum_rate_limits: {
        Args: Record<never, never>;
        Returns: number;
      },
      cleanup_geocoding_cache: {
        Args: {
        p_max_age_days?: number | null;
      };
        Returns: number;
      },
      cleanup_old_analytics: {
        Args: {
        p_days?: number | null;
      };
        Returns: Json;
      },
      cleanup_old_audit_logs: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      cleanup_old_digest_queue: {
        Args: {
        p_days_old?: number | null;
      };
        Returns: number;
      },
      cleanup_old_drafts: {
        Args: Record<never, never>;
        Returns: number;
      },
      cleanup_old_events: {
        Args: {
        p_days?: number | null;
      };
        Returns: number;
      },
      cleanup_old_geocode_queue: {
        Args: {
        days_old?: number | null;
      };
        Returns: number;
      },
      cleanup_old_health_events: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      cleanup_old_image_metrics: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      cleanup_old_metrics: {
        Args: Record<never, never>;
        Returns: number;
      },
      cleanup_old_notifications: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      cleanup_old_queue_items: {
        Args: Record<never, never>;
        Returns: number;
      },
      cleanup_old_telegram_states: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      cleanup_rate_limit_entries: {
        Args: {
        p_max_age_ms?: number | null;
      };
        Returns: number;
      },
      clear_forum_search_history: {
        Args: Record<never, never>;
        Returns: boolean;
      },
      clear_reading_history: {
        Args: Record<never, never>;
        Returns: boolean;
      },
      complete_challenge: {
        Args: {
        p_user_id: string | null;
        p_challenge_id: number | null;
        p_proof_data?: Json | null;
      };
        Returns: Json;
      },
      complete_transaction: {
        Args: {
        p_post_id: number | null;
        p_sharer_id: string | null;
        p_receiver_id: string | null;
      };
        Returns: Json;
      },
      compute_feed_for_cell: {
        Args: {
        p_cell_id: string | null;
        p_lat: number | null;
        p_lng: number | null;
        p_radius_km?: number | null;
        p_limit?: number | null;
      };
        Returns: Json;
      },
      count_new_profiles_within_radius: {
        Args: {
        lat: number | null;
        lng: number | null;
        radius_meters?: number | null;
        days_ago?: number | null;
      };
        Returns: number;
      },
      count_posts_within_radius: {
        Args: {
        lat: number | null;
        lng: number | null;
        radius_meters?: number | null;
        days_ago?: number | null;
      };
        Returns: number;
      },
      count_profiles_within_radius: {
        Args: {
        lat: number | null;
        lng: number | null;
        radius_meters?: number | null;
      };
        Returns: number;
      },
      create_announcement: {
        Args: {
        p_title: string | null;
        p_content: string | null;
        p_announcement_type?: string | null;
        p_display_location?: string | null;
        p_target_type?: string | null;
        p_is_dismissible?: boolean | null;
        p_priority?: number | null;
        p_starts_at?: string | null;
        p_ends_at?: string | null;
        p_publish_immediately?: boolean | null;
      };
        Returns: string;
      },
      create_bookmark_collection: {
        Args: {
        p_name: string | null;
        p_description?: string | null;
        p_color?: string | null;
        p_icon_name?: string | null;
        p_is_private?: boolean | null;
      };
        Returns: string;
      },
      create_default_address: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      create_default_bookmark_collection: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      create_default_email_preferences: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      create_forum_comment: {
        Args: {
        p_user_id: string | null;
        p_forum_id: number | null;
        p_content: string | null;
        p_parent_id?: number | null;
        p_rich_content?: Json | null;
      };
        Returns: Json;
      },
      create_forum_notification: {
        Args: {
        p_recipient_id: string | null;
        p_actor_id: string | null;
        p_type: string | null;
        p_forum_id?: number | null;
        p_comment_id?: number | null;
        p_data?: Json | null;
      };
        Returns: string;
      },
      create_forum_poll: {
        Args: {
        p_forum_id: number | null;
        p_question: string | null;
        p_options: Array<string> | null;
        p_poll_type?: string | null;
        p_ends_at?: string | null;
        p_is_anonymous?: boolean | null;
        p_show_results_before_vote?: boolean | null;
      };
        Returns: Json;
      },
      create_forum_series: {
        Args: {
        p_title: string | null;
        p_description?: string | null;
        p_category_id?: number | null;
        p_difficulty_level?: string | null;
        p_cover_image?: string | null;
      };
        Returns: string;
      },
      create_listing_transactional: {
        Args: {
        p_profile_id: string | null;
        p_title: string | null;
        p_description?: string | null;
        p_post_type?: string | null;
        p_images?: Array<string> | null;
        p_latitude?: number | null;
        p_longitude?: number | null;
        p_pickup_address?: string | null;
        p_pickup_time?: string | null;
        p_category_id?: number | null;
      };
        Returns: Json;
      },
      create_mfa_challenge: {
        Args: {
        p_profile_id: string | null;
        p_method: string | null;
        p_ip_address?: string | null;
        p_user_agent?: string | null;
      };
        Returns: Json;
      },
      create_profile_stats: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      create_profile_stats_on_profile_insert: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      create_recurring_post: {
        Args: {
        p_title_template: string | null;
        p_description_template: string | null;
        p_recurrence_type: string | null;
        p_recurrence_time: string | null;
        p_category_id?: number | null;
        p_recurrence_day?: number | null;
        p_timezone?: string | null;
        p_max_occurrences?: number | null;
        p_end_date?: string | null;
      };
        Returns: string;
      },
      create_telegram_link_token: {
        Args: {
        p_ttl_minutes?: number | null;
      };
        Returns: Json;
      },
      create_user_notification: {
        Args: {
        p_recipient_id: string | null;
        p_actor_id: string | null;
        p_type: string | null;
        p_title: string | null;
        p_body?: string | null;
        p_post_id?: number | null;
        p_room_id?: string | null;
        p_review_id?: number | null;
        p_data?: Json | null;
      };
        Returns: string;
      },
      deactivate_expired_posts: {
        Args: {
        p_days_old?: number | null;
      };
        Returns: Json;
      },
      deactivate_post: {
        Args: {
        p_post_id: number | null;
      };
        Returns: Json;
      },
      decrement_forum_likes: {
        Args: {
        forum_id: number | null;
      };
        Returns: undefined;
      },
      decrypt_pii: {
        Args: {
        encrypted_data: string | null;
      };
        Returns: string;
      },
      deep_merge_jsonb: {
        Args: {
        base_obj: Json | null;
        merge_obj: Json | null;
      };
        Returns: Json;
      },
      delete_notification: {
        Args: {
        p_user_id: string | null;
        p_notification_id: string | null;
      };
        Returns: Json;
      },
      detect_forum_spam_patterns: {
        Args: {
        p_content: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      dismiss_announcement: {
        Args: {
        p_announcement_id: string | null;
      };
        Returns: boolean;
      },
      dispatch_notification_trigger: {
        Args: {
        p_path: string | null;
        p_record: Json | null;
        p_type: string | null;
        p_table: string | null;
        p_schema: string | null;
      };
        Returns: number;
      },
      email_template_version_trigger: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      encrypt_pii: {
        Args: {
        data: string | null;
      };
        Returns: string;
      },
      enforce_max_drafts: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      enroll_user_in_automation: {
        Args: {
        p_flow_id: string | null;
        p_profile_id: string | null;
      };
        Returns: string;
      },
      ensure_forum_user_stats: {
        Args: {
        p_profile_id: string | null;
      };
        Returns: undefined;
      },
      execute_readonly_query: {
        Args: {
        query_text: string | null;
      };
        Returns: Json;
      },
      extract_coordinates: {
        Args: {
        geog: unknown | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      extract_mentions: {
        Args: {
        p_text: string | null;
        p_mentioner_id: string | null;
        p_forum_id?: number | null;
        p_comment_id?: number | null;
      };
        Returns: Array<string>;
      },
      fail_automation_attempts: {
        Args: {
        p_ids: Array<string> | null;
        p_error_message: string | null;
        p_should_retry?: boolean | null;
      };
        Returns: number;
      },
      feature_forum_post: {
        Args: {
        p_forum_id: number | null;
        p_duration_hours?: number | null;
        p_reason?: string | null;
      };
        Returns: boolean;
      },
      filter_blocked_content: {
        Args: {
        p_profile_id: string | null;
      };
        Returns: boolean;
      },
      find_nearby_posts_geography: {
        Args: {
        user_location: unknown | null;
        radius_km?: number | null;
        p_post_type?: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      forum_check_rate_limit: {
        Args: {
        p_action_type: string | null;
        p_consume?: boolean | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      generate_backup_codes: {
        Args: {
        count?: number | null;
      };
        Returns: Array<string>;
      },
      generate_forum_slug: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      generate_mfa_code: {
        Args: Record<never, never>;
        Returns: string;
      },
      generate_translation_etag: {
        Args: {
        p_locale: string | null;
      };
        Returns: string;
      },
      geocode_address: {
        Args: {
        address: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      geocode_and_update_location: {
        Args: Record<never, never> | {
        post_id: number | null;
      };
        Returns: unknown | undefined;
      },
      get_active_announcements: {
        Args: {
        p_category_id?: number | null;
        p_location?: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_admin_users: {
        Args: {
        p_search_query?: string | null;
        p_role_filter?: string | null;
        p_limit?: number | null;
        p_offset?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_airtable_api_token: {
        Args: Record<never, never>;
        Returns: string;
      },
      get_airtable_key: {
        Args: Record<never, never>;
        Returns: string;
      },
      get_all_provider_health: {
        Args: {
        p_date?: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_app_config: {
        Args: {
        p_platform?: string | null;
      };
        Returns: Json;
      },
      get_app_settings: {
        Args: Record<never, never>;
        Returns: Json;
      },
      get_audit_stats: {
        Args: {
        hours?: number | null;
      };
        Returns: Json;
      },
      get_author_dashboard: {
        Args: {
        p_days?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_badge_collection: {
        Args: {
        p_profile_id: string | null;
      };
        Returns: Json;
      },
      get_batch_engagement_status: {
        Args: {
        p_post_ids: Array<number> | null;
      };
        Returns: Json;
      },
      get_bff_feed_data: {
        Args: {
        p_user_id: string | null;
        p_lat: number | null;
        p_lng: number | null;
        p_radius_km?: number | null;
        p_limit?: number | null;
        p_cursor?: string | null;
        p_post_type?: string | null;
        p_category_id?: number | null;
      };
        Returns: Json;
      },
      get_bff_messages_data: {
        Args: {
        p_user_id: string | null;
        p_limit?: number | null;
        p_cursor?: string | null;
        p_include_archived?: boolean | null;
      };
        Returns: Json;
      },
      get_bff_messages_data_internal: {
        Args: {
        p_user_id: string | null;
        p_limit?: number | null;
        p_cursor?: string | null;
        p_include_archived?: boolean | null;
      };
        Returns: Json;
      },
      get_bff_notifications_data: {
        Args: {
        p_user_id: string | null;
        p_filter?: string | null;
        p_page_limit?: number | null;
        p_page_offset?: number | null;
      };
        Returns: Json;
      },
      get_bff_profile_data: {
        Args: {
        p_profile_id: string | null;
        p_viewer_id: string | null;
        p_include_listings?: boolean | null;
        p_include_reviews?: boolean | null;
        p_listings_limit?: number | null;
        p_reviews_limit?: number | null;
      };
        Returns: Json;
      },
      get_bff_unread_counts: {
        Args: {
        p_user_id: string | null;
      };
        Returns: Json;
      },
      get_blocked_users: {
        Args: Record<never, never>;
        Returns: Array<Record<string, unknown>>;
      },
      get_bookmark_reminders: {
        Args: Record<never, never>;
        Returns: Array<Record<string, unknown>>;
      },
      get_campaign_fairness_metrics: {
        Args: {
        p_campaign_id: string | null;
      };
        Returns: Json;
      },
      get_challenge_detail: {
        Args: {
        p_challenge_id: number | null;
        p_user_id?: string | null;
      };
        Returns: Json;
      },
      get_challenge_leaderboard: {
        Args: {
        limit_count?: number | null;
      } | {
        p_challenge_id: number | null;
        p_limit?: number | null;
      };
        Returns: Array<Record<string, unknown>> | Json;
      },
      get_challenges_data: {
        Args: {
        p_user_id: string | null;
        p_include_completed?: boolean | null;
        p_include_upcoming?: boolean | null;
        p_include_leaderboard?: boolean | null;
        p_leaderboard_limit?: number | null;
        p_completed_limit?: number | null;
      };
        Returns: Json;
      },
      get_challenges_screen_data: {
        Args: {
        p_user_id?: string | null;
        p_difficulty?: string | null;
        p_sort_by?: string | null;
        p_page_limit?: number | null;
        p_page_offset?: number | null;
      };
        Returns: Json;
      },
      get_chat_screen_data: {
        Args: {
        p_room_id: string | null;
        p_user_id: string | null;
        p_messages_limit?: number | null;
      };
        Returns: Json;
      },
      get_chat_thread: {
        Args: {
        p_room_id: string | null;
        p_limit?: number | null;
        p_before_id?: string | null;
        p_mark_read?: boolean | null;
      };
        Returns: Json;
      },
      get_comment_reactions: {
        Args: {
        p_comment_id: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_comprehensive_quota_status: {
        Args: {
        p_organization_id?: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_connection_pool_stats: {
        Args: Record<never, never>;
        Returns: Array<Record<string, unknown>>;
      },
      get_crm_customer_summary: {
        Args: {
        p_customer_id: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_current_aal: {
        Args: {
        p_profile_id: string | null;
      };
        Returns: string;
      },
      get_dashboard_stats: {
        Args: Record<never, never>;
        Returns: Json;
      },
      get_delta_sync: {
        Args: {
        p_user_id: string | null;
        p_tables?: Array<string> | null;
      };
        Returns: Json;
      },
      get_delta_translations: {
        Args: {
        p_locale: string | null;
        p_from_version: string | null;
      };
        Returns: Json;
      },
      get_display_name_data: {
        Args: {
        p_user_id: string | null;
      };
        Returns: Json;
      },
      get_display_name_data_batch: {
        Args: {
        p_user_ids: Array<string> | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_draft_count: {
        Args: Record<never, never>;
        Returns: number;
      },
      get_edge_function_url: {
        Args: Record<never, never>;
        Returns: string;
      },
      get_email_dashboard_stats_v2: {
        Args: Record<never, never>;
        Returns: Json;
      },
      get_email_provider_health: {
        Args: Record<never, never>;
        Returns: Json;
      },
      get_email_template: {
        Args: {
        p_slug: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_email_template_history: {
        Args: {
        p_template_id: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_error_rate: {
        Args: {
        p_minutes?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_experiment_variant: {
        Args: {
        p_user_id: string | null;
        p_experiment_key: string | null;
      };
        Returns: Json;
      },
      get_feed_cache_stats: {
        Args: Record<never, never>;
        Returns: Json;
      },
      get_feed_initial_data: {
        Args: {
        p_latitude: number | null;
        p_longitude: number | null;
        p_radius_km?: number | null;
        p_feed_limit?: number | null;
        p_trending_limit?: number | null;
        p_post_type?: string | null;
        p_category_id?: number | null;
      } | {
        p_latitude: number | null;
        p_longitude: number | null;
        p_radius_km?: number | null;
        p_feed_limit?: number | null;
        p_trending_limit?: number | null;
        p_category_id?: number | null;
        p_post_type?: string | null;
      };
        Returns: Json;
      },
      get_filtered_feed: {
        Args: {
        p_latitude: number | null;
        p_longitude: number | null;
        p_radius_km?: number | null;
        p_category_id?: number | null;
        p_post_type?: string | null;
        p_search_query?: string | null;
        p_sort_by?: string | null;
        p_limit?: number | null;
        p_offset?: number | null;
      };
        Returns: Json;
      },
      get_forum_feed_data: {
        Args: {
        p_user_id?: string | null;
        p_category_id?: number | null;
        p_post_type?: string | null;
        p_sort_by?: string | null;
        p_page_limit?: number | null;
        p_page_offset?: number | null;
      };
        Returns: Json;
      },
      get_forum_post_detail: {
        Args: {
        p_post_id: number | null;
        p_user_id?: string | null;
        p_comments_limit?: number | null;
      };
        Returns: Json;
      },
      get_forum_rate_limits_status: {
        Args: Record<never, never>;
        Returns: Array<Record<string, unknown>>;
      },
      get_global_quota_status: {
        Args: Record<never, never>;
        Returns: Array<Record<string, unknown>>;
      },
      get_healthiest_provider: {
        Args: {
        p_email_type?: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_home_screen_data: {
        Args: {
        p_user_id: string | null;
        p_lat: number | null;
        p_lng: number | null;
        p_radius_km?: number | null;
        p_feed_limit?: number | null;
        p_trending_limit?: number | null;
      };
        Returns: Json;
      },
      get_large_uncompressed_images: {
        Args: {
        target_bucket?: string | null;
        size_threshold_bytes?: number | null;
        max_results?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_large_uncompressed_images_all_buckets: {
        Args: {
        size_threshold_bytes?: number | null;
        max_results?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_large_uncompressed_images_multi: {
        Args: {
        p_buckets?: Array<string> | null;
        p_min_size?: number | null;
        p_limit?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_latitude: {
        Args: {
        address: string | null;
      } | {
        loc: unknown | null;
      };
        Returns: number;
      },
      get_leaderboard_user_profile: {
        Args: {
        user_id: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_listing_detail_data: {
        Args: {
        p_listing_id: number | null;
        p_viewer_id?: string | null;
      };
        Returns: Json;
      },
      get_locations_in_viewport: {
        Args: {
        p_north: number | null;
        p_south: number | null;
        p_east: number | null;
        p_west: number | null;
        p_post_type?: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_login_spike_stats: {
        Args: {
        p_current_window_minutes?: number | null;
        p_baseline_window_hours?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_longitude: {
        Args: {
        address: string | null;
      } | {
        loc: unknown | null;
      };
        Returns: number;
      },
      get_mixed_activity_feed: {
        Args: {
        p_limit?: number | null;
        p_offset?: number | null;
      };
        Returns: Json;
      },
      get_mobile_home_data: {
        Args: {
        p_latitude?: number | null;
        p_longitude?: number | null;
        p_radius_km?: number | null;
        p_feed_limit?: number | null;
        p_challenges_limit?: number | null;
      };
        Returns: Json;
      },
      get_moderation_queue: {
        Args: {
        p_status?: string | null;
        p_queue_type?: string | null;
        p_assigned_to_me?: boolean | null;
        p_limit?: number | null;
        p_offset?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_moderation_stats: {
        Args: Record<never, never>;
        Returns: Json;
      },
      get_my_profile: {
        Args: {
        p_user_id: string | null;
      };
        Returns: Json;
      },
      get_my_scheduled_posts: {
        Args: {
        p_status?: string | null;
        p_limit?: number | null;
        p_offset?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_my_user_stats: {
        Args: Record<never, never>;
        Returns: Array<Record<string, unknown>>;
      },
      get_nearby_posts: {
        Args: {
        user_lat: number | null;
        user_lng: number | null;
        radius_meters?: number | null;
        post_type_filter?: string | null;
        cursor_distance?: number | null;
        cursor_id?: number | null;
        page_limit?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_nearby_posts_count: {
        Args: {
        user_lat: number | null;
        user_lng: number | null;
        radius_meters?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_notification_preferences: {
        Args: {
        p_user_id: string | null;
      };
        Returns: Json;
      },
      get_notification_summary: {
        Args: {
        p_user_id: string | null;
      };
        Returns: Json;
      },
      get_notifications_screen: {
        Args: {
        p_user_id: string | null;
        p_offset?: number | null;
        p_limit?: number | null;
        p_filter?: string | null;
      };
        Returns: Json;
      },
      get_or_compute_feed_cell: {
        Args: {
        p_lat: number | null;
        p_lng: number | null;
        p_radius_km?: number | null;
        p_limit?: number | null;
      };
        Returns: Json;
      },
      get_or_create_room: {
        Args: {
        p_post_id: number | null;
        p_sharer_id: string | null;
        p_requester_id: string | null;
      };
        Returns: Array<Record<string, unknown>> | Json;
      },
      get_or_translate: {
        Args: {
        p_content_type: string | null;
        p_content_id: string | null;
        p_field_name: string | null;
        p_source_locale: string | null;
        p_target_locale: string | null;
        p_source_text: string | null;
      } | {
        p_source_text: string | null;
        p_target_locale: string | null;
        p_content_type?: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_p95_latency: {
        Args: {
        p_minutes?: number | null;
      };
        Returns: number;
      },
      get_paginated_notifications: {
        Args: {
        p_user_id: string | null;
        p_limit?: number | null;
        p_offset?: number | null;
      };
        Returns: Json;
      },
      get_pending_digest_notifications: {
        Args: {
        p_frequency: string | null;
        p_limit?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_pending_emails_for_processing: {
        Args: {
        p_batch_size?: number | null;
        p_provider?: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_pending_geocode_queue: {
        Args: {
        batch_size?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_personalized_feed: {
        Args: {
        p_user_id: string | null;
        p_latitude: number | null;
        p_longitude: number | null;
        p_offset?: number | null;
        p_limit?: number | null;
      };
        Returns: Json;
      },
      get_platform_stats: {
        Args: {
        p_days?: number | null;
      };
        Returns: Json;
      },
      get_poll_results: {
        Args: {
        p_poll_id: string | null;
        p_profile_id: string | null;
      };
        Returns: Json;
      },
      get_post: {
        Args: {
        IN: unknown | null;
      };
        Returns: undefined;
      },
      get_post_activity_timeline: {
        Args: {
        p_post_id: number | null;
        p_limit?: number | null;
        p_offset?: number | null;
        p_activity_types?: Array<Database["public"]["Enums"]["post_activity_type"]> | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_post_analytics: {
        Args: {
        p_post_id: number | null;
        p_days?: number | null;
      };
        Returns: Json;
      },
      get_post_engagement_totals: {
        Args: Record<never, never>;
        Returns: Array<Record<string, unknown>>;
      },
      get_post_rating: {
        Args: {
        p_post_id: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_post_reactions: {
        Args: {
        p_forum_id: number | null;
        p_profile_id: string | null;
      };
        Returns: Json;
      },
      get_posts_in_bounds: {
        Args: {
        min_lat: number | null;
        min_lng: number | null;
        max_lat: number | null;
        max_lng: number | null;
        post_type_filter?: string | null;
        page_limit?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_profile_analytics: {
        Args: {
        p_user_id?: string | null;
      };
        Returns: Json;
      },
      get_profile_view: {
        Args: {
        p_profile_id: string | null;
        p_viewer_id?: string | null;
      };
        Returns: Json;
      },
      get_provider_health_summary: {
        Args: Record<never, never>;
        Returns: Array<Record<string, unknown>>;
      },
      get_quiet_hours_end: {
        Args: {
        p_user_id: string | null;
      };
        Returns: string;
      },
      get_ready_emails: {
        Args: {
        p_limit?: number | null;
      };
        Returns: Array<unknown>;
      },
      get_recent_critical_audit_events: {
        Args: {
        hours?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_reputation_leaderboard: {
        Args: {
        p_period?: string | null;
        p_limit?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_resend_api_key: {
        Args: Record<never, never>;
        Returns: string;
      },
      get_reviews_with_average: {
        Args: {
        p_post_id: number | null;
      };
        Returns: Json;
      },
      get_search_screen_data: {
        Args: {
        p_user_id?: string | null;
        p_query?: string | null;
        p_search_type?: string | null;
        p_latitude?: number | null;
        p_longitude?: number | null;
        p_radius_km?: number | null;
        p_category_id?: number | null;
        p_limit?: number | null;
        p_offset?: number | null;
      };
        Returns: Json;
      },
      get_search_suggestions: {
        Args: {
        p_partial_query: string | null;
        p_limit?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_secret_audited: {
        Args: {
        secret_name: string | null;
        requesting_user_id?: string | null;
        request_metadata?: Json | null;
      };
        Returns: string;
      },
      get_secrets: {
        Args: {
        secret_names: Array<string> | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_service_config: {
        Args: Record<never, never>;
        Returns: Json;
      },
      get_threaded_comments: {
        Args: {
        p_forum_id: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_translation_changes_since: {
        Args: {
        p_locale: string | null;
        p_since: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_translation_stats: {
        Args: Record<never, never> | {
        p_locale?: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_translation_usage: {
        Args: {
        p_service: string | null;
        p_month: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_translations_batch: {
        Args: {
        p_texts: Array<string> | null;
        p_target_locale: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_trending_items: {
        Args: {
        p_latitude: number | null;
        p_longitude: number | null;
        p_radius_km?: number | null;
        p_limit?: number | null;
        p_post_type?: string | null;
        p_urgency_threshold_hours?: number | null;
      };
        Returns: Json;
      },
      get_trending_posts: {
        Args: {
        p_limit?: number | null;
        p_offset?: number | null;
        p_hours_window?: number | null;
        p_latitude?: number | null;
        p_longitude?: number | null;
        p_radius_km?: number | null;
      };
        Returns: Json;
      },
      get_trending_searches: {
        Args: {
        p_limit?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_trust_limits: {
        Args: {
        p_profile_id: string | null;
      };
        Returns: Json;
      },
      get_uncompressed_large_images: {
        Args: {
        p_bucket: string | null;
        p_min_size: number | null;
        p_limit?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_underserved_users: {
        Args: {
        p_campaign_id: string | null;
        p_limit?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_unread_count: {
        Args: Record<never, never>;
        Returns: Json;
      },
      get_unread_feed_count: {
        Args: Record<never, never>;
        Returns: number;
      },
      get_unread_forum_notification_count: {
        Args: Record<never, never>;
        Returns: number;
      },
      get_unread_message_count: {
        Args: {
        p_profile_id?: string | null;
      };
        Returns: number;
      },
      get_unread_notification_count: {
        Args: {
        p_user_id: string | null;
      };
        Returns: number;
      },
      get_unread_posts: {
        Args: {
        p_category_id?: number | null;
        p_limit?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_untranslated_challenges: {
        Args: {
        p_limit?: number | null;
        p_offset?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_untranslated_forum_posts: {
        Args: {
        p_limit?: number | null;
        p_offset?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_untranslated_posts: {
        Args: {
        p_limit?: number | null;
        p_offset?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_upstash_redis_token: {
        Args: Record<never, never>;
        Returns: string;
      },
      get_upstash_redis_url: {
        Args: Record<never, never>;
        Returns: string;
      },
      get_user_bookmarks: {
        Args: {
        p_limit?: number | null;
      };
        Returns: Json;
      },
      get_user_challenges_with_counts: {
        Args: {
        p_user_id: string | null;
      };
        Returns: Json;
      },
      get_user_comment_reactions: {
        Args: {
        p_comment_ids: Array<number> | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_user_dashboard: {
        Args: {
        p_user_id: string | null;
        p_include_listings?: boolean | null;
        p_listings_limit?: number | null;
      };
        Returns: Json;
      },
      get_user_dashboard_fast: {
        Args: {
        p_user_id: string | null;
      };
        Returns: Json;
      },
      get_user_email_metrics: {
        Args: {
        p_user_id: string | null;
      };
        Returns: Json;
      },
      get_user_feature_flags: {
        Args: {
        p_user_id: string | null;
        p_platform?: string | null;
        p_app_version?: string | null;
      };
        Returns: Json;
      },
      get_user_feed: {
        Args: {
        p_limit?: number | null;
        p_offset?: number | null;
        p_include_own?: boolean | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_user_post_activity_summary: {
        Args: {
        p_user_id: string | null;
        p_days?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_user_post_activity_summary_internal: {
        Args: {
        p_user_id: string | null;
        p_days?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_user_preferences: {
        Args: {
        p_user_id: string | null;
      };
        Returns: Json;
      },
      get_user_reputation: {
        Args: {
        p_profile_id?: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_user_reviews_with_average: {
        Args: {
        p_user_id: string | null;
      };
        Returns: Json;
      },
      get_user_roles: {
        Args: {
        user_id: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      get_user_rooms: {
        Args: {
        p_user_id: string | null;
        p_search_query?: string | null;
        p_filter_type?: string | null;
        p_limit?: number | null;
        p_offset?: number | null;
      };
        Returns: Json;
      },
      get_user_settings: {
        Args: {
        p_user_id: string | null;
      };
        Returns: Json;
      },
      get_user_settings_internal: {
        Args: {
        p_user_id: string | null;
      };
        Returns: Json;
      },
      get_user_stats: {
        Args: {
        p_user_id: string | null;
      };
        Returns: Json;
      },
      get_user_stats_fast: {
        Args: {
        p_user_id: string | null;
        p_max_stale_minutes?: number | null;
      };
        Returns: Json;
      },
      get_user_trust_level: {
        Args: {
        p_user_id?: string | null;
      };
        Returns: number;
      },
      get_user_vault_access_summary: {
        Args: {
        user_uuid?: string | null;
      };
        Returns: Json;
      },
      get_vault_failure_count: {
        Args: {
        p_hours?: number | null;
      };
        Returns: number;
      },
      get_vault_secret: {
        Args: {
        secret_name: string | null;
      };
        Returns: string;
      },
      get_worker_secret: {
        Args: {
        p_secret_name: string | null;
      };
        Returns: string;
      },
      handle_comment_delete: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      handle_comment_insert: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      handle_new_user: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      handle_new_user_notifications: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      handle_new_user_to_address: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      handle_post_delete: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      has_any_role: {
        Args: {
        user_id: string | null;
        role_names: Array<string> | null;
      };
        Returns: boolean;
      },
      has_block_relationship: {
        Args: {
        p_user_id: string | null;
      };
        Returns: boolean;
      },
      has_role: {
        Args: {
        user_id: string | null;
        role_name: string | null;
      };
        Returns: boolean;
      },
      hash_mfa_code: {
        Args: {
        code: string | null;
      };
        Returns: string;
      },
      http_wrapper: {
        Args: {
        method: string | null;
        url: string | null;
        headers: Array<string> | null;
        body: string | null;
      };
        Returns: Json;
      },
      increment_challenge_views: {
        Args: {
        p_challenge_id: number | null;
      };
        Returns: Json;
      },
      increment_challenged_people: {
        Args: {
        p_challenge_id: number | null;
      };
        Returns: undefined;
      },
      increment_email_provider_stats: {
        Args: {
        p_provider: string | null;
        p_success: boolean | null;
        p_latency_ms?: number | null;
      };
        Returns: undefined;
      },
      increment_forum_likes: {
        Args: {
        forum_id: number | null;
      };
        Returns: undefined;
      },
      increment_forum_view: {
        Args: {
        p_forum_id: number | null;
      };
        Returns: undefined;
      },
      increment_forum_views: {
        Args: {
        p_forum_id: number | null;
      };
        Returns: Json;
      },
      increment_monthly_quota: {
        Args: {
        p_provider: string | null;
        p_organization_id?: string | null;
      };
        Returns: number;
      },
      increment_post_view: {
        Args: {
        p_post_id: number | null;
      };
        Returns: number;
      },
      increment_post_views: {
        Args: {
        IN: unknown | null;
      } | {
        p_post_id: number | null;
      };
        Returns: undefined | Json;
      },
      increment_provider_quota: {
        Args: {
        p_provider: string | null;
        p_date?: string | null;
      } | {
        p_provider: string | null;
        p_date?: string | null;
        p_organization_id?: string | null;
      };
        Returns: number;
      },
      increment_translation_usage: {
        Args: {
        p_service: string | null;
        p_month: string | null;
        p_chars: number | null;
        p_limit: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      increment_view_count: {
        Args: {
        item_id: number | null;
      };
        Returns: undefined;
      },
      init_notification_preferences: {
        Args: {
        p_user_id: string | null;
      };
        Returns: undefined;
      },
      insert_creator_into_room: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      invoke_image_compression: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      invoke_update_post_coordinates: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      invoke_upstash_health_check: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      is_admin: {
        Args: Record<never, never> | {
        user_id: string | null;
      };
        Returns: boolean;
      },
      is_admin_jsonb: {
        Args: Record<never, never>;
        Returns: boolean;
      },
      is_blocked_by_user: {
        Args: {
        p_user_id: string | null;
        p_target_user_id: string | null;
      };
        Returns: boolean;
      },
      is_email_suppressed: {
        Args: {
        p_email: string | null;
      };
        Returns: boolean;
      },
      is_room_participant: {
        Args: {
        profile_id: string | null;
        room_id: number | null;
      } | {
        room_id: number | null;
        profile_id: string | null;
      };
        Returns: boolean;
      },
      is_user_blocked: {
        Args: {
        p_user_id: string | null;
        p_target_user_id: string | null;
      };
        Returns: boolean;
      },
      is_valid_locale: {
        Args: {
        p_locale: string | null;
      };
        Returns: boolean;
      },
      join_challenge: {
        Args: {
        p_user_id: string | null;
        p_challenge_id: number | null;
      };
        Returns: Json;
      },
      jsonb_add_missing: {
        Args: {
        target: Json | null;
        source: Json | null;
      };
        Returns: Json;
      },
      jsonb_deep_merge: {
        Args: {
        a: Json | null;
        b: Json | null;
      };
        Returns: Json;
      },
      jsonb_set: {
        Args: {
        field: string | null;
        path: string | null;
        value: Json | null;
      };
        Returns: undefined;
      },
      lat_lng_to_geohash: {
        Args: {
        p_lat: number | null;
        p_lng: number | null;
        p_precision?: number | null;
      };
        Returns: string;
      },
      list_email_templates: {
        Args: {
        p_category?: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      list_required_secrets: {
        Args: Record<never, never>;
        Returns: Array<Record<string, unknown>>;
      },
      log_audit_event: {
        Args: {
        p_user_id: string | null;
        p_action: string | null;
        p_resource_type: string | null;
        p_resource_id: string | null;
        p_metadata?: Json | null;
      };
        Returns: string;
      },
      log_audit_event_internal: {
        Args: {
        p_user_id: string | null;
        p_action: string | null;
        p_resource_type: string | null;
        p_resource_id: string | null;
        p_metadata?: Json | null;
      };
        Returns: string;
      },
      log_moderator_action: {
        Args: {
        p_action_type: string | null;
        p_target_type: string | null;
        p_target_id: string | null;
        p_target_profile_id?: string | null;
        p_reason?: string | null;
        p_details?: Json | null;
      };
        Returns: string;
      },
      log_post_activity: {
        Args: {
        p_post_id: number | null;
        p_actor_id: string | null;
        p_activity_type: Database["public"]["Enums"]["post_activity_type"] | null;
        p_previous_state?: Json | null;
        p_new_state?: Json | null;
        p_changes?: Json | null;
        p_metadata?: Json | null;
        p_reason?: string | null;
        p_notes?: string | null;
        p_ip_address?: string | null;
        p_user_agent?: string | null;
        p_request_id?: string | null;
        p_related_post_id?: number | null;
        p_related_profile_id?: string | null;
        p_related_room_id?: string | null;
      };
        Returns: string;
      },
      manage_post_like_counter: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      mark_all_notifications_read: {
        Args: {
        p_user_id: string | null;
      };
        Returns: undefined;
      },
      mark_automation_email_sent: {
        Args: {
        p_queue_id: string | null;
        p_provider: string | null;
        p_message_id: string | null;
      };
        Returns: boolean;
      },
      mark_best_answer: {
        Args: {
        p_comment_id: number | null;
      };
        Returns: Json;
      },
      mark_category_as_read: {
        Args: {
        p_category_id: number | null;
      };
        Returns: number;
      },
      mark_conversation_read: {
        Args: {
        p_conversation_id: string | null;
      };
        Returns: undefined;
      },
      mark_digest_notifications_sent: {
        Args: {
        p_notification_ids: Array<string> | null;
      };
        Returns: undefined;
      },
      mark_email_as_failed: {
        Args: {
        p_delivery_id: string | null;
        p_error_code: string | null;
        p_error_message: string | null;
        p_should_retry?: boolean | null;
      };
        Returns: boolean;
      },
      mark_email_as_sent: {
        Args: {
        p_delivery_id: string | null;
        p_provider: string | null;
        p_message_id: string | null;
      };
        Returns: boolean;
      },
      mark_feed_read: {
        Args: {
        p_activity_ids: Array<string> | null;
      };
        Returns: number;
      },
      mark_forum_notifications_read: {
        Args: {
        p_notification_ids?: Array<string> | null;
      };
        Returns: number;
      },
      mark_geocode_completed: {
        Args: {
        queue_id: number | null;
      };
        Returns: undefined;
      },
      mark_geocode_failed: {
        Args: {
        queue_id: number | null;
        error_msg: string | null;
      };
        Returns: undefined;
      },
      mark_geocode_processing: {
        Args: {
        queue_id: number | null;
      };
        Returns: undefined;
      },
      mark_messages_read: {
        Args: {
        conversation_uuid: string | null;
      };
        Returns: Json;
      },
      mark_notification_read: {
        Args: {
        p_user_id: string | null;
        p_notification_id: string | null;
      };
        Returns: Json;
      },
      mark_notifications_read: {
        Args: {
        p_notification_ids: Array<string> | null;
      };
        Returns: undefined;
      },
      match_posts: {
        Args: {
        query_embedding: number[] | null;
        match_threshold: number | null;
        match_count: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      moderate_remove_post: {
        Args: {
        p_forum_id: number | null;
        p_reason?: string | null;
      };
        Returns: boolean;
      },
      moderate_toggle_post_lock: {
        Args: {
        p_forum_id: number | null;
        p_reason?: string | null;
      };
        Returns: boolean;
      },
      move_bookmark_to_collection: {
        Args: {
        p_bookmark_id: number | null;
        p_new_collection_id: string | null;
      };
        Returns: boolean;
      },
      move_failed_email_to_dlq: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      move_to_dead_letter_queue: {
        Args: {
        p_queue_id: string | null;
        p_failure_reason: string | null;
      };
        Returns: string;
      },
      nearby_address: {
        Args: {
        lat: number | null;
        long: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      nearby_community_fridges: {
        Args: {
        user_lat: number | null;
        user_lng: number | null;
        radius_meters?: number | null;
        limit_count?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      nearby_posts: {
        Args: {
        lat: number | null;
        long: number | null;
        p_post_type: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      nearby_posts_full: {
        Args: {
        user_lat: number | null;
        user_lng: number | null;
        radius_meters: number | null;
        post_type_filter?: string | null;
        category_filter?: number | null;
        limit_count?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      notify_forum_post_telegram: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      notify_new_chat_message: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      notify_new_feedback: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      notify_new_interest: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      notify_new_message: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      notify_new_post: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      notify_new_report: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      notify_new_review: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      notify_new_room_message: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      notify_new_user: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      notify_on_forum_comment: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      notify_on_forum_mention: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      notify_on_forum_reaction: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      notify_post_arranged: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      notify_review_received: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      notify_user_blocked: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      notify_user_verified: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      on_email_queued: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      on_post_user_unliked: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      post_views_trigger_func: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      postgres_fdw_disconnect: {
        Args: {
        arg1: string | null;
      };
        Returns: boolean;
      },
      postgres_fdw_disconnect_all: {
        Args: Record<never, never>;
        Returns: boolean;
      },
      postgres_fdw_get_connections: {
        Args: never;
        Returns: Array<Record<string, unknown>>;
      },
      postgres_fdw_handler: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      postgres_fdw_validator: {
        Args: {
        arg1: Array<string> | null;
        arg2: unknown | null;
      };
        Returns: undefined;
      },
      posts_in_view: {
        Args: {
        min_lat: number | null;
        min_long: number | null;
        max_lat: number | null;
        max_long: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      posts_location_json: {
        Args: {
        arg1: unknown | null;
      };
        Returns: Json;
      },
      posts_within_radius: {
        Args: {
        user_lat: number | null;
        user_lng: number | null;
        radius_meters?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      prevent_duplicate_rooms_insert: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      prevent_duplicate_rooms_insert_function: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      preview_automation_queue: {
        Args: {
        p_batch_size?: number | null;
      };
        Returns: Array<unknown>;
      },
      process_automation_queue_item: {
        Args: {
        p_queue_id: string | null;
      };
        Returns: Json;
      },
      process_bounce_event: {
        Args: {
        p_email: string | null;
        p_provider: string | null;
        p_event_type: string | null;
        p_bounce_type?: string | null;
        p_bounce_category?: string | null;
        p_message_id?: string | null;
        p_raw_payload?: Json | null;
      };
        Returns: undefined;
      },
      process_location_update_queue: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      process_notification_digest: {
        Args: Record<never, never>;
        Returns: Json;
      },
      process_notification_queue: {
        Args: {
        p_batch_size?: number | null;
      };
        Returns: Json;
      },
      process_publication_queue: {
        Args: Record<never, never>;
        Returns: number;
      },
      publish_draft: {
        Args: {
        p_draft_id: string | null;
      };
        Returns: Json;
      },
      publish_forum_series: {
        Args: {
        p_series_id: string | null;
      };
        Returns: boolean;
      },
      queue_email: {
        Args: {
        p_recipient_id: string | null;
        p_recipient_email: string | null;
        p_email_type: string | null;
        p_template_name: string | null;
        p_template_data?: Json | null;
      };
        Returns: string;
      },
      queue_location_update: {
        Args: Record<never, never> | {
        post_id: number | null;
      };
        Returns: unknown | undefined;
      },
      queue_nearby_notifications: {
        Args: {
        p_food_item_id: string | null;
        p_sender_id: string | null;
        p_latitude: number | null;
        p_longitude: number | null;
        p_title: string | null;
        p_notification_type?: string | null;
        p_radius_km?: number | null;
        p_consolidation_key?: string | null;
        p_bypass_quiet_hours?: boolean | null;
      };
        Returns: Json;
      },
      queue_newsletter_fair: {
        Args: {
        p_campaign_id: string | null;
        p_batch_size?: number | null;
      };
        Returns: Json;
      },
      queue_notification: {
        Args: {
        p_user_id: string | null;
        p_type: string | null;
        p_title: string | null;
        p_payload?: Json | null;
        p_priority?: number | null;
        p_consolidation_key?: string | null;
      };
        Returns: Json;
      },
      record_activity: {
        Args: {
        p_activity_type: string | null;
        p_target_forum_id?: number | null;
        p_target_comment_id?: number | null;
        p_target_profile_id?: string | null;
        p_target_badge_id?: number | null;
        p_target_series_id?: string | null;
        p_metadata?: Json | null;
        p_is_public?: boolean | null;
      } | {
        p_user_id: number | null;
        p_username: string | null;
        p_first_name: string | null;
        p_last_name: string | null;
        p_date: string | null;
        p_message_count: number | null;
        p_characters: number | null;
        p_media_count: number | null;
        p_reply_count: number | null;
        p_emoji_usage: Json | null;
        p_word_usage: Json | null;
      };
        Returns: string | undefined;
      },
      record_announcement_event: {
        Args: {
        p_announcement_id: string | null;
        p_event_type: string | null;
        p_page_url?: string | null;
      };
        Returns: undefined;
      },
      record_circuit_event: {
        Args: {
        p_circuit_name: string | null;
        p_state: string | null;
        p_previous_state?: string | null;
        p_failure_count?: number | null;
        p_success_count?: number | null;
        p_consecutive_failures?: number | null;
        p_trigger_reason?: string | null;
        p_app_platform?: string | null;
      };
        Returns: undefined;
      },
      record_compressed_image: {
        Args: {
        p_bucket: string | null;
        p_path: string | null;
        p_original_size: number | null;
        p_compressed_size: number | null;
      };
        Returns: undefined;
      },
      record_compression_result: {
        Args: {
        p_bucket: string | null;
        p_original_path: string | null;
        p_compressed_path?: string | null;
        p_original_size?: number | null;
        p_compressed_size?: number | null;
        p_original_width?: number | null;
        p_original_height?: number | null;
        p_compressed_width?: number | null;
        p_compressed_height?: number | null;
        p_original_format?: string | null;
        p_compressed_format?: string | null;
        p_compression_method?: string | null;
        p_quality_setting?: number | null;
        p_processing_time_ms?: number | null;
        p_status?: string | null;
        p_error_message?: string | null;
      };
        Returns: string;
      },
      record_email_metrics: {
        Args: {
        p_provider: string | null;
        p_success: boolean | null;
        p_latency_ms: number | null;
      };
        Returns: undefined;
      },
      record_email_send: {
        Args: {
        p_provider: string | null;
        p_success: boolean | null;
        p_latency_ms?: number | null;
        p_message_id?: string | null;
      };
        Returns: undefined;
      },
      record_forum_search: {
        Args: {
        p_query: string | null;
        p_filters?: Json | null;
        p_results_count?: number | null;
      };
        Returns: Json;
      },
      record_post_view_analytics: {
        Args: {
        p_forum_id: number | null;
        p_referrer?: string | null;
        p_device_type?: string | null;
        p_time_spent_seconds?: number | null;
      };
        Returns: undefined;
      },
      record_provider_failure: {
        Args: {
        p_provider: string | null;
        p_error_message: string | null;
        p_metadata?: Json | null;
      };
        Returns: undefined;
      },
      record_provider_metrics: {
        Args: {
        p_provider: string | null;
        p_success: boolean | null;
        p_latency_ms: number | null;
        p_error?: string | null;
      };
        Returns: undefined;
      },
      record_provider_success: {
        Args: {
        p_provider: string | null;
      };
        Returns: undefined;
      },
      record_request: {
        Args: {
        p_endpoint: string | null;
        p_method: string | null;
        p_response_time_ms: number | null;
        p_app_platform: string | null;
        p_app_version: string | null;
        p_cache_hit?: boolean | null;
        p_status_code?: number | null;
        p_error_type?: string | null;
        p_request_size?: number | null;
        p_response_size?: number | null;
      };
        Returns: undefined;
      },
      refresh_analytics_staging: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      refresh_user_email_health: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      refresh_user_stats_mv: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      release_automation_claims: {
        Args: {
        p_ids: Array<string> | null;
        p_error_message?: string | null;
      };
        Returns: number;
      },
      release_email_claims: {
        Args: {
        p_ids: Array<string> | null;
      };
        Returns: number;
      },
      reorder_series_posts: {
        Args: {
        p_series_id: string | null;
        p_post_orders: Json | null;
      };
        Returns: boolean;
      },
      request_item: {
        Args: {
        p_post_id: number | null;
        p_requester_id: string | null;
        p_message?: string | null;
      };
        Returns: Json;
      },
      requires_mfa: {
        Args: {
        p_profile_id: string | null;
      };
        Returns: boolean;
      },
      reset_circuit_breaker: {
        Args: {
        p_provider: string | null;
        p_organization_id?: string | null;
      };
        Returns: undefined;
      },
      reset_daily_email_quotas: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      reset_forum_user_rate_limit: {
        Args: {
        p_profile_id: string | null;
        p_action_type?: string | null;
      };
        Returns: boolean;
      },
      resolve_forum_report: {
        Args: {
        p_report_id: string | null;
        p_status: string | null;
        p_notes?: string | null;
      };
        Returns: boolean;
      },
      resolve_queue_item: {
        Args: {
        p_queue_id: string | null;
        p_resolution: string | null;
        p_notes?: string | null;
        p_issue_warning?: boolean | null;
        p_warning_type?: string | null;
      };
        Returns: boolean;
      },
      retry_dlq_email: {
        Args: {
        p_dlq_id: string | null;
      };
        Returns: string;
      },
      retry_queued_email: {
        Args: {
        p_queue_id: string | null;
        p_error_message: string | null;
      };
        Returns: boolean;
      },
      revenuecat_begin_reconciliation: {
        Args: {
        p_customer_id: string | null;
      };
        Returns: number;
      },
      revenuecat_commit: {
        Args: {
        p_customer_id: string | null;
        p_revision: number | null;
        p_has_access: boolean | null;
        p_expires_at: string | null;
      };
        Returns: boolean;
      },
      revenuecat_my_status: {
        Args: Record<never, never>;
        Returns: Json;
      },
      rollup_hourly_stats: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      save_forum_draft: {
        Args: {
        p_draft_id?: string | null;
        p_title?: string | null;
        p_description?: string | null;
        p_rich_content?: Json | null;
        p_category_id?: number | null;
        p_post_type?: string | null;
        p_tags?: Array<number> | null;
        p_image_url?: string | null;
        p_poll_data?: Json | null;
      };
        Returns: Json;
      },
      save_forum_search: {
        Args: {
        p_name: string | null;
        p_query: string | null;
        p_filters?: Json | null;
        p_notify_on_new?: boolean | null;
      };
        Returns: string;
      },
      schedule_post: {
        Args: {
        p_title: string | null;
        p_description: string | null;
        p_scheduled_for: string | null;
        p_category_id?: number | null;
        p_post_type?: string | null;
        p_tags?: Array<number> | null;
        p_rich_content?: Json | null;
        p_image_url?: string | null;
        p_poll_data?: Json | null;
        p_series_id?: string | null;
        p_notify_followers?: boolean | null;
        p_timezone?: string | null;
      };
        Returns: string;
      },
      scheduled_update_locations: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      search_all_functions: {
        Args: {
        search_string: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      search_food_items: {
        Args: {
        p_latitude: number | null;
        p_longitude: number | null;
        p_radius_km?: number | null;
        p_search_query?: string | null;
        p_category_id?: number | null;
        p_post_type?: string | null;
        p_available_only?: boolean | null;
        p_arranged_only?: boolean | null;
        p_sort_by?: string | null;
        p_limit?: number | null;
        p_offset?: number | null;
      };
        Returns: Json;
      },
      search_forum: {
        Args: {
        p_query: string | null;
        p_category_id?: number | null;
        p_limit?: number | null;
        p_offset?: number | null;
      } | {
        p_query: string | null;
        p_category_id?: number | null;
        p_tags?: Array<number> | null;
        p_author_id?: string | null;
        p_date_from?: string | null;
        p_date_to?: string | null;
        p_sort_by?: string | null;
        p_limit?: number | null;
        p_offset?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      search_functions: {
        Args: {
        search_string: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      search_trigger_functions: {
        Args: {
        search_string: string | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      send_chat_message: {
        Args: {
        p_room_id: string | null;
        p_sender_id: string | null;
        p_text: string | null;
        p_image?: string | null;
      };
        Returns: Json;
      },
      send_food_listing_notification: {
        Args: {
        p_recipient_id: string | null;
        p_food_item_id: string | null;
        p_food_name: string | null;
        p_distance_km: number | null;
      };
        Returns: boolean;
      },
      send_message: {
        Args: {
        p_conversation_id: string | null;
        p_content: string | null;
        p_message_type?: string | null;
        p_reply_to_id?: string | null;
        p_rich_content?: Json | null;
      };
        Returns: string;
      },
      send_review_reminder: {
        Args: {
        p_recipient_id: string | null;
        p_transaction_id: string | null;
        p_other_user_name: string | null;
      };
        Returns: boolean;
      },
      set_post_slug: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      should_send_notification: {
        Args: {
        p_user_id: string | null;
        p_category: string | null;
        p_channel: string | null;
      };
        Returns: Json;
      },
      silence_user: {
        Args: {
        p_profile_id: string | null;
        p_duration_hours: number | null;
        p_reason?: string | null;
      };
        Returns: boolean;
      },
      snapshot_provider_health: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      start_conversation: {
        Args: {
        p_participant_ids: Array<string> | null;
        p_title?: string | null;
        p_initial_message?: string | null;
      };
        Returns: string;
      },
      store_translation: {
        Args: {
        p_content_type: string | null;
        p_content_id: string | null;
        p_field_name: string | null;
        p_source_locale: string | null;
        p_target_locale: string | null;
        p_source_text: string | null;
        p_translated_text: string | null;
        p_quality_score?: number | null;
      } | {
        p_source_text: string | null;
        p_translated_text: string | null;
        p_target_locale: string | null;
        p_content_type?: string | null;
        p_quality_score?: number | null;
      };
        Returns: string;
      },
      strip_address: {
        Args: Record<never, never> | {
        full_address: string | null;
      };
        Returns: unknown | string;
      },
      submit_forum_report: {
        Args: {
        p_forum_id?: number | null;
        p_comment_id?: number | null;
        p_reason?: string | null;
        p_description?: string | null;
      };
        Returns: string;
      },
      submit_pending_operation: {
        Args: {
        p_user_id: string | null;
        p_operation_type: string | null;
        p_table_name: string | null;
        p_record_id: string | null;
        p_payload: Json | null;
        p_client_timestamp: string | null;
      };
        Returns: Json;
      },
      submit_review: {
        Args: {
        p_reviewer_id: string | null;
        p_post_id: number | null;
        p_rating: number | null;
        p_feedback?: string | null;
      };
        Returns: Json;
      },
      sync_email_provider_stats_internal: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      sync_locale_to_redis: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      sync_provider_health: {
        Args: {
        p_provider: string | null;
        p_health_score: number | null;
        p_latency_ms: number | null;
        p_daily_used?: number | null;
        p_daily_limit?: number | null;
        p_monthly_used?: number | null;
        p_monthly_limit?: number | null;
        p_delivered?: number | null;
        p_opened?: number | null;
        p_clicked?: number | null;
        p_bounced?: number | null;
        p_complained?: number | null;
      };
        Returns: undefined;
      },
      toggle_automation_cron: {
        Args: {
        p_enabled: boolean | null;
      };
        Returns: undefined;
      },
      toggle_bookmark: {
        Args: {
        p_post_id: number | null;
      };
        Returns: Json;
      },
      toggle_challenge_like: {
        Args: {
        p_challenge_id: number | null;
      };
        Returns: Json;
      },
      toggle_comment_like: {
        Args: {
        p_comment_id: number | null;
      };
        Returns: Json;
      },
      toggle_comment_reaction: {
        Args: {
        p_comment_id: number | null;
        p_reaction_type_id: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      toggle_featured_badge: {
        Args: {
        p_badge_id: number | null;
      };
        Returns: Json;
      },
      toggle_forum_bookmark: {
        Args: {
        p_forum_id: number | null;
      };
        Returns: Json;
      },
      toggle_forum_like: {
        Args: {
        p_forum_id: number | null;
      };
        Returns: Json;
      },
      toggle_forum_reaction: {
        Args: {
        p_forum_id: number | null;
        p_reaction_type: string | null;
      };
        Returns: Json;
      },
      toggle_forum_subscription: {
        Args: {
        p_forum_id?: number | null;
        p_category_id?: number | null;
      };
        Returns: Json;
      },
      toggle_like: {
        Args: {
        p_post_id: number | null;
      };
        Returns: Json;
      },
      toggle_pinned_comment: {
        Args: {
        p_comment_id: number | null;
      };
        Returns: Json;
      },
      toggle_post_bookmark: {
        Args: {
        p_post_id: number | null;
        p_user_id: string | null;
      };
        Returns: Json;
      },
      toggle_post_like: {
        Args: {
        p_post_id: number | null;
        p_user_id: string | null;
      };
        Returns: Json;
      },
      toggle_user_follow: {
        Args: {
        p_user_id: string | null;
      };
        Returns: Json;
      },
      track_comment_edit: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      track_forum_edit: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      track_reading_progress: {
        Args: {
        p_forum_id: number | null;
        p_last_comment_id?: number | null;
        p_scroll_position?: number | null;
        p_time_spent?: number | null;
        p_is_fully_read?: boolean | null;
      };
        Returns: Json;
      },
      track_translation_changes: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      track_user_activity: {
        Args: {
        p_user_id: string | null;
        p_activity_type: string | null;
        p_data?: Json | null;
      };
        Returns: undefined;
      },
      track_user_event: {
        Args: {
        p_user_id: string | null;
        p_event_type: string | null;
        p_data?: Json | null;
      };
        Returns: Json;
      },
      track_view: {
        Args: {
        p_post_id: number | null;
        p_session_id?: string | null;
        p_viewer_id?: string | null;
      };
        Returns: Json;
      },
      trending_items: {
        Args: {
        hours_lookback?: number | null;
        limit_count?: number | null;
      };
        Returns: Array<Record<string, unknown>>;
      },
      trg_add_report_to_queue: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      trg_award_comment_reputation: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      trg_award_like_reputation: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      trg_award_post_reputation: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      trg_record_badge_activity: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      trg_record_comment_activity: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      trg_record_follow_activity: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      trg_record_post_activity: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      trigger_check_badges: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      trigger_digest_edge_function: {
        Args: {
        p_frequency: string | null;
      };
        Returns: number;
      },
      trigger_email_provider_sync: {
        Args: Record<never, never>;
        Returns: number;
      },
      trigger_email_queue_processing: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      trigger_log_post_changes: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      trigger_post_translation: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      trigger_recalculate_trust_level: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      trigger_signup_automation: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      trigger_sync_post_like_counter: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      trigger_translate_challenge: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      trigger_translate_forum_post: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      trigger_translate_post: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      trigger_update_coordinates: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      trigger_update_user_rating: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      unblock_user: {
        Args: {
        p_blocked_id: string | null;
      };
        Returns: boolean;
      },
      unlink_telegram_account: {
        Args: {
        p_user_id?: string | null;
      };
        Returns: Json;
      },
      update_all_hot_scores: {
        Args: Record<never, never>;
        Returns: number;
      },
      update_app_config_updated_at: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_avatar_url_on_storage_upload: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_bookmark_collection_count: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_category_posts_count: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_circuit_breaker_state: {
        Args: {
        p_provider: string | null;
        p_state: string | null;
        p_failures?: number | null;
        p_consecutive_successes?: number | null;
        p_last_failure_time?: string | null;
        p_next_retry_time?: string | null;
      };
        Returns: undefined;
      },
      update_comment_likes_count: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_comment_reactions_count: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_daily_stats: {
        Args: {
        p_date?: string | null;
      };
        Returns: undefined;
      },
      update_device_attestations_updated_at: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_device_tokens_updated_at: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_display_name_override_updated_at: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_email_delivery_log_updated_at: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_email_delivery_status: {
        Args: {
        p_message_id: string | null;
        p_status: string | null;
        p_metadata?: Json | null;
      };
        Returns: boolean;
      },
      update_email_preferences_updated_at: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_email_provider_delivery_stats: {
        Args: {
        p_provider: string | null;
        p_status: string | null;
        p_date?: string | null;
      };
        Returns: undefined;
      },
      update_email_provider_quota_updated_at: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_email_queue_updated_at: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_feature_flags_updated_at: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_feedback_updated_at: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_follow_counts: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_forum_last_activity: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_forum_reactions_count: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_forum_search_vector: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_generated_full_address: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_last_seen: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      update_lat_lon: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_listing_transactional: {
        Args: {
        p_listing_id: number | null;
        p_title?: string | null;
        p_description?: string | null;
        p_is_active?: boolean | null;
        p_pickup_address?: string | null;
        p_pickup_time?: string | null;
      };
        Returns: Json;
      },
      update_listing_version: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_location_queue_updated_at: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_moderation_queue_updated_at: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_my_profile: {
        Args: {
        p_user_id: string | null;
        p_updates: Json | null;
      };
        Returns: Json;
      },
      update_notification_preference: {
        Args: {
        p_user_id: string | null;
        p_category: string | null;
        p_channel: string | null;
        p_enabled?: boolean | null;
        p_frequency?: string | null;
      };
        Returns: Json;
      },
      update_notification_preference_channel: {
        Args: {
        p_user_id: string | null;
        p_category: string | null;
        p_channel: string | null;
        p_enabled: boolean | null;
        p_frequency?: string | null;
      };
        Returns: Json;
      },
      update_notification_settings: {
        Args: {
        p_user_id: string | null;
        p_settings: Json | null;
      };
        Returns: Json;
      },
      update_notification_templates_updated_at: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_post_hot_score: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_post_reports_updated_at: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_post_views: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_report_counts: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_report_timestamp: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_reputation_level: {
        Args: {
        p_profile_id: string | null;
      };
        Returns: undefined;
      },
      update_room_last_message: {
        Args: {
        p_room_id: string | null;
        p_message: string | null;
        p_sent_by: string | null;
      };
        Returns: undefined;
      },
      update_room_on_new_message: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_scheduled_post: {
        Args: {
        p_scheduled_id: string | null;
        p_title?: string | null;
        p_description?: string | null;
        p_scheduled_for?: string | null;
        p_category_id?: number | null;
        p_tags?: Array<number> | null;
      };
        Returns: boolean;
      },
      update_series_stats: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_sync_version: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_tag_usage_count: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_updated_at_column: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_user_location: {
        Args: {
        user_id: string | null;
        lat: number | null;
        lng: number | null;
      };
        Returns: undefined;
      },
      update_user_notifications_updated_at: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_user_preferences: {
        Args: {
        p_preferences: Json | null;
        p_profile_id?: string | null;
      };
        Returns: Json;
      },
      update_user_rating: {
        Args: {
        target_user_id: string | null;
      };
        Returns: undefined;
      },
      update_user_settings: {
        Args: {
        p_user_id: string | null;
        p_section: string | null;
        p_settings: Json | null;
      };
        Returns: Json;
      },
      update_user_stats_on_comment: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_user_stats_on_post: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      update_user_stats_on_reaction: {
        Args: Record<never, never>;
        Returns: unknown;
      },
      user_statistics: {
        Args: {
        target_user_id: string | null;
      };
        Returns: Json;
      },
      vacuum_all_tables: {
        Args: Record<never, never>;
        Returns: undefined;
      },
      validate_listing: {
        Args: {
        p_title: string | null;
        p_description?: string | null;
        p_images?: Array<string> | null;
        p_post_type?: string | null;
        p_latitude?: number | null;
        p_longitude?: number | null;
        p_pickup_address?: string | null;
        p_pickup_time?: string | null;
      };
        Returns: Json;
      },
      validate_listing_update: {
        Args: {
        p_listing_id: number | null;
        p_title?: string | null;
        p_description?: string | null;
        p_is_active?: boolean | null;
        p_is_arranged?: boolean | null;
      };
        Returns: Json;
      },
      vector_contains: {
        Args: {
        arg1: number[] | null;
        arg2: number[] | null;
      };
        Returns: boolean;
      },
      vector_distance_cosine: {
        Args: {
        arg1: number[] | null;
        arg2: number[] | null;
      };
        Returns: number;
      },
      vector_distance_ip: {
        Args: {
        arg1: number[] | null;
        arg2: number[] | null;
      };
        Returns: number;
      },
      vector_distance_l2: {
        Args: {
        arg1: number[] | null;
        arg2: number[] | null;
      };
        Returns: number;
      },
      vector_in: {
        Args: {
        arg1: unknown | null;
      };
        Returns: number[];
      },
      vector_out: {
        Args: {
        arg1: number[] | null;
      };
        Returns: unknown;
      },
      verify_mfa_challenge: {
        Args: {
        p_challenge_id: string | null;
        p_code: string | null;
        p_profile_id: string | null;
      };
        Returns: Json;
      },
      verify_mfa_code: {
        Args: {
        code: string | null;
        code_hash: string | null;
      };
        Returns: boolean;
      },
      verify_phone_for_sms: {
        Args: {
        p_user_id: string | null;
        p_phone_number: string | null;
        p_verification_code: string | null;
      };
        Returns: Json;
      }
    };
    Enums: {
      continents: "Africa" | "Antarctica" | "Asia" | "Europe" | "Oceania" | "North America" | "South America";
      location_status: "active" | "inactive";
      notification_category: "posts" | "forum" | "challenges" | "comments" | "chats" | "social" | "system" | "marketing";
      notification_channel: "push" | "email" | "sms" | "telegram" | "in_app";
      post_activity_type: "created" | "updated" | "deleted" | "restored" | "activated" | "deactivated" | "expired" | "viewed" | "contacted" | "arranged" | "arrangement_cancelled" | "collected" | "not_collected" | "reported" | "flagged" | "unflagged" | "approved" | "rejected" | "hidden" | "unhidden" | "liked" | "unliked" | "shared" | "bookmarked" | "unbookmarked" | "admin_edited" | "admin_note_added" | "admin_status_changed" | "auto_expired" | "auto_deactivated" | "location_updated" | "images_updated";
    };
    CompositeTypes: { [_ in never]: never; };
  },
  storage: {
    Tables: {
      objects: {
        Row: {
        bucket_id: string | null;
        id: string;
        metadata: Json | null;
        name: string | null;
        };
        Insert: {
        bucket_id?: string;
        id?: string;
        metadata?: Json;
        name?: string;
        };
        Update: {
        bucket_id?: string | null;
        id?: string;
        metadata?: Json | null;
        name?: string | null;
        };
        Relationships: [];
      }
    };
    Views: { [_ in never]: never; };
    CompositeTypes: { [_ in never]: never; };
  },
  vault: {
    Tables: {
      secrets: {
        Row: {
        description: string | null;
        id: string;
        name: string | null;
        secret: string | null;
        };
        Insert: {
        description?: string;
        id?: string;
        name?: string;
        secret?: string;
        };
        Update: {
        description?: string | null;
        id?: string;
        name?: string | null;
        secret?: string | null;
        };
        Relationships: [];
      }
    };
    Views: {
      decrypted_secrets: {
        Row: {
        description: string | null;
        id: string | null;
        name: string | null;
        secret: string | null;
        };
        Insert: {
        description?: string;
        id?: string;
        name?: string;
        secret?: string;
        };
        Update: {
        description?: string | null;
        id?: string | null;
        name?: string | null;
        secret?: string | null;
        };
        Relationships: [];
      }
      // view: postgrest returns this as read-only, but the generated
      // shape is identical to a table's so the client treats it as one.
    };
    CompositeTypes: { [_ in never]: never; };
  }
};

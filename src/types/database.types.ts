/**
 * Supabase Database Types
 * Auto-generated types for the FoodShare database schema
 *
 * NOTE: In production, these should be generated using:
 * bunx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      posts: {
        Row: {
          id: number;
          post_name: string;
          post_type: string;
          post_description: string;
          post_address: string;
          post_stripped_address: string;
          location: unknown; // PostGIS geography type
          images: string[];
          available_hours: string;
          transportation: string;
          is_active: boolean;
          is_arranged: boolean;
          post_views: number;
          post_like_counter: number;
          five_star: number | null;
          four_star: number | null;
          profile_id: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          post_name: string;
          post_type: string;
          post_description?: string;
          post_address?: string;
          post_stripped_address?: string;
          location?: unknown;
          images?: string[];
          available_hours?: string;
          transportation?: string;
          is_active?: boolean;
          is_arranged?: boolean;
          post_views?: number;
          post_like_counter?: number;
          five_star?: number | null;
          four_star?: number | null;
          profile_id: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          post_name?: string;
          post_type?: string;
          post_description?: string;
          post_address?: string;
          post_stripped_address?: string;
          location?: unknown;
          images?: string[];
          available_hours?: string;
          transportation?: string;
          is_active?: boolean;
          is_arranged?: boolean;
          post_views?: number;
          post_like_counter?: number;
          five_star?: number | null;
          four_star?: number | null;
          profile_id?: string;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          first_name: string | null;
          second_name: string | null;
          nickname: string | null;
          avatar_url: string | null;
          phone: string | null;
          bio: string | null;
          search_radius_km: number | null;
          location: unknown | null;
          is_active: boolean;
          is_verified: boolean;
          onboarding_completed: boolean;
          created_time: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          first_name?: string | null;
          second_name?: string | null;
          nickname?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          bio?: string | null;
          search_radius_km?: number | null;
          location?: unknown | null;
          is_active?: boolean;
          is_verified?: boolean;
          onboarding_completed?: boolean;
          created_time?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          first_name?: string | null;
          second_name?: string | null;
          nickname?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          bio?: string | null;
          search_radius_km?: number | null;
          location?: unknown | null;
          is_active?: boolean;
          is_verified?: boolean;
          onboarding_completed?: boolean;
          created_time?: string | null;
          updated_at?: string | null;
        };
      };
      address: {
        Row: {
          profile_id: string;
          address_line_1: string;
          address_line_2: string | null;
          address_line_3: string | null;
          city: string;
          state_province: string | null;
          postal_code: string;
          county: string | null;
          country: string;
          lat: number | null;
          long: number | null;
          generated_full_address: string | null;
          radius_meters: number | null;
        };
        Insert: {
          profile_id: string;
          address_line_1: string;
          address_line_2?: string | null;
          address_line_3?: string | null;
          city: string;
          state_province?: string | null;
          postal_code: string;
          county?: string | null;
          country: string;
          lat?: number | null;
          long?: number | null;
          generated_full_address?: string | null;
          radius_meters?: number | null;
        };
        Update: {
          profile_id?: string;
          address_line_1?: string;
          address_line_2?: string | null;
          address_line_3?: string | null;
          city?: string;
          state_province?: string | null;
          postal_code?: string;
          county?: string | null;
          country?: string;
          lat?: number | null;
          long?: number | null;
          generated_full_address?: string | null;
          radius_meters?: number | null;
        };
      };
      user_roles: {
        Row: {
          user_id: string;
          role_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          role_id?: string;
          created_at?: string;
        };
      };
      reviews: {
        Row: {
          id: number;
          post_id: number;
          reviewer_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          post_id: number;
          reviewer_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          post_id?: number;
          reviewer_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
        };
      };
      chat_rooms: {
        Row: {
          id: number;
          post_id: number;
          owner_id: string;
          requester_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          post_id: number;
          owner_id: string;
          requester_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          post_id?: number;
          owner_id?: string;
          requester_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: number;
          room_id: number;
          sender_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          room_id: number;
          sender_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          room_id?: number;
          sender_id?: string;
          content?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      posts_with_location: {
        Row: {
          id: number;
          post_name: string;
          post_description: string | null;
          post_type: string;
          post_address: string | null;
          post_stripped_address: string | null;
          quantity: string | null;
          pickup_time: string | null;
          is_active: boolean;
          is_arranged: boolean;
          created_at: string;
          updated_at: string;
          profile_id: string;
          images: string[];
          post_views: number;
          location: unknown;
          location_json: Json | null;
          latitude: number | null;
          longitude: number | null;
          category_id: number | null;
          tags: string[] | null;
          metadata: Json | null;
          fridge_id: string | null;
          has_pantry: boolean | null;
          available_hours: string | null;
          location_type: string | null;
          condition: string | null;
        };
      };
    };
    Functions: {
      get_nearby_posts: {
        Args: {
          p_latitude: number;
          p_longitude: number;
          p_radius_meters: number;
          p_user_id?: string | null;
          p_post_type?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: number;
          profile_id: string;
          post_name: string;
          post_description: string;
          post_type: string;
          pickup_time: string;
          post_address: string;
          post_stripped_address: string;
          latitude: number;
          longitude: number;
          images: string[];
          is_active: boolean;
          is_arranged: boolean;
          post_views: number;
          category_id: number;
          tags: string[];
          quantity: string;
          created_at: string;
          updated_at: string;
          distance_meters: number;
          metadata: Json;
          fridge_id: string;
          has_pantry: boolean;
          available_hours: string;
          location_type: string;
          condition: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Convenience type aliases
export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type PostInsert = Database["public"]["Tables"]["posts"]["Insert"];
export type PostUpdate = Database["public"]["Tables"]["posts"]["Update"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type ReviewInsert = Database["public"]["Tables"]["reviews"]["Insert"];

export type ChatRoom = Database["public"]["Tables"]["chat_rooms"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];

export type PostWithLocation = Database["public"]["Views"]["posts_with_location"]["Row"];

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
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          address: string | null;
          bio: string | null;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          address?: string | null;
          bio?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          address?: string | null;
          bio?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
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
          post_type: string;
          images: string[];
          location_json: Json | null;
          is_active: boolean;
        };
      };
    };
    Functions: {
      [_ in never]: never;
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

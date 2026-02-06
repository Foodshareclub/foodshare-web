/**
 * Unified API Client
 *
 * Abstraction layer for migrating from Vercel API routes to Supabase Edge Functions.
 * Provides feature flag control, automatic fallback, and monitoring.
 *
 * Usage:
 *   const products = await api.products.list({ type: 'food' })
 *
 * Environment Variables:
 *   NEXT_PUBLIC_USE_SUPABASE_BACKEND=true/false - Enable Supabase backend
 *   NEXT_PUBLIC_SUPABASE_BACKEND_ROLLOUT=0-100 - Gradual rollout percentage
 */

import { createClient } from "@/lib/supabase/client";

// Minimal type for transformation - only fields we actually use
interface SupabaseProduct {
  id: number;
  title: string;
  description?: string;
  images: string[];
  postType: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  pickupTime?: string;
  categoryId?: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt?: string;
  userId: string;
}

// Minimal return type - only fields we need
interface ProductResponse {
  id: number;
  post_name: string;
  post_description?: string;
  images: string[];
  post_type: string;
  latitude?: number;
  longitude?: number;
  pickup_address?: string;
  pickup_time?: string;
  category_id?: number;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
  updated_at?: string;
  profile_id: string;
  location_json?: {
    type: string;
    coordinates: [number, number];
  } | null;
}
import type { InitialProductStateType } from "@/types/product.types";

// =============================================================================
// Configuration
// =============================================================================

const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE_BACKEND === "true";
const ROLLOUT_PERCENTAGE = parseInt(process.env.NEXT_PUBLIC_SUPABASE_BACKEND_ROLLOUT || "0", 10);

// =============================================================================
// Types
// =============================================================================

interface PaginatedResponse<T> {
  data: T[];
  nextCursor: number | null;
  hasMore: boolean;
}

interface ProductsListParams {
  type?: string;
  cursor?: number | null;
  limit?: number;
  userId?: string;
  search?: string;
  locations?: boolean;
}

interface ChatMessageParams {
  message: string;
  conversationId?: string;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Check if user should use Supabase backend based on rollout percentage
 */
function shouldUseSupabase(): boolean {
  if (!USE_SUPABASE) return false;
  if (ROLLOUT_PERCENTAGE >= 100) return true;
  if (ROLLOUT_PERCENTAGE <= 0) return false;

  // Stable hash based on session ID (consistent per user)
  const sessionId =
    typeof window !== "undefined"
      ? window.localStorage.getItem("session_id") || createSessionId()
      : "server";

  const hash = hashCode(sessionId);
  return hash % 100 < ROLLOUT_PERCENTAGE;
}

function createSessionId(): string {
  const id = Math.random().toString(36).substring(2);
  if (typeof window !== "undefined") {
    window.localStorage.setItem("session_id", id);
  }
  return id;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Track API call metrics
 */
function trackAPICall(
  endpoint: string,
  backend: "vercel" | "supabase",
  duration: number,
  success: boolean,
  error?: Error
) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "api_call", {
      endpoint,
      backend,
      duration,
      success,
      error: error?.message,
    });
  }

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[API] ${endpoint} via ${backend}: ${duration}ms ${success ? "✓" : "✗"}`, error);
  }
}

/**
 * Transform Supabase response to match Vercel format
 * Supabase uses camelCase, Vercel uses snake_case
 */
function transformSupabaseProduct(data: Record<string, unknown>): InitialProductStateType {
  return {
    id: data.id,
    post_name: data.title,
    post_description: data.description,
    images: data.images,
    post_type: data.postType,
    latitude: data.location?.lat,
    longitude: data.location?.lng,
    pickup_address: data.location?.address,
    pickup_time: data.pickupTime,
    category_id: data.categoryId,
    is_active: data.isActive,
    expires_at: data.expiresAt,
    created_at: data.createdAt,
    updated_at: data.updatedAt,
    profile_id: data.userId,
    // Add location_json for compatibility
    location_json: data.location
      ? {
          type: "Point",
          coordinates: [data.location.lng, data.location.lat],
        }
      : null,
  } as InitialProductStateType;
}

// =============================================================================
// API Client
// =============================================================================

class APIClient {
  private supabase = createClient();
  private useSupabase = shouldUseSupabase();

  /**
   * Products API
   */
  products = {
    /**
     * List products with pagination
     */
    list: async (
      params: ProductsListParams = {}
    ): Promise<PaginatedResponse<InitialProductStateType>> => {
      const startTime = Date.now();

      try {
        if (this.useSupabase) {
          // Call Supabase Edge Function
          const queryParams = new URLSearchParams();
          if (params.type && params.type !== "all") queryParams.set("postType", params.type);
          if (params.cursor) queryParams.set("cursor", String(params.cursor));
          if (params.limit) queryParams.set("limit", String(params.limit));
          if (params.userId) queryParams.set("userId", params.userId);

          const { data, error } = await this.supabase.functions.invoke("api-v1-products", {
            method: "GET",
            // @ts-expect-error - Supabase types don't include query params yet
            query: Object.fromEntries(queryParams),
          });

          if (error) throw error;

          // Transform response to match Vercel format
          const transformed = {
            data: data.data.map(transformSupabaseProduct),
            nextCursor: data.pagination?.nextCursor || null,
            hasMore: data.pagination?.nextCursor !== null,
          };

          trackAPICall("products.list", "supabase", Date.now() - startTime, true);
          return transformed;
        }

        // Fallback to Vercel
        const searchParams = new URLSearchParams();
        if (params.type && params.type !== "all") searchParams.set("type", params.type);
        if (params.cursor) searchParams.set("cursor", String(params.cursor));
        if (params.limit) searchParams.set("limit", String(params.limit));
        if (params.userId) searchParams.set("userId", params.userId);
        if (params.search) searchParams.set("search", params.search);
        if (params.locations) searchParams.set("locations", "true");

        const response = await fetch(`/api/products?${searchParams.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch products");

        const result = await response.json();
        trackAPICall("products.list", "vercel", Date.now() - startTime, true);
        return result;
      } catch (error) {
        trackAPICall(
          "products.list",
          this.useSupabase ? "supabase" : "vercel",
          Date.now() - startTime,
          false,
          error as Error
        );

        // If Supabase fails, try Vercel fallback
        if (this.useSupabase) {
          console.warn("[API] Supabase failed, falling back to Vercel", error);
          this.useSupabase = false; // Disable for this session
          return this.products.list(params);
        }

        throw error;
      }
    },

    /**
     * Get single product by ID
     */
    get: async (id: number): Promise<InitialProductStateType | null> => {
      const startTime = Date.now();

      try {
        if (this.useSupabase) {
          const { data, error } = await this.supabase.functions.invoke("api-v1-products", {
            method: "GET",
            // @ts-expect-error - Supabase types don't include query params yet
            query: { id: String(id) },
          });

          if (error) throw error;
          if (!data) return null;

          trackAPICall("products.get", "supabase", Date.now() - startTime, true);
          return transformSupabaseProduct(data);
        }

        const response = await fetch(`/api/products?id=${id}`);
        if (!response.ok) throw new Error("Failed to fetch product");

        const result = await response.json();
        trackAPICall("products.get", "vercel", Date.now() - startTime, true);
        return result;
      } catch (error) {
        trackAPICall(
          "products.get",
          this.useSupabase ? "supabase" : "vercel",
          Date.now() - startTime,
          false,
          error as Error
        );

        if (this.useSupabase) {
          console.warn("[API] Supabase failed, falling back to Vercel", error);
          this.useSupabase = false;
          return this.products.get(id);
        }

        throw error;
      }
    },
  };

  /**
   * Chat API
   */
  chat = {
    /**
     * Send chat message
     */
    send: async (params: ChatMessageParams): Promise<unknown> => {
      const startTime = Date.now();

      try {
        if (this.useSupabase) {
          const { data, error } = await this.supabase.functions.invoke("api-v1-chat", {
            method: "POST",
            body: params,
          });

          if (error) throw error;

          trackAPICall("chat.send", "supabase", Date.now() - startTime, true);
          return data;
        }

        const response = await fetch("/api/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        if (!response.ok) throw new Error("Failed to send message");

        const result = await response.json();
        trackAPICall("chat.send", "vercel", Date.now() - startTime, true);
        return result;
      } catch (error) {
        trackAPICall(
          "chat.send",
          this.useSupabase ? "supabase" : "vercel",
          Date.now() - startTime,
          false,
          error as Error
        );

        if (this.useSupabase) {
          console.warn("[API] Supabase failed, falling back to Vercel", error);
          this.useSupabase = false;
          return this.chat.send(params);
        }

        throw error;
      }
    },
  };
}

// =============================================================================
// Export Singleton
// =============================================================================

export const api = new APIClient();

// Export for testing
export { shouldUseSupabase, transformSupabaseProduct };

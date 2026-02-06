/**
 * Migration Layer: Vercel → Supabase
 *
 * Gradual rollout with automatic fallback and monitoring.
 * Zero changes to existing hooks/components.
 *
 * ENV:
 *   NEXT_PUBLIC_USE_SUPABASE=true - Enable
 *   NEXT_PUBLIC_SUPABASE_ROLLOUT=0-100 - Percentage
 */

import type { InitialProductStateType } from "@/types/product.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Feature flags
const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE === "true";
const ROLLOUT_PCT = parseInt(process.env.NEXT_PUBLIC_SUPABASE_ROLLOUT || "0", 10);

// Session-stable user bucketing
function isInRollout(): boolean {
  if (!USE_SUPABASE || ROLLOUT_PCT === 0) return false;
  if (ROLLOUT_PCT >= 100) return true;

  const sessionId =
    sessionStorage.getItem("rollout_id") ||
    (() => {
      const id = Math.random().toString(36).slice(2);
      sessionStorage.setItem("rollout_id", id);
      return id;
    })();

  const hash = sessionId.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  return Math.abs(hash) % 100 < ROLLOUT_PCT;
}

// Transform Supabase camelCase → Vercel snake_case
function transformProduct(data: {
  id: number;
  title: string;
  description?: string;
  images: string[];
  postType: string;
  location?: { lat: number; lng: number; address?: string };
  pickupTime?: string;
  categoryId?: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt?: string;
  userId: string;
}): InitialProductStateType {
  return {
    id: data.id,
    post_name: data.title,
    post_description: data.description || "",
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
    location_json: data.location
      ? { type: "Point", coordinates: [data.location.lng, data.location.lat] }
      : null,
    // Fill in missing fields with defaults
    available_hours: "",
    condition: "",
    five_star: null,
    four_star: null,
    location: null as never,
    post_address: data.location?.address || "",
    post_stripped_address: "",
    is_arranged: false,
    post_like_counter: 0,
    transportation: "",
    post_views: 0,
  } as InitialProductStateType;
}

async function callSupabase<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${SUPABASE_URL}/functions/v1/${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  return res.json();
}

async function callVercel<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Vercel error: ${res.status}`);
  return res.json();
}

// Products API
async function listProducts(params?: {
  postType?: string;
  categoryId?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  cursor?: number | null;
  limit?: number;
  userId?: string;
}): Promise<{ data: InitialProductStateType[]; nextCursor: number | null; hasMore: boolean }> {
  const useSupabase = isInRollout();
  const start = Date.now();

  try {
    if (useSupabase) {
      const queryParams: Record<string, string> = {};
      if (params?.postType) queryParams.postType = params.postType;
      if (params?.categoryId) queryParams.categoryId = String(params.categoryId);
      if (params?.lat) queryParams.lat = String(params.lat);
      if (params?.lng) queryParams.lng = String(params.lng);
      if (params?.radius) queryParams.radius = String(params.radius);
      if (params?.cursor) queryParams.cursor = String(params.cursor);
      if (params?.limit) queryParams.limit = String(params.limit);
      if (params?.userId) queryParams.userId = params.userId;

      const result = await callSupabase<{
        data: unknown[];
        nextCursor: string | null;
        hasMore: boolean;
      }>("api-v1-products", queryParams);

      if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_MONITORING === "true") {
        console.log(`[API] products.list via supabase: ${Date.now() - start}ms ✓`);
      }

      return {
        data: result.data.map((item) => transformProduct(item as never)),
        nextCursor: result.nextCursor ? parseInt(result.nextCursor, 10) : null,
        hasMore: result.hasMore,
      };
    }
  } catch (error) {
    console.error("[API] Supabase failed, falling back to Vercel:", error);
  }

  // Fallback to Vercel
  const queryParams: Record<string, string> = {};
  if (params?.postType) queryParams.post_type = params.postType;
  if (params?.categoryId) queryParams.category_id = String(params.categoryId);
  if (params?.lat) queryParams.lat = String(params.lat);
  if (params?.lng) queryParams.lng = String(params.lng);
  if (params?.radius) queryParams.radius = String(params.radius);
  if (params?.cursor) queryParams.cursor = String(params.cursor);
  if (params?.limit) queryParams.limit = String(params.limit);
  if (params?.userId) queryParams.user_id = params.userId;

  const result = await callVercel<{
    data: InitialProductStateType[];
    nextCursor: number | null;
    hasMore: boolean;
  }>("/api/products", queryParams);

  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_MONITORING === "true") {
    console.log(`[API] products.list via vercel: ${Date.now() - start}ms ✓`);
  }

  return result;
}

export const api = {
  products: {
    list: listProducts,
  },
};

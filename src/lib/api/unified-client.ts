/**
 * Migration Layer: Vercel → Supabase
 * Gradual rollout with automatic fallback
 */

import type { InitialProductStateType } from "@/types/product.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE === "true";
const ROLLOUT_PCT = parseInt(process.env.NEXT_PUBLIC_SUPABASE_ROLLOUT || "0", 10);

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

async function listProducts(params?: {
  postType?: string;
  cursor?: number | null;
  limit?: number;
  userId?: string;
}): Promise<{ data: InitialProductStateType[]; nextCursor: number | null; hasMore: boolean }> {
  const useSupabase = isInRollout();
  const start = Date.now();

  if (useSupabase) {
    try {
      const url = new URL(`${SUPABASE_URL}/functions/v1/api-v1-products`);
      if (params?.postType) url.searchParams.set("postType", params.postType);
      if (params?.cursor) url.searchParams.set("cursor", String(params.cursor));
      if (params?.limit) url.searchParams.set("limit", String(params.limit));
      if (params?.userId) url.searchParams.set("userId", params.userId);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error(`Supabase: ${res.status}`);
      const result = await res.json();

      if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_MONITORING === "true") {
        console.log(`[API] products via supabase: ${Date.now() - start}ms ✓`);
      }

      return result;
    } catch (error) {
      console.error("[API] Supabase failed, falling back:", error);
    }
  }

  // Fallback to Vercel
  const url = new URL("/api/products", window.location.origin);
  if (params?.postType) url.searchParams.set("post_type", params.postType);
  if (params?.cursor) url.searchParams.set("cursor", String(params.cursor));
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.userId) url.searchParams.set("user_id", params.userId);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Vercel: ${res.status}`);
  const result = await res.json();

  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_MONITORING === "true") {
    console.log(`[API] products via vercel: ${Date.now() - start}ms ✓`);
  }

  return result;
}

export const api = {
  products: {
    list: listProducts,
  },
};

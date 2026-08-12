/**
 * Unified API Client
 * Gradual rollout with automatic fallback
 */

import type { InitialProductStateType } from "@/types/product.types";
import { logger } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Removed unused variables and functions

async function listProducts(params?: {
  postType?: string;
  cursor?: number | null;
  limit?: number;
  userId?: string;
}): Promise<{ data: InitialProductStateType[]; nextCursor: number | null; hasMore: boolean }> {
  const start = Date.now();

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
      logger.debug(`[API] products via supabase: ${Date.now() - start}ms ✓`, {
        component: "UnifiedClient",
      });
    }

    return result;
  } catch (error) {
    console.error("[API] Supabase fetch failed:", error);
    throw error;
  }
}

export const api = {
  products: {
    list: listProducts,
  },
};

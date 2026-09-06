/**
 * Products API Route
 * Client-safe endpoint for fetching products
 * Uses standardized ApiResponse type for consistent error/success patterns
 */

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/lib/api-types";
import type { InitialProductStateType } from "@/lib/data/products";
import { getProducts } from "@/lib/data/products";

/**
 * GET /api/products
 * Fetches products with proper type safety
 */
export async function GET(): Promise<NextResponse<ApiResponse<InitialProductStateType[]>>> {
  const products = await getProducts("latest", { limit: 12 });

  if (!products) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: products }, { status: 200 });
}

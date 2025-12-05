import { supabase } from "@/lib/supabase/client";
import type { PostgrestSingleResponse, PostgrestResponse } from "@supabase/supabase-js";
import type { ReviewsType } from "@/api/chatAPI";
import { parsePostGISPoint } from "@/utils/postgis";
import type { PostGISGeography, GeoJSONPoint } from "@/types/postgis.types";

export type InitialProductStateType = {
  available_hours: string;
  condition: string;
  created_at: string;
  five_star: number | null;
  four_star: number | null;
  images: string[];
  id: number;
  location: PostGISGeography;
  post_address: string;
  post_stripped_address: string;
  is_arranged: boolean;
  post_description: string;
  post_like_counter: number;
  transportation: string;
  post_name: string;
  post_type: string;
  is_active: boolean;
  post_views: number;
  profile_id: string;
  reviews: Array<ReviewsType>;
};

export type LocationType = {
  id: number;
  location?: PostGISGeography;
  location_json?: GeoJSONPoint | null;
  post_name: string;
  post_type?: string;
  images?: string[];
};

/**
 * Helper to get coordinates from product (PostGIS format)
 * Checks location_json (GeoJSON from computed column) first,
 * then falls back to location field for backwards compatibility
 */
export function getCoordinates(
  product: InitialProductStateType | LocationType
): { lat: number; lng: number } | null {
  // Prefer location_json (GeoJSON from computed column)
  if ("location_json" in product && product.location_json) {
    const parsed = parsePostGISPoint(product.location_json);
    if (parsed) {
      return { lat: parsed.latitude, lng: parsed.longitude };
    }
  }

  // Fallback to location field (may be WKB hex or already parsed)
  if (product.location) {
    const parsed = parsePostGISPoint(product.location);
    if (parsed) {
      return { lat: parsed.latitude, lng: parsed.longitude };
    }
  }

  return null;
}

export const productAPI = {
  /**
   * Get all products from the database
   * Uses posts_with_location view for proper GeoJSON coordinates
   * @returns Promise with all products
   */
  getAllProducts(): PromiseLike<PostgrestResponse<InitialProductStateType>> {
    return supabase.from("posts_with_location").select("*");
  },

  /**
   * Get products filtered by type
   * Uses posts_with_location view for proper GeoJSON coordinates
   * @param productType - The type of product to filter by
   * @returns Promise with filtered products
   */
  getProducts(
    productType: string
  ): PromiseLike<PostgrestSingleResponse<Array<InitialProductStateType>>> {
    return supabase
      .from("posts_with_location")
      .select(`*`)
      .order("created_at", { ascending: false })
      .eq("post_type", productType.toLowerCase())
      .eq("is_active", true);
  },

  /**
   * Get product locations for map display
   * @param productType - The type of product to filter by
   * @returns Promise with location data
   */
  getProductsLocation(productType: string): PromiseLike<PostgrestResponse<LocationType>> {
    return supabase
      .from("posts_with_location")
      .select("id, location_json, post_name, post_type, images")
      .eq("post_type", productType.toLowerCase())
      .eq("is_active", true);
  },

  /**
   * Get products created by a specific user
   * Uses posts_with_location view for proper GeoJSON coordinates
   * @param currentUserID - The user's profile ID
   * @returns Promise with user's products
   */
  getCurrentUserProduct(currentUserID: string): PromiseLike<PostgrestResponse<InitialProductStateType>> {
    return supabase.from("posts_with_location").select("*").eq("profile_id", currentUserID);
  },

  /**
   * Get a single product by ID with reviews
   * @param productId - The product ID
   * @returns Promise with product and reviews
   */
  getOneProduct(productId: number): PromiseLike<PostgrestResponse<InitialProductStateType>> {
    return supabase.from("posts_with_location").select(`*, reviews(*)`).eq("id", productId);
  },

  /**
   * Create a new product
   * @param createdProduct - The product data to insert
   * @returns Promise with insert result
   */
  async createProduct(createdProduct: Partial<InitialProductStateType>): Promise<PostgrestSingleResponse<null>> {
    return supabase.from("posts").insert(createdProduct).select().single();
  },

  /**
   * Update an existing product
   * @param createdProduct - The product data to update
   * @returns Promise with upsert result
   */
  async updateProduct(createdProduct: Partial<InitialProductStateType>): Promise<PostgrestSingleResponse<null>> {
    return supabase.from("posts").upsert(createdProduct).select().single();
  },

  /**
   * Delete a product by ID
   * @param productID - The product ID to delete
   * @returns Promise with delete result
   */
  async deleteProduct(productID: number): Promise<PostgrestSingleResponse<null>> {
    return supabase.from("posts").delete().eq("id", productID).select().single();
  },

  /**
   * Search products by name with optional type filter
   * Uses posts_with_location view for proper GeoJSON coordinates
   * @param searchWord - The search term
   * @param productSearchType - Optional product type filter
   * @returns Promise with search results
   */
  searchProducts(searchWord: string, productSearchType: string): PromiseLike<PostgrestResponse<InitialProductStateType>> {
    let query = supabase
      .from("posts_with_location")
      .select("*, reviews(*)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (productSearchType && productSearchType !== "all") {
      query = query.eq("post_type", productSearchType.toLowerCase());
    }

    query = query.textSearch("post_name", searchWord, {
      type: "websearch",
    });

    return query;
  },
};

"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult, withErrorHandling, validateWithSchema } from "@/lib/errors";
import {
  CACHE_TAGS,
  invalidateTag,
  invalidatePostActivityCaches,
  getProductTags,
} from "@/lib/data/cache-keys";
import { trackEvent } from "@/app/actions/analytics";
import { logPostActivity as _logPostActivity } from "@/app/actions/post-activity";
import {
  indexProduct,
  removeProductFromSearch,
  type ProductSearchDocument,
} from "@/lib/storage/search";
import { embedProduct } from "@/lib/embeddings";
import { createActionLogger } from "@/lib/structured-logger";
import {
  createProductAPI,
  updateProductAPI as _updateProductAPI,
  deleteProductAPI,
} from "@/lib/api/products";

// Feature flag for Edge Function migration (set to true to enable)
const USE_EDGE_FUNCTIONS = process.env.USE_EDGE_FUNCTIONS_FOR_PRODUCTS === "true";

// NOTE: Data functions (getProducts, getAllProducts, etc.) should be imported
// directly from '@/lib/data/products' - they cannot be re-exported from a
// 'use server' file as only async server actions are allowed.

/**
 * Index a product for full-text search (fire-and-forget)
 * Runs asynchronously to avoid blocking the main action
 */
async function indexProductForSearch(
  productId: number,
  productData: {
    post_name: string;
    post_description: string;
    post_type: string;
    post_address?: string;
    profile_id: string;
    is_active?: boolean;
  }
): Promise<void> {
  try {
    const searchDoc: ProductSearchDocument = {
      id: productId.toString(),
      title: productData.post_name,
      description: productData.post_description,
      type: productData.post_type,
      location: productData.post_address || "",
      userId: productData.profile_id,
      createdAt: new Date().toISOString(),
      active: productData.is_active ?? true,
      content: {
        title: productData.post_name,
        description: productData.post_description,
        type: productData.post_type,
      },
    };

    const success = await indexProduct(searchDoc);
    if (!success) {
      console.warn("[indexProductForSearch] Failed to index product", { id: productId });
    }
  } catch (error) {
    // Non-blocking - log and continue
    console.error("[indexProductForSearch] Error:", error);
  }
}

/**
 * Batch invalidate product-related caches
 */
function invalidateProductCaches(productId?: number, postType?: string, profileId?: string): void {
  // Use helper for consistent tag invalidation
  getProductTags(productId, postType).forEach((tag) => invalidateTag(tag));

  // Invalidate user-specific cache
  if (profileId) {
    invalidateTag(CACHE_TAGS.USER_PRODUCTS(profileId));
  }

  // Invalidate activity caches
  if (productId && profileId) {
    invalidatePostActivityCaches(productId, profileId);
  }
}

// ============================================================================
// Zod Schemas for validation
// ============================================================================

const createProductSchema = z.object({
  post_name: z.string().min(1, "Name is required").max(200),
  post_description: z.string().min(1, "Description is required").max(5000),
  post_type: z.string().min(1, "Type is required"),
  post_address: z.string().optional().default(""), // Address is optional
  available_hours: z.string().optional(),
  transportation: z.string().optional(),
  condition: z.string().optional(),
  images: z.array(z.string()).optional().default([]),
  profile_id: z.string().uuid("Invalid user ID"),
  // Location coordinates (optional - when provided, enables Edge Function path)
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const updateProductSchema = createProductSchema.partial().extend({
  is_active: z.boolean().optional(),
});

/**
 * Create a new product
 *
 * Routes to Edge Function when:
 * - USE_EDGE_FUNCTIONS flag is enabled
 * - Latitude and longitude are provided
 *
 * Falls back to direct Supabase otherwise.
 */
export async function createProduct(formData: FormData): Promise<ActionResult<{ id: number }>> {
  const logger = await createActionLogger("createProduct");
  logger.info("Starting product creation");

  // Parse form data - convert null to undefined for optional fields
  const getString = (key: string): string => (formData.get(key) as string) ?? "";
  const getOptionalString = (key: string): string | undefined => {
    const value = formData.get(key);
    return value ? (value as string) : undefined;
  };
  const getOptionalNumber = (key: string): number | undefined => {
    const value = formData.get(key);
    if (!value) return undefined;
    const num = parseFloat(value as string);
    return isNaN(num) ? undefined : num;
  };

  // Parse images JSON safely
  let images: string[] = [];
  try {
    images = JSON.parse((formData.get("images") as string) || "[]");
  } catch {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid images format" },
    };
  }

  const rawData = {
    post_name: getString("post_name"),
    post_description: getString("post_description"),
    post_type: getString("post_type"),
    post_address: getOptionalString("post_address") ?? "",
    available_hours: getOptionalString("available_hours"),
    transportation: getOptionalString("transportation"),
    condition: getOptionalString("condition"),
    images,
    profile_id: getString("profile_id"),
    latitude: getOptionalNumber("latitude"),
    longitude: getOptionalNumber("longitude"),
  };

  logger.debug("Parsed form data", {
    post_name: rawData.post_name,
    post_type: rawData.post_type,
    images_count: rawData.images?.length,
    has_location: !!(rawData.latitude && rawData.longitude),
  });

  // Validate with standard helper
  const validation = validateWithSchema(createProductSchema, rawData);
  if (!validation.success) {
    logger.warn("Validation failed", { error: validation.error });
    return validation;
  }

  // Check if we should use Edge Function
  const hasLocation =
    validation.data.latitude !== undefined && validation.data.longitude !== undefined;
  const useEdgeFunction = USE_EDGE_FUNCTIONS && hasLocation;

  if (useEdgeFunction) {
    logger.info("Using Edge Function path", { hasLocation });

    // Route through Edge Function for unified cross-platform behavior
    const result = await createProductAPI({
      post_name: validation.data.post_name,
      post_description: validation.data.post_description,
      post_type: validation.data.post_type,
      post_address: validation.data.post_address,
      available_hours: validation.data.available_hours,
      transportation: validation.data.transportation,
      condition: validation.data.condition,
      images: validation.data.images ?? [],
      profile_id: validation.data.profile_id,
      latitude: validation.data.latitude,
      longitude: validation.data.longitude,
    });

    if (result.success) {
      // Invalidate caches
      invalidateProductCaches(
        result.data.id,
        validation.data.post_type,
        validation.data.profile_id
      );

      // Fire-and-forget background tasks
      Promise.all([
        trackEvent("Listing Created", {
          listingId: result.data.id,
          type: validation.data.post_type,
          via: "edge-function",
        }),
        indexProductForSearch(result.data.id, {
          post_name: validation.data.post_name,
          post_description: validation.data.post_description,
          post_type: validation.data.post_type,
          post_address: validation.data.post_address,
          profile_id: validation.data.profile_id,
          // NOTE: Edge Function currently handles is_active separately
          // Volunteer posts require approval via admin dashboard
          is_active: validation.data.post_type !== "volunteer",
        }),
        embedProduct({
          id: result.data.id,
          title: validation.data.post_name,
          description: validation.data.post_description,
          type: validation.data.post_type,
          location: validation.data.post_address || undefined,
          userId: validation.data.profile_id,
        }),
      ]).catch(() => {});

      logger.info("Product created via Edge Function", { id: result.data.id });
    }

    return result;
  }

  // Fallback: Direct Supabase path (legacy behavior)
  logger.info("Using direct Supabase path", { hasLocation, useEdgeFunctions: USE_EDGE_FUNCTIONS });

  return withErrorHandling(async () => {
    const supabase = await createClient();

    // Verify user is authenticated and matches profile_id
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("You must be signed in to create a listing");
    }

    if (user.id !== validation.data.profile_id) {
      throw new Error("Unauthorized: User ID mismatch");
    }

    // Remove lat/lng from insert data (not in posts table schema for direct insert)
    const { latitude: _lat, longitude: _lng, ...insertData } = validation.data;

    // Volunteer posts require admin approval (start as inactive)
    const isVolunteerPost = validation.data.post_type === "volunteer";
    const initialActiveStatus = !isVolunteerPost; // false for volunteers, true for others

    const { data, error } = await supabase
      .from("posts")
      .insert({ ...insertData, is_active: initialActiveStatus })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Batch invalidate all product caches
    invalidateProductCaches(data.id, validation.data.post_type, validation.data.profile_id);

    logger.info("Product created", { id: data.id });
    return { id: data.id };
  }, "createProduct").then(async (result) => {
    if (result.success && result.data) {
      // Fire-and-forget: analytics, search indexing, and embeddings (don't block response)
      Promise.all([
        trackEvent("Listing Created", {
          listingId: result.data.id,
          type: formData.get("post_type") as string,
        }),
        indexProductForSearch(result.data.id, {
          post_name: formData.get("post_name") as string,
          post_description: formData.get("post_description") as string,
          post_type: formData.get("post_type") as string,
          post_address: formData.get("post_address") as string | undefined,
          profile_id: formData.get("profile_id") as string,
          // Volunteer posts start inactive (pending approval)
          is_active: formData.get("post_type") !== "volunteer",
        }),
        embedProduct({
          id: result.data.id,
          title: formData.get("post_name") as string,
          description: formData.get("post_description") as string,
          type: formData.get("post_type") as string,
          location: (formData.get("post_address") as string) || undefined,
          userId: formData.get("profile_id") as string,
        }),
      ]).catch(() => {});
    }
    return result;
  });
}

/**
 * Update an existing product
 *
 * TODO: Migrate to Edge Function when version field is added to product type.
 * The Edge Function requires `version` for optimistic locking, which needs:
 * 1. Add `version` to InitialProductStateType (src/types/product.types.ts)
 * 2. Include version in product queries (lib/data/products.ts)
 * 3. Pass version through FormData when editing
 * 4. Call updateProductAPI with version
 *
 * Currently stays on direct Supabase path for backwards compatibility.
 */
export async function updateProduct(
  id: number,
  formData: FormData
): Promise<ActionResult<undefined>> {
  const logger = await createActionLogger("updateProduct");
  logger.info("Starting product update", { id });

  // Parse form data
  const rawData: Record<string, unknown> = {};
  const fields = [
    "post_name",
    "post_description",
    "post_type",
    "post_address",
    "available_hours",
    "transportation",
    "condition",
    "is_active",
  ];

  for (const field of fields) {
    const value = formData.get(field);
    if (value !== null) {
      rawData[field] = field === "is_active" ? value === "true" : value;
    }
  }

  const imagesStr = formData.get("images");
  if (imagesStr) {
    try {
      rawData.images = JSON.parse(imagesStr as string);
    } catch {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid images format" },
      };
    }
  }

  // Validate with Zod (partial schema for updates)
  const validation = validateWithSchema(updateProductSchema, rawData);
  if (!validation.success) {
    logger.warn("Validation failed", { error: validation.error });
    return validation;
  }

  return withErrorHandling(async () => {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("You must be signed in to update a listing");
    }

    // Get current product info for cache invalidation and ownership check
    const { data: currentProduct } = await supabase
      .from("posts")
      .select("post_type, profile_id")
      .eq("id", id)
      .single();

    // Verify ownership
    if (currentProduct?.profile_id && currentProduct.profile_id !== user.id) {
      throw new Error("Unauthorized: You can only edit your own listings");
    }

    const { error } = await supabase.from("posts").update(validation.data).eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    // Batch invalidate caches - handles both old and new type
    invalidateProductCaches(id, currentProduct?.post_type, currentProduct?.profile_id);
    if (validation.data.post_type && validation.data.post_type !== currentProduct?.post_type) {
      invalidateProductCaches(id, validation.data.post_type);
    }

    // Fire-and-forget: re-embed if content changed
    if (validation.data.post_name || validation.data.post_description) {
      const { data: updatedProduct } = await supabase
        .from("posts")
        .select("post_name, post_description, post_type, post_address, profile_id")
        .eq("id", id)
        .single();

      if (updatedProduct) {
        embedProduct({
          id,
          title: updatedProduct.post_name,
          description: updatedProduct.post_description,
          type: updatedProduct.post_type,
          location: updatedProduct.post_address || undefined,
          userId: updatedProduct.profile_id,
        }).catch(() => {});
      }
    }

    logger.info("Product updated", { id });
    return undefined;
  }, "updateProduct");
}

/**
 * Delete a product (soft delete - sets is_active = false)
 * This unpublishes the listing rather than permanently deleting it
 *
 * Routes to Edge Function when USE_EDGE_FUNCTIONS is enabled.
 */
export async function deleteProduct(id: number): Promise<ActionResult<undefined>> {
  const logger = await createActionLogger("deleteProduct");
  logger.info("Starting soft delete", { id });

  // Use Edge Function when enabled
  if (USE_EDGE_FUNCTIONS) {
    logger.info("Using Edge Function path for delete");

    const result = await deleteProductAPI(id);

    if (result.success) {
      // We need to get product info for cache invalidation
      // The Edge Function already deleted, so we invalidate common caches
      invalidateTag(CACHE_TAGS.PRODUCTS);
      invalidateTag(CACHE_TAGS.PRODUCT(id));

      // Remove from search index (fire-and-forget)
      removeProductFromSearch(id.toString()).catch(() => {});

      logger.info("Product deleted via Edge Function", { id });
    }

    return result;
  }

  // Fallback: Direct Supabase path
  return withErrorHandling(async () => {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("You must be signed in to delete a listing");
    }

    // Get product info for cache invalidation and ownership check
    const { data: product } = await supabase
      .from("posts")
      .select("post_type, profile_id, is_active")
      .eq("id", id)
      .single();

    if (!product) {
      throw new Error("Listing not found");
    }

    // Verify ownership
    if (product.profile_id !== user.id) {
      throw new Error("Unauthorized: You can only delete your own listings");
    }

    // Soft delete: set is_active = false
    const { error } = await supabase.from("posts").update({ is_active: false }).eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    // Batch invalidate all product caches
    invalidateProductCaches(id, product.post_type, product.profile_id);

    // Remove from search index (fire-and-forget)
    removeProductFromSearch(id.toString()).catch(() => {});

    logger.info("Product unpublished", { id });
    return undefined;
  }, "deleteProduct");
}

/**
 * Refresh user listings cache
 * Call this to force a cache refresh for the current user's listings
 */
export async function refreshUserListingsCache(userId: string): Promise<ActionResult<undefined>> {
  return withErrorHandling(async () => {
    // Invalidate user-specific cache
    invalidateTag(CACHE_TAGS.USER_PRODUCTS(userId));
    invalidateTag(CACHE_TAGS.PRODUCTS);
    return undefined;
  }, "refreshUserListingsCache");
}

/**
 * Toggle product favorite status
 */
export async function toggleProductFavorite(
  productId: number,
  userId: string
): Promise<ActionResult<{ isFavorited: boolean }>> {
  return withErrorHandling(async () => {
    const supabase = await createClient();

    // Check if already favorited
    const { data: existing } = await supabase
      .from("favorites")
      .select("id")
      .eq("product_id", productId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      // Remove favorite
      const { error } = await supabase.from("favorites").delete().eq("id", existing.id);

      if (error) throw new Error(error.message);

      // Invalidate caches for immediate UI update
      invalidateTag(CACHE_TAGS.PRODUCT(productId));
      invalidateTag(CACHE_TAGS.USER_PRODUCTS(userId));

      return { isFavorited: false };
    } else {
      // Add favorite
      const { error } = await supabase
        .from("favorites")
        .insert({ product_id: productId, user_id: userId });

      if (error) throw new Error(error.message);

      // Invalidate caches for immediate UI update
      invalidateTag(CACHE_TAGS.PRODUCT(productId));
      invalidateTag(CACHE_TAGS.USER_PRODUCTS(userId));

      return { isFavorited: true };
    }
  }, "toggleProductFavorite");
}

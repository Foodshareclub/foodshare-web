"use server";

import { trackEvent } from "@/app/actions/analytics";
import { logPostActivity as _logPostActivity } from "@/app/actions/post-activity";
import { createProductAPI, deleteProductAPI } from "@/lib/api/products";
import { invalidatePostActivityCaches, invalidateTag } from "@/lib/data/cache-invalidation";
import { CACHE_TAGS, getProductTags } from "@/lib/data/cache-keys";
import { embedProduct } from "@/lib/embeddings";
import { type ActionResult, validateWithSchema, withErrorHandling } from "@/lib/errors";
import {
  type ProductSearchDocument,
  indexProduct,
  removeProductFromSearch,
} from "@/lib/storage/search";
import { createActionLogger } from "@/lib/structured-logger";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

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
  for (const tag of getProductTags(productId, postType)) invalidateTag(tag);

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
  category_mode: z.enum(["auto", "manual"]).optional(),
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
  // Create defaults must not erase omitted fields during a partial edit.
  post_address: z.string().optional(),
  images: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  version: z.number().int().positive().safe(),
});

/**
 * Create a new product
 *
 * Every new listing passes through the shared Edge Function classifier.
 * Missing coordinates remain absent; they never become a fictional (0, 0) location.
 */
export async function createProduct(
  formData: FormData
): Promise<ActionResult<{ id: number; post_type: string }>> {
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
    if (value === null || value === "") return undefined;
    return typeof value === "string" ? Number(value) : Number.NaN;
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
    category_mode: getOptionalString("category_mode"),
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
    has_location: rawData.latitude !== undefined && rawData.longitude !== undefined,
  });

  // Validate with standard helper
  const validation = validateWithSchema(createProductSchema, rawData);
  if (!validation.success) {
    logger.warn("Validation failed", { error: validation.error });
    return validation;
  }

  if ((validation.data.latitude === undefined) !== (validation.data.longitude === undefined)) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Latitude and longitude must be provided together",
      },
    };
  }

  return withErrorHandling<ActionResult<{ id: number; post_type: string }>>(async () => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== validation.data.profile_id) {
      throw new Error("You must be signed in as the listing owner");
    }

    const result = await createProductAPI(validation.data);
    if (!result.success) return result;

    // Use the saved category everywhere; classification may have corrected the form's default.
    const savedType = result.data.post_type;
    invalidateProductCaches(result.data.id, savedType, user.id);
    if (savedType !== validation.data.post_type) {
      invalidateProductCaches(result.data.id, validation.data.post_type, user.id);
    }
    Promise.all([
      trackEvent("Listing Created", {
        listingId: result.data.id,
        type: savedType,
        via: "edge-function",
      }),
      indexProductForSearch(result.data.id, {
        post_name: validation.data.post_name,
        post_description: validation.data.post_description,
        post_type: savedType,
        post_address: validation.data.post_address,
        profile_id: user.id,
        is_active: result.data.is_active,
      }),
      embedProduct({
        id: result.data.id,
        title: validation.data.post_name,
        description: validation.data.post_description,
        type: savedType,
        location: validation.data.post_address || undefined,
        userId: user.id,
      }),
    ]).catch(() => {});
    logger.info("Product created via Edge Function", { id: result.data.id, postType: savedType });
    return result;
  }, "createProduct").then((result) => (result.success ? result.data : result));
}

/**
 * Update an existing product
 *
 * Uses the revision loaded by the edit form so concurrent web and mobile
 * updates cannot silently overwrite each other.
 */
export async function updateProduct(
  id: number,
  formData: FormData
): Promise<ActionResult<undefined>> {
  const logger = await createActionLogger("updateProduct");
  logger.info("Starting product update", { id });

  // Parse form data
  const rawData: Record<string, unknown> = { version: Number(formData.get("version")) };
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

  return withErrorHandling<ActionResult<undefined>>(async () => {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("You must be signed in to update a listing");
    }

    // Get current product info for cache invalidation and ownership check
    const { data: currentProduct, error: fetchError } = await supabase
      .from("posts")
      .select("post_type,profile_id,metadata")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);
    if (!currentProduct) {
      return { success: false, error: { code: "NOT_FOUND", message: "Listing not found" } };
    }

    // Verify ownership
    if (currentProduct?.profile_id && currentProduct.profile_id !== user.id) {
      throw new Error("Unauthorized: You can only edit your own listings");
    }

    const { version, category_mode: _categoryMode, ...fields } = validation.data;
    const updates: Record<string, unknown> = { ...fields };
    if (fields.post_type && fields.post_type !== currentProduct.post_type) {
      updates.category_id = null;
      updates.metadata = {
        ...(currentProduct.metadata && typeof currentProduct.metadata === "object"
          ? currentProduct.metadata
          : {}),
        classification: {
          version: "2026-09-19.1",
          source: "manual",
          status: "manual",
          requestedPostType: currentProduct.post_type,
          postType: fields.post_type,
          suggestedPostType: null,
          confidence: null,
          needsReview: false,
          reason: "explicit_category_choice",
          decidedAt: new Date().toISOString(),
        },
      };
      if (fields.post_type === "volunteer") updates.is_active = false;
    }
    const { data: updated, error } = await supabase
      .from("posts")
      .update(updates)
      .eq("id", id)
      .eq("profile_id", user.id)
      .eq("version", version)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    if (!updated) {
      return {
        success: false,
        error: {
          code: "CONFLICT",
          message: "This listing changed while you were editing. Please refresh and try again.",
        },
      };
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
        .select("post_name,post_description,post_type,post_address,profile_id")
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
    return { success: true, data: undefined };
  }, "updateProduct").then((result) => (result.success ? result.data : result));
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
      .select("post_type,profile_id,is_active")
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
    }
    // Add favorite
    const { error } = await supabase
      .from("favorites")
      .insert({ product_id: productId, user_id: userId });

    if (error) throw new Error(error.message);

    // Invalidate caches for immediate UI update
    invalidateTag(CACHE_TAGS.PRODUCT(productId));
    invalidateTag(CACHE_TAGS.USER_PRODUCTS(userId));

    return { isFavorited: true };
  }, "toggleProductFavorite");
}

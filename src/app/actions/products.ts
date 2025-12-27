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

// NOTE: Data functions (getProducts, getAllProducts, etc.) should be imported
// directly from '@/lib/data/products' - they cannot be re-exported from a
// 'use server' file as only async server actions are allowed.

const IS_DEV = process.env.NODE_ENV === "development";

/**
 * Conditional logging - only logs in development
 */
function devLog(context: string, message: string, data?: unknown): void {
  if (!IS_DEV) return;
  const dataStr = data ? ` ${JSON.stringify(data)}` : "";
  console.log(`[${context}] ${message}${dataStr}`);
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
});

const updateProductSchema = createProductSchema.partial().extend({
  is_active: z.boolean().optional(),
});

/**
 * Create a new product
 */
export async function createProduct(formData: FormData): Promise<ActionResult<{ id: number }>> {
  devLog("createProduct", "🚀 Starting...");

  // Parse form data - convert null to undefined for optional fields
  const getString = (key: string): string => (formData.get(key) as string) ?? "";
  const getOptionalString = (key: string): string | undefined => {
    const value = formData.get(key);
    return value ? (value as string) : undefined;
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
  };

  devLog("createProduct", "📝 Parsed", {
    post_name: rawData.post_name,
    post_type: rawData.post_type,
    images_count: rawData.images?.length,
  });

  // Validate with standard helper
  const validation = validateWithSchema(createProductSchema, rawData);
  if (!validation.success) {
    devLog("createProduct", "❌ Validation failed", validation.error);
    return validation;
  }

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

    const { data, error } = await supabase
      .from("posts")
      .insert({ ...validation.data, is_active: true })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Batch invalidate all product caches
    invalidateProductCaches(data.id, validation.data.post_type, validation.data.profile_id);

    devLog("createProduct", "✅ Created", { id: data.id });
    return { id: data.id };
  }, "createProduct").then(async (result) => {
    if (result.success && result.data) {
      // Fire-and-forget analytics (don't block response)
      trackEvent("Listing Created", {
        listingId: result.data.id,
        type: formData.get("post_type") as string,
      }).catch(() => {});
    }
    return result;
  });
}

/**
 * Update an existing product
 */
export async function updateProduct(
  id: number,
  formData: FormData
): Promise<ActionResult<undefined>> {
  devLog("updateProduct", "🚀 Starting", { id });

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
    devLog("updateProduct", "❌ Validation failed", validation.error);
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

    devLog("updateProduct", "✅ Updated", { id });
    return undefined;
  }, "updateProduct");
}

/**
 * Delete a product (soft delete - sets is_active = false)
 * This unpublishes the listing rather than permanently deleting it
 */
export async function deleteProduct(id: number): Promise<ActionResult<undefined>> {
  devLog("deleteProduct", "🚀 Starting soft delete", { id });

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

    devLog("deleteProduct", "✅ Unpublished", { id });
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

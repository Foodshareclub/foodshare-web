"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult, withErrorHandling, validateWithSchema } from "@/lib/errors";
import { CACHE_TAGS, invalidateTag } from "@/lib/data/cache-keys";
import { trackEvent } from "@/app/actions/analytics";

// NOTE: Data functions (getProducts, getAllProducts, etc.) should be imported
// directly from '@/lib/data/products' - they cannot be re-exported from a
// 'use server' file as only async server actions are allowed.

// ============================================================================
// Zod Schemas for validation
// ============================================================================

const createProductSchema = z.object({
  post_name: z.string().min(1, "Name is required").max(200),
  post_description: z.string().min(1, "Description is required").max(5000),
  post_type: z.string().min(1, "Type is required"),
  post_address: z.string().min(1, "Address is required"),
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
  // Parse form data
  const rawData = {
    post_name: formData.get("post_name") as string,
    post_description: formData.get("post_description") as string,
    post_type: formData.get("post_type") as string,
    post_address: formData.get("post_address") as string,
    available_hours: formData.get("available_hours") as string,
    transportation: formData.get("transportation") as string,
    condition: formData.get("condition") as string,
    images: JSON.parse((formData.get("images") as string) || "[]"),
    profile_id: formData.get("profile_id") as string,
  };

  // Validate with Zod
  const validation = validateWithSchema(createProductSchema, rawData);
  if (!validation.success) {
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

    if (error) throw new Error(error.message);

    // Invalidate product caches
    invalidateTag(CACHE_TAGS.PRODUCTS);
    invalidateTag(CACHE_TAGS.PRODUCT_LOCATIONS);
    invalidateTag(CACHE_TAGS.PRODUCTS_BY_TYPE(validation.data.post_type));
    invalidateTag(CACHE_TAGS.PRODUCT_LOCATIONS_BY_TYPE(validation.data.post_type));

    // Invalidate user-specific cache
    if (validation.data.profile_id) {
      invalidateTag(CACHE_TAGS.USER_PRODUCTS(validation.data.profile_id));
    }

    return { id: data.id };
  }, "createProduct").then(async (result) => {
    if (result.success && result.data) {
      await trackEvent("Listing Created", {
        listingId: result.data.id,
        type: formData.get("post_type") as string,
      });
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

  const images = formData.get("images");
  if (images) {
    rawData.images = JSON.parse(images as string);
  }

  // Validate with Zod (partial schema for updates)
  const validation = validateWithSchema(updateProductSchema, rawData);
  if (!validation.success) {
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

    if (error) throw new Error(error.message);

    // Invalidate product caches
    invalidateTag(CACHE_TAGS.PRODUCTS);
    invalidateTag(CACHE_TAGS.PRODUCT_LOCATIONS);
    invalidateTag(CACHE_TAGS.PRODUCT(id));

    // Invalidate type-specific caches (both old and new type if changed)
    if (currentProduct?.post_type) {
      invalidateTag(CACHE_TAGS.PRODUCTS_BY_TYPE(currentProduct.post_type));
      invalidateTag(CACHE_TAGS.PRODUCT_LOCATIONS_BY_TYPE(currentProduct.post_type));
    }
    if (validation.data.post_type && validation.data.post_type !== currentProduct?.post_type) {
      invalidateTag(CACHE_TAGS.PRODUCTS_BY_TYPE(validation.data.post_type));
      invalidateTag(CACHE_TAGS.PRODUCT_LOCATIONS_BY_TYPE(validation.data.post_type));
    }

    // Invalidate user-specific cache
    if (currentProduct?.profile_id) {
      invalidateTag(CACHE_TAGS.USER_PRODUCTS(currentProduct.profile_id));
    }

    return undefined;
  }, "updateProduct");
}

/**
 * Delete a product
 */
export async function deleteProduct(id: number): Promise<ActionResult<undefined>> {
  return withErrorHandling(async () => {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("You must be signed in to delete a listing");
    }

    // Get product info before deletion for cache invalidation and ownership check
    const { data: product } = await supabase
      .from("posts")
      .select("post_type, profile_id")
      .eq("id", id)
      .single();

    // Verify ownership
    if (product?.profile_id && product.profile_id !== user.id) {
      throw new Error("Unauthorized: You can only delete your own listings");
    }

    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) throw new Error(error.message);

    // Invalidate product caches
    invalidateTag(CACHE_TAGS.PRODUCTS);
    invalidateTag(CACHE_TAGS.PRODUCT_LOCATIONS);
    invalidateTag(CACHE_TAGS.PRODUCT(id));

    // Invalidate type-specific caches
    if (product?.post_type) {
      invalidateTag(CACHE_TAGS.PRODUCTS_BY_TYPE(product.post_type));
      invalidateTag(CACHE_TAGS.PRODUCT_LOCATIONS_BY_TYPE(product.post_type));
    }

    // Invalidate user-specific cache
    if (product?.profile_id) {
      invalidateTag(CACHE_TAGS.USER_PRODUCTS(product.profile_id));
    }

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
      return { isFavorited: false };
    } else {
      // Add favorite
      const { error } = await supabase
        .from("favorites")
        .insert({ product_id: productId, user_id: userId });

      if (error) throw new Error(error.message);
      return { isFavorited: true };
    }
  }, "toggleProductFavorite");
}

"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult, withErrorHandling, validateWithSchema } from "@/lib/errors";
import { CACHE_TAGS, invalidateTag, invalidatePostActivityCaches } from "@/lib/data/cache-keys";
import { trackEvent } from "@/app/actions/analytics";
import { logPostActivity as _logPostActivity } from "@/app/actions/post-activity";

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
  console.log("[createProduct] 🚀 Starting createProduct...");

  // Parse form data - convert null to undefined for optional fields
  const getString = (key: string): string => (formData.get(key) as string) ?? "";
  const getOptionalString = (key: string): string | undefined => {
    const value = formData.get(key);
    return value ? (value as string) : undefined;
  };

  const rawData = {
    post_name: getString("post_name"),
    post_description: getString("post_description"),
    post_type: getString("post_type"),
    post_address: getOptionalString("post_address") ?? "",
    available_hours: getOptionalString("available_hours"),
    transportation: getOptionalString("transportation"),
    condition: getOptionalString("condition"),
    images: JSON.parse((formData.get("images") as string) || "[]"),
    profile_id: getString("profile_id"),
  };

  console.log("[createProduct] 📝 Raw data parsed:", {
    post_name: rawData.post_name,
    post_name_length: rawData.post_name?.length,
    post_description_length: rawData.post_description?.length,
    post_type: rawData.post_type,
    post_address: rawData.post_address,
    post_address_length: rawData.post_address?.length,
    images_count: rawData.images?.length,
    profile_id: rawData.profile_id,
  });

  // Validate with Zod - do manual validation first to get detailed errors
  const zodResult = createProductSchema.safeParse(rawData);
  if (!zodResult.success) {
    const fieldErrors = zodResult.error.issues.map((e: z.ZodIssue) => ({
      field: e.path.join("."),
      message: e.message,
      code: e.code,
    }));
    console.log(
      "[createProduct] ❌ Zod validation failed - Field errors:",
      JSON.stringify(fieldErrors, null, 2)
    );
  }

  // Validate with standard helper
  const validation = validateWithSchema(createProductSchema, rawData);
  if (!validation.success) {
    console.log("[createProduct] ❌ Validation failed:", validation.error);
    return validation;
  }
  console.log("[createProduct] ✅ Validation passed");

  return withErrorHandling(async () => {
    console.log("[createProduct] 🔐 Getting Supabase client...");
    const supabase = await createClient();

    // Verify user is authenticated and matches profile_id
    console.log("[createProduct] 👤 Checking user authentication...");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.log("[createProduct] ❌ User not authenticated");
      throw new Error("You must be signed in to create a listing");
    }
    console.log("[createProduct] ✅ User authenticated:", user.id);

    if (user.id !== validation.data.profile_id) {
      console.log(
        "[createProduct] ❌ User ID mismatch:",
        user.id,
        "!=",
        validation.data.profile_id
      );
      throw new Error("Unauthorized: User ID mismatch");
    }
    console.log("[createProduct] ✅ User ID matches profile_id");

    console.log("[createProduct] 💾 Inserting into database...");
    const { data, error } = await supabase
      .from("posts")
      .insert({ ...validation.data, is_active: true })
      .select("id")
      .single();

    if (error) {
      console.error("[createProduct] ❌ Database error:", error);
      throw new Error(error.message);
    }
    console.log("[createProduct] ✅ Inserted, post ID:", data.id);

    // Invalidate product caches
    console.log("[createProduct] 🗑️ Invalidating caches...");
    invalidateTag(CACHE_TAGS.PRODUCTS);
    invalidateTag(CACHE_TAGS.PRODUCT_LOCATIONS);
    invalidateTag(CACHE_TAGS.PRODUCTS_BY_TYPE(validation.data.post_type));
    invalidateTag(CACHE_TAGS.PRODUCT_LOCATIONS_BY_TYPE(validation.data.post_type));

    // Invalidate user-specific cache
    if (validation.data.profile_id) {
      invalidateTag(CACHE_TAGS.USER_PRODUCTS(validation.data.profile_id));
    }

    console.log("[createProduct] ✅ SUCCESS! Returning id:", data.id);

    // Invalidate activity caches
    invalidatePostActivityCaches(data.id, validation.data.profile_id);

    return { id: data.id };
  }, "createProduct").then(async (result) => {
    if (result.success && result.data) {
      console.log("[createProduct] 📊 Tracking analytics event...");
      await trackEvent("Listing Created", {
        listingId: result.data.id,
        type: formData.get("post_type") as string,
      });
    }
    console.log("[createProduct] 🏁 Complete, result:", result.success ? "success" : "failed");
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
  console.log("[updateProduct] 🚀 Starting updateProduct for id:", id);

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

  console.log("[updateProduct] 📝 Raw data parsed:", {
    post_name: rawData.post_name,
    post_type: rawData.post_type,
    images_count: (rawData.images as string[])?.length,
    is_active: rawData.is_active,
  });

  // Validate with Zod (partial schema for updates)
  const validation = validateWithSchema(updateProductSchema, rawData);
  if (!validation.success) {
    console.log("[updateProduct] ❌ Validation failed:", validation.error);
    return validation;
  }
  console.log("[updateProduct] ✅ Validation passed");

  return withErrorHandling(async () => {
    console.log("[updateProduct] 🔐 Getting Supabase client...");
    const supabase = await createClient();

    // Verify user is authenticated
    console.log("[updateProduct] 👤 Checking user authentication...");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.log("[updateProduct] ❌ User not authenticated");
      throw new Error("You must be signed in to update a listing");
    }
    console.log("[updateProduct] ✅ User authenticated:", user.id);

    // Get current product info for cache invalidation and ownership check
    console.log("[updateProduct] 📝 Getting current product...");
    const { data: currentProduct } = await supabase
      .from("posts")
      .select("post_type, profile_id")
      .eq("id", id)
      .single();

    // Verify ownership
    if (currentProduct?.profile_id && currentProduct.profile_id !== user.id) {
      console.log("[updateProduct] ❌ Ownership check failed");
      throw new Error("Unauthorized: You can only edit your own listings");
    }
    console.log("[updateProduct] ✅ Ownership verified");

    console.log("[updateProduct] 💾 Updating database...");
    const { error } = await supabase.from("posts").update(validation.data).eq("id", id);

    if (error) {
      console.error("[updateProduct] ❌ Database error:", error);
      throw new Error(error.message);
    }
    console.log("[updateProduct] ✅ Database updated");

    // Invalidate product caches
    console.log("[updateProduct] 🗑️ Invalidating caches...");
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

    // Invalidate activity caches
    invalidatePostActivityCaches(id, currentProduct?.profile_id);

    console.log("[updateProduct] ✅ SUCCESS!");
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

    // Invalidate activity caches
    invalidatePostActivityCaches(id, product?.profile_id);

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

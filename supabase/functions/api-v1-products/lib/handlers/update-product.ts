/**
 * Product API v1 PUT Update Handler
 */

import type { HandlerContext } from "../../../_shared/api-handler.ts";
import { ok } from "../../../_shared/api-handler.ts";
import {
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import { sanitizeHtml } from "../../../_shared/validation-rules.ts";
import { validateProductImageUrls } from "../../../_shared/storage-urls.ts";
import type { ListQuery, UpdateProductBody } from "../schemas.ts";
import { transformProduct } from "../transformers.ts";
import { cache, invalidateListingCache } from "../../../_shared/cache.ts";
import { manualClassification } from "../classification.ts";

export async function updateProduct(
  ctx: HandlerContext<UpdateProductBody, ListQuery>,
): Promise<Response> {
  const { supabase, userId, body, query } = ctx;
  const productId = query.id;

  if (!productId) {
    throw new ValidationError("Product ID is required");
  }

  if (!userId) {
    throw new AuthenticationError();
  }

  const { data: existing, error: fetchError } = await supabase
    .from("posts")
    .select("id,profile_id,version,post_type,metadata")
    .eq("id", productId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) {
    throw new NotFoundError("Product", productId);
  }

  if (existing.profile_id !== userId) {
    throw new AuthorizationError("You can only update your own products");
  }

  if (existing.version !== body.version) {
    throw new ConflictError(
      "Product was modified by another request. Please refresh and try again.",
      { currentVersion: existing.version, expectedVersion: body.version },
    );
  }

  if (body.images !== undefined) {
    const imageCheck = await validateProductImageUrls(body.images);
    if (!imageCheck.valid) {
      throw new ValidationError(
        "All image URLs must be uploaded through our image API",
        { invalidUrls: imageCheck.invalidUrls },
      );
    }
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.title !== undefined) updates.post_name = sanitizeHtml(body.title);
  if (body.description !== undefined) {
    updates.post_description = sanitizeHtml(body.description);
  }
  if (body.images !== undefined) updates.images = body.images;
  if (body.pickupAddress !== undefined) {
    updates.post_address = sanitizeHtml(body.pickupAddress);
  }
  if (body.pickupTime !== undefined) {
    updates.pickup_time = sanitizeHtml(body.pickupTime);
    updates.available_hours = updates.pickup_time;
  }
  if (body.categoryId !== undefined) updates.category_id = body.categoryId;
  if (body.expiresAt !== undefined) updates.expires_at = body.expiresAt;
  if (body.isActive !== undefined) updates.is_active = body.isActive;
  if (body.postType !== undefined && body.postType !== existing.post_type) {
    updates.post_type = body.postType;
    updates.category_id = body.categoryId ?? null;
    updates.metadata = {
      ...(existing.metadata ?? {}),
      classification: {
        ...manualClassification(body.postType),
        requestedPostType: existing.post_type,
        decidedAt: new Date().toISOString(),
      },
    };
    // Moving a listing into volunteering must enter its existing approval workflow.
    if (body.postType === "volunteer") updates.is_active = false;
  }

  const { data, error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", productId)
    .eq("profile_id", userId)
    .eq("version", body.version)
    .select()
    .maybeSingle();

  if (error) {
    logger.error("Failed to update product", new Error(error.message));
    throw error;
  }
  if (!data) {
    throw new ConflictError("Product was modified during update. Please refresh and try again.");
  }

  logger.info("Product updated", {
    productId,
    userId,
    newVersion: data.version,
  });

  invalidateListingCache(productId, userId);
  try {
    cache.clear();
  } catch {
    // ignore cache clear errors
  }

  return ok(transformProduct(data), ctx);
}

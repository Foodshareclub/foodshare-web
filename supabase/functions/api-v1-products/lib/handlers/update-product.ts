/**
 * Product API v1 PUT Update Handler
 */

import type { HandlerContext } from "../../../_shared/api-handler.ts";
import { ok } from "../../../_shared/api-handler.ts";
import { ConflictError, NotFoundError, ValidationError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import { sanitizeHtml } from "../../../_shared/validation-rules.ts";
import { validateProductImageUrls } from "../../../_shared/storage-urls.ts";
import type { ListQuery, UpdateProductBody } from "../schemas.ts";
import { transformProduct } from "../transformers.ts";

export async function updateProduct(
  ctx: HandlerContext<UpdateProductBody, ListQuery>
): Promise<Response> {
  const { supabase, userId, body, query } = ctx;
  const productId = query.id;

  if (!productId) {
    throw new ValidationError("Product ID is required");
  }

  if (!userId) {
    throw new ValidationError("Authentication required");
  }

  const { data: existing, error: fetchError } = await supabase
    .from("posts")
    .select("id,profile_id,version")
    .eq("id", productId)
    .single();

  if (fetchError || !existing) {
    throw new NotFoundError("Product", productId);
  }

  if (existing.profile_id !== userId) {
    throw new ValidationError("You can only update your own products");
  }

  if (existing.version !== body.version) {
    throw new ConflictError(
      "Product was modified by another request. Please refresh and try again.",
      { currentVersion: existing.version, expectedVersion: body.version }
    );
  }

  if (body.images !== undefined) {
    const imageCheck = await validateProductImageUrls(body.images);
    if (!imageCheck.valid) {
      throw new ValidationError("All image URLs must be uploaded through our image API", {
        invalidUrls: imageCheck.invalidUrls,
      });
    }
  }

  const updates: Record<string, unknown> = {
    version: existing.version + 1,
    updated_at: new Date().toISOString(),
  };

  if (body.title !== undefined) updates.post_name = sanitizeHtml(body.title);
  if (body.description !== undefined) {
    updates.post_description = sanitizeHtml(body.description);
  }
  if (body.images !== undefined) updates.images = body.images;
  if (body.pickupAddress !== undefined) {
    updates.pickup_address = sanitizeHtml(body.pickupAddress);
  }
  if (body.pickupTime !== undefined) {
    updates.pickup_time = sanitizeHtml(body.pickupTime);
  }
  if (body.categoryId !== undefined) updates.category_id = body.categoryId;
  if (body.expiresAt !== undefined) updates.expires_at = body.expiresAt;
  if (body.isActive !== undefined) updates.is_active = body.isActive;

  const { data, error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", productId)
    .eq("version", body.version)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new ConflictError("Product was modified during update");
    }
    logger.error("Failed to update product", new Error(error.message));
    throw error;
  }

  logger.info("Product updated", {
    productId,
    userId,
    newVersion: data.version,
  });

  return ok(transformProduct(data), ctx);
}

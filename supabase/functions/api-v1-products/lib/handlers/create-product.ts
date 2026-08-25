/**
 * Product API v1 POST Create Handler
 */

import type { HandlerContext } from "../../../_shared/api-handler.ts";
import { created } from "../../../_shared/api-handler.ts";
import { ValidationError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import { sanitizeHtml } from "../../../_shared/validation-rules.ts";
import { validateProductImageUrls } from "../../../_shared/storage-urls.ts";
import type { CreateProductBody } from "../schemas.ts";
import { transformProduct } from "../transformers.ts";

export async function createProduct(ctx: HandlerContext<CreateProductBody>): Promise<Response> {
  const { supabase, userId, body } = ctx;

  if (!userId) {
    throw new ValidationError("Authentication required");
  }

  const imageCheck = await validateProductImageUrls(body.images);
  if (!imageCheck.valid) {
    throw new ValidationError("All image URLs must be uploaded through our image API", {
      invalidUrls: imageCheck.invalidUrls,
    });
  }

  const sanitizedTitle = sanitizeHtml(body.title);
  const sanitizedDescription = body.description ? sanitizeHtml(body.description) : undefined;
  const sanitizedPickupAddress = body.pickupAddress ? sanitizeHtml(body.pickupAddress) : undefined;
  const sanitizedPickupTime = body.pickupTime ? sanitizeHtml(body.pickupTime) : undefined;

  const { data: validation, error: validationError } = await supabase.rpc(
    "validate_listing_content",
    {
      p_title: sanitizedTitle,
      p_description: sanitizedDescription || "",
    }
  );

  if (validationError) {
    logger.warn("Content validation failed", {
      error: validationError.message,
    });
  }

  if (validation && !validation.is_valid) {
    throw new ValidationError("Content validation failed", validation.issues);
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      profile_id: userId,
      post_name: sanitizedTitle,
      post_description: sanitizedDescription,
      images: body.images,
      post_type: body.postType,
      latitude: body.latitude,
      longitude: body.longitude,
      pickup_address: sanitizedPickupAddress,
      pickup_time: sanitizedPickupTime,
      category_id: body.categoryId,
      expires_at: body.expiresAt,
      is_active: true,
      version: 1,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to create product", new Error(error.message));
    throw error;
  }

  logger.info("Product created", { productId: data.id, userId });

  try {
    (globalThis as any).EdgeRuntime.waitUntil(
      supabase.functions
        .invoke("api-v1-notifications", {
          body: {
            route: "trigger/new-listing",
            food_item_id: data.id,
            user_id: userId,
            latitude: data.latitude,
            longitude: data.longitude,
            post_name: data.post_name,
            post_type: data.post_type,
          },
        })
        .catch((err: unknown) => {
          logger.warn("Failed to trigger new-listing notification", {
            error: err instanceof Error ? err.message : String(err),
          });
        })
    );
  } catch {
    // (globalThis as any).EdgeRuntime.waitUntil may not be available in all environments
  }

  return created(transformProduct(data), ctx);
}

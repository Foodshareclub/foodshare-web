/**
 * Product API v1 POST Create Handler
 */

import type { HandlerContext } from "../../../_shared/api-handler.ts";
import { created } from "../../../_shared/api-handler.ts";
import { AuthenticationError, ValidationError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import { sanitizeHtml } from "../../../_shared/validation-rules.ts";
import { validateProductImageUrls } from "../../../_shared/storage-urls.ts";
import type { CreateProductBody } from "../schemas.ts";
import { transformProduct } from "../transformers.ts";
import { cache } from "../../../_shared/cache.ts";
import { classifyListing } from "../classification.ts";
import { predictListingCategory } from "../classification-ai.ts";

export async function createProduct(
  ctx: HandlerContext<CreateProductBody>,
): Promise<Response> {
  const { supabase, userId, body } = ctx;

  if (!userId) {
    throw new AuthenticationError();
  }

  const imageCheck = await validateProductImageUrls(body.images);
  if (!imageCheck.valid) {
    throw new ValidationError(
      "All image URLs must be uploaded through our image API",
      { invalidUrls: imageCheck.invalidUrls },
    );
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
    },
  );

  if (validationError) {
    logger.warn("Content validation failed", {
      error: validationError.message,
    });
  }

  if (validation && !validation.is_valid) {
    throw new ValidationError("Content validation failed", validation.issues);
  }

  const classification = await classifyListing({
    title: sanitizedTitle,
    description: sanitizedDescription,
    postType: body.postType,
    categoryMode: body.categoryMode,
  }, predictListingCategory);

  const { data, error } = await supabase
    .from("posts")
    .insert({
      profile_id: userId,
      post_name: sanitizedTitle,
      post_description: sanitizedDescription,
      images: body.images,
      post_type: classification.postType,
      ...(body.longitude !== undefined && body.latitude !== undefined
        ? { location: `SRID=4326;POINT(${body.longitude} ${body.latitude})` }
        : {}),
      post_address: sanitizedPickupAddress,
      pickup_time: sanitizedPickupTime,
      available_hours: sanitizedPickupTime,
      transportation: body.transportation ? sanitizeHtml(body.transportation) : undefined,
      condition: body.condition ? sanitizeHtml(body.condition) : undefined,
      // A subcategory chosen for the old type may be incompatible with the resolved type.
      category_id: classification.postType === body.postType ? body.categoryId : undefined,
      expires_at: body.expiresAt,
      is_active: classification.postType !== "volunteer",
      metadata: { classification: { ...classification, decidedAt: new Date().toISOString() } },
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to create product", new Error(error.message));
    throw error;
  }

  logger.info("Product created", { productId: data.id, userId });

  // 10x cache invalidation — new listing busts list caches
  try {
    cache.clear();
  } catch {
    // ignore cache clear errors
  }

  if (!data.is_active || body.latitude === undefined || body.longitude === undefined) {
    return created(transformProduct(data), ctx);
  }

  try {
    (globalThis as any).EdgeRuntime.waitUntil(
      supabase.functions.invoke("api-v1-notifications", {
        body: {
          route: "trigger/new-listing",
          food_item_id: data.id,
          user_id: userId,
          latitude: body.latitude,
          longitude: body.longitude,
          post_name: data.post_name,
          post_type: data.post_type,
        },
      }).catch((err: unknown) => {
        logger.warn("Failed to trigger new-listing notification", {
          error: err instanceof Error ? err.message : String(err),
        });
      }),
    );
  } catch {
    // (globalThis as any).EdgeRuntime.waitUntil may not be available in all environments
  }

  return created(transformProduct(data), ctx);
}

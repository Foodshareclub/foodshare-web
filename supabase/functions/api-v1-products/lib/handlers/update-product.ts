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
import { createListingCover } from "../listing-cover.ts";

export interface UpdateProductDependencies {
  createCover?: typeof createListingCover;
}

export async function updateProduct(
  ctx: HandlerContext<UpdateProductBody, ListQuery>,
  deps: UpdateProductDependencies = {},
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
    .select("id,profile_id,version,post_type,post_name,post_description,images,metadata")
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

  if (body.images !== undefined && body.images.length > 0) {
    const imageCheck = await validateProductImageUrls(body.images);
    if (!imageCheck.valid) {
      throw new ValidationError(
        "Images must be available in our storage. Upload them through our image API",
        { invalidUrls: imageCheck.invalidUrls },
      );
    }
  }

  const sanitizedTitle = body.title !== undefined ? sanitizeHtml(body.title) : undefined;
  const sanitizedDescription = body.description !== undefined
    ? sanitizeHtml(body.description)
    : undefined;

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  const existingMeta = (existing.metadata ?? {}) as Record<string, unknown>;
  const mergedMetadata: Record<string, unknown> = { ...existingMeta };
  let metadataUpdated = false;

  if (sanitizedTitle !== undefined) updates.post_name = sanitizedTitle;
  if (sanitizedDescription !== undefined) {
    updates.post_description = sanitizedDescription;
  }
  if (body.images !== undefined) {
    if (body.images.length > 0) {
      updates.images = body.images;
    } else {
      const generateCover = deps.createCover ?? createListingCover;
      const coverResult = await generateCover(
        {
          title: sanitizedTitle ?? String(existing.post_name ?? ""),
          description: sanitizedDescription ??
            (typeof existing.post_description === "string" ? existing.post_description : undefined),
          postType: body.postType ?? existing.post_type,
          images: [],
        },
        userId,
        supabase,
        ctx.ctx?.requestId || "",
      );
      updates.images = coverResult.images;
      const priorArchive = Array.isArray(existingMeta.cover_image_archive)
        ? existingMeta.cover_image_archive.filter((v): v is string => typeof v === "string")
        : [];
      const priorImages = Array.isArray(existing.images)
        ? existing.images.filter((v): v is string => typeof v === "string")
        : [];
      const archive = [...new Set([...priorArchive, ...priorImages])];
      if (archive.length > 0) {
        mergedMetadata.cover_image_archive = archive;
      }
      if (coverResult.cover) {
        mergedMetadata.cover = coverResult.cover;
      }
      metadataUpdated = true;
    }
  }
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
    mergedMetadata.classification = {
      ...manualClassification(body.postType),
      requestedPostType: existing.post_type,
      decidedAt: new Date().toISOString(),
    };
    metadataUpdated = true;
    // Moving a listing into volunteering must enter its existing approval workflow.
    if (body.postType === "volunteer") updates.is_active = false;
  }
  if (metadataUpdated) {
    updates.metadata = mergedMetadata;
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

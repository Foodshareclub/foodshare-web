/**
 * Product API v1 DELETE Handler
 */

import type { HandlerContext } from "../../../_shared/api-handler.ts";
import { noContent } from "../../../_shared/api-handler.ts";
import { NotFoundError, ValidationError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import type { ListQuery } from "../schemas.ts";
import { cache, invalidateListingCache } from "../../../_shared/cache.ts";

export async function deleteProduct(
  ctx: HandlerContext<unknown, ListQuery>,
): Promise<Response> {
  const { supabase, userId, query } = ctx;
  const productId = query.id;

  if (!productId) {
    throw new ValidationError("Product ID is required");
  }

  if (!userId) {
    throw new ValidationError("Authentication required");
  }

  const { data: existing, error: fetchError } = await supabase
    .from("posts")
    .select("id,profile_id")
    .eq("id", productId)
    .single();

  if (fetchError || !existing) {
    throw new NotFoundError("Product", productId);
  }

  if (existing.profile_id !== userId) {
    throw new ValidationError("You can only delete your own products");
  }

  const { error } = await supabase
    .from("posts")
    .update({
      is_active: false,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (error) {
    logger.error("Failed to delete product", new Error(error.message));
    throw error;
  }

  logger.info("Product deleted", { productId, userId });

  invalidateListingCache(productId, userId);
  try {
    cache.clear();
  } catch (_e) {
    // ignore cache clear errors
  }

  return noContent(ctx);
}

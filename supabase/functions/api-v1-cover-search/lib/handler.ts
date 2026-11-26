import { created, type HandlerContext } from "../../_shared/api-handler.ts";
import { AuthenticationError, ValidationError } from "../../_shared/errors.ts";
import { z } from "../../_shared/schemas/common.ts";
import { LISTING, sanitizeHtml } from "../../_shared/validation-rules.ts";
import { validateProductImageUrls } from "../../_shared/storage-urls.ts";
import { postTypeSchema } from "../../api-v1-products/lib/schemas.ts";
import { createListingCover } from "../../api-v1-products/lib/listing-cover.ts";

export const coverSearchSchema = z.object({
  postId: z.number().int().positive().optional(),
  title: z.string().min(LISTING.title.minLength).max(LISTING.title.maxLength).optional(),
  description: z.string().max(LISTING.description.maxLength).optional(),
  postType: postTypeSchema.optional(),
  images: z.array(z.string().url()).max(5).default([]),
});

export async function handleCoverSearch(
  ctx: HandlerContext<z.infer<typeof coverSearchSchema>>,
): Promise<Response> {
  if (!ctx.userId) throw new AuthenticationError();

  let title = ctx.body.title;
  let description = ctx.body.description;
  let postType = ctx.body.postType;
  const postId = ctx.body.postId;

  if (postId) {
    const { data: post, error: postErr } = await ctx.supabase
      .from("posts")
      .select("id, post_name, post_description, post_type, profile_id, images, metadata")
      .eq("id", postId)
      .maybeSingle();

    if (postErr || !post) {
      throw new ValidationError(`Post #${postId} not found`);
    }

    title = title ?? post.post_name;
    description = description ?? post.post_description;
    postType = postType ?? post.post_type;
  }

  if (!title || !postType) {
    throw new ValidationError("title and postType are required");
  }

  const imageCheck = await validateProductImageUrls(ctx.body.images);
  if (!imageCheck.valid) {
    throw new ValidationError("Existing photos must belong to FoodShare Storage");
  }

  const sanitizedTitle = sanitizeHtml(title);
  const sanitizedDescription = description ? sanitizeHtml(description) : undefined;

  const result = await createListingCover(
    {
      title: sanitizedTitle,
      description: sanitizedDescription,
      postType,
      images: ctx.body.images,
    },
    ctx.userId,
    ctx.supabase,
    ctx.ctx?.requestId || "",
    { quota: () => Promise.resolve(true) },
  );

  if (postId && result.images && result.images.length > 0) {
    const now = new Date().toISOString();
    const newMetadata = {
      cover: result.cover,
      image_provenance: {
        source_url: result.cover?.sourceImageUrl || result.images[0],
        source: result.cover?.provider || "wikimedia-commons",
        verify_score: result.cover?.confidence ?? (result.cover?.kind === "generated" ? 0 : 1.0),
        verify_model: result.cover?.model || "commons-search-v1",
        crawled_at: now,
        placed_at: now,
        status: "placed",
        query_type: postType,
      },
    };

    await ctx.supabase
      .from("posts")
      .update({
        images: result.images,
        metadata: newMetadata,
      })
      .eq("id", postId);
  }

  return created(result, ctx);
}

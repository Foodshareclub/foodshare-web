import {created,type HandlerContext} from "../../_shared/api-handler.ts";
import {AuthenticationError,ValidationError} from "../../_shared/errors.ts";
import {z} from "../../_shared/schemas/common.ts";
import {LISTING,sanitizeHtml} from "../../_shared/validation-rules.ts";
import {validateProductImageUrls} from "../../_shared/storage-urls.ts";
import {postTypeSchema} from "../../api-v1-products/lib/schemas.ts";
import {createListingCover} from "../../api-v1-products/lib/listing-cover.ts";
export const coverSearchSchema=z.object({
  title:z.string().min(LISTING.title.minLength).max(LISTING.title.maxLength),
  description:z.string().max(LISTING.description.maxLength).optional(),
  postType:postTypeSchema,
  images:z.array(z.string().url()).max(5).default([]),
});
export async function handleCoverSearch(ctx:HandlerContext<z.infer<typeof coverSearchSchema>>):Promise<Response> {
  if(!ctx.userId)throw new AuthenticationError();
  const imageCheck=await validateProductImageUrls(ctx.body.images);
  if(!imageCheck.valid)throw new ValidationError("Existing photos must belong to FoodShare Storage");
  const result=await createListingCover({...ctx.body,title:sanitizeHtml(ctx.body.title),
    description:ctx.body.description?sanitizeHtml(ctx.body.description):undefined},ctx.userId,ctx.supabase,ctx.ctx?.requestId || "");
  return created(result,ctx);
}

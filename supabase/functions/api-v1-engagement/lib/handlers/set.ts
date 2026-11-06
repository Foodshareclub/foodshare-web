import { type HandlerContext, ok } from "../../../_shared/api-handler.ts";
import { ValidationError } from "../../../_shared/errors.ts";
import { setPostEngagement } from "../../../_shared/post-engagement.ts";
import { logActivity } from "../activity.ts";
import { setEngagementSchema } from "../schemas.ts";

export async function setEngagement(
  ctx: HandlerContext<unknown>,
  kind: "like" | "bookmark",
): Promise<Response> {
  if (!ctx.userId) throw new ValidationError("Authentication required");
  const parsed = setEngagementSchema.safeParse(ctx.body);
  if (!parsed.success) {
    throw new ValidationError("A positive postId and boolean active state are required");
  }
  const { postId, active } = parsed.data;
  const result = await setPostEngagement(ctx.supabase, kind, postId, ctx.userId, active);
  // Repeated desired-state writes must not repeat activity side effects.
  if (result.changed) {
    const action = kind === "like"
      ? (active ? "liked" : "unliked")
      : (active ? "bookmarked" : "unbookmarked");
    await logActivity(ctx.supabase, postId, ctx.userId, action);
  }
  return ok(
    kind === "like"
      ? { postId, isLiked: result.active, likeCount: result.likeCount }
      : { postId, isBookmarked: result.active },
    ctx,
  );
}

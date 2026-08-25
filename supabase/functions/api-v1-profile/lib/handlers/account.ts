import { type HandlerContext, ok } from "../../../_shared/api-handler.ts";
import { ValidationError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import { getAdminClient } from "../../../_shared/supabase.ts";
import { deleteAvatar } from "./avatar.ts";
import type { QueryParams } from "../schemas.ts";

export async function deleteAccount(ctx: HandlerContext): Promise<Response> {
  const { userId } = ctx;

  if (!userId) {
    throw new ValidationError("Authentication required");
  }

  logger.info("Deleting user", { userId });

  const supabaseAdmin = getAdminClient();

  try {
    const { data: avatarFiles } = await supabaseAdmin.storage.from("avatars")
      .list(userId);
    if (avatarFiles?.length) {
      await supabaseAdmin.storage.from("avatars").remove(
        avatarFiles.map((f) => `${userId}/${f.name}`),
      );
      logger.info("Deleted avatar files", { count: avatarFiles.length });
    }
  } catch (error) {
    logger.warn("Storage cleanup error", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const { data: postImages } = await supabaseAdmin.storage.from("post-images")
      .list(userId);
    if (postImages?.length) {
      await supabaseAdmin.storage.from("post-images").remove(
        postImages.map((f) => `${userId}/${f.name}`),
      );
      logger.info("Deleted post images", { count: postImages.length });
    }
  } catch (error) {
    logger.warn("Post images cleanup error", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
    userId,
  );

  if (deleteError) {
    logger.error("Failed to delete user", new Error(deleteError.message));
    throw new ValidationError("Failed to delete account. Please try again.");
  }

  logger.info("User deleted successfully", { userId });

  return ok(
    {
      success: true,
      message: "Account deleted successfully",
      deletedUserId: userId,
    },
    ctx,
  );
}

export function handleDelete(
  ctx: HandlerContext<unknown, QueryParams>,
): Promise<Response> {
  if (ctx.query.action === "avatar") {
    return deleteAvatar(ctx);
  }
  if (ctx.query.action === "account") {
    return deleteAccount(ctx);
  }
  throw new ValidationError(
    "Invalid action. Use ?action=avatar or ?action=account",
  );
}

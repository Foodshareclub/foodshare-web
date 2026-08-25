import { type HandlerContext, noContent, ok } from "../../../_shared/api-handler.ts";
import { ServerError, ValidationError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import type { QueryParams, UploadAvatarBody } from "../schemas.ts";

export async function uploadAvatar(ctx: HandlerContext<UploadAvatarBody>): Promise<Response> {
  const { supabase, userId, body } = ctx;

  if (!userId) {
    throw new ValidationError("Authentication required");
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const MAX_BASE64_LENGTH = Math.ceil((MAX_FILE_SIZE * 4) / 3) + 100;

  if (body.imageData.length > MAX_BASE64_LENGTH) {
    throw new ValidationError("File too large. Maximum size is 5MB");
  }

  const base64Data = body.imageData.includes(",") ? body.imageData.split(",")[1] : body.imageData;

  if (base64Data.length > MAX_BASE64_LENGTH) {
    throw new ValidationError("File too large. Maximum size is 5MB");
  }

  const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

  if (binaryData.length > MAX_FILE_SIZE) {
    throw new ValidationError("File too large. Maximum size is 5MB");
  }

  const extMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const ext = extMap[body.mimeType] || "jpg";
  const fileName = `${userId}/avatar.${ext}`;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const formData = new FormData();
  formData.append("file", new Blob([binaryData], { type: body.mimeType }));
  formData.append("bucket", "avatars");
  formData.append("path", fileName);
  formData.append("generateThumbnail", "false");
  formData.append("extractEXIF", "false");
  formData.append("enableAI", "false");

  const uploadResponse = await fetch(`${supabaseUrl}/functions/v1/api-v1-images/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new ServerError(`Avatar upload failed: ${error}`);
  }

  const uploadResult = await uploadResponse.json();
  const publicUrl = uploadResult.data.url;

  const otherExtensions = Object.values(extMap).filter((e) => e !== ext);
  const oldAvatarPaths = otherExtensions.map((e) => `${userId}/avatar.${e}`);

  supabase.storage
    .from("avatars")
    .remove(oldAvatarPaths)
    .then(({ error }) => {
      if (error) {
        logger.warn("Failed to cleanup old avatars", {
          userId,
          error: error.message,
        });
      }
    });

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    logger.error("Failed to update profile with avatar", new Error(updateError.message));
    throw updateError;
  }

  logger.info("Avatar uploaded", { userId, fileName });

  return ok({ url: publicUrl }, ctx);
}

export async function deleteAvatar(ctx: HandlerContext<unknown, QueryParams>): Promise<Response> {
  const { supabase, userId } = ctx;

  if (!userId) {
    throw new ValidationError("Authentication required");
  }

  const avatarPaths = [
    `${userId}/avatar.jpg`,
    `${userId}/avatar.png`,
    `${userId}/avatar.webp`,
    `${userId}/avatar.gif`,
  ];

  await supabase.storage.from("avatars").remove(avatarPaths);

  supabase.storage
    .from("profiles")
    .remove(avatarPaths)
    .then(({ error }) => {
      if (error) {
        logger.warn("Failed to cleanup legacy profile avatars", {
          userId,
          error: error.message,
        });
      }
    });

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      avatar_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    logger.error("Failed to update profile", new Error(updateError.message));
    throw updateError;
  }

  logger.info("Avatar deleted", { userId });

  return noContent(ctx);
}

export function handlePost(ctx: HandlerContext<UploadAvatarBody, QueryParams>): Promise<Response> {
  if (ctx.query.action === "avatar") {
    return uploadAvatar(ctx);
  }
  throw new ValidationError("Invalid action. Use ?action=avatar for uploads");
}

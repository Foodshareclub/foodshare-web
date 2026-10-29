import type { SupabaseClient } from "@supabase/supabase-js";
import { DatabaseError, ValidationError } from "./errors.ts";
import { logger } from "./logger.ts";

export function postEngagementId(value: unknown): number {
  const candidate = typeof value === "string" && /^[1-9]\d*$/.test(value.trim()) ? Number(value.trim()) : value;
  if (typeof candidate !== "number" || !Number.isSafeInteger(candidate) || candidate < 1) {
    throw new ValidationError("A positive post ID is required");
  }
  return candidate;
}

export interface PostEngagementState {
  active: boolean;
  likeCount: number;
}

/** One database transaction for each toggle; failures never become success. */
export async function togglePostEngagement(
  // deno-lint-ignore no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  kind: "like" | "bookmark",
  postId: unknown,
  userId: string,
): Promise<PostEngagementState> {
  const { data, error } = await supabase.rpc("toggle_post_engagement", {
    p_post_id: postEngagementId(postId),
    p_user_id: userId,
    p_kind: kind,
  });
  if (error) {
    logger.error("Post engagement mutation failed", { kind, code: error.code });
    throw new DatabaseError("Unable to update engagement");
  }
  if (!data || typeof data.active !== "boolean" || !Number.isSafeInteger(data.likeCount) || data.likeCount < 0) {
    throw new DatabaseError("Invalid engagement mutation response");
  }
  return { active: data.active, likeCount: data.likeCount };
}

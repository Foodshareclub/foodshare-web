/**
 * Engagement Schemas
 *
 * Zod schemas + inferred types for engagement routes.
 * Extracted from `api-v1-engagement/index.ts` — no changes.
 */

import { positiveIntSchema, uuidSchema, z } from "../../_shared/schemas/common.ts";

export const toggleEngagementSchema = z.object({
  postId: positiveIntSchema,
});

export const shareSchema = z.object({
  postId: positiveIntSchema,
  method: z.enum(["link", "social", "email", "other"]).default("link"),
});

export const batchOperationSchema = z.object({
  correlationId: uuidSchema,
  type: z.enum([
    "toggle_favorite",
    "toggle_like",
    "toggle_bookmark",
    "mark_read",
    "archive_room",
  ]),
  entityId: z.string(),
  payload: z.record(z.unknown()).optional(),
});

export const batchOperationsSchema = z.object({
  operations: z.array(batchOperationSchema).min(1).max(50),
});

export const querySchema = z.object({
  postId: z.string().optional(),
  postIds: z.string().optional(), // Comma-separated for batch
  action: z.enum(["like", "bookmark", "favorite", "share", "bookmarks"])
    .optional(),
  mode: z.enum(["toggle", "add", "remove"]).optional(), // For favorite action
  limit: z.string().optional(),
});

export type ToggleBody = z.infer<typeof toggleEngagementSchema>;
export type ShareBody = z.infer<typeof shareSchema>;
export type BatchOperationsBody = z.infer<typeof batchOperationsSchema>;
export type QueryParams = z.infer<typeof querySchema>;

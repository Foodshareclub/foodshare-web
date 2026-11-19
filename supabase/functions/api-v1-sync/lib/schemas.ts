/**
 * Sync Schemas
 *
 * Extracted from `api-v1-sync/index.ts` — no changes.
 */

import { z } from "zod";
import { ALLOWED_TABLES } from "./config.ts";

export const syncRequestSchema = z.object({
  tables: z.array(z.enum(ALLOWED_TABLES)).min(1, "At least one table required"),
  checkpoints: z.record(z.number()).optional(),
});

export const pendingOperationSchema = z.object({
  operationId: z.string().uuid(),
  table: z.string(),
  operation: z.enum(["insert", "update", "delete"]),
  recordId: z.string().uuid().optional(),
  data: z.record(z.unknown()).optional(),
  clientTimestamp: z.string().datetime(),
});

export const pendingOperationsSchema = z.object({
  operations: z.array(pendingOperationSchema).max(
    100,
    "Maximum 100 operations per batch",
  ),
});

export type SyncRequest = z.infer<typeof syncRequestSchema>;
export type PendingOperationsRequest = z.infer<typeof pendingOperationsSchema>;

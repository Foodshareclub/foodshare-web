/**
 * Analytics Schemas
 *
 * Extracted from `api-v1-analytics/index.ts` — no changes.
 */

import { z } from "zod";

export const syncSchema = z.object({
  mode: z.enum(["full", "incremental"]).default("incremental"),
});

export type SyncRequest = z.infer<typeof syncSchema>;

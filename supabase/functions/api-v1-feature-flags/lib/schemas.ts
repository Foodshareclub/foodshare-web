/**
 * Feature Flags Schemas
 *
 * Extracted from `api-v1-feature-flags/index.ts` — no changes.
 */

import { z } from "zod";

export const flagsQuerySchema = z.object({
  platform: z.string().optional(),
  version: z.string().optional(),
  action: z.string().optional(),
  experimentKey: z.string().optional(),
});

export type FlagsQuery = z.infer<typeof flagsQuerySchema>;

/**
 * Alerts Schemas
 *
 * Request validation for alert-check routes.
 * Extracted from `api-v1-alerts/index.ts` — no changes.
 */

import { z } from "zod";

export const checkAlertsSchema = z.object({
  force: z.boolean().optional(),
}).optional();

export type CheckAlertsRequest = z.infer<typeof checkAlertsSchema>;

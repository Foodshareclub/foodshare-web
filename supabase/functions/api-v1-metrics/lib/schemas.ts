/**
 * Metrics Schemas
 *
 * Extracted from `api-v1-metrics/index.ts` — no changes.
 */

import { z } from "zod";

export const metricsQuerySchema = z.object({
  format: z.enum(["json", "prometheus"]).optional(),
});

export const eventSchema = z.object({
  eventType: z.string(),
  data: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

export const batchEventsSchema = z.object({
  events: z.array(eventSchema).max(50),
});

export type MetricsQuery = z.infer<typeof metricsQuerySchema>;
export type EventRequest = z.infer<typeof eventSchema>;
export type BatchEventsRequest = z.infer<typeof batchEventsSchema>;

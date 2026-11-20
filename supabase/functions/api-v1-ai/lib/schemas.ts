/**
 * AI Schemas
 *
 * Extracted from `api-v1-ai/index.ts` — no changes.
 */

import { z } from "zod";

export const postBodySchema = z
  .object({
    // Chat fields
    messages: z.array(z.record(z.unknown())).optional(),
    model: z.string().optional(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
    // Embeddings fields
    input: z.union([z.string(), z.array(z.string())]).optional(),
    // HF inference fields
    inputs: z.union([z.string(), z.array(z.string())]).optional(),
    parameters: z.record(z.unknown()).optional(),
    imageUrl: z.string().optional(),
    imageData: z.unknown().optional(),
    question: z.string().optional(),
    context: z.string().optional(),
    // imageSearch fields (SERP crawl, service-auth only)
    name: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    post_type: z.enum(["fridge", "foodbank"]).optional(),
    max_results: z.number().int().positive().optional(),
    // imageVerify fields (vision gate, service-auth pipeline stage). Without
    // these the POST schema strips them and the dispatch reads empty strings.
    image_url: z.string().optional(),
    listing_name: z.string().optional(),
    listing_address: z.string().optional(),
    // enrichListing field (backfill orchestrator dispatch, service-auth only)
    post_id: z.number().int().optional(),
  })
  .optional();

export type PostBody = z.infer<typeof postBodySchema>;

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
  })
  .optional();

export type PostBody = z.infer<typeof postBodySchema>;

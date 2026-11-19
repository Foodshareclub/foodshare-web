/**
 * Validation Request Schemas
 *
 * Extracted from `api-v1-validation/index.ts` — no changes.
 */

import { z } from "zod";

export const listingSchema = z.object({
  title: z.string(),
  description: z.string().optional().default(""),
  quantity: z.number().int().optional().default(1),
  expiresAt: z.string().datetime().optional(),
});

export const profileSchema = z.object({
  nickname: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
});

export const reviewSchema = z.object({
  rating: z.number().int(),
  comment: z.string().optional().nullable(),
  revieweeId: z.string().uuid().optional().nullable(),
});

export const emailSchema = z.object({
  email: z.string(),
});

export const passwordSchema = z.object({
  password: z.string(),
});

export const batchSchema = z.object({
  validations: z.array(z.object({
    type: z.enum(["listing", "profile", "review", "email", "password"]),
    data: z.record(z.unknown()),
  })).min(1).max(20),
});

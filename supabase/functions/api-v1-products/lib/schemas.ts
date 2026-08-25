/**
 * Product API v1 Schemas
 */

import { datetimeSchema, positiveIntSchema, uuidSchema, z } from "../../_shared/schemas/common.ts";
import { latitudeSchema, longitudeSchema } from "../../_shared/schemas/geo.ts";
import { LISTING } from "../../_shared/validation-rules.ts";

export const createProductSchema = z.object({
  title: z.string().min(LISTING.title.minLength).max(LISTING.title.maxLength),
  description: z.string().max(LISTING.description.maxLength).optional(),
  images: z.array(z.string().url()).min(1).max(5),
  postType: z.enum([
    "food",
    "thing",
    "borrow",
    "wanted",
    "foodbank",
    "fridge",
    "zerowaste",
    "vegan",
    "organisation",
    "volunteer",
    "challenge",
    "forum",
  ]),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  pickupAddress: z.string().max(500).optional(),
  pickupTime: z.string().max(200).optional(),
  categoryId: positiveIntSchema.optional(),
  expiresAt: datetimeSchema.optional(),
});

export const updateProductSchema = z.object({
  title: z.string().min(LISTING.title.minLength).max(LISTING.title.maxLength)
    .optional(),
  description: z.string().max(LISTING.description.maxLength).optional(),
  images: z.array(z.string().url()).min(1).max(5).optional(),
  pickupAddress: z.string().max(500).optional(),
  pickupTime: z.string().max(200).optional(),
  categoryId: positiveIntSchema.optional(),
  expiresAt: datetimeSchema.optional(),
  isActive: z.boolean().optional(),
  version: positiveIntSchema, // Required for optimistic locking
});

export const listQuerySchema = z.object({
  mode: z.enum(["feed"]).optional(),
  id: z.string().optional(),
  include: z.string().optional(), // e.g., "owner,related"
  postType: z.enum([
    "food",
    "thing",
    "borrow",
    "wanted",
    "foodbank",
    "fridge",
    "zerowaste",
    "vegan",
    "organisation",
    "volunteer",
    "challenge",
    "forum",
  ]).optional(),
  categoryId: z.string().optional(),
  lat: z.string().optional(),
  lng: z.string().optional(),
  radius: z.string().optional(),
  radiusKm: z.string().optional(), // alias for radius (feed compat)
  cursor: z.string().optional(),
  limit: z.string().optional(),
  userId: uuidSchema.optional(),
});

export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;

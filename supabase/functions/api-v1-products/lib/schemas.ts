/**
 * Product API v1 Schemas
 */

import { datetimeSchema, positiveIntSchema, uuidSchema, z } from "../../_shared/schemas/common.ts";
import { latitudeSchema, longitudeSchema } from "../../_shared/schemas/geo.ts";
import { LISTING } from "../../_shared/validation-rules.ts";

export const postTypeSchema = z.enum([
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
]);

export const createProductSchema = z.object({
  title: z.string().min(LISTING.title.minLength).max(LISTING.title.maxLength),
  description: z.string().max(LISTING.description.maxLength).optional(),
  images: z.array(z.string().url()).max(5),
  postType: postTypeSchema,
  categoryMode: z.enum(["auto", "manual"]).optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  pickupAddress: z.string().max(500).optional(),
  pickupTime: z.string().max(200).optional(),
  transportation: z.string().max(500).optional(),
  condition: z.string().max(200).optional(),
  categoryId: positiveIntSchema.optional(),
  expiresAt: datetimeSchema.optional(),
}).refine((body) => (body.latitude === undefined) === (body.longitude === undefined), {
  message: "Latitude and longitude must be provided together",
});

export const updateProductSchema = z.object({
  postType: postTypeSchema.optional(),
  title: z.string().min(LISTING.title.minLength).max(LISTING.title.maxLength)
    .optional(),
  description: z.string().max(LISTING.description.maxLength).optional(),
  images: z.array(z.string().url()).min(1).max(5).optional(),
  pickupAddress: z.string().max(500).optional(),
  pickupTime: z.string().max(200).optional(),
  categoryId: positiveIntSchema.optional(),
  expiresAt: datetimeSchema.optional(),
  isActive: z.boolean().optional(),
  version: positiveIntSchema.max(Number.MAX_SAFE_INTEGER), // Required for optimistic locking
});

const coordinateString = (min: number, max: number) =>
  z.string().refine(
    (value) =>
      value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= min &&
      Number(value) <= max,
    "Invalid coordinate",
  );

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
  categoryId: z.string().regex(/^[1-9]\d*$/).optional(),
  lat: coordinateString(-90, 90).optional(),
  lng: coordinateString(-180, 180).optional(),
  radius: z.string().optional(),
  radiusKm: z.string().optional(), // alias for radius (feed compat)
  cursor: z.string().optional(),
  limit: z.string().optional(),
  userId: uuidSchema.optional(),
}).refine((query) => (query.lat === undefined) === (query.lng === undefined), {
  message: "Latitude and longitude must be provided together",
}).refine(
  (query) => query.lat === undefined || query.cursor === undefined || /^\d+$/.test(query.cursor),
  {
    message: "Nearby cursor must be a non-negative offset",
  },
);

export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;

export const mutationQuerySchema = z.object({
  id: z.string().regex(/^[1-9]\d*$/).refine(
    (id) => Number.isSafeInteger(Number(id)),
    "Invalid product ID",
  ),
});

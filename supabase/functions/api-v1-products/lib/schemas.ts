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
  mode: z.enum(["feed", "search"]).optional(),
  q: z.string().max(200).optional(),
  sortBy: z.enum(["distance", "newest", "oldest", "popular"]).optional(),
  availableOnly: z.enum(["true", "false"]).optional(),
  arrangedOnly: z.enum(["true", "false"]).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
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

// Search is intentionally strict: unsupported filters must not silently disappear.
export const listingSearchQuerySchema = z.object({
  mode: z.literal("search"),
  q: z.string().trim().max(200).optional(),
  lat: coordinateString(-90, 90),
  lng: coordinateString(-180, 180),
  radiusKm: coordinateString(0.1, 100),
  categoryId: z.string().regex(/^[1-9]\d*$/).optional(),
  postType: postTypeSchema.optional(),
  availableOnly: z.enum(["true", "false"]).default("true"),
  arrangedOnly: z.enum(["true", "false"]).default("false"),
  sortBy: z.enum(["distance", "newest", "oldest", "popular"]).default("distance"),
  limit: z.string().regex(/^[1-9]\d*$/).refine((v) => Number(v) <= 100).default("50"),
  offset: z.string().regex(/^\d+$/).refine((v) => Number.isSafeInteger(Number(v))).default("0"),
}).strict().refine((q) => q.availableOnly !== "true" || q.arrangedOnly !== "true", {
  message: "Available-only and arranged-only cannot both be selected",
});

export type ListingSearchQuery = z.infer<typeof listingSearchQuerySchema>;

export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;

export const mutationQuerySchema = z.object({
  id: z.string().regex(/^[1-9]\d*$/).refine(
    (id) => Number.isSafeInteger(Number(id)),
    "Invalid product ID",
  ),
});

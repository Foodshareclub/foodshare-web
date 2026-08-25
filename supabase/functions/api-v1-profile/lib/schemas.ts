import { z } from "../../_shared/schemas/common.ts";
import { latitudeSchema, longitudeSchema } from "../../_shared/schemas/geo.ts";
import { PROFILE } from "../../_shared/validation-rules.ts";

export const updateProfileSchema = z.object({
  name: z.string().min(PROFILE.nickname.minLength).max(PROFILE.nickname.maxLength).optional(),
  bio: z.string().max(PROFILE.bio.maxLength).optional(),
  phone: z.string().max(20).optional(),
  location: z.string().max(200).optional(),
  isVolunteer: z.boolean().optional(),
  profileVisibility: z.enum(["public", "friends_only", "private"]).optional(),
});

export const updateAddressSchema = z.object({
  addressLine1: z.string().min(1).max(500),
  addressLine2: z.string().max(500).optional(),
  addressLine3: z.string().max(500).optional(),
  city: z.string().min(1).max(100),
  stateProvince: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().min(1).max(100),
  lat: latitudeSchema.optional(),
  lng: longitudeSchema.optional(),
  radiusMeters: z.number().positive().optional(),
});

export const uploadAvatarSchema = z.object({
  imageData: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  fileName: z.string().optional(),
});

export const querySchema = z.object({
  action: z.enum(["avatar", "address", "dashboard", "account", "session"]).optional(),
  includeListings: z
    .string()
    .transform((v) => v === "true")
    .optional(),
});

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
export type UpdateAddressBody = z.infer<typeof updateAddressSchema>;
export type UploadAvatarBody = z.infer<typeof uploadAvatarSchema>;
export type QueryParams = z.infer<typeof querySchema>;

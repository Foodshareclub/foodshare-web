"use server";

/**
 * Profile Server Actions
 * Bleeding-edge implementation with:
 * - Zod schema validation
 * - Type-safe action results
 * - Proper auth checks
 * - Edge Function routing (when enabled via feature flag)
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS, invalidateTag } from "@/lib/data/cache-keys";
import { type UserAddress } from "@/lib/data/profiles";
import { serverActionError, successVoid, type ServerActionResult } from "@/lib/errors";
import { createActionLogger } from "@/lib/structured-logger";
import { trackEvent } from "@/app/actions/analytics";

// Edge Function API imports
import {
  updateProfileAPI,
  uploadAvatarAPI,
  deleteAvatarAPI,
  updateAddressAPI,
  formDataToProfileInput,
  formDataToAddressInput,
  fileToAvatarInput,
} from "@/lib/api/profile";

// =============================================================================
// Feature Flag
// =============================================================================

const USE_EDGE_FUNCTIONS = process.env.USE_EDGE_FUNCTIONS_FOR_PROFILE === "true";

// ============================================================================
// Zod Schemas
// ============================================================================

const UpdateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  bio: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  location: z.string().max(200).optional(),
  is_volunteer: z.boolean().optional(),
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// ============================================================================
// Types
// ============================================================================

export interface ProfileResult {
  id: string;
  name?: string;
}

export interface AvatarUploadResult {
  url: string;
}

// NOTE: UserAddress type and getCurrentProfile/getUserAddress READ functions
// have been moved to @/lib/data/profiles per the architecture rule.

// ============================================================================
// Helper: Verify Auth
// ============================================================================

async function verifyAuth() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be logged in", supabase: null, user: null };
  }

  return { error: null, supabase, user };
}

// ============================================================================
// Profile Actions (WRITES only)
// ============================================================================

/**
 * Update profile
 */
export async function updateProfile(
  formData: FormData
): Promise<ServerActionResult<ProfileResult>> {
  const logger = await createActionLogger("updateProfile");

  try {
    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      logger.warn("Auth failed", { error: authError });
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

    // ==========================================================================
    // Edge Function Path (when enabled)
    // ==========================================================================
    if (USE_EDGE_FUNCTIONS) {
      const input = formDataToProfileInput(formData);
      const result = await updateProfileAPI(input);

      if (result.success) {
        invalidateTag(CACHE_TAGS.PROFILES);
        invalidateTag(CACHE_TAGS.PROFILE(user.id));
        revalidatePath("/profile");
        logger.info("Profile updated via Edge Function", { userId: user.id });
        return {
          success: true,
          data: {
            id: result.data.id,
            name: result.data.name,
          },
        };
      }

      return result as ServerActionResult<ProfileResult>;
    }

    // ==========================================================================
    // Direct Supabase Path (fallback)
    // ==========================================================================

    // Parse form data
    const rawData: Record<string, unknown> = {};
    const fields = ["name", "bio", "phone", "location"];
    for (const field of fields) {
      const value = formData.get(field);
      if (value !== null) {
        rawData[field] = value;
      }
    }

    const isVolunteer = formData.get("is_volunteer");
    if (isVolunteer !== null) {
      rawData.is_volunteer = isVolunteer === "true";
    }

    // Validate with Zod
    const validated = UpdateProfileSchema.safeParse(rawData);
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    // Build update object
    const profileData: Record<string, unknown> = {
      ...validated.data,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").update(profileData).eq("id", user.id);

    if (error) {
      logger.error("Database error", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Invalidate profile caches
    invalidateTag(CACHE_TAGS.PROFILES);
    invalidateTag(CACHE_TAGS.PROFILE(user.id));
    revalidatePath("/profile");

    // Track analytics event (fire-and-forget)
    trackEvent("Profile Updated", {
      userId: user.id,
      fieldsUpdated: Object.keys(validated.data),
    }).catch(() => {});

    logger.info("Profile updated", { userId: user.id });
    return {
      success: true,
      data: {
        id: user.id,
        name: validated.data.name,
      },
    };
  } catch (error) {
    logger.error("Unexpected error", error instanceof Error ? error : undefined);
    return serverActionError("Failed to update profile", "UNKNOWN_ERROR");
  }
}

/**
 * Upload avatar image
 */
export async function uploadAvatar(
  formData: FormData
): Promise<ServerActionResult<AvatarUploadResult>> {
  try {
    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

    const file = formData.get("avatar") as File;
    if (!file) {
      return serverActionError("No file provided", "VALIDATION_ERROR");
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return serverActionError(
        "Invalid file type. Allowed: JPEG, PNG, WebP, GIF",
        "VALIDATION_ERROR"
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return serverActionError("File too large. Maximum size is 5MB", "VALIDATION_ERROR");
    }

    // ==========================================================================
    // Edge Function Path (when enabled)
    // ==========================================================================
    if (USE_EDGE_FUNCTIONS) {
      const input = await fileToAvatarInput(file);
      const result = await uploadAvatarAPI(input);

      if (result.success) {
        invalidateTag(CACHE_TAGS.PROFILES);
        invalidateTag(CACHE_TAGS.PROFILE(user.id));
        revalidatePath("/profile");
        return {
          success: true,
          data: { url: result.data.url },
        };
      }

      return result as ServerActionResult<AvatarUploadResult>;
    }

    // ==========================================================================
    // Direct Supabase Path (fallback)
    // ==========================================================================

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error("Failed to upload avatar:", uploadError);
      return serverActionError(uploadError.message, "DATABASE_ERROR");
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName);

    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update profile with avatar:", updateError);
      return serverActionError(updateError.message, "DATABASE_ERROR");
    }

    // Invalidate profile caches
    invalidateTag(CACHE_TAGS.PROFILES);
    invalidateTag(CACHE_TAGS.PROFILE(user.id));
    revalidatePath("/profile");

    // Track analytics event
    trackEvent("Avatar Uploaded", { userId: user.id }).catch(() => {});

    return {
      success: true,
      data: { url: publicUrl },
    };
  } catch (error) {
    console.error("Failed to upload avatar:", error);
    return serverActionError("Failed to upload avatar", "UNKNOWN_ERROR");
  }
}

/**
 * Upload profile avatar (alias for uploadAvatar with different form field name)
 * Expects formData with 'file' and 'userId' fields
 */
export async function uploadProfileAvatar(
  formData: FormData
): Promise<ServerActionResult<AvatarUploadResult>> {
  try {
    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    if (!file) {
      return serverActionError("No file provided", "VALIDATION_ERROR");
    }

    // Verify user is uploading their own avatar
    if (userId && userId !== user.id) {
      return serverActionError("Unauthorized", "FORBIDDEN");
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return serverActionError(
        "Invalid file type. Allowed: JPEG, PNG, WebP, GIF",
        "VALIDATION_ERROR"
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return serverActionError("File too large. Maximum size is 5MB", "VALIDATION_ERROR");
    }

    // ==========================================================================
    // Edge Function Path (when enabled)
    // ==========================================================================
    if (USE_EDGE_FUNCTIONS) {
      const input = await fileToAvatarInput(file);
      const result = await uploadAvatarAPI(input);

      if (result.success) {
        invalidateTag(CACHE_TAGS.PROFILES);
        invalidateTag(CACHE_TAGS.PROFILE(user.id));
        revalidatePath("/profile");
        return {
          success: true,
          data: { url: result.data.url },
        };
      }

      return result as ServerActionResult<AvatarUploadResult>;
    }

    // ==========================================================================
    // Direct Supabase Path (fallback)
    // ==========================================================================

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("profiles")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error("Failed to upload profile avatar:", uploadError);
      return serverActionError(uploadError.message, "DATABASE_ERROR");
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("profiles").getPublicUrl(fileName);

    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update profile with avatar:", updateError);
      return serverActionError(updateError.message, "DATABASE_ERROR");
    }

    // Invalidate profile caches
    invalidateTag(CACHE_TAGS.PROFILES);
    invalidateTag(CACHE_TAGS.PROFILE(user.id));
    revalidatePath("/profile");

    return {
      success: true,
      data: { url: publicUrl },
    };
  } catch (error) {
    console.error("Failed to upload profile avatar:", error);
    return serverActionError("Failed to upload profile avatar", "UNKNOWN_ERROR");
  }
}

/**
 * Delete user avatar
 */
export async function deleteAvatar(): Promise<ServerActionResult<void>> {
  try {
    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

    // ==========================================================================
    // Edge Function Path (when enabled)
    // ==========================================================================
    if (USE_EDGE_FUNCTIONS) {
      const result = await deleteAvatarAPI();

      if (result.success) {
        invalidateTag(CACHE_TAGS.PROFILES);
        invalidateTag(CACHE_TAGS.PROFILE(user.id));
        revalidatePath("/profile");
      }

      return result;
    }

    // ==========================================================================
    // Direct Supabase Path (fallback)
    // ==========================================================================

    // List and delete all avatar files for this user
    const { data: files } = await supabase.storage.from("avatars").list(user.id);

    if (files && files.length > 0) {
      const filePaths = files.map((f) => `${user.id}/${f.name}`);
      await supabase.storage.from("avatars").remove(filePaths);
    }

    // Also check profiles bucket
    const { data: profileFiles } = await supabase.storage.from("profiles").list(user.id);

    if (profileFiles && profileFiles.length > 0) {
      const profilePaths = profileFiles.map((f) => `${user.id}/${f.name}`);
      await supabase.storage.from("profiles").remove(profilePaths);
    }

    // Update profile to remove avatar URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update profile:", updateError);
      return serverActionError(updateError.message, "DATABASE_ERROR");
    }

    // Invalidate profile caches
    invalidateTag(CACHE_TAGS.PROFILES);
    invalidateTag(CACHE_TAGS.PROFILE(user.id));
    revalidatePath("/profile");

    return successVoid();
  } catch (error) {
    console.error("Failed to delete avatar:", error);
    return serverActionError("Failed to delete avatar", "UNKNOWN_ERROR");
  }
}

/**
 * Update user's address
 */
export async function updateUserAddress(
  formData: FormData
): Promise<ServerActionResult<UserAddress>> {
  try {
    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

    // ==========================================================================
    // Edge Function Path (when enabled)
    // ==========================================================================
    if (USE_EDGE_FUNCTIONS) {
      const input = formDataToAddressInput(formData);
      const result = await updateAddressAPI(input);

      if (result.success) {
        revalidatePath("/profile");
        revalidatePath("/settings");
        // Transform response back to UserAddress format
        return {
          success: true,
          data: {
            profile_id: result.data.profileId,
            address_line_1: result.data.addressLine1,
            address_line_2: result.data.addressLine2 || "",
            address_line_3: result.data.addressLine3 || "",
            city: result.data.city,
            state_province: result.data.stateProvince || "",
            postal_code: result.data.postalCode || "",
            country: result.data.country,
            lat: result.data.lat,
            long: result.data.lng,
            generated_full_address: result.data.fullAddress,
            radius_meters: result.data.radiusMeters,
          },
        };
      }

      return result as ServerActionResult<UserAddress>;
    }

    // ==========================================================================
    // Direct Supabase Path (fallback)
    // ==========================================================================

    // Parse form data
    const addressData = {
      address_line_1: (formData.get("address_line_1") as string) || "",
      address_line_2: (formData.get("address_line_2") as string) || "",
      address_line_3: (formData.get("address_line_3") as string) || "",
      city: (formData.get("city") as string) || "",
      state_province: (formData.get("state_province") as string) || "",
      postal_code: (formData.get("postal_code") as string) || "",
      country: (formData.get("country") as string) || "",
      generated_full_address: (formData.get("generated_full_address") as string) || "",
      updated_at: new Date().toISOString(),
    };

    // Handle lat/long if provided (with NaN validation)
    const lat = formData.get("lat");
    const long = formData.get("long");
    if (lat && long) {
      const parsedLat = parseFloat(lat as string);
      const parsedLong = parseFloat(long as string);
      // Only assign if both are valid numbers
      if (!Number.isNaN(parsedLat) && !Number.isNaN(parsedLong)) {
        Object.assign(addressData, {
          lat: parsedLat,
          long: parsedLong,
        });
      }
    }

    const { data, error } = await supabase
      .from("address")
      .update(addressData)
      .eq("profile_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update user address:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    revalidatePath("/profile");
    revalidatePath("/settings");

    // Track analytics event
    trackEvent("Address Updated", { userId: user.id }).catch(() => {});

    return { success: true, data: data as UserAddress };
  } catch (error) {
    console.error("Failed to update user address:", error);
    return serverActionError("Failed to update user address", "UNKNOWN_ERROR");
  }
}

/**
 * Update address directly from an address object (upsert)
 * Used by AddressBlock component
 */
export async function updateAddressDirect(address: {
  address_line_1: string;
  address_line_2: string;
  city: string;
  country: number;
  county: string;
  postal_code: string;
  profile_id: string;
  state_province: string;
}): Promise<ServerActionResult<void>> {
  try {
    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

    if (address.profile_id !== user.id) {
      return serverActionError("Not authorized to update this address", "FORBIDDEN");
    }

    const { error } = await supabase.from("address").upsert(address);

    if (error) {
      console.error("[updateAddressDirect] Failed:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    revalidatePath("/profile");
    revalidatePath("/settings");

    return successVoid();
  } catch (error) {
    console.error("[updateAddressDirect] Error:", error);
    return serverActionError("Failed to update address", "INTERNAL_ERROR");
  }
}

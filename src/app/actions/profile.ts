"use server";

/**
 * Profile Server Actions
 * Bleeding-edge implementation with:
 * - Zod schema validation
 * - Type-safe action results
 * - Proper auth checks
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS, invalidateTag } from "@/lib/data/cache-keys";
import { getProfile, type Profile } from "@/lib/data/profiles";
import { serverActionError, successVoid, type ServerActionResult } from "@/lib/errors";

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
// Profile Actions
// ============================================================================

/**
 * Get current user's profile (not cached - depends on auth)
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const { user } = await verifyAuth();
  if (!user) return null;

  return getProfile(user.id);
}

/**
 * Update profile
 */
export async function updateProfile(
  formData: FormData
): Promise<ServerActionResult<ProfileResult>> {
  try {
    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

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
      console.error("Failed to update profile:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Invalidate profile caches
    invalidateTag(CACHE_TAGS.PROFILES);
    invalidateTag(CACHE_TAGS.PROFILE(user.id));
    revalidatePath("/profile");

    return {
      success: true,
      data: {
        id: user.id,
        name: validated.data.name,
      },
    };
  } catch (error) {
    console.error("Failed to update profile:", error);
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

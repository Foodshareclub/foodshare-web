"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Session } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS, invalidateTag } from "@/lib/data/cache-keys";
import { trackEvent } from "@/app/actions/analytics";
import { createActionLogger } from "@/lib/structured-logger";

// Import AuthUser for internal use (don't re-export from server action files)
import type { AuthUser } from "@/lib/data/auth";

// ============================================================================
// Validation Schemas
// ============================================================================

const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format")
  .max(254, "Email too long");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long");

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128, "Password too long"),
});

const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().max(100, "First name too long").optional().nullable(),
  lastName: z.string().max(100, "Last name too long").optional().nullable(),
  name: z.string().max(200, "Name too long").optional().nullable(),
});

const updatePasswordSchema = z.object({
  password: passwordSchema,
});

/**
 * Check if a string is a full URL (http/https)
 */
function isFullUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * Resolve avatar URL to a public URL
 * If it's already a full URL, return as-is
 * If it's a storage path, generate the public URL
 */
async function resolveAvatarUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  avatarUrl: string | null
): Promise<string | null> {
  if (!avatarUrl || avatarUrl.trim() === "") return null;

  // If already a full URL, return as-is
  if (isFullUrl(avatarUrl)) return avatarUrl;

  // Otherwise, it's a storage path - get the public URL
  const { data } = supabase.storage.from("profiles").getPublicUrl(avatarUrl);
  return data?.publicUrl || null;
}

/**
 * Get current session
 * Returns null if DB is unavailable (graceful degradation)
 */
export async function getSession(): Promise<Session | null> {
  try {
    const supabase = await createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) return null;
    return session;
  } catch {
    // DB unavailable - return null gracefully
    return null;
  }
}

/**
 * Get current user with profile
 * Returns null if DB is unavailable (graceful degradation)
 * Resolves avatar_url to a public URL if it's a storage path
 */
export async function getUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Auth error or no user = return null gracefully
    if (authError || !user) return null;

    // Get profile data - also wrapped in try-catch
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, first_name, second_name, nickname, avatar_url, email")
        .eq("id", user.id)
        .single();

      // Resolve avatar URL to public URL if needed
      const resolvedAvatarUrl = profile?.avatar_url
        ? await resolveAvatarUrl(supabase, profile.avatar_url)
        : null;

      return {
        id: user.id,
        email: user.email,
        profile: profile
          ? {
              ...profile,
              avatar_url: resolvedAvatarUrl,
            }
          : null,
      };
    } catch {
      // Profile fetch failed, return user without profile
      return {
        id: user.id,
        email: user.email,
        profile: null,
      };
    }
  } catch {
    // DB unavailable - return null gracefully
    return null;
  }
}

/**
 * Check if current user is admin
 * Uses centralized admin auth from @/lib/data/admin-auth
 * Returns false if DB is unavailable (graceful degradation)
 */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const { getAdminAuth } = await import("@/lib/data/admin-auth");
    const { isAdmin } = await getAdminAuth();
    return isAdmin;
  } catch {
    return false;
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithPassword(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const logger = await createActionLogger("signInWithPassword");

  // Validate input
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const validation = signInSchema.safeParse(rawData);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    logger.warn("Validation failed", { error: firstError?.message });
    return { success: false, error: firstError?.message || "Invalid input" };
  }

  const { email, password } = validation.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    logger.warn("Sign in failed", { error: error.message });
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  invalidateTag(CACHE_TAGS.AUTH);

  // Track login
  await trackEvent("User Login", { method: "password" });

  logger.info("User signed in successfully");
  return { success: true };
}

/**
 * Sign up with email and password
 */
export async function signUp(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const logger = await createActionLogger("signUp");

  // Validate input
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
    firstName: formData.get("firstName") || null,
    lastName: formData.get("lastName") || null,
    name: formData.get("name") || null,
  };

  const validation = signUpSchema.safeParse(rawData);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    logger.warn("Validation failed", { error: firstError?.message });
    return { success: false, error: firstError?.message || "Invalid input" };
  }

  const { email, password, firstName, lastName, name } = validation.data;
  const supabase = await createClient();

  // Build display name from firstName/lastName or use name directly
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : firstName || name || "";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: displayName,
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (error) {
    logger.warn("Sign up failed", { error: error.message });
    return { success: false, error: error.message };
  }

  // Create profile
  if (data.user) {
    await supabase.from("profiles").insert({
      id: data.user.id,
      first_name: firstName || displayName,
      second_name: lastName || "",
      email,
    });
  }

  revalidatePath("/", "layout");
  invalidateTag(CACHE_TAGS.AUTH);
  invalidateTag(CACHE_TAGS.PROFILES);

  // Track signup
  await trackEvent("User Signup", { method: "password" });

  logger.info("User signed up successfully");
  return { success: true };
}

/**
 * Sign out and redirect
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  invalidateTag(CACHE_TAGS.AUTH);
  redirect("/");
}

/**
 * Request password reset
 */
export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  // Validate email
  const validation = emailSchema.safeParse(email);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return { success: false, error: firstError?.message || "Invalid email" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(validation.data, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=recovery`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update password (for authenticated users)
 */
export async function updatePassword(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  // Validate input
  const rawData = {
    password: formData.get("password"),
  };

  const validation = updatePasswordSchema.safeParse(rawData);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return { success: false, error: firstError?.message || "Invalid password" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: validation.data.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get OAuth sign in URL
 */
export async function getOAuthSignInUrl(
  provider: "google" | "github" | "facebook" | "apple"
): Promise<{ url: string | null; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { url: null, error: error.message };
  }

  return { url: data.url };
}

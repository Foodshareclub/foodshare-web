"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Session } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/data/cache-keys";
import { invalidateTag } from "@/lib/data/cache-invalidation";
import { trackEvent } from "@/app/actions/analytics";
import { createActionLogger } from "@/lib/structured-logger";
import { serverActionError, successVoid, type ServerActionResult } from "@/lib/errors";

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
 * Returns null if not authenticated or DB is unavailable (graceful degradation)
 *
 * SECURITY: Uses getUser() which validates the JWT against the auth server,
 * unlike getSession() which only reads from cookies without verification.
 * See: https://supabase.com/docs/guides/auth/server-side/nextjs#understanding-the-authentication-flow
 */
export async function getSession(): Promise<Session | null> {
  try {
    const supabase = await createClient();
    // Validate the user's JWT against the auth server first
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return null;

    // Only return the session if the user is verified
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
        .select(
          "id,first_name,second_name,nickname,avatar_url,email,search_radius_km,onboarding_completed"
        )
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
 * Uses centralized admin auth from @/lib/data/admin-check
 * Returns false if DB is unavailable (graceful degradation)
 */
export async function checkUserIsAdmin(): Promise<boolean> {
  try {
    const { getAdminAuth } = await import("@/lib/data/admin-check");
    const { isAdmin } = await getAdminAuth();
    return isAdmin;
  } catch {
    return false;
  }
}

/**
 * Sign in with email and password
 */
export type AuthActionResult = ServerActionResult<void> & { error?: any };
export type OAuthUrlResult = ServerActionResult<{ url: string }> & {
  error?: any;
  url?: string | null;
};

/**
 * Sign in with email and password
 */
export async function signInWithPassword(formData: FormData): Promise<AuthActionResult> {
  const logger = await createActionLogger("signInWithPassword");

  // Validate input
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const validation = signInSchema.safeParse(rawData);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    const errMsg = firstError?.message || "Invalid input";
    logger.warn("Validation failed", { error: errMsg });
    const errObj = serverActionError(errMsg, "VALIDATION_ERROR");
    return { ...errObj, error: errMsg };
  }

  const { email, password } = validation.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    logger.warn("Sign in failed", { error: error.message });
    const errObj = serverActionError(error.message, "AUTH_ERROR");
    return { ...errObj, error: error.message };
  }

  revalidatePath("/", "layout");
  invalidateTag(CACHE_TAGS.AUTH);

  // Track login
  await trackEvent("User Login", { method: "password" });

  logger.info("User signed in successfully");
  return successVoid();
}

/**
 * Sign up with email and password
 */
export async function signUp(formData: FormData): Promise<AuthActionResult> {
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
    const errMsg = firstError?.message || "Invalid input";
    logger.warn("Validation failed", { error: errMsg });
    const errObj = serverActionError(errMsg, "VALIDATION_ERROR");
    return { ...errObj, error: errMsg };
  }

  const { email, password, firstName, lastName, name } = validation.data;
  const supabase = await createClient();

  // Build display name from firstName/lastName or use name directly
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : firstName || name || "";

  const { data: _data, error } = await supabase.auth.signUp({
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
    const errObj = serverActionError(error.message, "AUTH_ERROR");
    return { ...errObj, error: error.message };
  }

  revalidatePath("/", "layout");
  invalidateTag(CACHE_TAGS.AUTH);
  invalidateTag(CACHE_TAGS.PROFILES);

  // Track signup
  await trackEvent("User Signup", { method: "password" });

  logger.info("User signed up successfully");
  return successVoid();
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
export async function resetPassword(email: string): Promise<AuthActionResult> {
  // Validate email
  const validation = emailSchema.safeParse(email);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    const errMsg = firstError?.message || "Invalid email";
    const errObj = serverActionError(errMsg, "VALIDATION_ERROR");
    return { ...errObj, error: errMsg };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(validation.data, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=recovery`,
  });

  if (error) {
    const errObj = serverActionError(error.message, "AUTH_ERROR");
    return { ...errObj, error: error.message };
  }

  return successVoid();
}

/**
 * Update password (for authenticated users)
 */
export async function updatePassword(formData: FormData): Promise<AuthActionResult> {
  // Validate input
  const rawData = {
    password: formData.get("password"),
  };

  const validation = updatePasswordSchema.safeParse(rawData);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    const errMsg = firstError?.message || "Invalid password";
    const errObj = serverActionError(errMsg, "VALIDATION_ERROR");
    return { ...errObj, error: errMsg };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: validation.data.password,
  });

  if (error) {
    const errObj = serverActionError(error.message, "AUTH_ERROR");
    return { ...errObj, error: error.message };
  }

  return successVoid();
}

/**
 * Get OAuth sign in URL
 */
export async function getOAuthSignInUrl(
  provider: "google" | "github" | "facebook" | "apple"
): Promise<OAuthUrlResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      // Must be true: this runs server-side as a Server Action,
      // so we return the URL to the client for navigation
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    // Provide user-friendly error for missing OAuth configuration
    const errMsg =
      error.message.includes("missing OAuth secret") ||
      error.message.includes("Unsupported provider")
        ? `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in is not configured yet. Please use email/password or magic link.`
        : error.message;

    return { success: false, url: null, error: errMsg } as any;
  }

  return { success: true, data: { url: data.url }, url: data.url } as any;
}

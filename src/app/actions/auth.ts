"use server";

import { trackEvent } from "@/app/actions/analytics";
import { invalidateTag } from "@/lib/data/cache-invalidation";
import { CACHE_TAGS } from "@/lib/data/cache-keys";
import {
  type AuthErrorCode,
  type ServerActionResult,
  getAuthErrorCode,
  sanitizeErrorMessage,
  serverActionError,
  successVoid,
  toAuthErrorCode,
} from "@/lib/errors";
import { createActionLogger } from "@/lib/structured-logger";
import { createClient } from "@/lib/supabase/server";
import type { Session } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

// Import AuthUser for internal use (don't re-export from server action files)
import type { AuthUser } from "@/lib/data/auth";

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Validation messages are codes for the same reason auth failures are.
 *
 * Every one of these was an English sentence handed to the browser and rendered
 * verbatim, so "Password must be at least 8 characters" appeared in all 21
 * locales. `weakPassword` is deliberately the *client-facing* message rather
 * than a field-level one: telling a reader their new password is too short
 * before they have finished choosing it is worse copy than the same fact told
 * once, on submit.
 */
const emailSchema = z.string().min(1, "fieldRequired").email("invalidEmail").max(254, "fieldTooLong");

const passwordSchema = z.string().min(8, "weakPassword").max(128, "fieldTooLong");

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "fieldRequired").max(128, "fieldTooLong"),
});

const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().max(100, "fieldTooLong").optional().nullable(),
  lastName: z.string().max(100, "fieldTooLong").optional().nullable(),
  name: z.string().max(200, "fieldTooLong").optional().nullable(),
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
  avatarUrl: string | null,
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
        .select("id,first_name,second_name,nickname,avatar_url,email,search_radius_km,onboarding_completed")
        .eq("id", user.id)
        .single();

      // Resolve avatar URL to public URL if needed
      const resolvedAvatarUrl = profile?.avatar_url ? await resolveAvatarUrl(supabase, profile.avatar_url) : null;

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
 * The result of an auth action.
 *
 * `error` is an `AuthErrorCode`, not a message — it is resolved through the
 * catalogue on the client. It keeps the name `error` because it is a failure
 * slot and every caller already reads it; what changed is its domain, and the
 * tests that asserted "an error is defined" now assert *which* error.
 */
export type AuthActionResult = Omit<ServerActionResult<void>, "error"> & { error?: AuthErrorCode };
export type OAuthUrlResult = {
  success?: boolean;
  data?: { url: string };
  /** Resolved through `authErrorKey()` on the client. */
  code?: AuthErrorCode;
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
    const code = toAuthErrorCode(validation.error.issues[0]?.message);
    logger.warn("Validation failed", { code });
    return { ...serverActionError(code, "VALIDATION_ERROR"), error: code };
  }

  const { email, password } = validation.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // The raw message goes to the log and nowhere else. It is Supabase's
    // English, it can change in a patch release, and it has no business being
    // the last thing between a reader and their own password.
    const code = getAuthErrorCode(error);
    logger.warn("Sign in failed", { code, detail: sanitizeErrorMessage(error.message) });
    return { ...serverActionError(code, "AUTH_ERROR"), error: code };
  }

  revalidatePath("/", "layout");
  invalidateTag(CACHE_TAGS.AUTH);

  // Track login
  await trackEvent("User Login", { method: "password" });

  logger.info("User signed in successfully");
  return successVoid() as AuthActionResult;
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
    const code = toAuthErrorCode(validation.error.issues[0]?.message);
    logger.warn("Validation failed", { code });
    return { ...serverActionError(code, "VALIDATION_ERROR"), error: code };
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
    const code = getAuthErrorCode(error);
    logger.warn("Sign up failed", { code, detail: sanitizeErrorMessage(error.message) });
    return { ...serverActionError(code, "AUTH_ERROR"), error: code };
  }

  revalidatePath("/", "layout");
  invalidateTag(CACHE_TAGS.AUTH);
  invalidateTag(CACHE_TAGS.PROFILES);

  // Track signup
  await trackEvent("User Signup", { method: "password" });

  logger.info("User signed up successfully");
  return successVoid() as AuthActionResult;
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
    const code = toAuthErrorCode(validation.error.issues[0]?.message);
    return { ...serverActionError(code, "VALIDATION_ERROR"), error: code };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(validation.data, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=recovery`,
  });

  if (error) {
    const code = getAuthErrorCode(error);
    return { ...serverActionError(code, "AUTH_ERROR"), error: code };
  }

  return successVoid() as AuthActionResult;
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
    const code = toAuthErrorCode(validation.error.issues[0]?.message);
    return { ...serverActionError(code, "VALIDATION_ERROR"), error: code };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: validation.data.password,
  });

  if (error) {
    const code = getAuthErrorCode(error);
    return { ...serverActionError(code, "AUTH_ERROR"), error: code };
  }

  return successVoid() as AuthActionResult;
}

/**
 * Get OAuth sign in URL
 */
export async function getOAuthSignInUrl(provider: "google" | "github" | "facebook" | "apple"): Promise<OAuthUrlResult> {
  const logger = await createActionLogger("getOAuthSignInUrl");
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
    // The provider name is interpolated by the caller, from its own translated
    // label, not here: "Google sign-in is not configured yet. Please use
    // email/password or magic link." was an English template built on the server
    // and sent to the client, in every locale.
    logger.warn("OAuth URL unavailable", { provider, detail: sanitizeErrorMessage(error.message) });
    return { url: null, code: getAuthErrorCode(error) };
  }

  return { url: data.url };
}

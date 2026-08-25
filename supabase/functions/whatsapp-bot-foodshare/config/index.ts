/**
 * Configuration and environment variables with validation
 */

/**
 * Get required environment variable with validation
 * @throws Error if the variable is missing or empty
 */
function requireEnv(name: string, fallbackName?: string): string {
  const value = Deno.env.get(name) || (fallbackName ? Deno.env.get(fallbackName) : undefined);
  if (!value || value.trim() === "") {
    const varNames = fallbackName ? `${name} or ${fallbackName}` : name;
    throw new Error(`Missing required environment variable: ${varNames}`);
  }
  return value.trim();
}

/**
 * Get optional environment variable with default
 */
function optionalEnv(name: string, defaultValue: string): string {
  const value = Deno.env.get(name);
  return value?.trim() || defaultValue;
}

/**
 * Validate URL format
 */
function validateUrl(url: string, name: string): string {
  try {
    new URL(url);
    return url;
  } catch {
    throw new Error(`Invalid URL format for ${name}: ${url}`);
  }
}

// WhatsApp Cloud API configuration
export const getWhatsappAccessToken = () => requireEnv("WHATSAPP_ACCESS_TOKEN");
export const getWhatsappPhoneNumberId = () => requireEnv("WHATSAPP_PHONE_NUMBER_ID");
export const getWhatsappVerifyToken = () => requireEnv("WHATSAPP_VERIFY_TOKEN");
export const getWhatsappBusinessAccountId = () => optionalEnv("WHATSAPP_BUSINESS_ACCOUNT_ID", "");
export const getWhatsappAppSecret = () => optionalEnv("WHATSAPP_APP_SECRET", "");

// WhatsApp API base URL
export const getWhatsappApiUrl = () =>
  `https://graph.facebook.com/v21.0/${getWhatsappPhoneNumberId()}`;

// Core configuration
export const getAppUrl = () =>
  validateUrl(
    optionalEnv(
      "APP_URL",
      `https://${Deno.env.get("SITE_DOMAIN") || Deno.env.get("SITE_DOMAIN") || "foodshare.club"}`,
    ),
    "APP_URL",
  );
export const getSupabaseUrl = () => validateUrl(requireEnv("SUPABASE_URL"), "SUPABASE_URL");
export const getSupabaseServiceRoleKey = () => requireEnv("SUPABASE_SERVICE_ROLE_KEY");

// Configuration object for easy access
export const config = {
  get whatsapp() {
    return {
      get accessToken() {
        return getWhatsappAccessToken();
      },
      get phoneNumberId() {
        return getWhatsappPhoneNumberId();
      },
      get verifyToken() {
        return getWhatsappVerifyToken();
      },
      get businessAccountId() {
        return getWhatsappBusinessAccountId();
      },
      get appSecret() {
        return getWhatsappAppSecret();
      },
      get apiUrl() {
        return getWhatsappApiUrl();
      },
    };
  },
  get appUrl() {
    return getAppUrl();
  },
  get supabaseUrl() {
    return getSupabaseUrl();
  },
  get supabaseKey() {
    return getSupabaseServiceRoleKey();
  },
  get isProduction() {
    return Deno.env.get("DENO_ENV") === "production";
  },
};

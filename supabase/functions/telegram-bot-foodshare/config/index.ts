/**
 * Configuration and environment variables with validation
 */

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

// Core configuration with validation
export const getBotToken = () =>
  optionalEnv("TELEGRAM_BOT_TOKEN", "") || optionalEnv("BOT_TOKEN", "");
export const getTelegramApi = () =>
  getBotToken() ? `https://api.telegram.org/bot${getBotToken()}` : "";
export const getAppUrl = () =>
  validateUrl(
    optionalEnv(
      "APP_URL",
      `https://${Deno.env.get("SITE_DOMAIN") || Deno.env.get("SITE_DOMAIN") || "foodshare.club"}`,
    ),
    "APP_URL",
  );
export const getSupabaseUrl = () => optionalEnv("SUPABASE_URL", "");
export const getSupabaseServiceRoleKey = () => optionalEnv("SUPABASE_SERVICE_ROLE_KEY", "");

// Optional webhook secret for security (recommended in production)
export const getWebhookSecret = () => Deno.env.get("TELEGRAM_WEBHOOK_SECRET");

// Bot username for detecting mentions in group chats (without @)
export const getBotUsername = () =>
  optionalEnv("TELEGRAM_BOT_USERNAME", "foodshare_club_bot").toLowerCase();

// Configuration object for easy access
export const config = {
  get botToken() {
    return getBotToken();
  },
  get telegramApi() {
    return getTelegramApi();
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
  get webhookSecret() {
    return getWebhookSecret();
  },
  get isProduction() {
    return Deno.env.get("DENO_ENV") === "production";
  },
};

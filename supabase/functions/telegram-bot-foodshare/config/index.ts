/**
 * Configuration and environment variables
 */

// Try both BOT_TOKEN and TELEGRAM_BOT_TOKEN for compatibility
export const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || Deno.env.get("BOT_TOKEN");
export const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
export const APP_URL = Deno.env.get("APP_URL") || "https://foodshare.club";
export const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Note: Validation is done in index.ts during initialization
// to provide better error messages to clients

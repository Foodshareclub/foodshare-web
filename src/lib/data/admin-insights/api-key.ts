/**
 * API Key Management
 * Handles API key retrieval from environment variables or Supabase Vault
 */

import type { VaultSecret } from "./types";
import { createClient } from "@/lib/supabase/server";

// Cache for API key to avoid repeated vault lookups
const API_KEY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cachedApiKey: string | null = null;
let apiKeyCacheExpiry = 0;

/**
 * Get AI API key from environment variable or Supabase Vault
 * Checks for XAI_API_KEY first, then AI_GATEWAY_API_KEY
 */
export async function getAiApiKey(): Promise<string | null> {
  // Check environment variables first (for local dev)
  if (process.env.XAI_API_KEY) {
    return process.env.XAI_API_KEY;
  }
  if (process.env.AI_GATEWAY_API_KEY) {
    return process.env.AI_GATEWAY_API_KEY;
  }

  // Check cache
  if (cachedApiKey && Date.now() < apiKeyCacheExpiry) {
    return cachedApiKey;
  }

  // Fetch from Supabase Vault
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_secrets", {
      secret_names: ["XAI_API_KEY", "AI_GATEWAY_API_KEY"],
    });

    if (error || !data || data.length === 0) {
      console.error("Failed to fetch AI API key from vault:", error?.message);
      return null;
    }

    const secrets = data as VaultSecret[];
    // Prefer XAI_API_KEY, fallback to AI_GATEWAY_API_KEY
    const xaiSecret = secrets.find((s) => s.name === "XAI_API_KEY");
    const gatewaySecret = secrets.find((s) => s.name === "AI_GATEWAY_API_KEY");

    const apiKey = xaiSecret?.value || gatewaySecret?.value;
    if (apiKey) {
      cachedApiKey = apiKey;
      apiKeyCacheExpiry = Date.now() + API_KEY_CACHE_TTL;
      return apiKey;
    }

    return null;
  } catch (err) {
    console.error("Error fetching secret from vault:", err);
    return null;
  }
}

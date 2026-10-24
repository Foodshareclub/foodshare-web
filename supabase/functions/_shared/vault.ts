import { getAdminClient } from "./supabase.ts";
import { logger } from "./logger.ts";
import { readVaultEntries } from "./vault-loader.ts";
import { VAULT_PRELOAD_NAMES } from "./vault-secret-names.ts";

/**
 * Secret interface from vault.secrets
 */
export interface VaultSecret {
  id: string;
  name: string;
  description: string;
  secret: string;
  key_id: string;
  nonce: Uint8Array;
  created_at: string;
  updated_at: string;
}

const cache = new Map<string, string>();
const cacheExpiresAt = new Map<string, number>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let preloadInFlight: Promise<void> | null = null;
const secretReadsInFlight = new Map<string, Promise<string | undefined>>();

function cacheSecret(name: string, value: string): void {
  cache.set(name, value);
  cacheExpiresAt.set(name, Date.now() + CACHE_TTL);
}

/**
 * Fetch a secret from the Supabase Vault.
 * Falls back to Deno.env if the secret is not found in the Vault.
 */
export async function getSecret(name: string): Promise<string | undefined> {
  // Check cache first
  if (cache.has(name) && Date.now() < (cacheExpiresAt.get(name) ?? 0)) {
    return cache.get(name);
  }

  let pending = secretReadsInFlight.get(name);
  if (!pending) {
    pending = fetchSecret(name).finally(() => secretReadsInFlight.delete(name));
    secretReadsInFlight.set(name, pending);
  }
  return await pending;
}

async function fetchSecret(name: string): Promise<string | undefined> {
  try {
    const supabase = getAdminClient();
    const { data: secret, error } = await supabase.rpc("get_vault_secret", { secret_name: name })
      .abortSignal(AbortSignal.timeout(5_000));

    if (error) {
      if (error.code === "PGRST116") {
        // Not found in Vault, fall back to environment variable
        const envVal = Deno.env.get(name);
        if (envVal) {
          cacheSecret(name, envVal);
          return envVal;
        }
        return undefined;
      }
      throw error;
    }

    if (secret) {
      cacheSecret(name, secret);
      return secret;
    }
  } catch (err) {
    logger.error("Failed to fetch secret from Vault", { name, error: err });
    // Emergency fallback to Deno.env
    return Deno.env.get(name);
  }

  return Deno.env.get(name);
}

/**
 * Fetch a secret synchronously from cache or Deno.env fallback.
 * Assumes loadAllSecrets() has been called.
 */
export function getSecretSync(name: string): string | undefined {
  if (cache.has(name)) {
    return cache.get(name);
  }
  return Deno.env.get(name);
}

/**
 * Pre-load all secrets from the Vault into cache.
 * Useful at startup to avoid multiple queries.
 */
export async function loadAllSecrets(): Promise<void> {
  if (!preloadInFlight) {
    preloadInFlight = preloadSecrets().finally(() => {
      preloadInFlight = null;
    });
  }
  await preloadInFlight;
}

async function preloadSecrets(): Promise<void> {
  try {
    const supabase = getAdminClient();
    const signal = AbortSignal.timeout(5_000);
    // Vault is intentionally not an exposed PostgREST schema. Use the existing
    // service-role-only RPC and isolate decryption failures per requested name.
    const { entries: data, unreadable } = await readVaultEntries(
      VAULT_PRELOAD_NAMES,
      (name) => supabase.rpc("get_vault_secret", { secret_name: name }).abortSignal(signal),
    );
    if (unreadable) {
      logger.warn(
        "Some Vault entries are unreadable; using environment fallback for those entries",
        { count: unreadable },
      );
    }

    if (data) {
      for (const item of data) {
        if (item.name && item.decrypted_secret) {
          cacheSecret(item.name, item.decrypted_secret);
        }
      }
      logger.info("Vault secrets loaded into cache", { count: data.length });
    }
  } catch (err) {
    logger.error("Failed to load all secrets from Vault", { error: err });
  }
}

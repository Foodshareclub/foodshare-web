/**
 * Vercel Edge Config Client
 * Used for feature flags and ultra-low latency configuration
 */
import { get, getAll, has } from '@vercel/edge-config';

/**
 * Feature flag keys
 */
export const FEATURE_FLAGS = {
  NEW_UI: 'feature_new_ui',
  DARK_MODE: 'feature_dark_mode',
  BETA_FEATURES: 'feature_beta',
  MAINTENANCE_MODE: 'maintenance_mode',
  AI_SEARCH: 'feature_ai_search',
  REALTIME_CHAT: 'feature_realtime_chat',
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

/**
 * Config keys for application settings
 */
export const CONFIG_KEYS = {
  RATE_LIMIT: 'config_rate_limit',
  MAX_UPLOAD_SIZE: 'config_max_upload_size',
  SUPPORTED_LOCALES: 'config_supported_locales',
  DEFAULT_LOCALE: 'config_default_locale',
} as const;

export type ConfigKey = (typeof CONFIG_KEYS)[keyof typeof CONFIG_KEYS];

/**
 * Get a single value from Edge Config
 */
export async function getConfig<T>(key: string): Promise<T | undefined> {
  return get<T>(key);
}

/**
 * Get all values from Edge Config
 */
export async function getAllConfig(): Promise<Record<string, unknown> | undefined> {
  return getAll();
}

/**
 * Check if a key exists in Edge Config
 */
export async function hasConfig(key: string): Promise<boolean> {
  return has(key);
}

/**
 * Check if a feature flag is enabled
 */
export async function isFeatureEnabled(flag: FeatureFlagKey): Promise<boolean> {
  const value = await get<boolean>(flag);
  return value === true;
}

/**
 * Get multiple feature flags at once
 */
export async function getFeatureFlags(
  flags: FeatureFlagKey[]
): Promise<Record<FeatureFlagKey, boolean>> {
  const all = await getAll<Record<string, boolean>>();
  const result: Record<string, boolean> = {};

  for (const flag of flags) {
    result[flag] = all?.[flag] === true;
  }

  return result as Record<FeatureFlagKey, boolean>;
}

/**
 * Check if maintenance mode is enabled
 */
export async function isMaintenanceMode(): Promise<boolean> {
  return isFeatureEnabled(FEATURE_FLAGS.MAINTENANCE_MODE);
}

/**
 * Get rate limit configuration
 */
export async function getRateLimitConfig(): Promise<{
  requests: number;
  windowSeconds: number;
} | null> {
  const config = await get<{ requests: number; windowSeconds: number }>(
    CONFIG_KEYS.RATE_LIMIT
  );
  return config ?? null;
}

/**
 * Get supported locales
 */
export async function getSupportedLocales(): Promise<string[]> {
  const locales = await get<string[]>(CONFIG_KEYS.SUPPORTED_LOCALES);
  return locales ?? ['en'];
}

/**
 * OAuth Provider Configuration
 * Controls which OAuth providers are enabled based on environment variables
 */

export type OAuthProvider = "google" | "facebook" | "apple" | "github";

interface OAuthConfig {
  enabled: boolean;
  name: string;
  icon: string;
}

/**
 * Check if an OAuth provider is enabled
 * Providers are disabled by default and must be explicitly enabled via env vars
 */
function isProviderEnabled(provider: OAuthProvider): boolean {
  switch (provider) {
    case "google":
      return process.env.NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED === "true";
    case "facebook":
      return process.env.NEXT_PUBLIC_OAUTH_FACEBOOK_ENABLED === "true";
    case "apple":
      return process.env.NEXT_PUBLIC_OAUTH_APPLE_ENABLED === "true";
    case "github":
      return process.env.NEXT_PUBLIC_OAUTH_GITHUB_ENABLED === "true";
    default:
      return false;
  }
}

/**
 * OAuth provider configurations
 */
export const OAUTH_PROVIDERS: Record<OAuthProvider, OAuthConfig> = {
  google: {
    enabled: isProviderEnabled("google"),
    name: "Google",
    icon: "/assets/google.svg",
  },
  facebook: {
    enabled: isProviderEnabled("facebook"),
    name: "Facebook",
    icon: "/assets/facebookblue.svg",
  },
  apple: {
    enabled: isProviderEnabled("apple"),
    name: "Apple",
    icon: "/assets/apple.svg",
  },
  github: {
    enabled: isProviderEnabled("github"),
    name: "GitHub",
    icon: "/assets/github.svg",
  },
};

/**
 * Get list of enabled OAuth providers
 */
export function getEnabledProviders(): OAuthProvider[] {
  return (Object.keys(OAUTH_PROVIDERS) as OAuthProvider[]).filter(
    (provider) => OAUTH_PROVIDERS[provider].enabled
  );
}

/**
 * Check if any OAuth providers are enabled
 */
export function hasEnabledProviders(): boolean {
  return getEnabledProviders().length > 0;
}

/**
 * Check if a specific provider is enabled
 */
export function isOAuthEnabled(provider: OAuthProvider): boolean {
  return OAUTH_PROVIDERS[provider]?.enabled ?? false;
}

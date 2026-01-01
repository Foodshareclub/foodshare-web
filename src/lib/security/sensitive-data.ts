/**
 * Sensitive Data Manager
 *
 * Handles sensitive data securely:
 * - Prevents sensitive data in logs
 * - Clears sensitive data on logout
 * - Encrypts sensitive data at rest (where supported)
 * - Redacts sensitive fields from objects
 *
 * @module lib/security/sensitive-data
 */

// =============================================================================
// Types
// =============================================================================

export interface SensitiveDataConfig {
  /** Fields to treat as sensitive */
  sensitiveFields?: string[];
  /** Redaction string (default: '[REDACTED]') */
  redactionString?: string;
  /** Enable encryption for storage (default: false) */
  enableEncryption?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default sensitive field names
 */
export const DEFAULT_SENSITIVE_FIELDS = [
  // Auth
  "password",
  "token",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "apiKey",
  "api_key",
  "secret",
  "secretKey",
  "secret_key",
  "privateKey",
  "private_key",

  // Personal
  "ssn",
  "socialSecurityNumber",
  "social_security_number",
  "creditCard",
  "credit_card",
  "cardNumber",
  "card_number",
  "cvv",
  "cvc",
  "pin",

  // Contact (partial redaction)
  "email",
  "phone",
  "phoneNumber",
  "phone_number",

  // Location (when sensitive)
  "exactLocation",
  "exact_location",
  "homeAddress",
  "home_address",
];

const DEFAULT_REDACTION = "[REDACTED]";

// =============================================================================
// Redaction Functions
// =============================================================================

/**
 * Check if a field name is sensitive
 */
export function isSensitiveField(
  fieldName: string,
  sensitiveFields: string[] = DEFAULT_SENSITIVE_FIELDS
): boolean {
  const lowerField = fieldName.toLowerCase();
  return sensitiveFields.some((sensitive) =>
    lowerField.includes(sensitive.toLowerCase())
  );
}

/**
 * Redact a single value
 */
export function redactValue(
  value: unknown,
  fieldName: string,
  config: SensitiveDataConfig = {}
): unknown {
  const { sensitiveFields = DEFAULT_SENSITIVE_FIELDS, redactionString = DEFAULT_REDACTION } =
    config;

  if (!isSensitiveField(fieldName, sensitiveFields)) {
    return value;
  }

  // Partial redaction for emails
  if (
    typeof value === "string" &&
    (fieldName.toLowerCase().includes("email") || value.includes("@"))
  ) {
    return redactEmail(value);
  }

  // Partial redaction for phone numbers
  if (
    typeof value === "string" &&
    fieldName.toLowerCase().includes("phone")
  ) {
    return redactPhone(value);
  }

  return redactionString;
}

/**
 * Redact email (show first char and domain)
 */
export function redactEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return DEFAULT_REDACTION;

  const redactedLocal = local.charAt(0) + "***";
  return `${redactedLocal}@${domain}`;
}

/**
 * Redact phone number (show last 4 digits)
 */
export function redactPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return DEFAULT_REDACTION;

  return "***-***-" + digits.slice(-4);
}

/**
 * Redact sensitive fields from an object (deep)
 */
export function redactObject<T extends Record<string, unknown>>(
  obj: T,
  config: SensitiveDataConfig = {}
): T {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  const result: Record<string, unknown> = Array.isArray(obj) ? {} : {};

  if (Array.isArray(obj)) {
    return obj.map((item) => 
      typeof item === "object" && item !== null 
        ? redactObject(item as Record<string, unknown>, config) 
        : item
    ) as unknown as T;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object") {
      result[key] = redactObject(value as Record<string, unknown>, config);
    } else {
      result[key] = redactValue(value, key, config);
    }
  }

  return result as T;
}

/**
 * Create a safe logger that redacts sensitive data
 */
export function createSafeLogger(
  logger: typeof console = console,
  config: SensitiveDataConfig = {}
) {
  const safeLog = (level: "log" | "info" | "warn" | "error", ...args: unknown[]) => {
    const safeArgs = args.map((arg) => {
      if (arg && typeof arg === "object") {
        return redactObject(arg as Record<string, unknown>, config);
      }
      return arg;
    });

    logger[level](...safeArgs);
  };

  return {
    log: (...args: unknown[]) => safeLog("log", ...args),
    info: (...args: unknown[]) => safeLog("info", ...args),
    warn: (...args: unknown[]) => safeLog("warn", ...args),
    error: (...args: unknown[]) => safeLog("error", ...args),
  };
}

// =============================================================================
// Storage Functions
// =============================================================================

const STORAGE_PREFIX = "fs_secure_";

/**
 * Securely store data (with optional encryption)
 */
export async function secureStore(
  key: string,
  value: unknown,
  config: SensitiveDataConfig = {}
): Promise<void> {
  if (typeof window === "undefined") return;

  const serialized = JSON.stringify(value);
  const storageKey = STORAGE_PREFIX + key;

  if (config.enableEncryption && window.crypto?.subtle) {
    // Use Web Crypto API for encryption
    const encrypted = await encryptData(serialized);
    sessionStorage.setItem(storageKey, encrypted);
  } else {
    // Store in sessionStorage (cleared on tab close)
    sessionStorage.setItem(storageKey, serialized);
  }
}

/**
 * Securely retrieve data
 */
export async function secureRetrieve<T>(
  key: string,
  config: SensitiveDataConfig = {}
): Promise<T | null> {
  if (typeof window === "undefined") return null;

  const storageKey = STORAGE_PREFIX + key;
  const stored = sessionStorage.getItem(storageKey);

  if (!stored) return null;

  try {
    if (config.enableEncryption && window.crypto?.subtle) {
      const decrypted = await decryptData(stored);
      return JSON.parse(decrypted) as T;
    }

    return JSON.parse(stored) as T;
  } catch {
    return null;
  }
}

/**
 * Securely remove data
 */
export function secureRemove(key: string): void {
  if (typeof window === "undefined") return;

  const storageKey = STORAGE_PREFIX + key;
  sessionStorage.removeItem(storageKey);
}

/**
 * Clear all secure storage
 */
export function secureClearAll(): void {
  if (typeof window === "undefined") return;

  const keysToRemove: string[] = [];

  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    sessionStorage.removeItem(key);
  }
}

// =============================================================================
// Encryption Helpers (Web Crypto API)
// =============================================================================

let encryptionKey: CryptoKey | null = null;

/**
 * Get or generate encryption key
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  if (encryptionKey) return encryptionKey;

  // Generate a new key for this session
  encryptionKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  return encryptionKey;
}

/**
 * Encrypt data using AES-GCM
 */
async function encryptData(data: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);

  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data using AES-GCM
 */
async function decryptData(encryptedData: string): Promise<string> {
  const key = await getEncryptionKey();

  // Decode from base64
  const combined = new Uint8Array(
    atob(encryptedData)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}

// =============================================================================
// Cleanup on Logout
// =============================================================================

/**
 * Clear all sensitive data (call on logout)
 */
export function clearSensitiveData(): void {
  // Clear secure storage
  secureClearAll();

  // Clear encryption key
  encryptionKey = null;

  // Clear any in-memory caches that might contain sensitive data
  if (typeof window !== "undefined") {
    // Clear localStorage items with sensitive prefixes
    const sensitiveLocalStorageKeys = [
      "sb-",
      "supabase",
      "auth",
      "token",
      "session",
    ];

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (
        key &&
        sensitiveLocalStorageKeys.some((prefix) =>
          key.toLowerCase().includes(prefix)
        )
      ) {
        localStorage.removeItem(key);
      }
    }
  }
}

// =============================================================================
// Request/Response Sanitization
// =============================================================================

/**
 * Sanitize request body before logging
 */
export function sanitizeRequestBody(
  body: unknown,
  config: SensitiveDataConfig = {}
): unknown {
  if (!body || typeof body !== "object") {
    return body;
  }

  return redactObject(body as Record<string, unknown>, config);
}

/**
 * Sanitize response for logging
 */
export function sanitizeResponse(
  response: unknown,
  config: SensitiveDataConfig = {}
): unknown {
  if (!response || typeof response !== "object") {
    return response;
  }

  return redactObject(response as Record<string, unknown>, config);
}

/**
 * Create fetch wrapper that sanitizes logs
 */
export function createSanitizedFetch(
  baseFetch: typeof fetch = fetch,
  config: SensitiveDataConfig = {}
): typeof fetch {
  const safeLogger = createSafeLogger(console, config);

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    // Log sanitized request
    if (process.env.NODE_ENV !== "production") {
      safeLogger.log("[Fetch]", init?.method || "GET", url, {
        body: init?.body ? sanitizeRequestBody(JSON.parse(init.body as string), config) : undefined,
      });
    }

    const response = await baseFetch(input, init);

    return response;
  };
}

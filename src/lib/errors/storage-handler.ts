/**
 * Browser Storage Error Handler
 * Detects and provides guidance for browser storage issues (IndexedDB, LocalStorage)
 * Common with Supabase's local session persistence
 */

export type StorageErrorType =
  | "quota_exceeded"
  | "permission_denied"
  | "private_browsing"
  | "corrupted_db"
  | "unknown";

export interface StorageErrorInfo {
  type: StorageErrorType;
  message: string;
  userGuidance: string;
  canRecover: boolean;
}

/**
 * Detects storage errors from error messages
 */
export function detectStorageError(error: Error | string): StorageErrorInfo | null {
  const errorMessage = typeof error === "string" ? error : error.message;
  const errorStack = typeof error === "string" ? "" : error.stack || "";
  const fullError = `${errorMessage} ${errorStack}`.toLowerCase();

  // LevelDB errors (IndexedDB backend)
  if (fullError.includes("leveldb") || fullError.includes(".ldb")) {
    if (
      fullError.includes("unable to create writable file") ||
      fullError.includes("newwritablefile")
    ) {
      return {
        type: "quota_exceeded",
        message: "Browser storage quota exceeded or permissions issue",
        userGuidance:
          "Please clear your browser cache or free up storage space. You may need to enable storage permissions for this site.",
        canRecover: true,
      };
    }
  }

  // Quota errors
  if (
    fullError.includes("quota") ||
    fullError.includes("storage full") ||
    fullError.includes("exceeds quota")
  ) {
    return {
      type: "quota_exceeded",
      message: "Browser storage quota exceeded",
      userGuidance:
        "Please clear your browser cache and try again. You can do this in your browser settings.",
      canRecover: true,
    };
  }

  // Permission errors
  if (fullError.includes("permission") || fullError.includes("access denied")) {
    return {
      type: "permission_denied",
      message: "Storage permission denied",
      userGuidance: "Please enable storage permissions for this site in your browser settings.",
      canRecover: true,
    };
  }

  // Private browsing detection
  if (fullError.includes("private") || fullError.includes("incognito")) {
    return {
      type: "private_browsing",
      message: "Private browsing mode detected",
      userGuidance:
        "Some features may not work in private browsing mode. Please use a regular browser window.",
      canRecover: false,
    };
  }

  // Database corruption
  if (
    fullError.includes("corrupt") ||
    fullError.includes("damaged") ||
    fullError.includes("invalid database")
  ) {
    return {
      type: "corrupted_db",
      message: "Browser database corrupted",
      userGuidance: "Please clear your browser data for this site and refresh the page.",
      canRecover: true,
    };
  }

  return null;
}

/**
 * Tests if browser storage is available
 */
export async function testStorageAvailability(): Promise<{
  localStorage: boolean;
  indexedDB: boolean;
  error?: StorageErrorInfo;
}> {
  const result = {
    localStorage: false,
    indexedDB: false,
    error: undefined as StorageErrorInfo | undefined,
  };

  // Test localStorage
  try {
    const testKey = "__storage_test__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);
    result.localStorage = true;
  } catch (error) {
    const storageError = detectStorageError(error as Error);
    if (storageError) {
      result.error = storageError;
    }
  }

  // Test IndexedDB
  try {
    if ("indexedDB" in window) {
      const testDB = indexedDB.open("__test_db__", 1);

      await new Promise((resolve, reject) => {
        testDB.onsuccess = () => {
          result.indexedDB = true;
          testDB.result?.close();
          indexedDB.deleteDatabase("__test_db__");
          resolve(true);
        };
        testDB.onerror = () => {
          reject(testDB.error);
        };
        testDB.onblocked = () => {
          reject(new Error("IndexedDB blocked"));
        };
      });
    }
  } catch (error) {
    const storageError = detectStorageError(error as Error);
    if (storageError && !result.error) {
      result.error = storageError;
    }
  }

  return result;
}

/**
 * Auth-related key patterns that should NEVER be cleared
 * These are essential for maintaining user sessions
 */
const AUTH_KEY_PATTERNS = [
  "auth-token",
  "auth_token",
  "access_token",
  "refresh_token",
  "session",
  "pkce",
  "code_verifier",
];

/**
 * Check if a key is an auth-related key that should be preserved
 */
function isAuthKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return AUTH_KEY_PATTERNS.some((pattern) => lowerKey.includes(pattern));
}

/**
 * Attempts to clear Supabase cache storage to recover from storage errors
 * IMPORTANT: Never clears auth tokens - only clears cache data
 */
export async function clearSupabaseStorage(): Promise<boolean> {
  try {
    // Clear localStorage keys related to Supabase EXCEPT auth tokens
    const supabaseKeys = Object.keys(localStorage).filter(
      (key) => (key.includes("supabase") || key.includes("sb-")) && !isAuthKey(key)
    );

    console.log("[StorageErrorHandler] Clearing non-auth Supabase keys:", supabaseKeys);
    supabaseKeys.forEach((key) => localStorage.removeItem(key));

    // Delete Supabase IndexedDB databases EXCEPT auth-related ones
    const databases = await indexedDB.databases();
    const supabaseDbs = databases.filter(
      (db) =>
        (db.name?.includes("supabase") || db.name?.includes("sb-")) && !isAuthKey(db.name || "")
    );

    for (const db of supabaseDbs) {
      if (db.name) {
        console.log("[StorageErrorHandler] Deleting IndexedDB:", db.name);
        indexedDB.deleteDatabase(db.name);
      }
    }

    return true;
  } catch (error) {
    console.error("Failed to clear Supabase storage:", error);
    return false;
  }
}

/**
 * Logs storage errors in a user-friendly way
 */
export function logStorageError(error: Error | string, context: string = "Storage"): void {
  const storageError = detectStorageError(error);

  if (storageError) {
    console.error(`[${context}] Storage Error:`, {
      type: storageError.type,
      message: storageError.message,
      guidance: storageError.userGuidance,
      canRecover: storageError.canRecover,
    });
  } else {
    console.error(`[${context}] Unknown Error:`, error);
  }
}

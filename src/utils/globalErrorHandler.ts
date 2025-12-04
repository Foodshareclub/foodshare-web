/**
 * Global Error Handler
 * Catches unhandled promise rejections and storage errors at the application level
 */

import { detectStorageError, clearSupabaseStorage, logStorageError } from "./storageErrorHandler";
import { createLogger } from "@/lib/logger";
import { productionErrorReporter } from "./productionErrorReporter";
import { autoRecovery } from "./autoRecovery";

const logger = createLogger("GlobalErrorHandler");
let storageErrorShown = false;
let autoRecoveryAttempted = false;

/**
 * Initialize global error handlers
 * Call this once at app startup
 */
export function initializeGlobalErrorHandlers() {
  // Handle unhandled promise rejections (catches async storage errors)
  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason;

    // Check if this is a storage error
    const storageError = detectStorageError(error);

    if (storageError) {
      logger.error("Unhandled Promise Rejection - Storage Error", error, {
        type: "storage",
        errorType: storageError.type,
      });
      logStorageError(error, "Global Promise Rejection");

      // Prevent default error handling
      event.preventDefault();

      // Show recovery UI only once
      if (!storageErrorShown) {
        storageErrorShown = true;
        showStorageRecoveryUI(storageError);
      }
    } else {
      // Log non-storage errors too
      logger.error("Unhandled Promise Rejection", error, {
        type: "promise_rejection",
      });

      // Report to production error reporter
      if (process.env.NODE_ENV === 'production') {
        productionErrorReporter.reportError(error, "error", {
          type: "promise_rejection",
        });

        // Attempt auto-recovery
        if (!autoRecoveryAttempted) {
          autoRecoveryAttempted = true;
          autoRecovery.attemptRecovery(error).then((recovered) => {
            if (!recovered) {
              autoRecoveryAttempted = false;
            }
          });
        }
      }
    }
  });

  // Handle general errors
  window.addEventListener("error", (event) => {
    const error = event.error;

    if (error) {
      const storageError = detectStorageError(error);

      if (storageError) {
        logger.error("Global Error - Storage Error", error, {
          type: "storage",
          errorType: storageError.type,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
        logStorageError(error, "Global Error");

        // Prevent default error handling
        event.preventDefault();

        // Show recovery UI only once
        if (!storageErrorShown) {
          storageErrorShown = true;
          showStorageRecoveryUI(storageError);
        }
      } else {
        // Log non-storage errors
        logger.error("Global Error", error, {
          type: "runtime_error",
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });

        // Report to production error reporter
        if (process.env.NODE_ENV === 'production') {
          productionErrorReporter.reportError(error, "error", {
            type: "runtime_error",
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          });
        }
      }
    }
  });

  logger.success("Global error handlers initialized");
}

/**
 * Show a modal/alert with storage recovery options
 * Uses safe DOM methods to avoid XSS vulnerabilities
 */
function showStorageRecoveryUI(storageError: any) {
  // Create overlay
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  `;

  // Create error card
  const errorCard = document.createElement("div");
  errorCard.style.cssText = `
    background: white;
    padding: 32px;
    border-radius: 12px;
    max-width: 500px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  `;

  // Create content container
  const contentDiv = document.createElement("div");
  contentDiv.style.marginBottom = "20px";

  // Icon
  const iconDiv = document.createElement("div");
  iconDiv.style.cssText = "font-size: 48px; text-align: center; margin-bottom: 16px;";
  iconDiv.textContent = "⚠️";
  contentDiv.appendChild(iconDiv);

  // Title
  const title = document.createElement("h2");
  title.style.cssText = "margin: 0 0 12px 0; color: #e53e3e; font-size: 24px; text-align: center;";
  title.textContent = "Browser Storage Error";
  contentDiv.appendChild(title);

  // Message
  const messagePara = document.createElement("p");
  messagePara.style.cssText =
    "margin: 0 0 12px 0; color: #2d3748; font-size: 16px; line-height: 1.5;";
  messagePara.textContent = storageError.message;
  contentDiv.appendChild(messagePara);

  // Guidance
  const guidancePara = document.createElement("p");
  guidancePara.style.cssText =
    "margin: 0 0 20px 0; color: #4a5568; font-size: 14px; line-height: 1.5;";
  guidancePara.textContent = storageError.userGuidance;
  contentDiv.appendChild(guidancePara);

  errorCard.appendChild(contentDiv);

  // Buttons container
  const buttonsDiv = document.createElement("div");
  buttonsDiv.style.cssText = "display: flex; gap: 12px; flex-direction: column;";

  // Clear Storage button (if recoverable)
  if (storageError.canRecover) {
    const clearBtn = document.createElement("button");
    clearBtn.id = "clearStorageBtn";
    clearBtn.style.cssText = `
      background: #e53e3e;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    `;
    clearBtn.textContent = "Clear Storage & Reload";

    clearBtn.addEventListener("mouseenter", () => {
      clearBtn.style.background = "#c53030";
    });
    clearBtn.addEventListener("mouseleave", () => {
      clearBtn.style.background = "#e53e3e";
    });
    clearBtn.addEventListener("click", async () => {
      clearBtn.textContent = "Clearing...";
      clearBtn.disabled = true;
      clearBtn.style.opacity = "0.6";
      clearBtn.style.cursor = "not-allowed";

      try {
        const success = await clearSupabaseStorage();
        if (success) {
          clearBtn.textContent = "Success! Reloading...";
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } else {
          clearBtn.textContent = "Failed. Reload manually.";
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (error) {
        console.error("Failed to clear storage:", error);
        clearBtn.textContent = "Error. Reloading...";
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    });

    buttonsDiv.appendChild(clearBtn);
  }

  // Reload button
  const reloadBtn = document.createElement("button");
  reloadBtn.id = "reloadBtn";
  reloadBtn.style.cssText = `
    background: #edf2f7;
    color: #2d3748;
    border: 1px solid #cbd5e0;
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  `;
  reloadBtn.textContent = "Reload Page";

  reloadBtn.addEventListener("mouseenter", () => {
    reloadBtn.style.background = "#e2e8f0";
  });
  reloadBtn.addEventListener("mouseleave", () => {
    reloadBtn.style.background = "#edf2f7";
  });
  reloadBtn.addEventListener("click", () => {
    window.location.reload();
  });

  buttonsDiv.appendChild(reloadBtn);

  // Dismiss button
  const dismissBtn = document.createElement("button");
  dismissBtn.id = "dismissBtn";
  dismissBtn.style.cssText = `
    background: transparent;
    color: #718096;
    border: none;
    padding: 8px;
    font-size: 14px;
    cursor: pointer;
    text-decoration: underline;
  `;
  dismissBtn.textContent = "Dismiss (not recommended)";

  dismissBtn.addEventListener("click", () => {
    overlay.remove();
    storageErrorShown = false;
  });

  buttonsDiv.appendChild(dismissBtn);
  errorCard.appendChild(buttonsDiv);

  // Footer note
  const footerNote = document.createElement("p");
  footerNote.style.cssText = `
    margin: 20px 0 0 0;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
    color: #718096;
    font-size: 12px;
    text-align: center;
  `;
  footerNote.textContent = "Check browser console for technical details";
  errorCard.appendChild(footerNote);

  overlay.appendChild(errorCard);
  document.body.appendChild(overlay);
}

/**
 * Test if we can access storage and show error if not
 */
export async function checkStorageOnStartup() {
  try {
    // Test localStorage
    const testKey = "__startup_test__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);

    // Test IndexedDB
    if ("indexedDB" in window) {
      const testDB = indexedDB.open("__startup_test__", 1);

      await new Promise((resolve, reject) => {
        testDB.onsuccess = () => {
          testDB.result?.close();
          indexedDB.deleteDatabase("__startup_test__");
          resolve(true);
        };
        testDB.onerror = () => {
          reject(testDB.error);
        };
        testDB.onblocked = () => {
          reject(new Error("IndexedDB blocked"));
        };

        // Timeout after 2 seconds
        setTimeout(() => {
          reject(new Error("IndexedDB timeout"));
        }, 2000);
      });
    }

    logger.success("Storage availability check passed");
    return true;
  } catch (error) {
    logger.error("Storage availability check failed", error as Error, {
      action: "startup_check",
    });

    const storageError = detectStorageError(error as Error);
    if (storageError && !storageErrorShown) {
      storageErrorShown = true;
      showStorageRecoveryUI(storageError);
    }

    return false;
  }
}

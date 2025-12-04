/**
 * Build Error Detector
 * Detects and logs common build-time issues that cause white screens
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("BuildErrorDetector");

interface BuildInfo {
  timestamp: string;
  mode: string;
  version: string;
  commit?: string;
  branch?: string;
  vercel?: {
    env: string;
    region: string;
    url: string;
  };
}

/**
 * Get build information
 */
export function getBuildInfo(): BuildInfo {
  return {
    timestamp: new Date().toISOString(),
    mode: process.env.NODE_ENV,
    version: "3.0.0",
    commit: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    branch: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF,
    vercel: process.env.NEXT_PUBLIC_VERCEL_ENV
      ? {
          env: process.env.NEXT_PUBLIC_VERCEL_ENV,
          region: process.env.NEXT_PUBLIC_VERCEL_REGION || "unknown",
          url: process.env.NEXT_PUBLIC_VERCEL_URL || window.location.hostname,
        }
      : undefined,
  };
}

/**
 * Detect chunk loading errors (common cause of white screens)
 */
export function detectChunkLoadErrors() {
  let chunkErrorCount = 0;
  const MAX_CHUNK_ERRORS = 3;

  window.addEventListener("error", (event) => {
    const error = event.error;
    const message = event.message || error?.message || "";

    // Detect chunk loading errors
    if (
      message.includes("Loading chunk") ||
      message.includes("Failed to fetch dynamically imported module") ||
      message.includes("Importing a module script failed") ||
      error?.name === "ChunkLoadError"
    ) {
      chunkErrorCount++;

      logger.error("Chunk loading error detected", error, {
        count: chunkErrorCount,
        filename: event.filename,
        message,
      });

      // If too many chunk errors, suggest reload
      if (chunkErrorCount >= MAX_CHUNK_ERRORS) {
        showChunkErrorRecovery();
      }
    }
  });
}

/**
 * Show chunk error recovery UI
 */
function showChunkErrorRecovery() {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;

  const card = document.createElement("div");
  card.style.cssText = `
    background: white;
    padding: 40px;
    border-radius: 16px;
    max-width: 500px;
    text-align: center;
  `;

  card.innerHTML = `
    <div style="font-size: 64px; margin-bottom: 20px;">🔄</div>
    <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 24px;">
      New Version Available
    </h2>
    <p style="margin: 0 0 24px 0; color: #4a5568; line-height: 1.6;">
      We've deployed a new version of the app. Please reload to get the latest updates.
    </p>
    <button id="reloadBtn" style="
      background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
      color: white;
      border: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
    ">
      Reload Now
    </button>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  document.getElementById("reloadBtn")?.addEventListener("click", () => {
    window.location.reload();
  });
}

/**
 * Detect CSS loading errors
 */
export function detectCSSLoadErrors() {
  const links = document.querySelectorAll('link[rel="stylesheet"]');

  links.forEach((link) => {
    link.addEventListener("error", (event) => {
      logger.error("CSS loading error", undefined, {
        href: (event.target as HTMLLinkElement).href,
      });
    });
  });
}

/**
 * Detect script loading errors
 */
export function detectScriptLoadErrors() {
  const scripts = document.querySelectorAll("script[src]");

  scripts.forEach((script) => {
    script.addEventListener("error", (event) => {
      logger.error("Script loading error", undefined, {
        src: (event.target as HTMLScriptElement).src,
      });
    });
  });
}

/**
 * Monitor for white screen (no content rendered)
 */
export function monitorWhiteScreen() {
  // Wait for initial render
  setTimeout(() => {
    const root = document.getElementById("root");

    if (!root || !root.hasChildNodes() || root.children.length === 0) {
      logger.error("White screen detected - no content rendered", undefined, {
        rootExists: !!root,
        hasChildren: root?.hasChildNodes(),
        childCount: root?.children.length,
      });

      // Show emergency recovery UI
      showWhiteScreenRecovery();
    }
  }, 5000); // Wait 5 seconds for app to render
}

/**
 * Show white screen recovery UI
 */
function showWhiteScreenRecovery() {
  const root = document.getElementById("root");
  if (!root) return;

  root.innerHTML = `
    <div style="
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%);
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    ">
      <div style="
        background: white;
        padding: 40px;
        border-radius: 16px;
        max-width: 600px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      ">
        <div style="font-size: 64px; text-align: center; margin-bottom: 20px;">
          💥
        </div>
        <h1 style="
          margin: 0 0 16px 0;
          color: #1a202c;
          font-size: 28px;
          text-align: center;
        ">
          App Failed to Load
        </h1>
        <p style="
          margin: 0 0 24px 0;
          color: #4a5568;
          line-height: 1.6;
          text-align: center;
        ">
          The application failed to render. This could be due to a deployment issue or browser compatibility problem.
        </p>
        
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button onclick="window.location.reload()" style="
            background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
            color: white;
            border: none;
            padding: 14px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
          ">
            🔄 Reload Page
          </button>
          
          <button onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload();" style="
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
            padding: 14px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
          ">
            🧹 Clear Cache & Reload
          </button>
        </div>

        <details style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <summary style="
            cursor: pointer;
            color: #6b7280;
            font-size: 14px;
            font-weight: 600;
          ">
            🔍 Technical Details
          </summary>
          <pre style="
            margin-top: 12px;
            padding: 12px;
            background: #f9fafb;
            border-radius: 6px;
            font-size: 12px;
            overflow-x: auto;
            color: #374151;
          ">${JSON.stringify(getBuildInfo(), null, 2)}</pre>
        </details>
      </div>
    </div>
  `;
}

/**
 * Log build information on startup
 */
export function logBuildInfo() {
  const buildInfo = getBuildInfo();

  logger.info("📦 Build Information", buildInfo);

  // Store for debugging
  try {
    localStorage.setItem("build_info", JSON.stringify(buildInfo));
  } catch (error) {
    logger.warn("Failed to store build info", { error });
  }
}

/**
 * Initialize all build error detectors
 */
export function initializeBuildErrorDetection() {
  logger.info("🔍 Initializing build error detection...");

  logBuildInfo();
  detectChunkLoadErrors();
  detectCSSLoadErrors();
  detectScriptLoadErrors();
  monitorWhiteScreen();

  logger.success("Build error detection initialized");
}

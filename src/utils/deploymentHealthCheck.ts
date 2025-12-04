/**
 * Deployment Health Check
 * Detects common issues that cause white screens on Vercel
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("DeploymentHealthCheck");

interface HealthCheckResult {
  passed: boolean;
  checks: {
    name: string;
    passed: boolean;
    message: string;
    critical: boolean;
  }[];
  environment: {
    isVercel: boolean;
    isProduction: boolean;
    buildId?: string;
    region?: string;
  };
}

/**
 * Detect if running on Vercel
 */
function isVercelDeployment(): boolean {
  return !!(
    typeof window !== "undefined" &&
    (window.location.hostname.includes("vercel.app") ||
      process.env.NEXT_PUBLIC_VERCEL === "1" ||
      process.env.VERCEL === "1")
  );
}

/**
 * Get Vercel environment info
 */
function getVercelEnvironment() {
  return {
    isVercel: isVercelDeployment(),
    isProduction: process.env.NODE_ENV === 'production',
    buildId: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    region: process.env.NEXT_PUBLIC_VERCEL_REGION,
    env: process.env.NEXT_PUBLIC_VERCEL_ENV,
  };
}

/**
 * Check if environment variables are properly set
 */
function checkEnvironmentVariables(): { passed: boolean; message: string } {
  const requiredVars = [
    { key: "VITE_SUPABASE_URL", value: process.env.NEXT_PUBLIC_SUPABASE_URL },
    { key: "VITE_SUPABASE_ANON_KEY", value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
  ];

  const missing = requiredVars.filter((v) => !v.value);

  if (missing.length > 0) {
    return {
      passed: false,
      message: `Missing environment variables: ${missing.map((v) => v.key).join(", ")}`,
    };
  }

  // Check for placeholder values (common mistake)
  const placeholders = requiredVars.filter(
    (v) =>
      v.value &&
      (v.value.includes("your-") || v.value.includes("placeholder") || v.value.includes("example"))
  );

  if (placeholders.length > 0) {
    return {
      passed: false,
      message: `Placeholder values detected: ${placeholders.map((v) => v.key).join(", ")}`,
    };
  }

  return { passed: true, message: "All environment variables configured" };
}

/**
 * Check if critical assets are accessible
 */
async function checkCriticalAssets(): Promise<{ passed: boolean; message: string }> {
  const criticalAssets = ["/manifest.json", "/straw.svg"];

  try {
    const results = await Promise.allSettled(
      criticalAssets.map((asset) =>
        fetch(asset, { method: "HEAD" }).then((r) => ({ asset, ok: r.ok }))
      )
    );

    const failed = results
      .filter(
        (r): r is PromiseFulfilledResult<{ asset: string; ok: boolean }> =>
          r.status === "fulfilled" && !r.value.ok
      )
      .map((r) => r.value.asset);

    if (failed.length > 0) {
      return {
        passed: false,
        message: `Failed to load assets: ${failed.join(", ")}`,
      };
    }

    return { passed: true, message: "All critical assets accessible" };
  } catch (error) {
    return {
      passed: false,
      message: `Asset check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Check browser compatibility
 */
function checkBrowserCompatibility(): { passed: boolean; message: string } {
  const requiredFeatures = [
    { name: "localStorage", check: () => "localStorage" in window },
    { name: "sessionStorage", check: () => "sessionStorage" in window },
    { name: "indexedDB", check: () => "indexedDB" in window },
    { name: "fetch", check: () => "fetch" in window },
    { name: "Promise", check: () => "Promise" in window },
    { name: "async/await", check: () => true }, // If code runs, async/await works
  ];

  const missing = requiredFeatures.filter((f) => !f.check());

  if (missing.length > 0) {
    return {
      passed: false,
      message: `Missing browser features: ${missing.map((f) => f.name).join(", ")}`,
    };
  }

  return { passed: true, message: "Browser fully compatible" };
}

/**
 * Check React hydration
 */
function checkReactHydration(): { passed: boolean; message: string } {
  const root = document.getElementById("root");

  if (!root) {
    return { passed: false, message: "Root element not found" };
  }

  if (!root.hasChildNodes()) {
    return { passed: false, message: "Root element is empty (hydration may have failed)" };
  }

  return { passed: true, message: "React hydration successful" };
}

/**
 * Check for common Vercel deployment issues
 */
function checkVercelSpecificIssues(): { passed: boolean; message: string } {
  const issues: string[] = [];

  // Check for serverless function timeout (common cause of white screens)
  if (isVercelDeployment()) {
    // Check if we're in a serverless context (shouldn't be for SPA)
    if (typeof window === "undefined") {
      issues.push("Running in serverless context (should be client-side)");
    }

    // Check for build output configuration
    const hasVercelConfig = document.querySelector('meta[name="vercel-build-id"]');
    if (!hasVercelConfig && process.env.NODE_ENV === 'production') {
      issues.push("Missing Vercel build metadata");
    }
  }

  if (issues.length > 0) {
    return { passed: false, message: issues.join("; ") };
  }

  return { passed: true, message: "No Vercel-specific issues detected" };
}

/**
 * Check network connectivity
 */
async function checkNetworkConnectivity(): Promise<{ passed: boolean; message: string }> {
  if (!navigator.onLine) {
    return { passed: false, message: "No network connection" };
  }

  try {
    // Try to reach Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok && response.status !== 401) {
        // 401 is expected without auth
        return {
          passed: false,
          message: `Supabase unreachable (status: ${response.status})`,
        };
      }
    }

    return { passed: true, message: "Network connectivity OK" };
  } catch (error) {
    return {
      passed: false,
      message: `Network check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Run all health checks
 */
export async function runDeploymentHealthCheck(): Promise<HealthCheckResult> {
  logger.info("🏥 Running deployment health check...");

  const environment = getVercelEnvironment();

  const checks = [
    {
      name: "Environment Variables",
      check: () => checkEnvironmentVariables(),
      critical: true,
    },
    {
      name: "Browser Compatibility",
      check: () => checkBrowserCompatibility(),
      critical: true,
    },
    {
      name: "React Hydration",
      check: () => checkReactHydration(),
      critical: true,
    },
    {
      name: "Critical Assets",
      check: () => checkCriticalAssets(),
      critical: false,
    },
    {
      name: "Network Connectivity",
      check: () => checkNetworkConnectivity(),
      critical: false,
    },
    {
      name: "Vercel-Specific Issues",
      check: () => checkVercelSpecificIssues(),
      critical: false,
    },
  ];

  const results = await Promise.all(
    checks.map(async ({ name, check, critical }) => {
      try {
        const result = await check();
        return {
          name,
          passed: result.passed,
          message: result.message,
          critical,
        };
      } catch (error) {
        return {
          name,
          passed: false,
          message: `Check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          critical,
        };
      }
    })
  );

  const allPassed = results.every((r) => r.passed);
  const criticalFailed = results.some((r) => !r.passed && r.critical);

  // Log results
  results.forEach((result) => {
    const emoji = result.passed ? "✅" : result.critical ? "❌" : "⚠️";
    const message = `${emoji} ${result.name}: ${result.message}`;
    if (result.passed) {
      logger.success(message);
    } else if (result.critical) {
      logger.error(message);
    } else {
      logger.warn(message);
    }
  });

  const healthCheckResult: HealthCheckResult = {
    passed: allPassed,
    checks: results,
    environment,
  };

  // Store result for debugging
  if (process.env.NODE_ENV === 'production') {
    try {
      localStorage.setItem("deployment_health_check", JSON.stringify(healthCheckResult));
    } catch (error) {
      logger.warn("Failed to store health check result", { error });
    }
  }

  if (criticalFailed) {
    logger.error("🚨 Critical health check failures detected!", undefined, {
      failedChecks: results.filter((r) => !r.passed && r.critical).map((r) => r.name),
    });
  } else if (!allPassed) {
    logger.warn("⚠️ Some health checks failed (non-critical)", {
      failedChecks: results.filter((r) => !r.passed).map((r) => r.name),
    });
  } else {
    logger.success("🎉 All health checks passed!");
  }

  return healthCheckResult;
}

/**
 * Get last health check result
 */
export function getLastHealthCheck(): HealthCheckResult | null {
  try {
    const stored = localStorage.getItem("deployment_health_check");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Expose to window for debugging
 */
if (typeof window !== "undefined") {
  (
    window as typeof window & {
      __healthCheck: { run: typeof runDeploymentHealthCheck; getLast: typeof getLastHealthCheck };
    }
  ).__healthCheck = {
    run: runDeploymentHealthCheck,
    getLast: getLastHealthCheck,
  };
}

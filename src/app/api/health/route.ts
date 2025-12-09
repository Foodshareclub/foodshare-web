/**
 * Database Health Check API Route (Edge Function)
 * Checks:
 * 1. Direct DB connectivity
 * 2. Supabase project health via Management API
 * 3. Supabase upgrade status (if upgrade is in progress)
 * 4. Supabase platform status
 */

import { NextResponse } from "next/server";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

const DB_TIMEOUT_MS = 30000; // 30s for Supabase cold-start on free tier
const API_TIMEOUT_MS = 30000; // 30s for Management API

interface HealthStatus {
  status: "healthy" | "degraded" | "maintenance";
  database: boolean;
  timestamp: string;
  message?: string;
  retryAfter?: number;
  services: {
    database: "up" | "down" | "degraded";
    auth: "up" | "down" | "unknown";
    storage: "up" | "down" | "unknown";
  };
  upgradeStatus?: {
    status: string;
    progress?: string;
    targetVersion?: string;
  };
}

const MAINTENANCE_MESSAGE = "We're sprucing things up! Back shortly — thanks for your patience! 💚";

/**
 * Check Supabase project health via Management API
 * Requires SUPABASE_ACCESS_TOKEN (Personal Access Token from Supabase dashboard)
 * NOT the service role key - that's for database access only
 */
async function checkProjectHealth(): Promise<{
  healthy: boolean;
  services?: Record<string, string>;
} | null> {
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
    /https:\/\/([^.]+)\.supabase\.co/
  )?.[1];
  // Use SUPABASE_ACCESS_TOKEN (PAT) for Management API, not service role key
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (!projectRef || !accessToken) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/health?services=db,auth,storage`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        cache: "no-store",
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();

    // Check if all services are healthy
    const services: Record<string, string> = {};
    let allHealthy = true;

    if (Array.isArray(data)) {
      for (const service of data) {
        services[service.name] = service.status;
        if (service.status !== "HEALTHY" && service.status !== "ACTIVE_HEALTHY") {
          allHealthy = false;
        }
      }
    }

    return { healthy: allHealthy, services };
  } catch {
    return null;
  }
}

/**
 * Check if there's an ongoing Postgres upgrade
 * Uses SUPABASE_ACCESS_TOKEN for Management API authentication
 */
async function checkUpgradeStatus(): Promise<{
  upgrading: boolean;
  status?: string;
  progress?: string;
  targetVersion?: string;
} | null> {
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
    /https:\/\/([^.]+)\.supabase\.co/
  )?.[1];
  // Use SUPABASE_ACCESS_TOKEN (PAT) for Management API
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (!projectRef || !accessToken) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/upgrade/status`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        cache: "no-store",
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) return { upgrading: false };

    const data = await response.json();

    // Check if upgrade is in progress
    const isUpgrading =
      data.status && !["COMPLETED", "FAILED", "CANCELLED"].includes(data.status.toUpperCase());

    return {
      upgrading: isUpgrading,
      status: data.status,
      progress: data.progress,
      targetVersion: data.target_version,
    };
  } catch {
    return null;
  }
}

/**
 * Check direct database connectivity with retry logic
 * Retries up to 2 times with exponential backoff to handle cold starts
 */
async function checkDatabaseConnectivity(
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ ok: boolean; status: number | null }> {
  const maxRetries = 2;
  let lastStatus: number | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      // Shorter timeout per attempt, but multiple attempts
      const timeoutMs = attempt === 0 ? 10000 : 15000; // 10s first, 15s retry
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
        method: "GET",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: "application/json",
        },
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutId);
      lastStatus = response.status;

      // Success or client error (not server error)
      if (response.ok || response.status < 500) {
        return { ok: true, status: response.status };
      }

      // Server error - retry if we have attempts left
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1))); // 1s, 2s backoff
        continue;
      }
    } catch {
      // Timeout or network error - retry if we have attempts left
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  return { ok: false, status: lastStatus };
}

function createResponse(
  status: HealthStatus["status"],
  database: boolean,
  services: HealthStatus["services"],
  message?: string,
  upgradeStatus?: HealthStatus["upgradeStatus"]
): NextResponse<HealthStatus> {
  const response: HealthStatus = {
    status,
    database,
    timestamp: new Date().toISOString(),
    services,
    ...(message && { message }),
    ...(status !== "healthy" && { retryAfter: 30 }),
    ...(upgradeStatus && { upgradeStatus }),
  };

  const httpStatus = status === "maintenance" ? 503 : 200;
  const headers: Record<string, string> = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  };

  if (status === "maintenance") {
    headers["Retry-After"] = "30";
  }

  return NextResponse.json(response, { status: httpStatus, headers });
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return createResponse(
        "maintenance",
        false,
        { database: "down", auth: "unknown", storage: "unknown" },
        "Service configuration error"
      );
    }

    // Check all sources in parallel
    const [dbResult, projectHealth, upgradeInfo] = await Promise.all([
      checkDatabaseConnectivity(supabaseUrl, supabaseKey),
      checkProjectHealth(),
      checkUpgradeStatus(),
    ]);

    // Check if upgrade is in progress
    if (upgradeInfo?.upgrading) {
      const upgradeMessage = upgradeInfo.targetVersion
        ? `Database upgrade to v${upgradeInfo.targetVersion} in progress...`
        : `Database upgrade in progress: ${upgradeInfo.status}`;

      return createResponse(
        "maintenance",
        false,
        { database: "down", auth: "unknown", storage: "unknown" },
        upgradeMessage,
        {
          status: upgradeInfo.status || "upgrading",
          progress: upgradeInfo.progress,
          targetVersion: upgradeInfo.targetVersion,
        }
      );
    }

    // Check project health from Management API
    if (projectHealth && !projectHealth.healthy) {
      const unhealthyServices = Object.entries(projectHealth.services || {})
        .filter(([_, status]) => status !== "HEALTHY" && status !== "ACTIVE_HEALTHY")
        .map(([name]) => name);

      return createResponse(
        "maintenance",
        false,
        {
          database: projectHealth.services?.db === "HEALTHY" ? "up" : "down",
          auth: projectHealth.services?.auth === "HEALTHY" ? "up" : "down",
          storage: projectHealth.services?.storage === "HEALTHY" ? "up" : "down",
        },
        `Services under maintenance: ${unhealthyServices.join(", ")}`
      );
    }

    // Database is down (direct check)
    if (!dbResult.ok) {
      return createResponse(
        "maintenance",
        false,
        { database: "down", auth: "unknown", storage: "unknown" },
        MAINTENANCE_MESSAGE
      );
    }

    // All good
    return createResponse("healthy", true, { database: "up", auth: "up", storage: "up" });
  } catch {
    return createResponse(
      "maintenance",
      false,
      { database: "down", auth: "unknown", storage: "unknown" },
      MAINTENANCE_MESSAGE
    );
  }
}

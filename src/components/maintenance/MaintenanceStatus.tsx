"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Check, X, Loader2, RefreshCw } from "lucide-react";

interface HealthStatus {
  status: "healthy" | "degraded" | "maintenance";
  database: boolean;
  timestamp: string;
  message?: string;
  retryAfter?: number;
  services?: {
    database: "up" | "down" | "degraded";
    auth: "up" | "down" | "unknown";
    storage: "up" | "down" | "unknown";
  };
}

const SERVICE_LABELS: Record<string, string> = {
  database: "Database",
  auth: "Authentication",
  storage: "File Storage",
};

const DEFAULT_SERVICES = {
  database: "down" as const,
  auth: "unknown" as const,
  storage: "unknown" as const,
};

function ServiceStatusIcon({
  status,
}: {
  status: "up" | "down" | "degraded" | "unknown";
}): React.ReactElement {
  switch (status) {
    case "up":
      return <Check className="h-4 w-4 text-green-500" />;
    case "down":
      return <X className="h-4 w-4 text-red-500" />;
    case "degraded":
      return <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />;
    default:
      return <Loader2 className="h-4 w-4 text-gray-400" />;
  }
}

export function MaintenanceStatus(): React.ReactElement {
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const router = useRouter();
  const t = useTranslations("Maintenance");

  const checkHealth = async (): Promise<void> => {
    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s to allow for retries

      const res = await fetch("/api/health", {
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        // Server returned 503 or similar - maintenance mode
        const data = await res.json().catch(() => ({}));
        setStatus({
          status: "maintenance",
          database: false,
          timestamp: new Date().toISOString(),
          message: data.message || "Service is under maintenance",
          services: data.services || DEFAULT_SERVICES,
        });
        setLastChecked(new Date());
        return;
      }

      const data: HealthStatus = await res.json();
      setStatus(data);
      setLastChecked(new Date());

      // Start countdown and redirect to home if healthy
      if (data.status === "healthy") {
        setRedirectCountdown(3);
      }
    } catch {
      // Network error = maintenance mode
      setStatus({
        status: "maintenance",
        database: false,
        timestamp: new Date().toISOString(),
        message: "Service is temporarily unavailable",
        services: DEFAULT_SERVICES,
      });
      setLastChecked(new Date());
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();

    // Poll every 15 seconds
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handle redirect countdown
  useEffect(() => {
    if (redirectCountdown === null) return;

    if (redirectCountdown <= 0) {
      router.push("/");
      return;
    }

    const timer = setTimeout(() => {
      setRedirectCountdown(redirectCountdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [redirectCountdown, router]);

  const services = status?.services || DEFAULT_SERVICES;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 dark:text-white">
          {t("serviceStatus", { fallback: "Service Status" })}
        </h2>
        <button
          onClick={checkHealth}
          disabled={isChecking}
          className={cn(
            "p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
            isChecking && "animate-spin"
          )}
          aria-label={t("refresh", { fallback: "Refresh status" })}
        >
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      <div className="space-y-2">
        {Object.entries(services).map(([service, serviceStatus]) => (
          <div
            key={service}
            className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
          >
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {SERVICE_LABELS[service] || service}
            </span>
            <div className="flex items-center gap-2">
              <ServiceStatusIcon status={serviceStatus} />
              <span
                className={cn(
                  "text-xs font-medium capitalize",
                  serviceStatus === "up" && "text-green-600",
                  serviceStatus === "down" && "text-red-600",
                  serviceStatus === "degraded" && "text-amber-600",
                  serviceStatus === "unknown" && "text-gray-400"
                )}
              >
                {serviceStatus === "down"
                  ? "Maintenance"
                  : serviceStatus === "unknown"
                    ? "Checking..."
                    : serviceStatus}
              </span>
            </div>
          </div>
        ))}
      </div>

      {lastChecked && (
        <p className="text-xs text-gray-400 text-center">
          {t("lastChecked", { fallback: "Last checked" })}: {lastChecked.toLocaleTimeString()}
        </p>
      )}

      {status?.status === "healthy" && (
        <div className="text-center py-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-green-600 dark:text-green-400 font-medium text-lg">
            ✨ {t("allSystemsOperational", { fallback: "All systems operational!" })}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-3">
            {redirectCountdown !== null && redirectCountdown > 0
              ? `Redirecting in ${redirectCountdown}...`
              : t("redirecting", { fallback: "Redirecting you back..." })}
          </p>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              router.push("/");
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to Home →
          </a>
        </div>
      )}

      {status?.status === "maintenance" && (
        <div className="text-center py-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <p className="text-amber-700 dark:text-amber-400 text-sm">
            🛠️ Our team is working on it. Thanks for your patience!
          </p>
        </div>
      )}
    </div>
  );
}

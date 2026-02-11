"use client";

/**
 * ProviderPerformanceCard - Compact provider stats for overview
 */

import type { ProviderHealth } from "../types";
import { cn } from "@/lib/utils";

const providerConfig = {
  brevo: { name: "Brevo", color: "blue", description: "Primary notifications" },
  resend: { name: "Resend", color: "emerald", description: "Auth & transactional" },
  mailersend: { name: "MailerSend", color: "green", description: "High volume emails" },
  aws_ses: { name: "AWS SES", color: "amber", description: "Failover provider" },
};

const colorClasses = {
  blue: "bg-blue-500/10 border-blue-500/20",
  emerald: "bg-emerald-500/10 border-emerald-500/20",
  green: "bg-green-500/10 border-green-500/20",
  amber: "bg-amber-500/10 border-amber-500/20",
};

interface ProviderPerformanceCardProps {
  provider: ProviderHealth;
}

export function ProviderPerformanceCard({ provider }: ProviderPerformanceCardProps) {
  const config = providerConfig[provider.provider];

  return (
    <div
      className={cn(
        "p-4 rounded-xl border",
        colorClasses[config.color as keyof typeof colorClasses]
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-sm">{config.name}</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            provider.status === "healthy"
              ? "bg-emerald-500"
              : provider.status === "degraded"
                ? "bg-amber-500"
                : "bg-rose-500"
          )}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold tabular-nums">{provider.successRate}%</p>
          <p className="text-[10px] text-muted-foreground uppercase">Success</p>
        </div>
        <div>
          <p className="text-lg font-bold tabular-nums">{provider.avgLatencyMs}ms</p>
          <p className="text-[10px] text-muted-foreground uppercase">Latency</p>
        </div>
        <div>
          <p className="text-lg font-bold tabular-nums">
            {provider.totalRequests.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase">Requests</p>
        </div>
      </div>
    </div>
  );
}

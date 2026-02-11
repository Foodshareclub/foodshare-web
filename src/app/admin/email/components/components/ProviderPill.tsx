"use client";

/**
 * ProviderPill - Status indicator for email providers
 * Shows provider name with health status dot and success rate
 */

import { PROVIDER_NAMES, PROVIDER_STATUS_CONFIG } from "../constants";
import type { ProviderPillProps } from "../types";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ProviderPill({ provider }: ProviderPillProps) {
  const config = PROVIDER_STATUS_CONFIG[provider.status];
  const providerName = PROVIDER_NAMES[provider.provider] || provider.provider;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
            config.bg,
            config.text
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", config.dot)} />
          {providerName}
          <span className="opacity-70">{provider.successRate}%</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p className="font-medium">{providerName}</p>
        <p className="text-muted-foreground">
          {provider.totalRequests.toLocaleString()} requests • {provider.avgLatencyMs}ms avg
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

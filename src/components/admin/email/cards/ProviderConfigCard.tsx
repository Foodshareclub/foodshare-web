"use client";

/**
 * ProviderConfigCard - Configuration card for provider settings
 */

import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const statusConfig = {
  configured: {
    label: "Configured",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  not_configured: {
    label: "Not Configured",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-amber-600 dark:text-amber-400",
  },
  error: {
    label: "Error",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-rose-600 dark:text-rose-400",
  },
};

interface ProviderConfigCardProps {
  name: string;
  status: "configured" | "not_configured" | "error";
  dailyLimit: number;
  priority: number;
  description: string;
}

export function ProviderConfigCard({
  name,
  status,
  dailyLimit,
  priority,
  description,
}: ProviderConfigCardProps) {
  const config = statusConfig[status];

  return (
    <div className="p-4 rounded-xl border border-border/50 bg-muted/20">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold">{name}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Badge variant="outline" className="text-xs">
          Priority {priority}
        </Badge>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className={cn("flex items-center gap-1.5 text-sm", config.color)}>
          {config.icon}
          {config.label}
        </div>
        <span className="text-sm text-muted-foreground">{dailyLimit}/day</span>
      </div>
    </div>
  );
}

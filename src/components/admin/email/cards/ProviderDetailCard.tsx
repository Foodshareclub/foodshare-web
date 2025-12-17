"use client";

/**
 * ProviderDetailCard - Full provider card for providers tab
 */

import type { ProviderHealth } from "../types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

const providerConfig = {
  brevo: {
    name: "Brevo",
    color: "blue",
    limit: 300,
    description: "Primary email provider for notifications and newsletters",
  },
  resend: {
    name: "Resend",
    color: "emerald",
    limit: 100,
    description: "Optimized for authentication and transactional emails",
  },
  mailersend: {
    name: "MailerSend",
    color: "green",
    limit: 400,
    description: "High-volume email provider with 12,000 emails/month free tier",
  },
  aws_ses: {
    name: "AWS SES",
    color: "amber",
    limit: 100,
    description: "High-volume failover when primary quotas exhausted",
  },
};

const statusConfig = {
  healthy: {
    label: "Healthy",
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  degraded: {
    label: "Degraded",
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  down: {
    label: "Down",
    color: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
};

interface ProviderDetailCardProps {
  provider: ProviderHealth;
}

export function ProviderDetailCard({ provider }: ProviderDetailCardProps) {
  const config = providerConfig[provider.provider];
  const status = statusConfig[provider.status];

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="font-semibold text-lg">{config.name}</h4>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
          <Badge className={cn("text-xs", status.color)}>{status.label}</Badge>
        </div>

        <div className="space-y-4">
          {/* Health Score */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Health Score</span>
              <span className="font-medium">{provider.healthScore}%</span>
            </div>
            <Progress
              value={provider.healthScore}
              className={cn(
                "h-2",
                provider.healthScore >= 80
                  ? "[&>div]:bg-emerald-500"
                  : provider.healthScore >= 50
                    ? "[&>div]:bg-amber-500"
                    : "[&>div]:bg-rose-500"
              )}
            />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold tabular-nums">{provider.successRate}%</p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold tabular-nums">{provider.avgLatencyMs}ms</p>
              <p className="text-xs text-muted-foreground">Avg Latency</p>
            </div>
          </div>

          {/* Daily Limit */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-sm text-muted-foreground">Daily Limit</span>
            <span className="font-medium">{config.limit} emails/day</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

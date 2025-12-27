import { Mail } from "lucide-react";
import type { ProviderHealth } from "../types";
import { GlassCard } from "./GlassCard";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function ProviderHealthBadge({ provider }: { provider: ProviderHealth }) {
  const statusColors = {
    healthy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    degraded: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    down: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  };

  const providerNames = {
    brevo: "Brevo",
    resend: "Resend",
    aws_ses: "AWS SES",
    mailersend: "MailerSend",
  };

  return (
    <Badge variant="outline" className={cn("gap-1.5", statusColors[provider.status])}>
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          provider.status === "healthy"
            ? "bg-emerald-500"
            : provider.status === "degraded"
              ? "bg-amber-500"
              : "bg-rose-500"
        )}
      />
      {providerNames[provider.provider]}
      <span className="text-xs opacity-70">{provider.successRate}%</span>
    </Badge>
  );
}

export function ProviderCard({ provider }: { provider: ProviderHealth }) {
  const providerNames = {
    brevo: "Brevo",
    resend: "Resend",
    aws_ses: "AWS SES",
    mailersend: "MailerSend",
  };

  const statusColors = {
    healthy: "text-emerald-600 dark:text-emerald-400",
    degraded: "text-amber-600 dark:text-amber-400",
    down: "text-rose-600 dark:text-rose-400",
  };

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium">{providerNames[provider.provider]}</span>
        <span className={cn("text-sm font-semibold", statusColors[provider.status])}>
          {provider.successRate}%
        </span>
      </div>
      <Progress
        value={provider.successRate}
        className={cn(
          "h-2",
          provider.status === "healthy"
            ? "[&>div]:bg-emerald-500"
            : provider.status === "degraded"
              ? "[&>div]:bg-amber-500"
              : "[&>div]:bg-rose-500"
        )}
      />
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>{provider.totalRequests.toLocaleString()} requests</span>
        <span>{provider.avgLatencyMs}ms avg</span>
      </div>
    </div>
  );
}

export function ProviderDetailCard({ provider }: { provider: ProviderHealth }) {
  const providerNames = {
    brevo: "Brevo",
    resend: "Resend",
    aws_ses: "AWS SES",
    mailersend: "MailerSend",
  };

  const providerDescriptions = {
    brevo: "Primary email provider for app notifications",
    resend: "Optimized for authentication emails",
    aws_ses: "Failover provider for high availability",
    mailersend: "High volume email delivery",
  };

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "rounded-lg p-2",
              provider.status === "healthy"
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                : provider.status === "degraded"
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                  : "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
            )}
          >
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold">{providerNames[provider.provider]}</h4>
            <p className="text-xs text-muted-foreground">
              {providerDescriptions[provider.provider]}
            </p>
          </div>
        </div>
        <Badge
          variant={provider.status === "healthy" ? "default" : "secondary"}
          className="capitalize"
        >
          {provider.status}
        </Badge>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Success Rate</span>
            <span className="font-medium">{provider.successRate}%</span>
          </div>
          <Progress value={provider.successRate} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
          <div>
            <p className="text-xs text-muted-foreground">Total Requests</p>
            <p className="font-semibold">{provider.totalRequests.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg Latency</p>
            <p className="font-semibold">{provider.avgLatencyMs}ms</p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export function ProviderConfigCard({
  name,
  status,
  dailyLimit,
  priority,
  description,
}: {
  name: string;
  status: "configured" | "not_configured";
  dailyLimit: number;
  priority: number;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{name}</span>
        <Badge variant={status === "configured" ? "default" : "secondary"} className="text-xs">
          {status === "configured" ? "Active" : "Not Configured"}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Daily Limit: {dailyLimit}</span>
        <span className="text-muted-foreground">Priority: {priority}</span>
      </div>
    </div>
  );
}

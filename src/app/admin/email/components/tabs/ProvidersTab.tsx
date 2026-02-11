"use client";

/**
 * ProvidersTab - Professional Email Provider Management
 *
 * Features:
 * - Real-time provider health monitoring
 * - Visual quota tracking with animations
 * - Smart routing configuration
 * - Provider-specific settings
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Globe,
  Zap,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Mail,
  Activity,
  TrendingUp,
  Server,
} from "lucide-react";
import type { ProviderHealth } from "../types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const PROVIDER_CONFIG = {
  resend: {
    name: "Resend",
    description: "Modern email API for developers",
    color: "from-zinc-600 to-zinc-800",
    lightColor: "bg-zinc-100 dark:bg-zinc-800/50",
    textColor: "text-zinc-900 dark:text-zinc-100",
    borderColor: "border-zinc-200 dark:border-zinc-700",
    icon: "✉️",
    website: "https://resend.com",
    features: ["Developer-first", "React Email", "Fast delivery"],
    priority: 2,
    emailTypes: ["Authentication", "Transactional"],
  },
  brevo: {
    name: "Brevo",
    description: "All-in-one marketing platform",
    color: "from-blue-500 to-blue-700",
    lightColor: "bg-blue-50 dark:bg-blue-900/20",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: "📧",
    website: "https://brevo.com",
    features: ["Marketing automation", "CRM integration", "Analytics"],
    priority: 1,
    emailTypes: ["Newsletter", "Marketing", "Notifications"],
  },
  aws_ses: {
    name: "AWS SES",
    description: "Scalable enterprise email service",
    color: "from-orange-500 to-amber-600",
    lightColor: "bg-orange-50 dark:bg-orange-900/20",
    textColor: "text-orange-700 dark:text-orange-400",
    borderColor: "border-orange-200 dark:border-orange-800",
    icon: "☁️",
    website: "https://aws.amazon.com/ses",
    features: ["High volume", "Enterprise SLA", "Global infrastructure"],
    priority: 3,
    emailTypes: ["Bulk", "Failover", "High volume"],
  },
  mailersend: {
    name: "MailerSend",
    description: "Transactional email delivery",
    color: "from-emerald-500 to-green-600",
    lightColor: "bg-emerald-50 dark:bg-emerald-900/20",
    textColor: "text-emerald-700 dark:text-emerald-400",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    icon: "📬",
    website: "https://mailersend.com",
    features: ["Inbound parsing", "Email templates", "Webhooks"],
    priority: 4,
    emailTypes: ["Transactional", "Notifications"],
  },
};

const ROUTING_RULES = [
  {
    id: 1,
    condition: "Email type = authentication",
    action: "Route to Resend",
    priority: "Critical",
    icon: Shield,
    color: "text-zinc-600 dark:text-zinc-400",
    bgColor: "bg-zinc-100 dark:bg-zinc-800/50",
  },
  {
    id: 2,
    condition: "Email type = newsletter or marketing",
    action: "Route to Brevo",
    priority: "Normal",
    icon: Mail,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    id: 3,
    condition: "Primary provider quota < 10%",
    action: "Failover to AWS SES",
    priority: "High",
    icon: Zap,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  {
    id: 4,
    condition: "All quotas exhausted",
    action: "Queue for next day",
    priority: "Fallback",
    icon: Clock,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function ProvidersTab({ providerHealth }: { providerHealth: ProviderHealth[] }) {
  const [smartRouting, setSmartRouting] = useState(true);

  // Use provided health or defaults
  const providers = providerHealth.length > 0 ? providerHealth : defaultProviderHealth;

  return (
    <TooltipProvider>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header Stats */}
        <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickStat
            label="Total Providers"
            value="4"
            icon={<Server className="h-4 w-4" />}
            color="blue"
          />
          <QuickStat
            label="Healthy"
            value={providers.filter((p) => p.status === "healthy").length.toString()}
            icon={<CheckCircle2 className="h-4 w-4" />}
            color="emerald"
          />
          <QuickStat
            label="Avg. Latency"
            value={`${Math.round(providers.reduce((acc, p) => acc + p.avgLatencyMs, 0) / providers.length)}ms`}
            icon={<Activity className="h-4 w-4" />}
            color="violet"
          />
          <QuickStat
            label="Total Capacity"
            value={providers.reduce((acc, p) => acc + (p.dailyQuotaLimit || 0), 0).toLocaleString()}
            icon={<TrendingUp className="h-4 w-4" />}
            color="amber"
          />
        </motion.div>

        {/* Provider Cards Grid */}
        <motion.div variants={item}>
          <div className="grid md:grid-cols-2 gap-6">
            {providers.map((provider, index) => (
              <ProviderDetailCard key={provider.provider} provider={provider} index={index} />
            ))}
          </div>
        </motion.div>

        {/* Smart Routing Section */}
        <motion.div variants={item}>
          <Card className="border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Smart Routing Engine</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Automatic provider selection based on rules
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    AI-Optimized
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Enabled</span>
                    <Switch checked={smartRouting} onCheckedChange={setSmartRouting} />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {ROUTING_RULES.map((rule, index) => (
                  <motion.div
                    key={rule.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <RoutingRuleCard rule={rule} />
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Configuration Section */}
        <motion.div variants={item}>
          <Card className="border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2.5 text-muted-foreground">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Provider Configuration</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Priority and email type assignments
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(PROVIDER_CONFIG).map(([key, config]) => (
                  <ConfigCard key={key} config={config} />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function QuickStat({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "blue" | "emerald" | "violet" | "amber";
}) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card/50">
      <div className={cn("rounded-lg p-2", colors[color])}>{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function ProviderDetailCard({ provider, index }: { provider: ProviderHealth; index: number }) {
  const config = PROVIDER_CONFIG[provider.provider] || PROVIDER_CONFIG.resend;
  const quotaPercent = provider.dailyQuotaLimit
    ? Math.round(((provider.dailyQuotaUsed || 0) / provider.dailyQuotaLimit) * 100)
    : 0;

  const statusConfig = {
    healthy: {
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      label: "Healthy",
    },
    degraded: {
      icon: AlertTriangle,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
      label: "Degraded",
    },
    down: {
      icon: XCircle,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10",
      label: "Down",
    },
  };

  const status = statusConfig[provider.status];
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card
        className={cn(
          "group relative overflow-hidden border-border/50 hover:shadow-xl hover:shadow-black/5 transition-all duration-300",
          "bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm"
        )}
      >
        {/* Gradient overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-[0.03] group-hover:opacity-[0.06] transition-opacity",
            config.color
          )}
        />

        <CardContent className="p-6 relative">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex items-center justify-center h-14 w-14 rounded-2xl text-2xl",
                  config.lightColor
                )}
              >
                {config.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{config.name}</h3>
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full", status.bg)}
                >
                  <StatusIcon className={cn("h-3.5 w-3.5", status.color)} />
                  <span className={cn("text-xs font-medium", status.color)}>{status.label}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Provider status: {status.label}</TooltipContent>
            </Tooltip>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Health</p>
              <p className="text-2xl font-bold">{provider.healthScore}%</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Success</p>
              <p className="text-2xl font-bold">{provider.successRate}%</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Latency</p>
              <p className="text-2xl font-bold">
                {provider.avgLatencyMs}
                <span className="text-sm font-normal">ms</span>
              </p>
            </div>
          </div>

          {/* Quota Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Daily Quota</span>
              <span className="text-sm tabular-nums">
                <span className="font-semibold">
                  {(provider.dailyQuotaUsed || 0).toLocaleString()}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  / {(provider.dailyQuotaLimit || 0).toLocaleString()}
                </span>
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-muted/50 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(quotaPercent, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: index * 0.2 }}
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r",
                  quotaPercent > 90
                    ? "from-rose-500 to-rose-600"
                    : quotaPercent > 70
                      ? "from-amber-500 to-amber-600"
                      : config.color
                )}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{quotaPercent}% used</span>
              <span>
                {(
                  (provider.dailyQuotaLimit || 0) - (provider.dailyQuotaUsed || 0)
                ).toLocaleString()}{" "}
                remaining
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
            <div className="flex gap-1">
              {config.features.slice(0, 2).map((feature) => (
                <Badge key={feature} variant="secondary" className="text-[10px] px-2 py-0.5">
                  {feature}
                </Badge>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" asChild>
              <a href={config.website} target="_blank" rel="noopener noreferrer">
                Dashboard
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RoutingRuleCard({ rule }: { rule: (typeof ROUTING_RULES)[0] }) {
  const Icon = rule.icon;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors">
      <div className={cn("rounded-lg p-2", rule.bgColor)}>
        <Icon className={cn("h-4 w-4", rule.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{rule.condition}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{rule.action}</span>
        </div>
      </div>
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] px-2",
          rule.priority === "Critical" &&
            "border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300",
          rule.priority === "High" &&
            "border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-300",
          rule.priority === "Normal" &&
            "border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300",
          rule.priority === "Fallback" &&
            "border-rose-300 text-rose-700 dark:border-rose-600 dark:text-rose-300"
        )}
      >
        {rule.priority}
      </Badge>
    </div>
  );
}

function ConfigCard({
  config,
}: {
  config: (typeof PROVIDER_CONFIG)[keyof typeof PROVIDER_CONFIG];
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors hover:bg-muted/20",
        config.borderColor
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <span className="font-medium text-sm">{config.name}</span>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          P{config.priority}
        </Badge>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Handles:</p>
        <div className="flex flex-wrap gap-1">
          {config.emailTypes.map((type) => (
            <Badge key={type} variant="outline" className="text-[10px] px-1.5 py-0">
              {type}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

const defaultProviderHealth: ProviderHealth[] = [
  {
    provider: "resend",
    healthScore: 100,
    successRate: 100,
    avgLatencyMs: 0,
    totalRequests: 0,
    status: "healthy",
    dailyQuotaUsed: 0,
    dailyQuotaLimit: 100,
  },
  {
    provider: "brevo",
    healthScore: 100,
    successRate: 100,
    avgLatencyMs: 0,
    totalRequests: 0,
    status: "healthy",
    dailyQuotaUsed: 0,
    dailyQuotaLimit: 300,
  },
  {
    provider: "aws_ses",
    healthScore: 100,
    successRate: 100,
    avgLatencyMs: 0,
    totalRequests: 0,
    status: "healthy",
    dailyQuotaUsed: 0,
    dailyQuotaLimit: 50000,
  },
  {
    provider: "mailersend",
    healthScore: 100,
    successRate: 100,
    avgLatencyMs: 0,
    totalRequests: 0,
    status: "healthy",
    dailyQuotaUsed: 0,
    dailyQuotaLimit: 400,
  },
];

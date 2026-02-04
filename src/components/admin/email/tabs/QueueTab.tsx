"use client";

/**
 * QueueTab - Email Queue Monitoring
 *
 * Features:
 * - Real-time queue status
 * - Retry management
 * - Dead letter queue visibility
 * - Circuit breaker state
 */

import { motion } from "framer-motion";
import {
  Inbox,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  Activity,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CircuitBreakerState, QueueStats } from "@/lib/data/admin-email";

interface QueueTabProps {
  queueStats: QueueStats;
  circuitBreakers: CircuitBreakerState[];
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export function QueueTab({ queueStats, circuitBreakers }: QueueTabProps) {
  const totalInQueue = queueStats.pending + queueStats.processing + queueStats.failed;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Queue Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div variants={item}>
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="Pending"
            value={queueStats.pending}
            color="amber"
            description="Waiting to send"
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            icon={<Activity className="h-5 w-5" />}
            label="Processing"
            value={queueStats.processing}
            color="blue"
            description="Currently sending"
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Failed"
            value={queueStats.failed}
            color="rose"
            description="Will retry"
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            icon={<XCircle className="h-5 w-5" />}
            label="Dead Letter"
            value={queueStats.deadLetter}
            color="slate"
            description="Permanent failures"
          />
        </motion.div>
      </div>

      {/* Circuit Breaker Status */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2 bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Circuit Breakers</CardTitle>
                  <p className="text-xs text-muted-foreground">Provider resilience protection</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {circuitBreakers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No circuit breaker data available
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {circuitBreakers.map((cb) => (
                  <CircuitBreakerCard key={cb.provider} breaker={cb} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Queue Health Overview */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2 bg-emerald-500/10">
                  <Inbox className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Queue Health</CardTitle>
                  <p className="text-xs text-muted-foreground">{totalInQueue} emails in queue</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Failed
                </Button>
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear DLQ
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Progress breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Queue Distribution</span>
                  <span className="font-medium">{totalInQueue} total</span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden bg-muted/50">
                  {queueStats.pending > 0 && (
                    <div
                      className="bg-amber-500 transition-all"
                      style={{
                        width: `${totalInQueue > 0 ? (queueStats.pending / totalInQueue) * 100 : 0}%`,
                      }}
                    />
                  )}
                  {queueStats.processing > 0 && (
                    <div
                      className="bg-blue-500 transition-all"
                      style={{
                        width: `${totalInQueue > 0 ? (queueStats.processing / totalInQueue) * 100 : 0}%`,
                      }}
                    />
                  )}
                  {queueStats.failed > 0 && (
                    <div
                      className="bg-rose-500 transition-all"
                      style={{
                        width: `${totalInQueue > 0 ? (queueStats.failed / totalInQueue) * 100 : 0}%`,
                      }}
                    />
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-muted-foreground">Pending</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-muted-foreground">Processing</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-rose-500" />
                    <span className="text-muted-foreground">Failed</span>
                  </div>
                </div>
              </div>

              {/* Today's stats */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completed today</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="font-semibold">{queueStats.completed}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "amber" | "blue" | "rose" | "slate" | "emerald";
  description: string;
}) {
  const colorConfig = {
    amber: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-800",
    },
    blue: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800",
    },
    rose: {
      bg: "bg-rose-50 dark:bg-rose-950/30",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-200 dark:border-rose-800",
    },
    slate: {
      bg: "bg-slate-50 dark:bg-slate-950/30",
      text: "text-slate-600 dark:text-slate-400",
      border: "border-slate-200 dark:border-slate-800",
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-800",
    },
  };

  const config = colorConfig[color];

  return (
    <Card className={cn("border", config.border)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("rounded-lg p-2", config.bg, config.text)}>{icon}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-[10px] text-muted-foreground truncate">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CircuitBreakerCard({ breaker }: { breaker: CircuitBreakerState }) {
  const stateConfig = {
    closed: {
      label: "Closed",
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      icon: CheckCircle2,
      description: "Normal operation",
    },
    open: {
      label: "Open",
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-100 dark:bg-rose-900/30",
      icon: XCircle,
      description: "Provider blocked",
    },
    half_open: {
      label: "Half Open",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/30",
      icon: AlertTriangle,
      description: "Testing recovery",
    },
  };

  const config = stateConfig[breaker.state];
  const Icon = config.icon;

  const providerNames: Record<string, string> = {
    resend: "Resend",
    brevo: "Brevo",
    aws_ses: "AWS SES",
    mailersend: "MailerSend",
  };

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{providerNames[breaker.provider]}</span>
        <Badge variant="outline" className={cn("text-[10px] px-1.5", config.color)}>
          <Icon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Failures</p>
          <p className="font-semibold">{breaker.failureCount}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Successes</p>
          <p className="font-semibold">{breaker.successCount}</p>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">{config.description}</p>
    </div>
  );
}

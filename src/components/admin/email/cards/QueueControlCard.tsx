"use client";

/**
 * QueueControlCard - Admin controls for automation email queue
 */

import React, { useState, useTransition, useEffect } from "react";
import { Clock, Play, RefreshCw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActionToast } from "@/hooks/useActionToast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface QueueControlCardProps {
  onRefresh: () => void;
}

export function QueueControlCard({ onRefresh }: QueueControlCardProps) {
  const [isPending, startTransition] = useTransition();
  const [actionType, setActionType] = useState<"process" | "cancel" | "retry" | null>(null);
  const [queueStats, setQueueStats] = useState<{
    pending: number;
    processing: number;
    sent: number;
    failed: number;
  } | null>(null);
  const toast = useActionToast();

  useEffect(() => {
    const loadStats = async (): Promise<void> => {
      const { getQueueStatus } = await import("@/app/actions/automations");
      const result = await getQueueStatus();
      if (result.success) {
        setQueueStats(result.data);
      }
    };
    loadStats();
  }, []);

  const handleProcessNow = (): void => {
    setActionType("process");
    startTransition(async () => {
      const { triggerQueueProcessing } = await import("@/app/actions/automations");
      const result = await triggerQueueProcessing();
      if (result.success) {
        toast.success("Queue processed", result.data.message);
        const { getQueueStatus } = await import("@/app/actions/automations");
        const statsResult = await getQueueStatus();
        if (statsResult.success) setQueueStats(statsResult.data);
      } else {
        const errorMsg = typeof result.error === "string" ? result.error : result.error?.message;
        toast.error("Processing failed", errorMsg);
      }
      onRefresh();
      setActionType(null);
    });
  };

  const handleCancelPending = (): void => {
    if (!confirm("Cancel all pending automation emails? This cannot be undone.")) return;
    setActionType("cancel");
    startTransition(async () => {
      const { cancelPendingEmails } = await import("@/app/actions/automations");
      const result = await cancelPendingEmails();
      if (result.success) {
        toast.success("Emails cancelled", `${result.data.cancelled} pending emails cancelled`);
        const { getQueueStatus } = await import("@/app/actions/automations");
        const statsResult = await getQueueStatus();
        if (statsResult.success) setQueueStats(statsResult.data);
      } else {
        const errorMsg = typeof result.error === "string" ? result.error : result.error?.message;
        toast.error("Cancel failed", errorMsg);
      }
      onRefresh();
      setActionType(null);
    });
  };

  const handleRetryFailed = (): void => {
    setActionType("retry");
    startTransition(async () => {
      const { retryFailedEmails } = await import("@/app/actions/automations");
      const result = await retryFailedEmails();
      if (result.success) {
        toast.success("Emails queued for retry", `${result.data.retried} emails will be retried`);
        const { getQueueStatus } = await import("@/app/actions/automations");
        const statsResult = await getQueueStatus();
        if (statsResult.success) setQueueStats(statsResult.data);
      } else {
        const errorMsg = typeof result.error === "string" ? result.error : result.error?.message;
        toast.error("Retry failed", errorMsg);
      }
      onRefresh();
      setActionType(null);
    });
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            Queue Control
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Cron: Every 5 min
          </Badge>
        </div>
        <CardDescription>Manage the automation email queue</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 rounded-lg bg-amber-500/10">
            <p className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {queueStats?.pending ?? "-"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Pending</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-blue-500/10">
            <p className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">
              {queueStats?.processing ?? "-"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Processing</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-emerald-500/10">
            <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {queueStats?.sent ?? "-"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Sent</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-rose-500/10">
            <p className="text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400">
              {queueStats?.failed ?? "-"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Failed</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleProcessNow}
                disabled={isPending}
              >
                {actionType === "process" ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Process Now
              </Button>
            </TooltipTrigger>
            <TooltipContent>Manually trigger queue processing</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleRetryFailed}
                disabled={isPending || !queueStats?.failed}
              >
                {actionType === "retry" ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Retry Failed
              </Button>
            </TooltipTrigger>
            <TooltipContent>Retry all failed emails</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10")}
                onClick={handleCancelPending}
                disabled={isPending || !queueStats?.pending}
              >
                {actionType === "cancel" ? (
                  <div className="h-4 w-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Cancel Pending
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cancel all pending emails</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { triggerAnalyticsSync } from "@/app/actions/analytics";

interface SyncStatusBadgeProps {
  lastSyncAt?: string | null;
  onSyncComplete?: () => void;
}

export function SyncStatusBadge({ lastSyncAt, onSyncComplete }: SyncStatusBadgeProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<"success" | "error" | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const result = await triggerAnalyticsSync("incremental");
      if (result.success) {
        setSyncResult("success");
        onSyncComplete?.();
      } else {
        setSyncResult("error");
      }
    } catch {
      setSyncResult("error");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 3000);
    }
  };

  const getTimeSince = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm">
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
            syncResult === "success" && "bg-emerald-500/10 text-emerald-500",
            syncResult === "error" && "bg-rose-500/10 text-rose-500",
            !syncResult && "bg-muted text-muted-foreground"
          )}
        >
          {syncResult === "success" ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : syncResult === "error" ? (
            <AlertCircle className="w-3.5 h-3.5" />
          ) : (
            <Clock className="w-3.5 h-3.5" />
          )}
          <span>
            {syncResult === "success"
              ? "Synced"
              : syncResult === "error"
                ? "Failed"
                : getTimeSince(lastSyncAt)}
          </span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleSync}
        disabled={syncing}
        title="Sync analytics data"
      >
        <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
      </Button>
    </div>
  );
}

"use client";

import { Bell, BellOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { cn } from "@/lib/utils";

interface PushNotificationToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function PushNotificationToggle({
  className,
  showLabel = true,
}: PushNotificationToggleProps) {
  const { permission, isSubscribed, isLoading, error, subscribe, unsubscribe } =
    usePushNotifications();

  if (permission === "unsupported") {
    return null; // Don't show on unsupported browsers
  }

  const handleClick = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant={isSubscribed ? "default" : "outline"}
        size={showLabel ? "default" : "icon"}
        onClick={handleClick}
        disabled={isLoading || permission === "denied"}
        aria-label={
          permission === "denied"
            ? "Notifications blocked in browser settings"
            : isSubscribed
              ? "Disable push notifications"
              : "Enable push notifications"
        }
        aria-pressed={isSubscribed}
      >
        {isSubscribed ? (
          <Bell className={cn("h-4 w-4", showLabel && "mr-2")} aria-hidden="true" />
        ) : (
          <BellOff className={cn("h-4 w-4", showLabel && "mr-2")} aria-hidden="true" />
        )}
        {showLabel && (isSubscribed ? "Notifications On" : "Enable Notifications")}
      </Button>

      {error && <span className="text-sm text-destructive">{error}</span>}

      {permission === "denied" && showLabel && (
        <span className="text-sm text-muted-foreground">Blocked in browser settings</span>
      )}
    </div>
  );
}

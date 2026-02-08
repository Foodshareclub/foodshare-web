"use client";

import type { FC } from "react";
import { useState } from "react";
import { AlertCircle, Info } from "lucide-react";
import type { PositionError, AccuracyLevel } from "@/hooks/usePosition";
import { Button } from "@/components/ui/button";

interface LocationPermissionBannerProps {
  error: PositionError | null;
  isLoading: boolean;
  accuracyLevel?: AccuracyLevel;
  onRetry?: () => void;
  showAccuracyInfo?: boolean;
}

export const LocationPermissionBanner: FC<LocationPermissionBannerProps> = ({
  error,
  isLoading,
  accuracyLevel,
  onRetry,
  showAccuracyInfo = true,
}) => {
  const [open, setOpen] = useState(false);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-md border border-blue-500/20 bg-blue-500/10 dark:bg-blue-500/5">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <p className="text-sm text-foreground">Detecting your location...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-md border border-orange-500/20 bg-orange-500/10 dark:bg-orange-500/5">
        <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-foreground mb-1">Location Access</h4>
          <p className="text-sm text-muted-foreground mb-2">{error.userFriendlyMessage}</p>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="border-orange-500/30 text-orange-700 dark:text-orange-400 hover:bg-orange-500/10"
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Show accuracy level info (GDPR transparency)
  if (showAccuracyInfo && accuracyLevel) {
    const accuracyInfo = {
      precise: {
        icon: "🎯",
        text: "Precise location",
        description: "Accurate to within 50 meters",
        color: "green",
      },
      approximate: {
        icon: "📍",
        text: "Approximate location",
        description: "Accurate to within 1 kilometer",
        color: "blue",
      },
      "city-level": {
        icon: "🌆",
        text: "City-level location",
        description: "Based on your IP address",
        color: "orange",
      },
    };

    const info = accuracyInfo[accuracyLevel];

    return (
      <div className="flex items-start gap-3 p-4 rounded-md border border-blue-500/20 bg-blue-500/10 dark:bg-blue-500/5">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {info.icon} {info.text} detected
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setOpen(!open)}
              className="text-xs text-blue-700 dark:text-blue-400 hover:bg-blue-500/10"
            >
              {open ? "Hide" : "Why?"}
            </Button>
          </div>
          {open && (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">{info.description}</p>
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium mb-1 text-foreground">Privacy Notice</p>
                <p className="text-xs text-muted-foreground">
                  We use your location to show nearby food listings. Your location is only used for
                  this purpose and is not stored permanently. You can change or disable location
                  access at any time in your browser settings.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

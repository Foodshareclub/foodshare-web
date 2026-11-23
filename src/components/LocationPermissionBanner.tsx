"use client";

import { Button } from "@/components/ui/button";
import type { AccuracyLevel, PositionError } from "@/hooks/usePosition";
import { AlertCircle, Info } from "lucide-react";
import type { FC } from "react";
import { useState } from "react";

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
      <div className="flex items-center gap-3 p-4 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-xs">
        <Info className="w-5 h-5 text-brand flex-shrink-0" />
        <p className="text-sm text-foreground">Detecting your location...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-xs">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-foreground mb-1">Location Access</h4>
          <p className="text-sm text-muted-foreground mb-2">{error.userFriendlyMessage}</p>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="rounded-full text-xs font-semibold px-4 border border-border/80 hover:bg-muted/60 transition-all cursor-pointer"
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
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-xs">
        <Info className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {info.icon} {info.text} detected
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen(!open)}
              className="rounded-full text-xs font-semibold px-3 py-1 border border-border/80 hover:bg-muted/60 transition-all cursor-pointer"
            >
              {open ? "Hide" : "Why?"}
            </Button>
          </div>
          {open && (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">{info.description}</p>
              <div className="p-3 bg-muted/60 rounded-xl border border-border/60">
                <p className="font-medium mb-1 text-foreground">Privacy Notice</p>
                <p className="text-xs text-muted-foreground">
                  We use your location to show nearby food listings. Your location is only used for this purpose and is
                  not stored permanently. You can change or disable location access at any time in your browser
                  settings.
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

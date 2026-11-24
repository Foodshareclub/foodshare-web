"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Crosshair, MapPin, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FC, useState } from "react";

interface LocationStatusBannerProps {
  isApproximate: boolean;
  city?: string;
  onUpgradeLocation: () => Promise<void> | void;
  isUpgrading?: boolean;
  className?: string;
}

export const LocationStatusBanner: FC<LocationStatusBannerProps> = ({
  isApproximate,
  city,
  onUpgradeLocation,
  isUpgrading = false,
  className,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const t = useTranslations();

  // If dismissed or location is not approximate, don't show the banner
  if (dismissed || !isApproximate) {
    return null;
  }

  const locationText = city
    ? `Showing listings near ${city} (approximate network location)`
    : "Showing listings near your approximate network location";

  return (
    <aside
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2 text-sm text-foreground transition-all duration-200 mb-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="truncate font-medium">{locationText}</span>
      </div>
      <div className="flex items-center gap-2 ms-auto shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onUpgradeLocation()}
          disabled={isUpgrading}
          className="h-7 px-2.5 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <Crosshair className={cn("h-3.5 w-3.5", isUpgrading && "animate-spin")} aria-hidden="true" />
          {isUpgrading ? "Locating..." : "Use exact location"}
        </Button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label={t("close")}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
};

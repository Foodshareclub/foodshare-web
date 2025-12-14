"use client";

/**
 * LocationFilter Component
 *
 * Toggle for enabling location-based filtering of posts.
 * Shows radius selector when enabled.
 */

import { useState, useTransition } from "react";
import { MapPin, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useLocationFilter } from "@/hooks/useLocationFilter";

interface LocationFilterProps {
  onLocationChange?: (
    params: {
      latitude: number;
      longitude: number;
      radiusMeters: number;
    } | null
  ) => void;
  className?: string;
}

const RADIUS_OPTIONS = [1, 2, 5, 10, 25, 50, 100]; // km

export function LocationFilter({ onLocationChange, className }: LocationFilterProps) {
  const {
    latitude,
    longitude,
    radiusMeters,
    isEnabled,
    isLoading,
    error,
    requestLocation,
    setEnabled,
    setRadiusKm,
    clearLocation,
  } = useLocationFilter();

  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const radiusKm = Math.round(radiusMeters / 1000);

  // Notify parent when location changes
  const handleToggle = () => {
    if (isEnabled) {
      // Disable
      setEnabled(false);
      onLocationChange?.(null);
    } else {
      // Enable - request location
      requestLocation();
    }
  };

  // When location becomes available, notify parent
  const handleLocationReady = () => {
    if (latitude && longitude) {
      startTransition(() => {
        onLocationChange?.({ latitude, longitude, radiusMeters });
      });
    }
  };

  // Update radius and notify parent
  const handleRadiusChange = (value: number[]) => {
    const newRadiusKm = value[0];
    setRadiusKm(newRadiusKm);
    if (latitude && longitude) {
      startTransition(() => {
        onLocationChange?.({
          latitude,
          longitude,
          radiusMeters: newRadiusKm * 1000,
        });
      });
    }
  };

  // Effect: notify parent when location first becomes available
  if (isEnabled && latitude && longitude && !isPending) {
    handleLocationReady();
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={isEnabled ? "default" : "outline"}
            size="sm"
            className={cn("gap-2", isEnabled && "bg-primary text-primary-foreground")}
            onClick={(e) => {
              if (!isEnabled) {
                e.preventDefault();
                handleToggle();
              }
            }}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            {isEnabled ? `${radiusKm} km` : "Nearby"}
          </Button>
        </PopoverTrigger>

        {isEnabled && (
          <PopoverContent className="w-72" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Search radius</h4>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    clearLocation();
                    onLocationChange?.(null);
                    setIsOpen(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Slider
                  value={[radiusKm]}
                  onValueChange={handleRadiusChange}
                  min={1}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 km</span>
                  <span className="font-medium text-foreground">{radiusKm} km</span>
                  <span>100 km</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {RADIUS_OPTIONS.map((km) => (
                  <Button
                    key={km}
                    variant={radiusKm === km ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleRadiusChange([km])}
                  >
                    {km} km
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        )}
      </Popover>

      {error && !isEnabled && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

export default LocationFilter;

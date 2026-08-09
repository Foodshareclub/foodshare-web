"use client";

import React from "react";
import { MapPin, Clock, Train, Tag } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RequiredStar } from "@/components";
import { dietaryOptions, MAX_TAGS } from "../constants";
import { TagInput, CollapsibleSection } from "../components";

interface LocationPickupStepProps {
  address: string;
  onAddressChange: (address: string) => void;
  time: string;
  onTimeChange: (time: string) => void;
  metroStation: string;
  onMetroStationChange: (metroStation: string) => void;
  tags: string[];
  onTagsChange: React.Dispatch<React.SetStateAction<string[]>>;
  dietary: string[];
  onDietaryToggle: (option: string) => void;
  showAddressError?: boolean;
}

export function LocationPickupStep({
  address,
  onAddressChange,
  time,
  onTimeChange,
  metroStation,
  onMetroStationChange,
  tags,
  onTagsChange,
  dietary,
  onDietaryToggle,
  showAddressError,
}: LocationPickupStepProps) {
  return (
    <div className="space-y-4">
      {/* Pickup Location */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          Pickup Location
          <RequiredStar />
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="Address or general area..."
            className={`pl-9 ${showAddressError ? "border-destructive" : ""}`}
          />
        </div>
      </div>

      {/* Pickup Availability Times & Transport */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Pickup Times</Label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
              placeholder="e.g. Weekdays 5-8pm"
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Nearest Transit</Label>
          <div className="relative">
            <Train className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={metroStation}
              onChange={(e) => onMetroStationChange(e.target.value)}
              placeholder="e.g. Central Station"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Dietary Badges & Tags */}
      <CollapsibleSection
        title="Dietary & Search Tags"
        icon={<Tag className="h-4 w-4 text-muted-foreground" />}
        defaultOpen={false}
      >
        <div className="space-y-3 pt-2">
          {/* Dietary Options */}
          <div className="space-y-1.5">
            <Label className="text-xs">Dietary Info</Label>
            <div className="flex flex-wrap gap-1.5">
              {dietaryOptions.map((opt) => {
                const isSelected = dietary.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onDietaryToggle(opt.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Search Tags ({tags.length}/{MAX_TAGS})
            </Label>
            <TagInput tags={tags} onTagsChange={onTagsChange} maxTags={MAX_TAGS} />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

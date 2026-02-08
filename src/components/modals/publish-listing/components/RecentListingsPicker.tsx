"use client";

import React, { useState } from "react";
import { Copy, History, X } from "lucide-react";
import { RECENT_LISTINGS_KEY } from "../constants";
import type { RecentListing } from "../types";

interface RecentListingsPickerProps {
  onSelect: (listing: RecentListing) => void;
  onClose: () => void;
}

export const RecentListingsPicker: React.FC<RecentListingsPickerProps> = ({
  onSelect,
  onClose,
}) => {
  const [recentListings] = useState<RecentListing[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_LISTINGS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Invalid data
    }
    return [];
  });

  if (recentListings.length === 0) {
    return (
      <div className="p-3 rounded-lg bg-muted/50 text-center">
        <History className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No recent listings</p>
        <p className="text-xs text-muted-foreground/70">Your published listings will appear here</p>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-muted/50 space-y-2 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          Copy from Recent
        </p>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {recentListings.map((listing) => (
          <button
            key={listing.id}
            type="button"
            onClick={() => onSelect(listing)}
            className="w-full flex items-center gap-2 p-2 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{listing.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {listing.description.slice(0, 50)}...
              </p>
            </div>
            <Copy className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

"use client";

import React from "react";
import { Loader2, Sparkles, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

interface PublishListingFooterProps {
  isEditing: boolean;
  isLoading: boolean;
  isFormValid: boolean;
  imageCount: number;
  scheduledDate?: string;
  onPublish: () => void;
  onClose: () => void;
  onOpenDeleteModal?: () => void;
}

export function PublishListingFooter({
  isEditing,
  isLoading,
  isFormValid,
  imageCount,
  scheduledDate,
  onPublish,
  onClose,
  onOpenDeleteModal,
}: PublishListingFooterProps) {
  const isSubmitDisabled = isLoading || !isFormValid || imageCount === 0;

  return (
    <DialogFooter className="flex-shrink-0 pt-4 border-t flex flex-row items-center justify-between gap-2">
      <div>
        {isEditing && onOpenDeleteModal && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenDeleteModal}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onPublish}
          disabled={isSubmitDisabled}
          className="min-w-[120px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isEditing ? "Saving..." : "Publishing..."}
            </>
          ) : isEditing ? (
            "Save Changes"
          ) : scheduledDate ? (
            <>
              <Calendar className="h-4 w-4 mr-1.5" />
              Schedule
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-1.5" />
              Publish Now
            </>
          )}
        </Button>
      </div>
    </DialogFooter>
  );
}

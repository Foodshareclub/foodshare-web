"use client";

/**
 * ProductCardActions - Thin client wrapper for interactive elements
 * Contains auth-dependent action buttons (Like, Edit, Delete, Report)
 */

import { togglePostLike } from "@/app/actions/post-engagement";
import { ReportPostDialog } from "@/components/reports";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { InitialProductStateType } from "@/types/product.types";
import { gpu120Interactive } from "@/utils/gpuStyles";
import { Flag, Heart, Pencil } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

// Lazy load the heavy modal (3000+ lines)
const PublishListingModal = dynamic(() => import("@/components/modals/PublishListingModal"), {
  ssr: false,
});

/** 32px translucent round button over the photo; the pseudo-element pads the hit area to 44px. */
const ACTION_BUTTON =
  "relative flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur-xs transition-transform duration-150 after:absolute after:-inset-1.5 after:content-[''] hover:scale-105 hover:bg-background active:scale-95 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-ring";
type ProductCardActionsProps = {
  product: InitialProductStateType;
};

export function ProductCardActions({ product }: ProductCardActionsProps) {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const userId = user?.id;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false); // Default false unless we fetch batch status
  const [isPending, startTransition] = useTransition();

  const isOwner = userId === product.profile_id;
  const canReport = userId && userId !== product.profile_id && !isAdmin;
  const canEdit = isOwner || isAdmin;

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to the product detail page
    e.stopPropagation();

    if (!userId) {
      router.push("/auth/login");
      return;
    }

    // Optimistic toggle
    setIsLiked((prev) => !prev);

    startTransition(async () => {
      const result = await togglePostLike(product.id);
      if (!result.success) {
        setIsLiked((prev) => !prev); // Revert on failure
      } else {
        setIsLiked(result.data.isLiked);
      }
    });
  };

  return (
    <div className="absolute top-3 inset-e-3 z-10 flex gap-2">
      {/* Universal Like Button (Airbnb style) */}
      <button
        type="button"
        onClick={handleLike}
        disabled={isPending}
        className={ACTION_BUTTON}
        aria-label="Save listing"
        aria-pressed={isLiked}
        style={gpu120Interactive}
      >
        <Heart
          className={cn(
            "size-[18px] motion-safe:transition-all motion-safe:duration-200",
            isLiked ? "fill-brand text-brand scale-110" : "text-foreground/80 hover:text-foreground",
          )}
        />
      </button>

      {/* Report button */}
      {canReport && (
        <ReportPostDialog
          postId={product.id}
          postName={product.post_name}
          trigger={
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className={ACTION_BUTTON}
              aria-label="report"
              style={gpu120Interactive}
            >
              <Flag className="h-[18px] w-[18px] text-foreground" />
            </button>
          }
        />
      )}

      {/* Edit/Delete buttons */}
      {canEdit && (
        <>
          <button
            type="button"
            className={ACTION_BUTTON}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsEditOpen(true);
            }}
            aria-label="update"
            style={gpu120Interactive}
          >
            <Pencil className="size-4" />
          </button>
          {isEditOpen && (
            <PublishListingModal
              product={product}
              isOpen={isEditOpen}
              onClose={() => setIsEditOpen(false)}
              setOpenEdit={setIsEditOpen}
            />
          )}
        </>
      )}
    </div>
  );
}

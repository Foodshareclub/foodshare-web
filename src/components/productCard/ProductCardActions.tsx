"use client";

/**
 * ProductCardActions - Thin client wrapper for interactive elements
 * Contains auth-dependent action buttons (Like, Edit, Delete, Report)
 */

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Flag, Heart } from "lucide-react";
import { EditIcon } from "@/utils/icons";
import { useAuth } from "@/hooks/useAuth";
import { ReportPostDialog } from "@/components/reports";
import { togglePostLike } from "@/app/actions/post-engagement";
import { cn } from "@/lib/utils";
import type { InitialProductStateType } from "@/types/product.types";
import { gpu120Interactive } from "@/utils/gpuStyles";

// Lazy load the heavy modal (3000+ lines)
const PublishListingModal = dynamic(() => import("@/components/modals/PublishListingModal"), {
  ssr: false,
});

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
    <div className="absolute top-3 right-3 z-10 flex gap-2">
      {/* Universal Like Button (Airbnb style) */}
      <button
        onClick={handleLike}
        disabled={isPending}
        className="p-1 transition-transform duration-200 hover:scale-110 active:scale-95"
        aria-label="Save listing"
        style={gpu120Interactive}
      >
        <Heart
          className={cn(
            "h-[24px] w-[24px] transition-colors duration-200 stroke-2",
            isLiked ? "fill-[#FF385C] text-[#FF385C]" : "fill-black/50 text-white"
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="airbnb-action-btn airbnb-action-btn-hover"
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
            className="airbnb-action-btn airbnb-action-btn-hover"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsEditOpen(true);
            }}
            aria-label="update"
            style={gpu120Interactive}
          >
            <EditIcon />
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

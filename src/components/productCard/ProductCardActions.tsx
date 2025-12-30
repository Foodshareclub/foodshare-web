"use client";

/**
 * ProductCardActions - Thin client wrapper for interactive elements
 * Contains only the auth-dependent action buttons and modal state
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import { Flag } from "lucide-react";
import { DeleteIcon, EditIcon } from "@/utils/icons";
import { useAuth } from "@/hooks/useAuth";
import DeleteCardModal from "@/components/modals/DeleteCardModal";
import { ReportPostDialog } from "@/components/reports";
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
  const { user, isAdmin } = useAuth();
  const userId = user?.id;
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const isOwner = userId === product.profile_id;
  const canReport = userId && userId !== product.profile_id && !isAdmin;
  const canEdit = isOwner || isAdmin;

  // Don't render anything if no actions available
  if (!canReport && !canEdit) return null;

  return (
    <div className="absolute top-3 right-3 z-10 flex gap-2">
      {/* Report button */}
      {canReport && (
        <ReportPostDialog
          postId={product.id}
          postName={product.post_name}
          trigger={
            <button
              className="airbnb-action-btn airbnb-action-btn-hover"
              aria-label="report"
              style={gpu120Interactive}
            >
              <Flag className="h-4 w-4 text-foreground" />
            </button>
          }
        />
      )}

      {/* Edit/Delete buttons */}
      {canEdit && (
        <>
          <button
            className="airbnb-action-btn airbnb-action-btn-hover"
            onClick={() => setIsEditOpen(true)}
            aria-label="update"
            style={gpu120Interactive}
          >
            <EditIcon />
          </button>
          <PublishListingModal
            product={product}
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            setOpenEdit={setIsEditOpen}
          />
          <button
            className="airbnb-action-btn airbnb-action-btn-hover"
            onClick={() => setIsDeleteOpen(true)}
            aria-label="delete"
            style={gpu120Interactive}
          >
            <DeleteIcon />
          </button>
          <DeleteCardModal
            product={product}
            onClose={() => setIsDeleteOpen(false)}
            isOpen={isDeleteOpen}
          />
        </>
      )}
    </div>
  );
}

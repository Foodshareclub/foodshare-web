"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Flag } from "lucide-react";

import { DeleteIcon, EditIcon } from "@/utils/icons";
import { getProductDetailUrl } from "@/utils/categoryMapping";
import { useAuth } from "@/hooks/useAuth";
import DeleteCardModal from "@/components/modals/DeleteCardModal";
import { ReportPostDialog } from "@/components/reports";
import type { InitialProductStateType } from "@/types/product.types";
import { gpu120Interactive, gpu120Image } from "@/utils/gpuStyles";
import { isValidImageUrl } from "@/lib/image";
import bus from "@/assets/busIcon.png";

// Lazy load the heavy modal (3000+ lines)
const PublishListingModal = dynamic(() => import("@/components/modals/PublishListingModal"), {
  ssr: false,
});

type ProductCardType = {
  product: InitialProductStateType;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
};

// React Compiler handles memoization automatically - no need for React.memo
export function ProductCard({ product, onMouseEnter, onMouseLeave }: ProductCardType) {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const userId = user?.id;
  const [isOpen, setIsOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Product detail URL - use category-specific path based on post_type
  const productUrl = getProductDetailUrl(product.post_type, product.id);

  // Prefetch on hover with debounce to avoid excessive prefetching
  const handleMouseEnter = () => {
    onMouseEnter?.();
    // Prefetch after 100ms hover to avoid prefetching on quick mouse movements
    prefetchTimeoutRef.current = setTimeout(() => {
      router.prefetch(productUrl);
    }, 100);
  };

  const handleMouseLeave = () => {
    onMouseLeave?.();
    // Cancel prefetch if mouse leaves quickly
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
      prefetchTimeoutRef.current = null;
    }
  };

  const onOpenEditModal = () => setOpenEdit(true);
  const onCloseEditModal = () => setOpenEdit(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

  return (
    <div className="col-span-1" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {/* Airbnb-style card: clean, minimal with subtle shadow and hover lift */}
      <div className="airbnb-card airbnb-card-hover relative">
        {/* Image section - Airbnb uses near-square 20:19 ratio */}
        <div className="relative airbnb-card-image">
          <div className="absolute top-3 right-3 z-10 flex gap-2">
            {/* Report button - Airbnb-style circular action button */}
            {userId && userId !== product.profile_id && !isAdmin && (
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
            {/* Edit/Delete buttons - visible to owner or admin */}
            {(userId === product.profile_id || isAdmin) && (
              <>
                <button
                  className="airbnb-action-btn airbnb-action-btn-hover"
                  onClick={onOpenEditModal}
                  aria-label="update"
                  style={gpu120Interactive}
                >
                  <EditIcon />
                </button>
                <PublishListingModal
                  product={product}
                  isOpen={openEdit}
                  onClose={onCloseEditModal}
                  setOpenEdit={setOpenEdit}
                />
                <button
                  className="airbnb-action-btn airbnb-action-btn-hover"
                  onClick={onOpen}
                  aria-label="delete"
                  style={gpu120Interactive}
                >
                  <DeleteIcon />
                </button>
                <DeleteCardModal product={product} onClose={onClose} isOpen={isOpen} />
              </>
            )}
          </div>
          <Link
            href={productUrl}
            className="relative w-full block cursor-pointer"
            style={{ aspectRatio: "20/19" }}
            prefetch={false}
          >
            {product.images && product.images.length > 0 && isValidImageUrl(product.images[0]) ? (
              <Image
                className="object-cover transition-transform duration-300 hover:scale-105"
                style={gpu120Image}
                src={product.images[0]}
                alt={`${product.post_name} - ${product.post_type} listing`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center">
                <span className="text-5xl">📦</span>
              </div>
            )}
          </Link>
        </div>

        {/* Content section - Airbnb-style typography with clean background */}
        <div className="p-3 pt-3 pb-4">
          <h3 className="text-card-title text-left font-body line-clamp-1">{product.post_name}</h3>
          <p className="text-card-body line-clamp-1 mt-1">{product.post_stripped_address}</p>
          <p className="text-card-small mt-1 line-clamp-1">
            <span className="text-card-body">Available:</span>{" "}
            <span className="text-card-body">{product.available_hours}</span>
          </p>
          <div className="flex gap-1 items-center mt-2">
            <div className="relative w-4 h-4 opacity-70">
              <Image src={bus} alt="bus" fill sizes="16px" className="object-contain" />
            </div>
            <p className="text-card-emphasis line-clamp-1">{product.transportation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

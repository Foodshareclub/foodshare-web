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
import { gpu120Card, gpu120Interactive, gpu120Image } from "@/utils/gpuStyles";
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
      <div
        className="relative rounded-[20px] overflow-hidden shadow-lg glass-fade-in gpu"
        style={gpu120Card}
      >
        {/* Image section */}
        <div className="relative">
          <div className="absolute top-2 right-2 z-10 flex items-end justify-end w-full gap-2">
            {/* Report button - visible to logged-in users who don't own the post */}
            {userId && userId !== product.profile_id && !isAdmin && (
              <ReportPostDialog
                postId={product.id}
                postName={product.post_name}
                trigger={
                  <button
                    className="bg-background/90 backdrop-blur-[10px] p-2 rounded-md border border-border card-button-hover hover:bg-background/95"
                    aria-label="report"
                    style={gpu120Interactive}
                  >
                    <Flag className="h-4 w-4 text-muted-foreground" />
                  </button>
                }
              />
            )}
            {/* Edit/Delete buttons - visible to owner or admin */}
            {(userId === product.profile_id || isAdmin) && (
              <>
                <button
                  className="bg-background/90 backdrop-blur-[10px] p-2 rounded-md border border-border card-button-hover hover:bg-background/95"
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
                  className="bg-background/90 backdrop-blur-[10px] p-2 rounded-md border border-border card-button-hover hover:bg-background/95"
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
            style={{ aspectRatio: "4/3" }}
            prefetch={false} // We handle prefetch manually on hover
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

        {/* Glassmorphic content section */}
        <div className="p-4 h-[140px] bg-card/70 backdrop-blur-xl backdrop-saturate-150 border-t border-border/20">
          <h3 className="text-xl font-semibold text-left font-body line-clamp-1 text-card-foreground">
            {product.post_name}
          </h3>
          <div className="flex pt-2 items-center">
            <p className="text-sm text-foreground/80 line-clamp-1">
              {product.post_stripped_address}
            </p>
          </div>
          <div className="flex pt-1">
            <p className="text-sm text-muted-foreground">Available:</p>
            <p className="ml-2 text-sm text-foreground/80 line-clamp-1">
              {product.available_hours}
            </p>
          </div>
          <div className="flex gap-[5px] items-center pt-1">
            <div className="relative w-5 h-5">
              <Image src={bus} alt="bus" fill sizes="20px" className="object-contain" />
            </div>
            <p className="text-sm text-foreground/80 line-clamp-1">{product.transportation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

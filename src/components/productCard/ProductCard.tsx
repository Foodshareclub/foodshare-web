'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';

import { DeleteIcon, EditIcon } from '@/utils/icons';
import { useAuth } from '@/hooks/useAuth';
import DeleteCardModal from '@/components/modals/DeleteCardModal';
import type { InitialProductStateType } from '@/types/product.types';
import { gpu120Card, gpu120Interactive, gpu120Image } from '@/utils/gpuStyles';
import { isValidImageUrl } from '@/lib/image';
import bus from '@/assets/busIcon.png';

// Lazy load the heavy modal (3000+ lines)
const PublishListingModal = dynamic(
  () => import("@/components/modals/PublishListingModal"),
  { ssr: false }
);

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

  // React Compiler optimizes these handlers automatically
  const onNavigateToOneProductHandler = () => {
    router.push(`/${product.post_type}/${product.id}`);
  };

  const onOpenEditModal = () => setOpenEdit(true);
  const onCloseEditModal = () => setOpenEdit(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

    return (
      <div className="col-span-1" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        <div
          className="relative rounded-[20px] overflow-hidden shadow-lg glass-fade-in glass-accelerated"
          style={gpu120Card}
        >
          {/* Image section */}
          <div className="relative">
            {(userId === product.profile_id || isAdmin) && (
              <div className="absolute top-2 right-2 z-10 flex items-end justify-end w-full">
                <button
                  className="bg-white/90 backdrop-blur-[10px] p-2 rounded-md border border-gray-200 transition-all hover:bg-white/95 hover:scale-105"
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
                  className="bg-white/90 backdrop-blur-[10px] p-2 rounded-md border border-gray-200 ml-4 transition-all hover:bg-white/95 hover:scale-105"
                  onClick={onOpen}
                  aria-label="delete"
                  style={gpu120Interactive}
                >
                  <DeleteIcon />
                </button>
                <DeleteCardModal product={product} onClose={onClose} isOpen={isOpen} />
              </div>
            )}
            <div
              className="relative w-full cursor-pointer"
              style={{ aspectRatio: "4/3" }}
              onClick={onNavigateToOneProductHandler}
            >
              {product.images && product.images.length > 0 && isValidImageUrl(product.images[0]) ? (
                <Image
                  className="object-cover transition-transform hover:scale-[1.02]"
                  style={gpu120Image}
                  src={product.images[0]}
                  alt={`${product.post_name} - ${product.post_type} listing`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                  <span className="text-5xl">📦</span>
                </div>
              )}
            </div>
          </div>

          {/* Glassmorphic content section */}
          <div className="p-4 h-[140px] bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl backdrop-saturate-150 border-t border-white/20 dark:border-white/10">
            <h3 className="text-xl font-semibold text-left font-body line-clamp-1 text-gray-900 dark:text-white">
              {product.post_name}
            </h3>
            <div className="flex pt-2 items-center">
              <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-1">
                {product.post_stripped_address}
              </p>
            </div>
            <div className="flex pt-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Available:
              </p>
              <p className="ml-2 text-sm text-gray-700 dark:text-gray-200 line-clamp-1">{product.available_hours}</p>
            </div>
            <div className="flex gap-[5px] items-center pt-1">
              <div className="relative w-5 h-5">
                <Image src={bus} alt="bus" fill sizes="20px" className="object-contain" />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-1">{product.transportation}</p>
            </div>
          </div>
        </div>
      </div>
    );
}

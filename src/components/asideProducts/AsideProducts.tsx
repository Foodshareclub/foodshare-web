"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { DeleteIcon } from "@/utils/icons";
import type { InitialProductStateType } from "@/types/product.types";

// Lazy load the heavy modal (3000+ lines)
const PublishListingModal = dynamic(() => import("@/components/modals/PublishListingModal"), {
  ssr: false,
});

type AsideProdType = {
  img: string;
  name: string;
  about: string;
  available: string;
  distance: string;
  height?: string;
  product?: InitialProductStateType;
  deleteProductHandler?: (productID: number) => void;
};

const AsideProducts: React.FC<AsideProdType> = ({
  product,
  img,
  name,
  about,
  available: _available,
  distance: _distance,
  deleteProductHandler,
}) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const goToProduct = () => {
    // All products use /food/[id] path
    router.push(`/food/${product?.id}`);
  };

  const deleteHandler = () => {
    if (deleteProductHandler) {
      deleteProductHandler(product?.id as number);
    }
  };

  return (
    <div className="glass flex flex-col lg:flex-row overflow-hidden mt-4 mx-2 cursor-pointer rounded-2xl p-2 gpu">
      <img
        className="rounded-xl object-cover p-2 h-[150px] min-w-[150px]"
        src={img}
        alt="profile img"
        onClick={goToProduct}
        loading="lazy"
        decoding="async"
      />

      <div className="flex-1 self-center p-4" onClick={goToProduct}>
        <h2 className="text-2xl font-medium text-center line-clamp-1 font-body">{name}</h2>
        <p className="text-center line-clamp-1 text-muted-foreground text-sm uppercase">{about}</p>
      </div>

      {pathname === "/user-listings" && (
        <div className="self-center flex gap-2 p-4">
          <PublishListingModal isOpen={isOpen} onClose={() => setIsOpen(false)} product={product} />
          <button
            onClick={deleteHandler}
            className="ml-4 p-2 rounded-lg border border-border bg-background/20 backdrop-blur-md hover:bg-background/30 hover:scale-105 transition-all duration-200"
            aria-label="delete"
          >
            <DeleteIcon />
          </button>
        </div>
      )}
    </div>
  );
};

export default AsideProducts;

"use client";

import type { InitialProductStateType } from "@/types/product.types";
import { getProductDetailUrl } from "@/utils/categoryMapping";
import { DeleteIcon } from "@/utils/icons";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";

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
    router.push(getProductDetailUrl(product?.post_type, product?.id ?? 0));
  };

  const onProductKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goToProduct();
    }
  };

  const deleteHandler = () => {
    if (deleteProductHandler) {
      deleteProductHandler(product?.id as number);
    }
  };

  return (
    <div className="glass flex flex-col lg:flex-row overflow-hidden mt-4 mx-2 cursor-pointer rounded-2xl p-2 gpu">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="rounded-xl object-cover p-2 h-[150px] min-w-[150px]"
        src={img}
        alt="profile img"
        onClick={goToProduct}
        onKeyDown={onProductKeyDown}
        onKeyUp={onProductKeyDown}
        loading="lazy"
        decoding="async"
      />

      <button type="button" className="flex-1 self-center p-4 w-full" onClick={goToProduct}>
        <h2 className="text-2xl font-medium text-center line-clamp-1 font-body">{name}</h2>
        <p className="text-center line-clamp-1 text-muted-foreground text-sm uppercase">{about}</p>
      </button>

      {pathname === "/user-listings" && (
        <div className="self-center flex gap-2 p-4">
          <PublishListingModal isOpen={isOpen} onClose={() => setIsOpen(false)} product={product} />
          <button
            type="button"
            onClick={deleteHandler}
            className="ms-4 p-2 rounded-lg border border-border bg-background/20 backdrop-blur-md hover:bg-background/30 card-button-hover"
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

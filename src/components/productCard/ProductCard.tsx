import Image from "next/image";
import { ProductCardActions } from "./ProductCardActions";
import { ProductCardWrapper } from "./ProductCardWrapper";
import { ImageCarousel } from "./ImageCarousel";
import { getProductDetailUrl } from "@/utils/categoryMapping";
import type { InitialProductStateType } from "@/types/product.types";
import bus from "@/assets/busIcon.png";

type ProductCardProps = {
  product: InitialProductStateType;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
};

/**
 * ProductCard - Server Component for product display
 * Interactive actions are handled by the thin ProductCardActions client wrapper
 * Optional hover/click handlers are handled by ProductCardWrapper for map integration
 */
export function ProductCard({ product, onMouseEnter, onMouseLeave, onClick }: ProductCardProps) {
  // Product detail URL - use category-specific path based on post_type
  const productUrl = getProductDetailUrl(product.post_type, product.id);

  const cardContent = (
    <div className="group animate-on-scroll relative col-span-1 row-span-2 grid grid-rows-subgrid gap-0 h-full cursor-pointer">
      {/* Image section - Airbnb uses near-square 20:19 ratio with rounded corners */}
      <div className="relative rounded-xl overflow-hidden bg-muted">
        {/* Client-side action buttons (auth-dependent) */}
        <ProductCardActions product={product} />

        <ImageCarousel
          images={product.images || []}
          productUrl={productUrl}
          productId={product.id}
          postName={product.post_name}
          postType={product.post_type}
        />
      </div>

      {/* Content section - Modern Airbnb-style tight typography (no container padding) */}
      <div className="mt-3 flex flex-col gap-[2px]">
        <div className="flex justify-between items-start gap-2">
          <h3 className="text-[15px] font-medium text-[#222222] dark:text-[#E8E8E8] leading-[19px] line-clamp-1">
            {product.post_name}
          </h3>
        </div>
        <p className="text-[15px] text-[#717171] dark:text-[#A0A0A0] leading-[19px] line-clamp-1">
          {product.post_stripped_address}
        </p>
        <p className="text-[15px] text-[#717171] dark:text-[#A0A0A0] leading-[19px] line-clamp-1">
          {product.available_hours}
        </p>
        <div className="flex gap-1.5 items-center mt-1">
          <div className="relative w-[15px] h-[15px] opacity-70">
            <Image src={bus} alt="bus" fill sizes="15px" className="object-contain dark:invert" />
          </div>
          <p className="text-[15px] font-medium text-[#222222] dark:text-[#E8E8E8] leading-[19px] line-clamp-1">
            {product.transportation}
          </p>
        </div>
      </div>
    </div>
  );

  // If event handlers are provided, wrap in client component for interactivity
  if (onMouseEnter || onMouseLeave || onClick) {
    return (
      <ProductCardWrapper onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick}>
        {cardContent}
      </ProductCardWrapper>
    );
  }

  // Otherwise, render as pure server component
  return cardContent;
}

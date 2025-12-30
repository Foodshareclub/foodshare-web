import Link from "next/link";
import Image from "next/image";
import { ProductCardActions } from "./ProductCardActions";
import { ProductCardWrapper } from "./ProductCardWrapper";
import { getProductDetailUrl } from "@/utils/categoryMapping";
import type { InitialProductStateType } from "@/types/product.types";
import { gpu120Image } from "@/utils/gpuStyles";
import { isValidImageUrl } from "@/lib/image";
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
    <>
      {/* Airbnb-style card: clean, minimal with subtle shadow and hover lift */}
      <div className="airbnb-card airbnb-card-hover relative">
        {/* Image section - Airbnb uses near-square 20:19 ratio */}
        <div className="relative airbnb-card-image">
          {/* Client-side action buttons (auth-dependent) */}
          <ProductCardActions product={product} />

          <Link
            href={productUrl}
            className="relative w-full block cursor-pointer"
            style={{ aspectRatio: "20/19" }}
            prefetch={true}
          >
            {product.images && product.images.length > 0 && isValidImageUrl(product.images[0]) ? (
              <Image
                className="object-cover transition-transform duration-300 hover:scale-105"
                style={gpu120Image}
                src={product.images[0]}
                alt={`${product.post_name} - ${product.post_type} listing`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDBAMBAAAAAAAAAAAAAQIDAAQFBhESMSFBgRP/xAAVAQEBAAAAAAAAAAAAAAAAAAADBP/EABkRAAIDAQAAAAAAAAAAAAAAAAECAAMhMf/aAAwDAQACEQMRAD8AwWOzleZo4kLyOQqqOySdgKta0vYltMMJba0VgFDxvEZRvt1yCCO/VKUoDbYmr0P/2Q=="
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
    </>
  );

  // If event handlers are provided, wrap in client component for interactivity
  if (onMouseEnter || onMouseLeave || onClick) {
    return (
      <ProductCardWrapper
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        {cardContent}
      </ProductCardWrapper>
    );
  }

  // Otherwise, render as pure server component
  return <div className="col-span-1">{cardContent}</div>;
}

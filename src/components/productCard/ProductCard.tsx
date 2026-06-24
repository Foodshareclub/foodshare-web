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
    <div className="group animate-on-scroll relative col-span-1 row-span-2 grid grid-rows-subgrid gap-0 h-full cursor-pointer">
      {/* Image section - Airbnb uses near-square 20:19 ratio with rounded corners */}
      <div className="relative rounded-xl overflow-hidden bg-muted">
        {/* Client-side action buttons (auth-dependent) */}
        <ProductCardActions product={product} />

        {product.images && product.images.length > 1 ? (
          <div
            className="relative w-full overflow-hidden group/carousel"
            style={{ aspectRatio: "20/19" }}
          >
            <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar w-full h-full">
              {product.images.map(
                (image, i) =>
                  isValidImageUrl(image) && (
                    <div key={i} className="w-full h-full shrink-0 snap-center relative">
                      <Link
                        href={productUrl}
                        className="w-full h-full block relative cursor-pointer"
                        prefetch={true}
                      >
                        <Image
                          className="object-cover transition-transform duration-300 group-hover/carousel:scale-105"
                          style={
                            i === 0
                              ? { ...gpu120Image, viewTransitionName: `product-hero-${product.id}` }
                              : gpu120Image
                          }
                          src={image}
                          alt={`${product.post_name} - ${product.post_type} listing - Image ${i + 1}`}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDBAMBAAAAAAAAAAAAAQIDAAQFBhESMSFBgRP/xAAVAQEBAAAAAAAAAAAAAAAAAAADBP/EABkRAAIDAQAAAAAAAAAAAAAAAAECAAMhMf/aAAwDAQACEQMRAD8AwWOzleZo4kLyOQqqOySdgKta0vYltMMJba0VgFDxvEZRvt1yCCO/VKUoDbYmr0P/2Q=="
                        />
                      </Link>
                    </div>
                  )
              )}
            </div>

            {/* Dots */}
            <div className="absolute bottom-2 left-0 right-0 airbnb-dots pointer-events-none">
              {product.images.map(
                (img, i) =>
                  isValidImageUrl(img) && (
                    <div
                      key={i}
                      className={`airbnb-dot shadow-sm ${i === 0 ? "airbnb-dot-active" : "opacity-80"}`}
                    />
                  )
              )}
            </div>
          </div>
        ) : (
          <Link
            href={productUrl}
            className="relative w-full block cursor-pointer"
            style={{ aspectRatio: "20/19" }}
            prefetch={true}
          >
            {product.images && product.images.length > 0 && isValidImageUrl(product.images[0]) ? (
              <Image
                className="object-cover transition-transform duration-300 hover:scale-105"
                style={{
                  ...gpu120Image,
                  viewTransitionName: `product-hero-${product.id}`,
                }}
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
        )}
      </div>

      {/* Content section - Modern Airbnb-style tight typography (no container padding) */}
      <div className="mt-3 flex flex-col gap-0.5">
        <h3 className="text-[15px] font-semibold text-foreground leading-tight line-clamp-1">
          {product.post_name}
        </h3>
        <p className="text-[15px] text-muted-foreground leading-tight line-clamp-1">
          {product.post_stripped_address}
        </p>
        <p className="text-[15px] text-muted-foreground leading-tight line-clamp-1">
          Available: <span className="text-foreground">{product.available_hours}</span>
        </p>
        <div className="flex gap-1.5 items-center mt-1">
          <div className="relative w-4 h-4 opacity-70">
            <Image src={bus} alt="bus" fill sizes="16px" className="object-contain" />
          </div>
          <p className="text-[15px] font-semibold text-foreground leading-tight line-clamp-1">
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

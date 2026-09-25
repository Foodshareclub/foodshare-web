import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InitialProductStateType } from "@/types/product.types";
import { getProductDetailUrl } from "@/utils/categoryMapping";
import { Bus, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { ImageCarousel } from "./ImageCarousel";
import { ProductCardActions } from "./ProductCardActions";
import { ProductCardWrapper } from "./ProductCardWrapper";

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
  // Legacy imports use punctuation for missing metadata; keep it out of the layout.
  const hasContent = (value: string | null | undefined) =>
    Boolean(value?.trim().replace(/[\s,.-]/g, ""));
  const hasPickup = hasContent(product.available_hours);
  const hasTransport = hasContent(product.transportation);

  const cardContent = (
    <Card variant="listing" className="group relative flex h-full min-w-0 flex-col">
      <div className="relative isolate overflow-hidden rounded-2xl bg-muted">
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

      <CardHeader className="gap-1.5">
        <CardTitle>
          <h3 className="text-base leading-snug">
            <Link
              href={productUrl}
              className="line-clamp-2 rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              {product.post_name}
            </Link>
          </h3>
        </CardTitle>
        {hasContent(product.post_stripped_address) && (
          <CardDescription className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2">{product.post_stripped_address}</span>
          </CardDescription>
        )}
      </CardHeader>
      {(hasPickup || hasTransport) && (
        <CardContent className="flex flex-col gap-1.5">
          {hasPickup && (
            <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
              <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="line-clamp-2">{product.available_hours}</span>
            </p>
          )}
          {hasTransport && (
            <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
              <Bus className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="line-clamp-2">{product.transportation}</span>
            </p>
          )}
        </CardContent>
      )}
    </Card>
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

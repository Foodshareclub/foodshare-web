import { ProductCard } from "@/components/productCard/ProductCard";
import { cn } from "@/lib/utils";
import type { PostGISGeography } from "@/types/postgis.types";
import type { InitialProductStateType } from "@/types/product.types";
import type React from "react";

// Placeholder cards are indistinguishable by definition, so their keys are static ids.
const LOADING_CARD_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

/**
 * ProductGrid - Organism displaying products in responsive grid layout
 * Handles loading, empty, and error states gracefully
 */
interface ProductGridProps {
  products: InitialProductStateType[];
  onViewProduct?: (product: InitialProductStateType) => void;
  className?: string;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
}

/**
 * ProductGrid - Displays products in a responsive grid
 */
export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onViewProduct,
  className,
  isLoading = false,
  emptyState,
}) => {
  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))]", className)}>
        {LOADING_CARD_KEYS.map((k) => (
          <ProductCard
            key={k}
            product={{
              post_name: "Loading...",
              post_slug: "",
              post_type: "thing",
              id: 0,
              available_hours: "",
              condition: "",
              created_at: "",
              five_star: null,
              four_star: null,
              images: [],
              post_address: "",
              post_stripped_address: "",
              post_description: "",
              post_like_counter: 0,
              transportation: "",
              is_arranged: false,
              is_active: false,
              post_views: 0,
              profile_id: "",
              location: {} as PostGISGeography,
            }}
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      emptyState || (
        <div className={cn("col-span-full text-center py-8 text-muted-foreground", className)}>No products found</div>
      )
    );
  }

  return (
    <div className={cn("grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))]", className)}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onClick={() => onViewProduct?.(product)} />
      ))}
    </div>
  );
};

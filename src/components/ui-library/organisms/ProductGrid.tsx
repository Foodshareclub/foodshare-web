import React from "react";
import { cn } from "@/lib/utils";
import type { InitialProductStateType } from "@/types/product.types";
import { ProductCard } from "@/components/productCard/ProductCard";

/**
 * ProductGrid - Organism displaying products in responsive grid layout
 * Handles loading, empty, and error states gracefully
 */
interface ProductGridProps {
  products: InitialProductStateType[];
  onViewProduct?: (product: InitialProductStateType) => void;
  layout?: "grid" | "masonry";
  columns?: number;
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
  layout = "grid",
  columns = 3,
  className,
  isLoading = false,
  emptyState,
}) => {
  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))]", className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductCard
            key={i}
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
              location: {} as any,
            }}
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      emptyState || (
        <div className={cn("col-span-full text-center py-8 text-muted-foreground", className)}>
          No products found
        </div>
      )
    );
  }

  return (
    <div className={cn("grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))]", className)}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={() => onViewProduct && onViewProduct(product)}
        />
      ))}
    </div>
  );
};

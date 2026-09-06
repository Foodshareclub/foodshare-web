import React from "react";
import { ResponsiveGrid } from "@/components/ui-library";
import { ProductCard } from "@/components/ui-library";

interface ProductGridProps {
  products: Array<{
    image: string;
    title: string;
    subtitle?: string;
    price?: string | number;
    rating?: number;
    reviewCount?: number;
    badge?: string;
  }>;
  columns?: number;
  className?: string;
  loadMore?: boolean;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  columns = 2,
  className,
  loadMore = false,
}) => {
  return (
    <ResponsiveGrid columns={columns} className={className}>
      {products.map((product, index) => (
        <ProductCard
          key={index}
          image={product.image}
          title={product.title}
          subtitle={product.subtitle}
          price={product.price}
          rating={product.rating}
          reviewCount={product.reviewCount}
          badge={product.badge}
        />
      ))}

      {loadMore && (
        <div className="border-t py-8 text-center">
          <span className="text-muted-foreground cursor-pointer">Load more products</span>
        </div>
      )}
    </ResponsiveGrid>
  );
};

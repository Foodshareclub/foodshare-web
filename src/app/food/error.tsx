"use client";

import { ErrorDisplay, ProductErrorSuggestions, ProductCategoryLinks } from "@/components/error";

/**
 * Products Error Boundary Component
 * Handles errors specific to the products section
 */
export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
        </div>
      </div>

      {/* Error Content */}
      <div className="container mx-auto px-4 py-12">
        <ErrorDisplay
          error={error}
          reset={reset}
          variant="food"
          footerContent={<ProductErrorSuggestions />}
        />
        <ProductCategoryLinks />
      </div>
    </>
  );
}

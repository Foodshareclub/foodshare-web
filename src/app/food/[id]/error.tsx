"use client";

import { ErrorDisplay } from "@/components/error";

/**
 * Food Detail Error Boundary Component
 * Handles errors when loading product details
 */
export default function FoodDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorDisplay
      error={error}
      reset={reset}
      variant="default"
      title="Product Not Found"
      description="We couldn't load this product. It may have been removed or is temporarily unavailable."
      icon="🍽️"
      homeLink="/food"
    />
  );
}

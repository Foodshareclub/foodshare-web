"use client";

/**
 * QueryErrorBoundary
 * Wraps React Query's QueryErrorResetBoundary with FeatureErrorBoundary.
 * Provides "Try Again" that resets failed queries automatically.
 */

import type { ReactNode } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { FeatureErrorBoundary } from "./FeatureErrorBoundary";

type QueryErrorBoundaryProps = {
  children: ReactNode;
  featureName?: string;
};

export function QueryErrorBoundary({ children, featureName }: QueryErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <FeatureErrorBoundary
          featureName={featureName}
          onReset={reset}
          retryAction={reset}
        >
          {children}
        </FeatureErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

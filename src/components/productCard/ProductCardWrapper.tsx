"use client";

/**
 * ProductCardWrapper - Thin client wrapper for mouse/click events
 * Used when ProductCard needs to communicate with parent (e.g., map hover highlighting)
 */

import type { ReactNode } from "react";

type ProductCardWrapperProps = {
  children: ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
};

export function ProductCardWrapper({
  children,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: ProductCardWrapperProps) {
  return (
    <div
      className="col-span-1"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

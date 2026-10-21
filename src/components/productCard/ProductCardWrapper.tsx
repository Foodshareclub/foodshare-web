"use client";

/**
 * ProductCardWrapper - Thin client wrapper for mouse/click events
 * Used when ProductCard needs to communicate with parent (e.g., map hover highlighting)
 */

import type { KeyboardEvent, ReactNode } from "react";

type ProductCardWrapperProps = {
  children: ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
};

export function ProductCardWrapper({ children, onMouseEnter, onMouseLeave, onClick }: ProductCardWrapperProps) {
  // Keyboard events from the focusable card content bubble up here, mirroring the mouse click.
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if ((e.key === "Enter" || e.key === " ") && onClick) {
      onClick();
    }
  };

  return (
    <div
      className="contents"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}

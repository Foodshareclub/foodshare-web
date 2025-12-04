import React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: number | "auto";
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = "auto",
  className,
}) => {
  const getGridClasses = () => {
    if (columns === "auto") {
      return "grid-cols-[repeat(auto-fill,minmax(360px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(230px,1fr))]";
    }
    return `grid-cols-1 md:grid-cols-${Math.min(columns, 2)} lg:grid-cols-${columns}`;
  };

  return (
    <div className={cn("grid gap-4 auto-rows-[minmax(264px,auto)]", getGridClasses(), className)}>
      {children}
    </div>
  );
};

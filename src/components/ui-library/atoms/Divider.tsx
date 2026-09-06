import React from "react";
import { cn } from "@/lib/utils";

interface DividerProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ orientation = "horizontal", className }) => {
  const isHorizontal = orientation === "horizontal";

  return (
    <div
      className={cn(
        "border-t border-border opacity-40",
        isHorizontal && "h-px w-full",
        !isHorizontal && "w-px h-full",
        className
      )}
    />
  );
};

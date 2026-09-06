import React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface AvatarProps {
  src: string;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  children?: React.ReactNode;
}

/**
 * Avatar - A circular avatar component
 */
export const Avatar: React.FC<AvatarProps> = ({ src, alt, size = "md", className, children }) => {
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
    xl: "w-20 h-20",
  };

  return (
    <Image
      src={src}
      alt={alt}
      className={cn(sizeMap[size], "rounded-full", "object-cover", className)}
      width={size === "xl" ? 200 : size === "lg" ? 140 : size === "md" ? 100 : 80}
    />
  );
};

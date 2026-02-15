"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ProgressiveImageProps {
  src: string;
  placeholderSrc?: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  onLoad?: () => void;
  quality?: number;
}

/**
 * Progressive Image Component
 * Uses Next.js Image component with smooth blur transition
 * for better perceived performance and automatic optimization
 */
export function ProgressiveImage({
  src,
  placeholderSrc,
  alt,
  className = "",
  width,
  height,
  fill = false,
  sizes,
  priority = false,
  onLoad,
  quality = 85,
}: ProgressiveImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadingComplete = () => {
    setIsLoading(false);
    onLoad?.();
  };

  return (
    <Image
      src={src}
      alt={alt}
      width={!fill && width ? width : undefined}
      height={!fill && height ? height : undefined}
      fill={fill}
      sizes={sizes}
      className={cn(
        className,
        "transition-[opacity,filter] duration-400 ease-out",
        isLoading ? "opacity-60 blur-[10px]" : "opacity-100 blur-0"
      )}
      onLoadingComplete={handleLoadingComplete}
      priority={priority}
      quality={quality}
      placeholder={placeholderSrc ? "blur" : "empty"}
      blurDataURL={placeholderSrc}
    />
  );
}

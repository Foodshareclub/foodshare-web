"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

const MotionImage = motion(Image);

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
    <MotionImage
      src={src}
      alt={alt}
      width={!fill && width ? width : undefined}
      height={!fill && height ? height : undefined}
      fill={fill}
      sizes={sizes}
      className={className}
      initial={{ opacity: 0, filter: "blur(10px)" }}
      animate={{
        opacity: isLoading ? 0.6 : 1,
        filter: isLoading ? "blur(10px)" : "blur(0px)",
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      onLoadingComplete={handleLoadingComplete}
      priority={priority}
      quality={quality}
      placeholder={placeholderSrc ? "blur" : "empty"}
      blurDataURL={placeholderSrc}
    />
  );
}

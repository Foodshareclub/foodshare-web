"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface ForumCoverImageProps {
  primaryUrl: string;
  fallbackUrl: string;
  alt: string;
  priority?: boolean;
  className?: string;
  containerClassName?: string;
}

/**
 * Resilient editorial cover image for forum posts.
 * Shows a shimmer skeleton until decoded and seamlessly falls back to a local
 * context-matched cover if the remote image fails (e.g., 402/404 or offline).
 */
export function ForumCoverImage({
  primaryUrl,
  fallbackUrl,
  alt,
  priority = false,
  className,
  containerClassName,
}: ForumCoverImageProps) {
  const [src, setSrc] = useState(primaryUrl);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSrc(primaryUrl);
    setLoaded(false);
  }, [primaryUrl]);

  const handleError = () => {
    if (src !== fallbackUrl) {
      setSrc(fallbackUrl);
      setLoaded(false);
    } else {
      setLoaded(true);
    }
  };

  return (
    <div className={cn("relative aspect-video w-full overflow-hidden bg-muted", containerClassName)}>
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-muted via-muted/60 to-muted animate-pulse"
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={1200}
        height={675}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={handleError}
        className={cn(
          "h-full w-full object-cover transition-all duration-500",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </div>
  );
}

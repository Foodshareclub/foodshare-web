"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { gpu120Image, gpu120Interactive } from "@/utils/gpuStyles";
import { isValidImageUrl } from "@/lib/image";

type ImageCarouselProps = {
  images: string[];
  productUrl: string;
  productId: number;
  postName: string;
  postType: string;
};

export function ImageCarousel({
  images,
  productUrl,
  productId,
  postName,
  postType,
}: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  // Validate images
  const validImages = images.filter(isValidImageUrl);
  // Fallback for missing images
  if (validImages.length === 0) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-muted flex items-center justify-center aspect-square">
        <Link
          href={productUrl}
          className="w-full h-full block relative cursor-pointer flex items-center justify-center bg-gradient-to-br from-muted to-muted/80"
          prefetch={true}
        >
          <span className="text-5xl">📦</span>
        </Link>
      </div>
    );
  }

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollPosition = scrollRef.current.scrollLeft;
      const width = scrollRef.current.clientWidth;
      const newIndex = Math.round(scrollPosition / width);
      setActiveIndex(newIndex);
    }
  };

  const scrollToIndex = (index: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (scrollRef.current) {
      const width = scrollRef.current.clientWidth;
      scrollRef.current.scrollTo({
        left: index * width,
        behavior: "smooth",
      });
      setActiveIndex(index);
    }
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden group/carousel aspect-square"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory w-full h-full"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {validImages.map((image, i) => (
          <div key={i} className="w-full h-full shrink-0 snap-center relative">
            <Link
              href={productUrl}
              className="w-full h-full block relative cursor-pointer bg-muted"
              prefetch={true}
              // Prevent dragging the link to create a ghost image
              onDragStart={(e) => e.preventDefault()}
            >
              {imageErrors[i] ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/80">
                  <span className="text-5xl">📦</span>
                </div>
              ) : (
                <Image
                  className="object-cover"
                  style={
                    i === 0
                      ? { ...gpu120Image, viewTransitionName: `product-hero-${productId}` }
                      : gpu120Image
                  }
                  src={image}
                  alt={`${postName} - ${postType} listing - Image ${i + 1}`}
                  fill
                  onError={() => setImageErrors((prev) => ({ ...prev, [i]: true }))}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDBAMBAAAAAAAAAAAAAQIDAAQFBhESMSFBgRP/xAAVAQEBAAAAAAAAAAAAAAAAAAADBP/EABkRAAIDAQAAAAAAAAAAAAAAAAECAAMhMf/aAAwDAQACEQMRAD8AwWOzleZo4kLyOQqqOySdgKta0vYltMMJba0VgFDxvEZRvt1yCCO/VKUoDbYmr0P/2Q=="
                />
              )}

              {/* Subtle top gradient for the Heart button contrast */}
              <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />

              {/* Subtle bottom gradient for the pagination dots contrast */}
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
            </Link>
          </div>
        ))}
      </div>

      {/* Navigation Arrows (Desktop) */}
      {validImages.length > 1 && (
        <>
          <div
            className={`absolute left-2 top-1/2 -translate-y-1/2 transition-opacity duration-200 z-10 ${
              isHovered && activeIndex > 0 ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <button
              onClick={(e) => scrollToIndex(activeIndex - 1, e)}
              className="airbnb-action-btn airbnb-action-btn-hover w-7 h-7"
              aria-label="Previous image"
              style={gpu120Interactive}
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
          </div>
          <div
            className={`absolute right-2 top-1/2 -translate-y-1/2 transition-opacity duration-200 z-10 ${
              isHovered && activeIndex < validImages.length - 1
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <button
              onClick={(e) => scrollToIndex(activeIndex + 1, e)}
              className="airbnb-action-btn airbnb-action-btn-hover w-7 h-7"
              aria-label="Next image"
              style={gpu120Interactive}
            >
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </>
      )}

      {/* Dots */}
      {validImages.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 airbnb-dots pointer-events-none z-10">
          {validImages.map((_, i) => (
            <div
              key={i}
              className={`airbnb-dot shadow-sm ${
                i === activeIndex ? "airbnb-dot-active" : "opacity-60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

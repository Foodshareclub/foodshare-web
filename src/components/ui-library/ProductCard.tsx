"use client";

import { FrequencyBadge } from "@/components/ui-library/atoms/FrequencyBadge";
import { StatusIndicator } from "@/components/ui-library/atoms/StatusIndicator";
import Image from "next/image";
import type React from "react";

// Decorative star glyphs have no data identity; their keys are static ids.
const RATING_STAR_KEYS = Array.from({ length: 10 }, (_, i) => `star-${i}`);

interface ProductCardProps {
  image: string;
  title: string;
  subtitle?: string;
  price?: string | number;
  rating?: number;
  reviewCount?: number;
  badge?: string;
  onClick?: () => void;
  hover?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  image,
  title,
  subtitle,
  price,
  rating,
  reviewCount,
  badge,
  onClick,
  hover: _hover = true,
}) => {
  const ratingStars = rating
    ? Array.from({ length: rating }, (_, i) => (
        <span key={RATING_STAR_KEYS[i]} aria-hidden="true" className="text-yellow-500">
          ★
        </span>
      ))
    : [];

  return (
    <button
      type="button"
      aria-label={`View ${title} details`}
      className="group cursor-pointer rounded-2xl transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 text-start w-full"
      onClick={onClick}
    >
      {/* Image Container */}
      <div className="relative pb-[100%] overflow-hidden rounded-xl">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Badge */}
        {badge && (
          <div className="absolute bottom-3 start-3 bg-background text-foreground font-semibold px-3 py-1 rounded-md">
            {badge}
          </div>
        )}

        {/* Status Indicator */}
        <StatusIndicator status="online" className="absolute top-2 end-2" />

        {/* Card Body - Airbnb-style typography */}
        <div className="p-3">
          {/* Title */}
          <p className="text-card-title line-clamp-1 flex-1">{title}</p>

          {/* Subtitle */}
          {subtitle && <p className="text-card-body line-clamp-1 mb-1">{subtitle}</p>}

          {/* Price */}
          {price && (
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-card-emphasis">${price}</span>
              <span className="text-card-body">/ night</span>
            </div>
          )}

          {/* Rating */}
          {rating && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-card-body">★</span>
              {ratingStars}
              {reviewCount && <span className="text-card-small">({reviewCount})</span>}
            </div>
          )}

          {/* Frequency Badge */}
          {reviewCount && <FrequencyBadge count={reviewCount} label="reviews" />}
        </div>
      </div>
    </button>
  );
};

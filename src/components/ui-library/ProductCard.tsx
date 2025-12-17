"use client";

import React from "react";
import Image from "next/image";

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
  return (
    <button
      type="button"
      aria-label={`View ${title} details`}
      className="group cursor-pointer rounded-2xl transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 text-left w-full"
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
          <div className="absolute bottom-3 left-3 bg-background text-foreground font-semibold px-3 py-1 rounded-md">
            {badge}
          </div>
        )}
      </div>

      {/* Card Body - Airbnb-style typography */}
      <div className="p-3">
        {/* Title & Rating */}
        <div className="flex justify-between items-center mb-1">
          <p className="text-card-title line-clamp-1 flex-1">{title}</p>
          {rating && (
            <div className="flex items-center gap-1 ml-2">
              <span className="text-card-body">★</span>
              <span className="text-card-emphasis">{rating.toFixed(2)}</span>
              {reviewCount && <span className="text-card-small">({reviewCount})</span>}
            </div>
          )}
        </div>

        {/* Subtitle */}
        {subtitle && <p className="text-card-body line-clamp-1 mb-1">{subtitle}</p>}

        {/* Price */}
        {price && (
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-card-emphasis">${price}</span>
            <span className="text-card-body">/ night</span>
          </div>
        )}
      </div>
    </button>
  );
};

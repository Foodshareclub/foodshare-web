/**
 * Image Gallery component with advanced animations
 * Displays images in a grid with staggered animations
 */

import React from "react";
import { MotionGrid, MotionGridItem, MotionImage } from "../MotionComponents";

interface ImageItem {
  src: string;
  alt: string;
  gridColumn?: string;
  gridRow?: string;
}

interface ImageGalleryProps {
  images: ImageItem[];
  isLoaded: boolean;
  columns?: { base?: string; lg?: string };
  gap?: number;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  isLoaded,
  columns = { base: "repeat(3, 1fr)", lg: "repeat(5, 1fr)" },
  gap = 6,
}) => {
  const gridClasses = "grid gap-6";
  const gridStyle = {
    gridTemplateColumns: columns.base,
  };

  return (
    <MotionGrid
      className={gridClasses}
      style={gridStyle}
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {images.map((image, idx) => (
        <MotionGridItem
          key={idx}
          className="rounded-xl w-full"
          style={{
            gridColumn: image.gridColumn,
            gridRow: image.gridRow,
            willChange: "transform",
            transformOrigin: "center",
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{
            delay: idx * 0.1,
            duration: 0.6,
            type: "spring",
            stiffness: 200,
          }}
          whileHover={{
            scale: 1.05,
            rotate: idx % 2 === 0 ? 2 : -2,
            zIndex: 10,
          }}
        >
          {!isLoaded ? (
            <div className="h-full rounded-xl bg-gray-300 dark:bg-gray-700 animate-pulse" />
          ) : (
            <MotionImage
              src={image.src}
              alt={image.alt}
              className="rounded-xl shadow-lg w-full h-full object-cover"
              whileHover={{
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              }}
              transition={{
                boxShadow: {
                  duration: 0.3,
                },
              }}
            />
          )}
        </MotionGridItem>
      ))}
    </MotionGrid>
  );
};

export default ImageGallery;

/**
 * Enhanced Image component with advanced animations
 * Provides floating, glow, and 3D tilt effects
 */

import type { CSSProperties } from "react";
import React from "react";
import { MotionBox, MotionImage } from "../MotionComponents";
import { useHoverAnimation } from "../hooks/useHoverAnimation";

interface EnhancedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  enableFloating?: boolean;
  enableGlow?: boolean;
  enable3D?: boolean;
  glowColor?: string;
  w?: string;
  maxW?: string | { base?: string; md?: string };
  borderRadius?: string;
  shadow?: string;
  border?: string;
  borderColor?: string;
  m?: string;
  _dark?: { borderColor?: string };
}

export const EnhancedImage: React.FC<EnhancedImageProps> = ({
  src,
  alt,
  enableFloating = true,
  enableGlow = true,
  enable3D = true,
  glowColor = "rgba(255,99,71,0.4)",
  w,
  maxW,
  borderRadius = "2xl",
  shadow = "2xl",
  border,
  borderColor,
  m,
  _dark,
  className = "",
  ..._imageProps
}) => {
  const { isHovered, hoverProps } = useHoverAnimation({ translateY: 0 });

  // Convert Chakra-style props to Tailwind classes
  const getContainerClasses = () => {
    const classes = ["relative"];
    return classes.join(" ");
  };

  const getImageClasses = () => {
    const classes = [];

    // Border radius
    if (borderRadius === "2xl") classes.push("rounded-2xl");
    else if (borderRadius === "xl") classes.push("rounded-xl");

    // Shadow
    if (shadow === "2xl") classes.push("shadow-2xl");
    else if (shadow === "lg") classes.push("shadow-lg");

    // Border
    if (border === "4px solid") classes.push("border-4");
    if (borderColor === "white") classes.push("border-white dark:border-gray-700");

    // Width
    if (w === "100%") classes.push("w-full");

    return classes.join(" ");
  };

  const containerStyle: CSSProperties = {
    perspective: "1000px",
  };

  const imageStyle: CSSProperties = {
    willChange: "transform",
  };

  // Handle maxW
  if (maxW) {
    if (typeof maxW === "string") {
      imageStyle.maxWidth = maxW;
    } else if (typeof maxW === "object") {
      imageStyle.maxWidth = maxW.base || maxW.md;
    }
  }

  // Handle margin
  if (m === "0 auto") {
    imageStyle.margin = "0 auto";
  }

  return (
    <MotionBox
      className={getContainerClasses()}
      {...hoverProps}
      animate={
        enable3D && isHovered
          ? {
              rotateY: 3,
              rotateX: 3,
            }
          : {
              rotateY: 0,
              rotateX: 0,
            }
      }
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
      style={containerStyle}
    >
      <MotionImage
        src={src}
        alt={alt}
        className={`${getImageClasses()} ${className}`}
        style={imageStyle}
        animate={
          enableFloating
            ? {
                y: [0, -15, 0],
              }
            : undefined
        }
        transition={
          enableFloating
            ? {
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : undefined
        }
        whileHover={{
          scale: 1.05,
          rotate: [0, -1, 1, 0],
        }}
      />

      {/* Glow effect */}
      {enableGlow && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] rounded-xl -z-10 pointer-events-none transition-opacity duration-400 blur-[30px]"
          style={{
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            opacity: isHovered ? 1 : 0.5,
          }}
        />
      )}
    </MotionBox>
  );
};

export default EnhancedImage;

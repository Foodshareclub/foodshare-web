'use client';

import React, { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Glass Component Props
 * Extends all standard HTML div attributes plus glassmorphism-specific props
 */
export interface GlassProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Glassmorphism variant to apply
   * @default 'standard'
   */
  variant?:
    | "subtle"
    | "standard"
    | "prominent"
    | "strong"
    | "accentGreen"
    | "accentOrange"
    | "overlay"
    | "input";

  /**
   * Whether to enable hover effects
   * @default true
   */
  enableHover?: boolean;

  /**
   * Border radius
   * @default '16px'
   */
  borderRadius?: string;

  /**
   * Children elements
   */
  children?: React.ReactNode;

  /**
   * Additional custom styles
   */
  style?: React.CSSProperties;

  /**
   * Legacy Chakra UI props for backward compatibility
   * These will be converted to appropriate className or style attributes
   */
  padding?: string;
  p?: string | number;
  px?: string | number | Record<string, string | number>;
  py?: string | number | Record<string, string | number>;
  m?: string | number;
  mx?: string | number;
  my?: string | number;
  mr?: string | number;
  ml?: string | number;
  mt?: string | number;
  mb?: string | number;
  w?: string;
  h?: string;
  minW?: string | Record<string, string>;
  maxW?: string | Record<string, string>;
  minH?: string;
  maxH?: string;
  bg?: string;
  color?: string;
  as?: any; // For polymorphic component support
  position?: string;
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  left?: string | number;
  zIndex?: number;
  overflow?: string;
  overflowX?: string;
  overflowY?: string;
  display?: string | Record<string, string>;
  alignItems?: string;
  justifyContent?: string;
  flexDirection?: string;
  width?: string;
  height?: string;
  cursor?: string;
  opacity?: number;
  transform?: string;
  transition?: string;
  boxShadow?: string;
  border?: string;
  borderColor?: string;
  fontSize?: string | Record<string, string>;
  fontWeight?: string | number;
  textAlign?: string;
  textTransform?: string;
  pointerEvents?: string;
  _hover?: Record<string, any>;
  _active?: Record<string, any>;
  backfaceVisibility?: string;
  perspective?: string | number;
  willChange?: string;
}

/**
 * Variant to CSS class mapping
 */
const variantClassMap: Record<string, string> = {
  subtle: "glass-subtle",
  standard: "glass",
  prominent: "glass-prominent",
  strong: "glass-strong",
  accentGreen: "glass-accent-green",
  accentOrange: "glass-accent-orange",
  overlay: "glass-overlay",
  input: "glass-input",
};

/**
 * Glass Component
 *
 * A reusable glassmorphism component that provides beautiful frosted glass effects.
 * Supports multiple variants, color modes, and hover states.
 *
 * @example
 * // Basic usage
 * <Glass>Content</Glass>
 *
 * @example
 * // With variant
 * <Glass variant="prominent">Header Content</Glass>
 *
 * @example
 * // With accent color
 * <Glass variant="accentGreen" borderRadius="12px">
 *   Accent Card
 * </Glass>
 *
 * @example
 * // Disable hover effects
 * <Glass enableHover={false}>Static Content</Glass>
 */
export const Glass: React.FC<GlassProps> = ({
  variant = "standard",
  enableHover = true,
  borderRadius = "16px",
  children,
  className,
  style,
  // Extract custom props that shouldn't be passed to DOM
  padding,
  p,
  px,
  py,
  m,
  mx,
  my,
  mr,
  ml,
  mt,
  mb,
  w,
  h,
  minW,
  maxW,
  minH,
  maxH,
  bg,
  color,
  as,
  position,
  top,
  right,
  bottom,
  left,
  zIndex,
  overflow,
  overflowX,
  overflowY,
  display,
  alignItems,
  justifyContent,
  flexDirection,
  width,
  height,
  cursor,
  opacity,
  transform,
  transition,
  boxShadow,
  border,
  borderColor,
  fontSize,
  fontWeight,
  textAlign,
  textTransform,
  pointerEvents,
  _hover,
  _active,
  backfaceVisibility,
  perspective,
  willChange,
  ...divProps
}) => {
  const variantClass = variantClassMap[variant] || variantClassMap.standard;

  // Build inline styles from custom props
  const customStyles: React.CSSProperties = {};

  if (width || w) customStyles.width = width || w;
  if (height || h) customStyles.height = height || h;
  if (minW) customStyles.minWidth = typeof minW === "object" ? minW.base : minW;
  if (maxW) customStyles.maxWidth = typeof maxW === "object" ? maxW.base : maxW;
  if (minH) customStyles.minHeight = minH;
  if (maxH) customStyles.maxHeight = maxH;
  if (bg) customStyles.background = bg;
  if (color) customStyles.color = color;
  if (position) customStyles.position = position as any;
  if (top !== undefined) customStyles.top = top;
  if (right !== undefined) customStyles.right = right;
  if (bottom !== undefined) customStyles.bottom = bottom;
  if (left !== undefined) customStyles.left = left;
  if (zIndex !== undefined) customStyles.zIndex = zIndex;
  if (overflow) customStyles.overflow = overflow as any;
  if (overflowX) customStyles.overflowX = overflowX as any;
  if (overflowY) customStyles.overflowY = overflowY as any;
  if (display) customStyles.display = typeof display === "object" ? display.base : display;
  if (alignItems) customStyles.alignItems = alignItems;
  if (justifyContent) customStyles.justifyContent = justifyContent;
  if (flexDirection) customStyles.flexDirection = flexDirection as any;
  if (cursor) customStyles.cursor = cursor;
  if (opacity !== undefined) customStyles.opacity = opacity;
  if (transform) customStyles.transform = transform;
  if (transition) customStyles.transition = transition;
  if (boxShadow) customStyles.boxShadow = boxShadow;
  if (border) customStyles.border = border;
  if (borderColor) customStyles.borderColor = borderColor;
  if (fontSize) customStyles.fontSize = typeof fontSize === "object" ? fontSize.base : fontSize;
  if (fontWeight) customStyles.fontWeight = fontWeight;
  if (textAlign) customStyles.textAlign = textAlign as any;
  if (textTransform) customStyles.textTransform = textTransform as any;
  if (pointerEvents) customStyles.pointerEvents = pointerEvents as any;
  if (backfaceVisibility) customStyles.backfaceVisibility = backfaceVisibility as any;
  if (perspective) customStyles.perspective = perspective;
  if (willChange) customStyles.willChange = willChange;

  const Component = as || "div";

  return (
    <Component
      className={cn(variantClass, enableHover && "glass-transition", className)}
      style={{
        borderRadius,
        ...customStyles,
        ...style,
      }}
      {...divProps}
    >
      {children}
    </Component>
  );
};

/**
 * GlassCard - Specialized Glass component for cards
 */
export const GlassCard: React.FC<GlassProps> = (props) => {
  return <Glass variant="standard" className="p-5" borderRadius="16px" {...props} />;
};

/**
 * GlassHeader - Specialized Glass component for headers
 */
export const GlassHeader: React.FC<GlassProps> = (props) => {
  return <Glass variant="prominent" enableHover={false} borderRadius="0" {...props} />;
};

/**
 * GlassModal - Specialized Glass component for modals
 */
export const GlassModal: React.FC<GlassProps> = (props) => {
  return (
    <Glass
      variant="overlay"
      enableHover={false}
      borderRadius="20px"
      className="p-[30px]"
      {...props}
    />
  );
};

/**
 * GlassInput - Specialized Glass component for form inputs
 */
export const GlassInput: React.FC<GlassProps> = (props) => {
  return <Glass variant="input" borderRadius="12px" className="px-4 py-3" {...props} />;
};

/**
 * GlassButton - Specialized Glass component for buttons
 */
export const GlassButton: React.FC<GlassProps> = (props) => {
  return (
    <Glass
      variant="standard"
      borderRadius="12px"
      className="px-6 py-3 cursor-pointer select-none inline-flex items-center justify-center"
      {...props}
    />
  );
};

export default Glass;

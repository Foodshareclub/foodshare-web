/**
 * Animated Section wrapper component
 * Provides consistent section animations and styling
 */

import React, { CSSProperties } from "react";
import { MotionBox } from "../MotionComponents";
import { fadeInUp } from "../animations";

interface AnimatedSectionProps {
  children: React.ReactNode;
  delay?: number;
  variant?: "default" | "wide" | "narrow";
  className?: string;
}

const variantClasses = {
  default: "max-w-[1400px] mx-auto",
  wide: "max-w-[1600px] mx-auto",
  narrow: "max-w-[1200px] mx-auto",
};

export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  delay = 0,
  variant = "default",
  className = "",
}) => {
  return (
    <MotionBox
      className={`${variantClasses[variant]} ${className}`}
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay }}
    >
      {children}
    </MotionBox>
  );
};

export default AnimatedSection;

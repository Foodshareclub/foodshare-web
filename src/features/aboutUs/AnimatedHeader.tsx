/**
 * Animated Header component for About Us page
 * Reusable header with gradient animation
 */

import type { CSSProperties } from "react";
import React from "react";
import { GlassHeader } from "@/components/Glass";
import { MotionHeading } from "./MotionComponents";

interface AnimatedHeaderProps {
  children: React.ReactNode;
  animationDuration?: string;
  delay?: number;
  mt?: number | string;
  mb?: number | string;
}

export const AnimatedHeader: React.FC<AnimatedHeaderProps> = ({
  children,
  animationDuration = "5s",
  delay = 0,
  mt = 16,
  mb = 12,
}) => {
  // Convert mt/mb to Tailwind classes
  const getMarginClasses = () => {
    const classes = [];

    // Top margin
    if (mt === 8) classes.push("mt-8");
    else if (mt === 16) classes.push("mt-16");
    else if (mt === 20) classes.push("mt-20");

    // Bottom margin
    if (mb === 10) classes.push("mb-10");
    else if (mb === 12) classes.push("mb-12");

    return classes.join(" ");
  };

  const headerStyle: CSSProperties = {
    willChange: "background-position",
    animation: `headerGradient ${animationDuration} ease infinite`,
    backgroundImage: "linear-gradient(to right, rgb(239 68 68), rgb(251 146 60), rgb(239 68 68))",
    backgroundSize: "200% 100%",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  };

  return (
    <GlassHeader variant="prominent" padding="md" className={getMarginClasses()}>
      <MotionHeading
        className="text-[32px] md:text-[48px] text-center font-bold"
        style={headerStyle}
        initial={{ opacity: 0, y: delay ? 50 : -50, scale: delay ? 1 : 0.5 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{
          duration: 0.8,
          type: "spring",
          bounce: delay ? 0 : 0.4,
          delay: delay * 0.1,
        }}
      >
        {children}
      </MotionHeading>
    </GlassHeader>
  );
};

export default AnimatedHeader;

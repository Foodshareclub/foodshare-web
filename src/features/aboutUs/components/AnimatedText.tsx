/**
 * Animated Text component with staggered word/character reveals
 * Provides sophisticated text animations
 */

import React, { CSSProperties } from "react";
import { MotionBox } from "../MotionComponents";

interface AnimatedTextProps {
  text: string;
  delay?: number;
  staggerWords?: boolean;
  fontSize?: { base?: string; md?: string };
  lineHeight?: string;
  color?: string;
  fontWeight?: string;
  _dark?: { color?: string };
  className?: string;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  delay = 0,
  staggerWords = false,
  fontSize,
  lineHeight,
  color,
  fontWeight,
  _dark,
  className = "",
}) => {
  // Convert Chakra-style props to Tailwind classes
  const getTextClasses = () => {
    const classes = [];

    // Font size
    if (fontSize) {
      if (fontSize.base === "md") classes.push("text-base");
      if (fontSize.base === "lg") classes.push("text-lg");
      if (fontSize.md === "lg") classes.push("md:text-lg");
    }

    // Line height
    if (lineHeight === "1.9") classes.push("leading-[1.9]");
    if (lineHeight === "1.8") classes.push("leading-[1.8]");

    // Color
    if (color === "gray.700") classes.push("text-gray-700 dark:text-gray-300");

    // Font weight
    if (fontWeight === "400") classes.push("font-normal");

    return classes.join(" ");
  };

  if (!staggerWords) {
    return (
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.6 }}
      >
        <p className={`${getTextClasses()} ${className}`}>{text}</p>
      </MotionBox>
    );
  }

  const words = text.split(" ");

  return (
    <p className={`${getTextClasses()} ${className}`}>
      {words.map((word, idx) => (
        <MotionBox
          key={idx}
          className="inline-block mr-1"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            delay: delay + idx * 0.03,
            duration: 0.4,
          }}
        >
          {word}
        </MotionBox>
      ))}
    </p>
  );
};

export default AnimatedText;

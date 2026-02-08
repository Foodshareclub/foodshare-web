/**
 * Animated Contact Button component
 * Reusable button with shimmer and animation effects
 */

import React from "react";

import Link from "next/link";
import { ArrowForwardIcon } from "../../utils/icons";
import { MotionBox } from "./MotionComponents";
import { shimmerAnimation } from "./animations";

export const AnimatedContactButton: React.FC = () => {
  return (
    <MotionBox
      className="text-center mt-16 mb-8"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <Link href="/contact-us" className="no-underline hover:no-underline">
        <MotionBox
          className="inline-flex items-center gap-3 px-8 py-4 text-lg md:text-xl font-semibold text-white rounded-full shadow-lg relative overflow-hidden"
          style={{
            background: "linear-gradient(to right, rgb(239 68 68), rgb(251 146 60))",
            backgroundSize: "200% 100%",
            willChange: "transform",
          }}
          whileHover={{
            scale: 1.05,
            boxShadow: "0 20px 40px -12px rgba(255, 99, 71, 0.5)",
          }}
          whileTap={{ scale: 0.95 }}
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{
            backgroundPosition: {
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            },
          }}
        >
          {/* Shimmer effect */}
          <MotionBox
            className="absolute top-0 -left-full w-full h-full"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent)",
              willChange: "left",
            }}
            {...shimmerAnimation}
          />

          <span className="relative z-10">&quot;Contact Us&quot;</span>

          <MotionBox
            className="inline-block relative z-10"
            animate={{
              x: [0, 5, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ willChange: "transform" }}
          >
            <ArrowForwardIcon />
          </MotionBox>
        </MotionBox>
      </Link>
    </MotionBox>
  );
};

export default AnimatedContactButton;

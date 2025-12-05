import React from "react";
import { motion } from "framer-motion";
import { MotionBox, MotionImage, MotionBadge } from "@/features/aboutUs/MotionComponents";
import {
  fadeInUp,
  staggerItem,
  imageHover,
  card3DTilt,
  particleVariants,
} from "@/features/aboutUs/animations";
import { useHoverAnimation } from "@/features/aboutUs/hooks";

type PropsType = {
  name: string;
  secondName: string;
  img: string;
  aboutExp?: string;
  role?: string;
  index?: number;
};

const FloatingParticles: React.FC = () => (
  <div className="absolute -top-[10px] -left-[10px] -right-[10px] -bottom-[10px]">
    {[...Array(3)].map((_, i) => (
      <MotionBox
        key={i}
        className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-red-400 to-orange-400"
        {...particleVariants(i)}
        style={{
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
        }}
      />
    ))}
  </div>
);

const PersonCard: React.FC<PropsType> = ({ name, secondName, img, aboutExp, role, index = 0 }) => {
  const { isHovered, hoverProps, animationVariants } = useHoverAnimation({
    scale: 1.02,
    translateY: -12,
  });

  return (
    <MotionBox
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      transition={{ delay: index * 0.15 }}
      className="max-w-[400px] md:max-w-[320px] mx-auto w-full"
    >
      <motion.div
        {...hoverProps}
        className="glass rounded-xl p-8 glass-fade-in flex flex-col items-center overflow-hidden h-full relative"
        style={{
          perspective: "1000px",
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        {/* Animated gradient background */}
        <div
          className={`absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-br from-red-500/10 to-orange-500/10 pointer-events-none z-0 transition-opacity duration-400 ${isHovered ? "opacity-100" : "opacity-0"}`}
        />

        <MotionBox
          className="relative mb-6 md:mb-8"
          variants={card3DTilt}
          initial="rest"
          animate={isHovered ? "hover" : "rest"}
        >
          <FloatingParticles />

          <MotionImage
            className="object-cover rounded-full w-[160px] h-[160px] sm:w-[180px] sm:h-[180px] border-[5px] border-solid shadow-2xl relative z-[1]"
            style={{
              borderColor: isHovered ? "rgba(255, 99, 71, 0.8)" : "rgba(255, 255, 255, 0.4)",
            }}
            src={img}
            alt={`${name} profile image`}
            variants={imageHover}
            initial="rest"
            whileHover="hover"
          />

          {/* Glow effect */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] sm:w-[200px] h-[180px] sm:h-[200px] rounded-full bg-gradient-radial from-red-500/40 to-transparent blur-[20px] z-0 transition-opacity duration-400 ${isHovered ? "opacity-100" : "opacity-0"}`}
          />
        </MotionBox>

        <div className="flex flex-col items-center gap-3 md:gap-4 w-full relative z-10">
          <MotionBox
            variants={staggerItem}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-center text-xl md:text-2xl font-bold text-primary">
              {name} {secondName}
            </h3>
          </MotionBox>

          {role && (
            <MotionBadge
              className="bg-red-500 text-white text-sm md:text-base px-4 py-2 rounded-full capitalize font-semibold"
              variants={staggerItem}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
            >
              {role}
            </MotionBadge>
          )}

          <MotionBox
            variants={staggerItem}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-sm md:text-base text-center leading-relaxed text-muted-foreground px-2 mt-2">
              {aboutExp}
            </p>
          </MotionBox>
        </div>
      </motion.div>
    </MotionBox>
  );
};

export default PersonCard;

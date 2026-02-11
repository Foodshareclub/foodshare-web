"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type PropsType = {
  name: string;
  secondName: string;
  img: string;
  aboutExp?: string;
  role?: string;
  index?: number;
};

const PersonCard: React.FC<PropsType> = ({ name, secondName, img, aboutExp, role, index = 0 }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="max-w-[400px] md:max-w-[320px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ animationDelay: `${index * 150}ms`, animationFillMode: "both" }}
    >
      <div
        className={cn(
          "glass rounded-xl p-8 glass-fade-in flex flex-col items-center overflow-hidden h-full relative",
          "transition-all duration-300 ease-out",
          isHovered && "scale-[1.02] -translate-y-3"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Animated gradient background */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-br from-red-500/10 to-orange-500/10 pointer-events-none z-0 transition-opacity duration-400",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        />

        <div className="relative mb-6 md:mb-8">
          <Image
            className={cn(
              "object-cover rounded-full w-[160px] h-[160px] sm:w-[180px] sm:h-[180px] border-[5px] border-solid shadow-2xl relative z-[1]",
              "transition-all duration-300",
              isHovered && "scale-105"
            )}
            style={{
              borderColor: isHovered ? "rgba(255, 99, 71, 0.8)" : "rgba(255, 255, 255, 0.4)",
            }}
            src={img}
            alt={`${name} profile image`}
            width={180}
            height={180}
          />

          {/* Glow effect */}
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] sm:w-[200px] h-[180px] sm:h-[200px] rounded-full bg-gradient-radial from-red-500/40 to-transparent blur-[20px] z-0 transition-opacity duration-400",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          />
        </div>

        <div className="flex flex-col items-center gap-3 md:gap-4 w-full relative z-10">
          <h3 className="text-center text-xl md:text-2xl font-bold text-primary">
            {name} {secondName}
          </h3>

          {role && (
            <span className="bg-red-500 text-white text-sm md:text-base px-4 py-2 rounded-full capitalize font-semibold hover:scale-110 transition-transform">
              {role}
            </span>
          )}

          <p className="text-sm md:text-base text-center leading-relaxed text-muted-foreground px-2 mt-2">
            {aboutExp}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PersonCard;

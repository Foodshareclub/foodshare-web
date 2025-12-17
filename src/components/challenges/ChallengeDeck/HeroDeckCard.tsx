"use client";

import Image from "next/image";
import { Zap, Star, Flame, Users, Sparkles, Trophy } from "lucide-react";
import { DIFFICULTY_CONFIG, type DifficultyLevel } from "./constants";
import { cn } from "@/lib/utils";
import type { InitialProductStateType } from "@/types/product.types";

interface HeroDeckCardProps {
  challenge: InitialProductStateType;
  className?: string;
  isFaceUp?: boolean;
  isLarge?: boolean;
}

const DifficultyIcons = {
  Easy: Star,
  Medium: Flame,
  Hard: Zap,
} as const;

export function HeroDeckCard({
  challenge,
  className,
  isFaceUp = true,
  isLarge = false,
}: HeroDeckCardProps) {
  const difficulty = (challenge.condition as DifficultyLevel) || "Easy";
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.Easy;
  const DifficultyIcon = DifficultyIcons[difficulty] || Star;
  const imageUrl = challenge.images?.[0] || "/placeholder-challenge.webp";

  if (!isFaceUp) {
    return <CardBack className={className} isLarge={isLarge} />;
  }

  return (
    <div className={cn("relative", className)}>
      {/* Holographic border effect */}
      <div
        className="absolute -inset-[2px] rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background:
            "linear-gradient(45deg, hsl(var(--primary)), hsl(173 58% 39%), hsl(27 87% 59%), hsl(var(--primary)))",
          backgroundSize: "300% 300%",
          animation: "holographic 3s ease infinite",
        }}
      />

      {/* Main card */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl",
          "bg-card/95 backdrop-blur-xl",
          "border border-border/50",
          "shadow-2xl shadow-black/30",
          "gpu",
          isLarge ? "w-72 sm:w-80 md:w-96" : "w-64 sm:w-72"
        )}
        style={{ aspectRatio: "3/4" }}
      >
        {/* Shimmer overlay effect */}
        <div
          className="absolute inset-0 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background:
              "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 45%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.2) 55%, transparent 60%)",
            backgroundSize: "250% 100%",
            animation: "shimmer 2.5s infinite",
          }}
        />

        {/* Rainbow edge glow on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,45,85,0.1), rgba(0,166,153,0.1), rgba(252,100,45,0.1))",
            animation: "holographic 4s ease infinite",
          }}
        />

        {/* Challenge Image */}
        <div
          className={cn(
            "relative overflow-hidden",
            isLarge ? "h-48 sm:h-56 md:h-64" : "h-40 sm:h-48"
          )}
        >
          <Image
            src={imageUrl}
            alt={challenge.post_name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes={
              isLarge
                ? "(max-width: 640px) 288px, (max-width: 768px) 320px, 384px"
                : "(max-width: 640px) 256px, 288px"
            }
            priority
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Decorative corner accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/40 to-transparent" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-teal-500/30 to-transparent" />

          {/* Sparkle decoration on hover */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110">
            <div className="relative">
              <Sparkles className="w-10 h-10 text-white/60 animate-pulse" />
              <div className="absolute -inset-2 bg-white/20 blur-xl rounded-full" />
            </div>
          </div>

          {/* XP Badge - Enhanced */}
          <div className="absolute top-3 right-3">
            <div className="relative">
              <div className="absolute -inset-1 bg-yellow-500/40 rounded-full blur-md" />
              <div className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-yellow-500/40">
                <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-bold text-yellow-400">{config.xp} XP</span>
              </div>
            </div>
          </div>

          {/* Difficulty Badge - Enhanced */}
          <div className="absolute top-3 left-3">
            <div className="relative">
              <div
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold",
                  "backdrop-blur-md border shadow-lg",
                  config.color,
                  config.borderColor
                )}
              >
                <DifficultyIcon className="w-3.5 h-3.5" />
                {difficulty}
              </div>
            </div>
          </div>

          {/* Participants Badge */}
          <div className="absolute bottom-3 left-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/25 backdrop-blur-md text-white text-xs font-medium border border-white/20">
              <Users className="w-3.5 h-3.5" />
              <span>{challenge.post_like_counter || 0} joined</span>
            </div>
          </div>

          {/* Trophy indicator for popular challenges */}
          {(challenge.post_like_counter || 0) > 50 && (
            <div className="absolute bottom-3 right-3">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/80 backdrop-blur-md text-white text-xs font-medium">
                <Trophy className="w-3 h-3" />
                <span>Popular</span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className={cn("p-4 space-y-2", isLarge && "p-5 space-y-3")}>
          <h3
            className={cn(
              "font-bold text-foreground leading-tight line-clamp-2",
              isLarge ? "text-lg sm:text-xl" : "text-base sm:text-lg"
            )}
          >
            {challenge.post_name}
          </h3>

          <p
            className={cn(
              "text-muted-foreground leading-relaxed line-clamp-2",
              isLarge ? "text-sm" : "text-xs sm:text-sm"
            )}
          >
            {challenge.post_description}
          </p>

          {/* Call to action hint - Enhanced */}
          <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground/80">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/15 to-teal-500/15 text-primary border border-primary/20">
              <Sparkles className="w-3.5 h-3.5" />
              Tap to explore
            </span>
          </div>
        </div>

        {/* Bottom gradient accent - Animated */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1.5"
          style={{
            background:
              "linear-gradient(90deg, hsl(var(--primary)), hsl(173 58% 39%), hsl(27 87% 59%))",
            backgroundSize: "200% 100%",
            animation: "holographic 4s ease infinite",
          }}
        />
      </div>
    </div>
  );
}

// Elegant card back for deck stack - Enhanced
function CardBack({ className, isLarge = false }: { className?: string; isLarge?: boolean }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-primary/25 via-card to-teal-500/25",
        "border border-border/50",
        "shadow-xl shadow-black/20",
        isLarge ? "w-72 sm:w-80 md:w-96" : "w-64 sm:w-72",
        className
      )}
      style={{ aspectRatio: "3/4" }}
    >
      {/* Animated diagonal stripe pattern */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            currentColor 10px,
            currentColor 11px
          )`,
        }}
      />

      {/* Gradient mesh background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-teal-500/10" />

      {/* Center logo/icon with enhanced glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* Outer glow ring */}
          <div className="absolute -inset-8 bg-gradient-to-r from-primary/30 to-teal-500/30 rounded-full blur-2xl animate-pulse" />
          {/* Middle glow */}
          <div className="absolute -inset-4 bg-primary/25 rounded-full blur-xl" />
          {/* Icon container */}
          <div
            className={cn(
              "relative rounded-2xl bg-gradient-to-br from-primary/40 to-teal-500/40 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl",
              isLarge ? "w-20 h-20 sm:w-24 sm:h-24" : "w-16 h-16 sm:w-20 sm:h-20"
            )}
          >
            <Zap
              className={cn(
                "text-primary/70",
                isLarge ? "w-10 h-10 sm:w-12 sm:h-12" : "w-8 h-8 sm:w-10 sm:h-10"
              )}
            />
          </div>
        </div>
      </div>

      {/* Corner decorations - Enhanced */}
      <div className="absolute top-4 left-4 w-8 h-8 sm:w-10 sm:h-10 border-l-2 border-t-2 border-primary/40 rounded-tl-xl" />
      <div className="absolute top-4 right-4 w-8 h-8 sm:w-10 sm:h-10 border-r-2 border-t-2 border-primary/40 rounded-tr-xl" />
      <div className="absolute bottom-4 left-4 w-8 h-8 sm:w-10 sm:h-10 border-l-2 border-b-2 border-primary/40 rounded-bl-xl" />
      <div className="absolute bottom-4 right-4 w-8 h-8 sm:w-10 sm:h-10 border-r-2 border-b-2 border-primary/40 rounded-br-xl" />

      {/* Subtle inner sparkles */}
      <Sparkles className="absolute top-8 right-8 w-4 h-4 text-primary/30" />
      <Sparkles className="absolute bottom-8 left-8 w-3 h-3 text-teal-500/30" />

      {/* Bottom gradient accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-teal-500/40 to-orange-500/40" />
    </div>
  );
}

export default HeroDeckCard;

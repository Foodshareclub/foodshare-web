"use client";

import Image from "next/image";
import { Zap, Star, Flame, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { DIFFICULTY_CONFIG } from "./constants";
import type { CardFaceProps } from "./types";
import { getChallengeData } from "./types";

const DifficultyIcons = {
  Easy: Star,
  Medium: Flame,
  Hard: Zap,
} as const;

export function CardFace({ challenge, className }: CardFaceProps) {
  const data = getChallengeData(challenge);
  const difficultyConfig = DIFFICULTY_CONFIG[data.difficulty] || DIFFICULTY_CONFIG.Easy;
  const DifficultyIcon = DifficultyIcons[data.difficulty] || Star;
  const xp = difficultyConfig.xp;

  return (
    <div
      className={cn(
        "relative w-72 overflow-hidden rounded-2xl",
        "bg-card/95 backdrop-blur-xl",
        "border border-border/50",
        "shadow-2xl shadow-black/20",
        "gpu",
        className
      )}
      style={{ aspectRatio: "3/4" }}
    >
      {/* Challenge Image */}
      <div className="relative h-48 overflow-hidden">
        <Image
          src={data.image}
          alt={data.title}
          fill
          className="object-cover"
          sizes="288px"
          priority
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/30 to-transparent" />

        {/* XP Badge */}
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-yellow-500/30">
            <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-bold text-yellow-400">{xp} XP</span>
          </div>
        </div>

        {/* Difficulty Badge */}
        <div className="absolute top-3 left-3">
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold",
              "backdrop-blur-md border",
              difficultyConfig.color,
              difficultyConfig.borderColor
            )}
          >
            <DifficultyIcon className="w-3.5 h-3.5" />
            {data.difficulty}
          </div>
        </div>

        {/* Participants Badge */}
        <div className="absolute bottom-3 left-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs">
            <Users className="w-3.5 h-3.5" />
            <span>{data.participants} joined</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-bold text-lg text-foreground leading-tight line-clamp-2">
          {data.title}
        </h3>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {data.description}
        </p>

        {/* Swipe hint */}
        <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground/70">
          <span className="flex items-center gap-1">
            <span className="text-red-400">←</span> Skip
          </span>
          <span className="text-muted-foreground/40">|</span>
          <span className="flex items-center gap-1">
            Accept <span className="text-green-400">→</span>
          </span>
        </div>
      </div>

      {/* Bottom gradient accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-teal-500/50 to-orange-500/50" />
    </div>
  );
}

// Simplified card back for deck stack
export function CardBack({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative w-72 overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-primary/20 via-card to-teal-500/20",
        "border border-border/50",
        "shadow-xl shadow-black/10",
        className
      )}
      style={{ aspectRatio: "3/4" }}
    >
      {/* Pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="w-full h-full"
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
      </div>

      {/* Center logo/icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-teal-500/30 backdrop-blur-sm border border-white/10 flex items-center justify-center">
          <Zap className="w-10 h-10 text-primary/60" />
        </div>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary/30 rounded-tl-lg" />
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-primary/30 rounded-tr-lg" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-primary/30 rounded-bl-lg" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-primary/30 rounded-br-lg" />
    </div>
  );
}

export default CardFace;

/**
 * Leaderboard Skeleton Component
 *
 * Loading skeleton that matches the leaderboard layout.
 */

"use client";

import { motion } from "framer-motion";
import { skeletonVariants } from "./animations";
import type { LeaderboardSkeletonProps } from "./types";

export function LeaderboardSkeleton({ rows = 5 }: LeaderboardSkeletonProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4">
      {/* Header skeleton */}
      <div className="flex items-center gap-2 mb-4">
        <motion.div
          className="h-6 w-6 rounded-full bg-muted"
          variants={skeletonVariants}
          initial="initial"
          animate="animate"
        />
        <motion.div
          className="h-5 w-36 rounded bg-muted"
          variants={skeletonVariants}
          initial="initial"
          animate="animate"
        />
      </div>

      {/* Rows skeleton */}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonRow key={index} delay={index * 0.1} />
        ))}
      </div>
    </div>
  );
}

function SkeletonRow({ delay }: { delay: number }) {
  return (
    <motion.div
      className="flex items-center gap-3 p-2 rounded-lg"
      variants={skeletonVariants}
      initial="initial"
      animate="animate"
      transition={{ delay }}
    >
      {/* Rank */}
      <motion.div
        className="h-7 w-7 rounded-full bg-muted shrink-0"
        variants={skeletonVariants}
        initial="initial"
        animate="animate"
      />

      {/* Avatar */}
      <motion.div
        className="h-10 w-10 rounded-full bg-muted shrink-0"
        variants={skeletonVariants}
        initial="initial"
        animate="animate"
      />

      {/* Name and tier */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <motion.div
          className="h-4 w-24 rounded bg-muted"
          variants={skeletonVariants}
          initial="initial"
          animate="animate"
        />
        <motion.div
          className="h-3 w-16 rounded bg-muted"
          variants={skeletonVariants}
          initial="initial"
          animate="animate"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 shrink-0">
        <motion.div
          className="h-4 w-8 rounded bg-muted"
          variants={skeletonVariants}
          initial="initial"
          animate="animate"
        />
        <motion.div
          className="h-4 w-12 rounded bg-muted"
          variants={skeletonVariants}
          initial="initial"
          animate="animate"
        />
      </div>
    </motion.div>
  );
}

export default LeaderboardSkeleton;

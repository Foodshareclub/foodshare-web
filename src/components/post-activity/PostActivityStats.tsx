"use client";

/**
 * Post Activity Stats Component
 *
 * Displays activity statistics for a post in a compact card format.
 */

import {
  FiEye,
  FiMessageCircle,
  FiCheckCircle,
  FiPackage,
  FiHeart,
  FiShare2,
} from "react-icons/fi";
import { cn } from "@/lib/utils";
import type { PostActivityCounts } from "@/types/post-activity.types";

interface PostActivityStatsProps {
  counts: PostActivityCounts;
  className?: string;
}

const STAT_CONFIG = [
  { key: "viewed", label: "Views", icon: FiEye, color: "text-gray-500" },
  { key: "contacted", label: "Contacts", icon: FiMessageCircle, color: "text-blue-500" },
  { key: "arranged", label: "Arranged", icon: FiCheckCircle, color: "text-green-500" },
  { key: "collected", label: "Collected", icon: FiPackage, color: "text-green-600" },
  { key: "liked", label: "Likes", icon: FiHeart, color: "text-pink-500" },
  { key: "shared", label: "Shares", icon: FiShare2, color: "text-blue-500" },
] as const;

export function PostActivityStats({ counts, className }: PostActivityStatsProps) {
  const stats = STAT_CONFIG.map((config) => ({
    ...config,
    count: counts[config.key as keyof PostActivityCounts] || 0,
  })).filter((stat) => stat.count > 0);

  if (stats.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-4", className)}>
      {stats.map((stat) => (
        <div key={stat.key} className="flex items-center gap-1.5">
          <stat.icon className={cn("w-4 h-4", stat.color)} />
          <span className="text-sm font-medium">{stat.count}</span>
          <span className="text-sm text-muted-foreground">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

export default PostActivityStats;

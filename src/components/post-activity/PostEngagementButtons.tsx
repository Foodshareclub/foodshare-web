"use client";

/**
 * Post Engagement Buttons Component
 *
 * Like, bookmark, and share buttons with optimistic updates.
 * Bleeding-edge React 19 patterns.
 */

import { useTransition } from "react";
import { Heart, Bookmark, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOptimisticLike, useOptimisticBookmark } from "@/hooks/useOptimisticActivity";
import { togglePostLike, togglePostBookmark, recordPostShare } from "@/app/actions/post-engagement";

interface PostEngagementButtonsProps {
  postId: number;
  initialIsLiked?: boolean;
  initialLikeCount?: number;
  initialIsBookmarked?: boolean;
  showCounts?: boolean;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function PostEngagementButtons({
  postId,
  initialIsLiked = false,
  initialLikeCount = 0,
  initialIsBookmarked = false,
  showCounts = true,
  size = "default",
  className,
}: PostEngagementButtonsProps) {
  const [isSharePending, startShareTransition] = useTransition();

  // Optimistic like state
  const {
    isLiked,
    count: likeCount,
    toggleLike,
    isPending: isLikePending,
  } = useOptimisticLike({
    isLiked: initialIsLiked,
    count: initialLikeCount,
  });

  // Optimistic bookmark state
  const {
    isBookmarked,
    toggleBookmark,
    isPending: isBookmarkPending,
  } = useOptimisticBookmark(initialIsBookmarked);

  const handleLike = async () => {
    toggleLike();
    await togglePostLike(postId);
  };

  const handleBookmark = async () => {
    toggleBookmark();
    await togglePostBookmark(postId);
  };

  const handleShare = async () => {
    startShareTransition(async () => {
      // Copy link to clipboard
      const url = `${window.location.origin}/post/${postId}`;
      await navigator.clipboard.writeText(url);

      // Record share
      await recordPostShare(postId, "link");
    });
  };

  const buttonSize = size === "sm" ? "icon-sm" : size === "lg" ? "icon-lg" : "icon";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Like Button */}
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={handleLike}
        disabled={isLikePending}
        className={cn("transition-colors", isLiked && "text-pink-500 hover:text-pink-600")}
        aria-label={isLiked ? "Unlike" : "Like"}
      >
        <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
        {showCounts && likeCount > 0 && <span className="ml-1 text-xs">{likeCount}</span>}
      </Button>

      {/* Bookmark Button */}
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={handleBookmark}
        disabled={isBookmarkPending}
        className={cn("transition-colors", isBookmarked && "text-yellow-500 hover:text-yellow-600")}
        aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
      >
        <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} />
      </Button>

      {/* Share Button */}
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={handleShare}
        disabled={isSharePending}
        aria-label="Share"
      >
        <Share2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default PostEngagementButtons;

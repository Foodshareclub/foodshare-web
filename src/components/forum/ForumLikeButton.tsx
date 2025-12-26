"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";

// Icon aliases for consistency
const FaHeart = Heart;
const FaRegHeart = Heart;
import { Button } from "@/components/ui/button";
import { toggleForumLike } from "@/app/actions/forum";
import { cn } from "@/lib/utils";

type ForumLikeButtonProps = {
  forumId: number;
  initialLikeCount: number;
  initialIsLiked: boolean;
  isAuthenticated: boolean;
  className?: string;
};

export function ForumLikeButton({
  forumId,
  initialLikeCount,
  initialIsLiked,
  isAuthenticated,
  className,
}: ForumLikeButtonProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);

  const handleLike = (): void => {
    if (!isAuthenticated) return;

    // Optimistic update
    setIsLiked((prev) => !prev);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));

    startTransition(async () => {
      const result = await toggleForumLike(forumId);
      if (!result.success) {
        // Revert on error
        setIsLiked((prev) => !prev);
        setLikeCount((prev) => (isLiked ? prev + 1 : prev - 1));
      } else {
        // Sync with server state
        setIsLiked(result.isLiked);
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLike}
      disabled={isPending || !isAuthenticated}
      className={cn(
        "flex items-center gap-1.5 transition-colors",
        isLiked && "text-red-500 hover:text-red-600",
        className
      )}
      title={isAuthenticated ? (isLiked ? "Unlike" : "Like") : "Sign in to like"}
    >
      {isLiked ? <FaHeart className="w-4 h-4" /> : <FaRegHeart className="w-4 h-4" />}
      <span>{likeCount}</span>
    </Button>
  );
}

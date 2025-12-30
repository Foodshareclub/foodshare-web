"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
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
      aria-label={
        isAuthenticated
          ? isLiked
            ? `Unlike this post (${likeCount} likes)`
            : `Like this post (${likeCount} likes)`
          : "Sign in to like this post"
      }
      aria-pressed={isLiked}
    >
      <Heart className="w-4 h-4" aria-hidden="true" />
      <span aria-hidden="true">{likeCount}</span>
    </Button>
  );
}

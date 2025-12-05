import React from "react";
import type { ForumTag } from "@/api/forumAPI";

type ForumTagBadgeProps = {
  tag: ForumTag;
  onClick?: () => void;
  size?: "sm" | "md";
};

export const ForumTagBadge: React.FC<ForumTagBadgeProps> = ({ tag, onClick, size = "sm" }) => {
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2 py-1 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium bg-muted text-muted-foreground transition-colors hover:bg-muted/80 ${sizeClasses[size]} ${onClick ? "cursor-pointer" : ""}`}
      style={tag.color ? { color: tag.color } : undefined}
      onClick={onClick}
    >
      #{tag.name}
    </span>
  );
};

ForumTagBadge.displayName = "ForumTagBadge";

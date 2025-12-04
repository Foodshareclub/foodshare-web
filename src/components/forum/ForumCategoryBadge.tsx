import React from "react";
import type { ForumCategory } from "@/api/forumAPI";

type ForumCategoryBadgeProps = {
  category: ForumCategory;
  onClick?: () => void;
  size?: "sm" | "md";
};

export const ForumCategoryBadge: React.FC<ForumCategoryBadgeProps> = ({
  category,
  onClick,
  size = "sm",
}) => {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium transition-colors ${sizeClasses[size]} ${onClick ? "cursor-pointer hover:opacity-80" : ""}`}
      style={{
        backgroundColor: `${category.color}20`,
        color: category.color || "#4CAF50",
      }}
      onClick={onClick}
    >
      {category.name}
    </span>
  );
};

ForumCategoryBadge.displayName = "ForumCategoryBadge";
